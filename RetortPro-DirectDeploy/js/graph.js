/* ==========================================================================
   graph.js — Standalone Graphs view: Temperature / Pressure / F0 vs Time
   across any saved batch, interactive via Chart.js
   ========================================================================== */
const GraphView = (() => {
  let chart = null;

  function batchOptions() {
    const batches = DB.getBatches().filter(b => (b.tempReadings||[]).length > 1);
    return batches.map(b => `<option value="${b.id}">${b.batchNumber} — ${b.productName}</option>`).join('') ||
      `<option value="">No batches with readings yet</option>`;
  }

  function render() {
    return `
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <div class="section-title mb-0"><i class="bi bi-graph-up"></i> Temperature / Pressure / F0 Graphs</div>
      <div class="d-flex gap-2 align-items-center">
        <select class="form-select form-select-sm" id="graphBatchSelect" style="min-width:260px">${batchOptions()}</select>
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-primary active" data-metric="temp">Temp</button>
          <button class="btn btn-outline-primary" data-metric="pressure">Pressure</button>
          <button class="btn btn-outline-primary" data-metric="f0">F0</button>
          <button class="btn btn-outline-primary" data-metric="all">All</button>
        </div>
      </div>
    </div>
    <div class="card-surface p-3">
      <canvas id="mainGraphCanvas" height="110"></canvas>
    </div>
    <div class="row g-3 mt-1" id="graphStats"></div>`;
  }

  function draw(batchId, metric) {
    const batch = DB.getBatch(batchId);
    const canvas = document.getElementById('mainGraphCanvas');
    const statsBox = document.getElementById('graphStats');
    if (!batch) { statsBox.innerHTML = ''; if (chart) chart.destroy(); return; }
    const evalResult = Calc.evaluateBatch(batch);
    const points = evalResult.points;

    const datasets = [];
    if (metric === 'temp' || metric === 'all') datasets.push({ label:'Temperature (°C)', data: points.map(p=>p.temp), borderColor:'#2377cc', backgroundColor:'rgba(35,119,204,.08)', tension:.3, yAxisID:'y' });
    if (metric === 'pressure' || metric === 'all') {
      const pByTime = {}; (batch.tempReadings||[]).forEach(r => pByTime[r.time] = r.pressure || 0);
      datasets.push({ label:'Pressure (bar)', data: points.map(p=>pByTime[p.time]||0), borderColor:'#c9770b', backgroundColor:'rgba(201,119,11,.08)', tension:.3, yAxisID: metric==='all'?'y2':'y' });
    }
    if (metric === 'f0' || metric === 'all') datasets.push({ label:'Cumulative F0', data: points.map(p=>p.cumF0), borderColor:'#12805c', backgroundColor:'rgba(18,128,92,.08)', tension:.3, yAxisID: metric==='all'?'y1':'y' });

    if (chart) chart.destroy();
    chart = new Chart(canvas, {
      type: 'line',
      data: { labels: points.map(p=>p.time), datasets },
      options: {
        responsive: true,
        interaction: { mode:'index', intersect:false },
        scales: metric === 'all' ? {
          y: { position:'left', title:{display:true,text:'°C'} },
          y1:{ position:'right', title:{display:true,text:'F0'}, grid:{drawOnChartArea:false} },
          y2:{ position:'right', title:{display:true,text:'bar'}, grid:{drawOnChartArea:false}, offset:true }
        } : { y: { title:{display:true,text: metric==='pressure'?'bar':(metric==='f0'?'F0':'°C')} } }
      }
    });

    statsBox.innerHTML = `
      <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-label">Total F0</div><div class="stat-value mono">${evalResult.totalF0.toFixed(2)}</div></div></div>
      <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-label">Max Temp</div><div class="stat-value mono">${evalResult.maxTemp.toFixed(1)}</div></div></div>
      <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-label">Holding Time</div><div class="stat-value mono">${evalResult.actualHolding}</div></div></div>
      <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-label">Result</div><div class="stat-value">${evalResult.pass?'<span class="badge-pass">PASS</span>':'<span class="badge-fail">FAIL</span>'}</div></div></div>`;
  }

  function init() {
    const sel = document.getElementById('graphBatchSelect');
    let metric = 'temp';
    if (sel.value) draw(sel.value, metric);
    sel.addEventListener('change', () => draw(sel.value, metric));
    document.querySelectorAll('[data-metric]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-metric]').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        metric = btn.dataset.metric;
        draw(sel.value, metric);
      });
    });
  }

  return { render, init };
})();
