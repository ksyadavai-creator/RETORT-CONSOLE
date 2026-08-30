/* ==========================================================================
   calculator.js — F0 Lethality Engine + standalone F0 Calculator view
   F0 = Σ Δt * 10^((T_avg - Tref)/z)   (General Method, trapezoidal lethal rate)
   ========================================================================== */
const Calc = (() => {

  function lethalRate(temp, refTemp, z) {
    return Math.pow(10, (temp - refTemp) / z);
  }

  // readings: [{time:0, temp:30}, {time:1, temp:45}, ...] time in minutes, sorted
  function computeSeries(readings, refTemp = 121.1, z = 10) {
    const sorted = [...readings].sort((a, b) => a.time - b.time);
    let cumF0 = 0;
    const out = [];
    let maxTemp = -Infinity;
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      const L = lethalRate(r.temp, refTemp, z);
      if (i > 0) {
        const prev = sorted[i - 1];
        const dt = r.time - prev.time;
        const avgL = (lethalRate(prev.temp, refTemp, z) + L) / 2;
        cumF0 += avgL * dt;
      }
      maxTemp = Math.max(maxTemp, r.temp);
      out.push({ time: r.time, temp: r.temp, lethalRate: L, cumF0: Math.round(cumF0 * 100) / 100 });
    }
    return { points: out, totalF0: Math.round(cumF0 * 100) / 100, maxTemp: maxTemp === -Infinity ? 0 : maxTemp };
  }

  // Determine holding time = span where temp >= (retortTemp - 1.0) as a simple heuristic
  function estimateHoldingTime(readings, retortTemp) {
    const sorted = [...readings].sort((a,b)=>a.time-b.time);
    const above = sorted.filter(r => r.temp >= retortTemp - 1.0);
    if (above.length < 2) return 0;
    return Math.round((above[above.length-1].time - above[0].time) * 10) / 10;
  }

  function evaluateBatch(batch) {
    const readings = batch.tempReadings || [];
    const refTemp = batch.refTemp || 121.1;
    const z = batch.zValue || 10;
    const result = computeSeries(readings, refTemp, z);
    const actualHolding = estimateHoldingTime(readings, parseFloat(batch.retortTemp) || 0);
    const targetF0 = parseFloat(batch.targetF0) || 5;
    const reqHoldingTime = parseFloat(batch.holdingTime) || 0;
    const pressure = parseFloat(batch.pressure) || 0;
    const coolingTime = parseFloat(batch.coolingTime) || 0;

    const warnings = [];
    if (result.maxTemp < (parseFloat(batch.retortTemp) || 0) - 2) warnings.push({ level: 'danger', msg: `Low Temperature — max recorded ${result.maxTemp.toFixed(1)}°C is below target retort temperature ${batch.retortTemp}°C.` });
    if (actualHolding < reqHoldingTime - 1) warnings.push({ level: 'danger', msg: `Low Holding Time — actual ${actualHolding} min is below required ${reqHoldingTime} min.` });
    if (pressure > 3.5) warnings.push({ level: 'warning', msg: `High Pressure — recorded pressure ${pressure} bar exceeds safe operating range.` });
    if (coolingTime < 10) warnings.push({ level: 'warning', msg: `Cooling Error — cooling time ${coolingTime} min appears too short for safe de-pressurization.` });
    if (result.totalF0 < targetF0) warnings.push({ level: 'danger', msg: `F0 Shortfall — achieved F0 ${result.totalF0} is below target F0 ${targetF0}.` });

    const pass = result.totalF0 >= targetF0 && actualHolding >= reqHoldingTime - 1 && warnings.filter(w=>w.level==='danger').length === 0;

    return { ...result, actualHolding, targetF0, pass, warnings };
  }

  // ---------------- Standalone Calculator View ----------------
  let rows = []; // {time, temp}

  function render() {
    const settings = DB.getSettings();
    return `
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <div class="section-title mb-0"><i class="bi bi-calculator-fill"></i> F0 Lethality Calculator</div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-primary btn-sm" id="calcAddRow"><i class="bi bi-plus-lg me-1"></i>Add Reading</button>
        <button class="btn btn-primary btn-sm" id="calcCompute"><i class="bi bi-lightning-charge-fill me-1"></i>Compute F0</button>
        <button class="btn btn-outline-secondary btn-sm" id="calcReset"><i class="bi bi-arrow-counterclockwise me-1"></i>Reset</button>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-lg-5">
        <div class="card-surface p-3 mb-3">
          <div class="row g-2">
            <div class="col-6">
              <label class="form-label">Reference Temperature (°C)</label>
              <input type="number" step="0.1" class="form-control" id="calcRefTemp" value="${settings.refTemp || 121.1}">
            </div>
            <div class="col-6">
              <label class="form-label">z Value (°C)</label>
              <input type="number" step="0.1" class="form-control" id="calcZ" value="${settings.zValue || 10}">
            </div>
          </div>
        </div>
        <div class="card-surface p-3" style="max-height:420px;overflow:auto">
          <table class="table table-industrial table-sm">
            <thead><tr><th>Min</th><th>Temp °C</th><th>Lethal Rate</th><th>Cum. F0</th><th></th></tr></thead>
            <tbody id="calcRowsBody"></tbody>
          </table>
        </div>
      </div>
      <div class="col-lg-7">
        <div class="card-surface p-3 mb-3">
          <div class="section-title mb-2"><i class="bi bi-graph-up-arrow"></i> Lethality Curve</div>
          <canvas id="calcChart" height="200"></canvas>
        </div>
        <div class="row g-3">
          <div class="col-6 col-md-3">
            <div class="stat-card"><div class="stat-label">Total F0</div><div class="stat-value mono" id="calcF0Val">0.0</div></div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card"><div class="stat-label">Max Temp</div><div class="stat-value mono" id="calcMaxTemp">0.0</div></div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card"><div class="stat-label">Holding Time</div><div class="stat-value mono" id="calcHoldTime">0</div></div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card"><div class="stat-label">Result</div><div class="stat-value" id="calcResultVal">—</div></div>
          </div>
        </div>
        <div class="card-surface p-3 mt-3">
          <div class="section-title mb-2"><i class="bi bi-exclamation-triangle-fill"></i> Warnings</div>
          <div id="calcWarnings"><p class="text-muted small mb-0">Add temperature readings and click Compute F0 to evaluate the process.</p></div>
        </div>
      </div>
    </div>`;
  }

  function renderRows() {
    const body = document.getElementById('calcRowsBody');
    if (!body) return;
    body.innerHTML = rows.map((r, i) => `
      <tr>
        <td><input type="number" class="form-control form-control-sm mono" style="width:70px" value="${r.time}" onchange="Calc._setRow(${i},'time',this.value)"></td>
        <td><input type="number" step="0.1" class="form-control form-control-sm mono" style="width:80px" value="${r.temp}" onchange="Calc._setRow(${i},'temp',this.value)"></td>
        <td class="mono text-muted small">${r.lethalRate !== undefined ? r.lethalRate.toFixed(4) : '—'}</td>
        <td class="mono small">${r.cumF0 !== undefined ? r.cumF0.toFixed(2) : '—'}</td>
        <td><button class="btn btn-sm btn-outline-danger" onclick="Calc._removeRow(${i})"><i class="bi bi-trash"></i></button></td>
      </tr>`).join('') || `<tr><td colspan="5" class="text-center text-muted py-3">No readings yet. Click "Add Reading".</td></tr>`;
  }

  function addRow() {
    const lastTime = rows.length ? rows[rows.length - 1].time + 1 : 0;
    const lastTemp = rows.length ? rows[rows.length - 1].temp : 30;
    rows.push({ time: lastTime, temp: lastTemp });
    renderRows();
  }
  function setRow(i, field, val) { rows[i][field] = parseFloat(val) || 0; }
  function removeRow(i) { rows.splice(i, 1); renderRows(); }

  let chartInstance = null;
  function compute() {
    const refTemp = parseFloat(document.getElementById('calcRefTemp').value) || 121.1;
    const z = parseFloat(document.getElementById('calcZ').value) || 10;
    if (rows.length < 2) { App.toast('Add at least 2 temperature readings', 'danger'); return; }
    const result = computeSeries(rows, refTemp, z);
    rows = result.points;
    renderRows();

    document.getElementById('calcF0Val').textContent = result.totalF0.toFixed(2);
    document.getElementById('calcMaxTemp').textContent = result.maxTemp.toFixed(1);
    const holdTime = estimateHoldingTime(rows, refTemp - 1);
    document.getElementById('calcHoldTime').textContent = holdTime + ' min';

    const pass = result.totalF0 >= 5;
    const resEl = document.getElementById('calcResultVal');
    resEl.innerHTML = pass ? '<span class="badge-pass">PASS</span>' : '<span class="badge-fail">FAIL</span>';

    const warnBox = document.getElementById('calcWarnings');
    const warnings = [];
    if (result.maxTemp < refTemp - 5) warnings.push('Low Temperature — recorded maximum temperature is well below the reference temperature.');
    if (result.totalF0 < 5) warnings.push('F0 Shortfall — computed F0 is below the common minimum target of 5.0 for low-acid foods.');
    if (holdTime < 5) warnings.push('Low Holding Time — very short duration held near process temperature.');
    warnBox.innerHTML = warnings.length
      ? warnings.map(w => `<div class="alert-danger-line"><i class="bi bi-exclamation-octagon-fill"></i>${w}</div>`).join('')
      : `<div class="alert-warning-line" style="background:var(--green-bg);color:var(--green)"><i class="bi bi-check-circle-fill"></i>No warnings — process parameters look acceptable.</div>`;

    drawChart(rows);
  }

  function drawChart(points) {
    const ctx = document.getElementById('calcChart');
    if (!ctx) return;
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: points.map(p => p.time),
        datasets: [
          { label: 'Temperature (°C)', data: points.map(p => p.temp), borderColor: '#2377cc', backgroundColor: 'rgba(35,119,204,.08)', tension: .3, yAxisID: 'y' },
          { label: 'Cumulative F0', data: points.map(p => p.cumF0), borderColor: '#c9770b', backgroundColor: 'rgba(201,119,11,.08)', tension: .3, yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { position: 'left', title: { display: true, text: '°C' } },
          y1: { position: 'right', title: { display: true, text: 'F0' }, grid: { drawOnChartArea: false } }
        }
      }
    });
  }

  function init() {
    rows = [
      { time: 0, temp: 30 }, { time: 5, temp: 90 }, { time: 10, temp: 118 },
      { time: 15, temp: 121 }, { time: 20, temp: 121 }, { time: 25, temp: 122 },
      { time: 30, temp: 121 }, { time: 35, temp: 90 }, { time: 40, temp: 45 }
    ];
    renderRows();
    document.getElementById('calcAddRow').addEventListener('click', addRow);
    document.getElementById('calcCompute').addEventListener('click', compute);
    document.getElementById('calcReset').addEventListener('click', () => { rows = []; renderRows(); if(chartInstance){chartInstance.destroy();chartInstance=null;} document.getElementById('calcF0Val').textContent='0.0'; document.getElementById('calcResultVal').textContent='—'; });
    compute();
  }

  return { computeSeries, evaluateBatch, lethalRate, estimateHoldingTime, render, init, _setRow: setRow, _removeRow: removeRow };
})();
