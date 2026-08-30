/* ==========================================================================
   batch.js — New Batch screen: form, live batch timer, temperature logging,
   start/save/clear, auto batch numbering.
   ========================================================================== */
const BatchView = (() => {
  const PACKAGING_TYPES = ['Can','Vacuum Pouch','Ready To Eat Pouch','Glass Bottle','Cup Tray','PP Bowl','PET Jar','Aluminium Tray','Aluminium Pouch','Retortable Tray'];
  const RETORT_TYPES = ['Steam','Steam Air','Water Spray','Water Cascade','Water Immersion','Rotary Retort'];

  let rows = [];
  let consumptionRows = [];
  let timerInterval = null;
  let timerSeconds = 0;
  let batchRunning = false;
  let editingId = null;

  function productOptions() {
    const names = [...new Set(Products.all().map(p => p.name))].sort();
    return names.map(n => `<option value="${n}">`).join('');
  }

  function render(batchToEdit) {
    editingId = batchToEdit ? batchToEdit.id : null;
    const user = DB.getCurrentUser();
    const autoNum = batchToEdit ? batchToEdit.batchNumber : DB.nextBatchNumber();
    const b = batchToEdit || {};
    return `
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <div class="section-title mb-0"><i class="bi bi-plus-square-fill"></i> ${editingId ? 'Edit Batch' : 'New Batch'}</div>
      <div class="d-flex align-items-center gap-3">
        <div class="chip"><i class="bi bi-stopwatch"></i> <span id="batchTimerDisplay">00:00:00</span></div>
        <span id="batchStatusBadge" class="badge-run">NOT STARTED</span>
      </div>
    </div>

    <form id="batchForm">
    <div class="row g-3">
      <div class="col-lg-8">
        <div class="card-surface p-3 mb-3">
          <div class="section-title"><i class="bi bi-card-list"></i> Batch Details</div>
          <div class="row g-3">
            <div class="col-md-4"><label class="form-label">Batch Number</label><input type="text" class="form-control mono" id="f_batchNumber" value="${autoNum}" readonly></div>
            <div class="col-md-4">
              <label class="form-label">Product Name</label>
              <input type="text" class="form-control" id="f_productName" list="productList" value="${b.productName||''}" placeholder="Start typing..." required>
              <datalist id="productList">${productOptions()}</datalist>
            </div>
            <div class="col-md-4">
              <label class="form-label">Packaging Type</label>
              <select class="form-select" id="f_packaging" required>${PACKAGING_TYPES.map(p=>`<option ${b.packaging===p?'selected':''}>${p}</option>`).join('')}</select>
            </div>
            <div class="col-md-4"><label class="form-label">Operator Name</label><input type="text" class="form-control" id="f_operator" value="${b.operator || (user?user.name:'')}" required></div>
            <div class="col-md-4"><label class="form-label">Machine Number</label><input type="text" class="form-control" id="f_machine" value="${b.machine||''}" placeholder="e.g. RT-03" required></div>
            <div class="col-md-4">
              <label class="form-label">Retort Type</label>
              <select class="form-select" id="f_retortType" required>${RETORT_TYPES.map(r=>`<option ${b.retortType===r?'selected':''}>${r}</option>`).join('')}</select>
            </div>
          </div>
        </div>

        <div class="card-surface p-3 mb-3">
          <div class="section-title"><i class="bi bi-thermometer-half"></i> Process Parameters</div>
          <div class="row g-3">
            <div class="col-md-3"><label class="form-label">Initial Product Temp (°C)</label><input type="number" step="0.1" class="form-control" id="f_initTemp" value="${b.initTemp??20}" required></div>
            <div class="col-md-3"><label class="form-label">Retort Temp (°C)</label><input type="number" step="0.1" class="form-control" id="f_retortTemp" value="${b.retortTemp??121.1}" required></div>
            <div class="col-md-3"><label class="form-label">Come-up Time (min)</label><input type="number" class="form-control" id="f_comeUpTime" value="${b.comeUpTime??10}" required></div>
            <div class="col-md-3"><label class="form-label">Holding Time (min)</label><input type="number" class="form-control" id="f_holdingTime" value="${b.holdingTime??20}" required></div>
            <div class="col-md-3"><label class="form-label">Pressure (bar)</label><input type="number" step="0.01" class="form-control" id="f_pressure" value="${b.pressure??1.8}" required></div>
            <div class="col-md-3"><label class="form-label">Cooling Time (min)</label><input type="number" class="form-control" id="f_coolingTime" value="${b.coolingTime??20}" required></div>
            <div class="col-md-3"><label class="form-label">Cooling Pressure (bar)</label><input type="number" step="0.01" class="form-control" id="f_coolingPressure" value="${b.coolingPressure??1.2}" required></div>
            <div class="col-md-3"><label class="form-label">Vent Open Time (min)</label><input type="number" class="form-control" id="f_ventTime" value="${b.ventTime??3}" required></div>
            <div class="col-md-3"><label class="form-label">Steam %</label><input type="number" class="form-control" id="f_steamPct" value="${b.steamPct??100}" required></div>
            <div class="col-md-3"><label class="form-label">Air %</label><input type="number" class="form-control" id="f_airPct" value="${b.airPct??0}" required></div>
            <div class="col-md-3"><label class="form-label">Target F0</label><input type="number" step="0.1" class="form-control" id="f_targetF0" value="${b.targetF0??5}" required></div>
            <div class="col-md-3"><label class="form-label">z Value</label><input type="number" step="0.1" class="form-control" id="f_zValue" value="${b.zValue??10}" required></div>
            <div class="col-md-3"><label class="form-label">Quantity Produced (pcs)</label><input type="number" class="form-control" id="f_qtyProduced" value="${b.qtyProduced??''}" placeholder="e.g. 1200"></div>
          </div>
        </div>

        <div class="card-surface p-3 mb-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="section-title mb-0"><i class="bi bi-box-seam"></i> Raw Material / Packaging Consumed</div>
            <button type="button" class="btn btn-sm btn-outline-primary" id="batchAddConsumption"><i class="bi bi-plus-lg me-1"></i>Add Material</button>
          </div>
          <div class="table-responsive">
          <table class="table table-industrial table-sm mb-0">
            <thead><tr><th>Stock Item</th><th>Qty Consumed</th><th></th></tr></thead>
            <tbody id="consumptionBody"></tbody>
          </table>
          </div>
          <p class="text-muted small mb-0 mt-2">On save, these quantities are deducted from Stock (Outward) and, if a quantity produced is entered above, finished goods are added to Stock (Inward) automatically — both logged against this batch number in the Stock Ledger.</p>
        </div>

        <div class="card-surface p-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="section-title mb-0"><i class="bi bi-graph-up"></i> Temperature Log (per minute)</div>
            <button type="button" class="btn btn-sm btn-outline-primary" id="batchAddReading"><i class="bi bi-plus-lg me-1"></i>Add Reading</button>
          </div>
          <div style="max-height:260px;overflow:auto">
          <table class="table table-industrial table-sm mb-0">
            <thead><tr><th>Min</th><th>Temp °C</th><th>Pressure bar</th><th></th></tr></thead>
            <tbody id="batchReadingsBody"></tbody>
          </table>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card-surface p-3 mb-3">
          <div class="section-title"><i class="bi bi-speedometer2"></i> Live Evaluation</div>
          <div class="row g-2 text-center">
            <div class="col-6"><div class="stat-card p-2"><div class="stat-label">F0</div><div class="stat-value mono" id="liveF0" style="font-size:20px">0.0</div></div></div>
            <div class="col-6"><div class="stat-card p-2"><div class="stat-label">Max Temp</div><div class="stat-value mono" id="liveMaxTemp" style="font-size:20px">0.0</div></div></div>
          </div>
          <div id="liveResult" class="text-center mt-3"><span class="badge-run">PENDING</span></div>
          <div id="liveWarnings" class="mt-3"></div>
        </div>
        <div class="card-surface p-3 d-grid gap-2">
          <button type="button" class="btn btn-primary" id="btnStartBatch"><i class="bi bi-play-fill me-1"></i>Start Batch</button>
          <button type="submit" class="btn btn-outline-primary" id="btnSaveBatch"><i class="bi bi-save-fill me-1"></i>Save Batch</button>
          <button type="button" class="btn btn-outline-secondary" id="btnClearForm"><i class="bi bi-x-circle me-1"></i>Clear Form</button>
        </div>
      </div>
    </div>
    </form>`;
  }

  function renderRows() {
    const body = document.getElementById('batchReadingsBody');
    if (!body) return;
    body.innerHTML = rows.map((r,i)=>`
      <tr>
        <td><input type="number" class="form-control form-control-sm mono" style="width:70px" value="${r.time}" onchange="BatchView._set(${i},'time',this.value)"></td>
        <td><input type="number" step="0.1" class="form-control form-control-sm mono" style="width:80px" value="${r.temp}" onchange="BatchView._set(${i},'temp',this.value)"></td>
        <td><input type="number" step="0.01" class="form-control form-control-sm mono" style="width:80px" value="${r.pressure||0}" onchange="BatchView._set(${i},'pressure',this.value)"></td>
        <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="BatchView._remove(${i})"><i class="bi bi-trash"></i></button></td>
      </tr>`).join('') || `<tr><td colspan="4" class="text-center text-muted py-3">No temperature readings logged yet.</td></tr>`;
    liveEval();
  }
  function setRow(i,f,v){ rows[i][f] = parseFloat(v)||0; liveEval(); }
  function removeRow(i){ rows.splice(i,1); renderRows(); }
  function addReading() {
    const last = rows.length ? rows[rows.length-1] : null;
    rows.push({ time: last ? last.time+1 : 0, temp: last ? last.temp : parseFloat(document.getElementById('f_initTemp').value)||20, pressure: last ? last.pressure : 0 });
    renderRows();
  }

  function stockItemOptions(selectedId) {
    const items = DB.getStockItems();
    return items.map(i => `<option value="${i.id}" ${i.id===selectedId?'selected':''}>${i.name} (${i.currentStock} ${i.unit} in stock)</option>`).join('')
      || `<option value="">No stock items — add some in Stock Management first</option>`;
  }
  function renderConsumptionRows() {
    const body = document.getElementById('consumptionBody');
    if (!body) return;
    body.innerHTML = consumptionRows.map((r,i) => `
      <tr>
        <td><select class="form-select form-select-sm" onchange="BatchView._setConsumption(${i},'itemId',this.value)">${stockItemOptions(r.itemId)}</select></td>
        <td><input type="number" step="0.01" class="form-control form-control-sm mono" style="width:100px" value="${r.qty||''}" onchange="BatchView._setConsumption(${i},'qty',this.value)"></td>
        <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="BatchView._removeConsumption(${i})"><i class="bi bi-trash"></i></button></td>
      </tr>`).join('') || `<tr><td colspan="3" class="text-center text-muted py-3">No materials linked to this batch yet.</td></tr>`;
  }
  function addConsumption() {
    const firstItem = DB.getStockItems()[0];
    if (!firstItem) { App.toast('Add a stock item in Stock Management first', 'danger'); return; }
    consumptionRows.push({ itemId: firstItem.id, qty: '' });
    renderConsumptionRows();
  }
  function setConsumption(i, field, val) { consumptionRows[i][field] = field === 'qty' ? val : val; renderConsumptionRows(); }
  function removeConsumption(i) { consumptionRows.splice(i,1); renderConsumptionRows(); }

  function liveEval() {
    const retortTemp = parseFloat(document.getElementById('f_retortTemp')?.value) || 121.1;
    const targetF0 = parseFloat(document.getElementById('f_targetF0')?.value) || 5;
    const zValue = parseFloat(document.getElementById('f_zValue')?.value) || 10;
    const holdingTime = parseFloat(document.getElementById('f_holdingTime')?.value) || 0;
    const pressureMax = Math.max(0,...rows.map(r=>r.pressure||0));
    const coolingTime = parseFloat(document.getElementById('f_coolingTime')?.value) || 0;

    const evalResult = Calc.evaluateBatch({ tempReadings: rows, refTemp: 121.1, zValue, retortTemp, targetF0, holdingTime, pressure: pressureMax, coolingTime });
    document.getElementById('liveF0').textContent = evalResult.totalF0.toFixed(2);
    document.getElementById('liveMaxTemp').textContent = evalResult.maxTemp.toFixed(1);
    document.getElementById('liveResult').innerHTML = rows.length < 2 ? '<span class="badge-run">PENDING</span>' : (evalResult.pass ? '<span class="badge-pass">PASS</span>' : '<span class="badge-fail">FAIL</span>');
    const wbox = document.getElementById('liveWarnings');
    wbox.innerHTML = evalResult.warnings.length
      ? evalResult.warnings.map(w=>`<div class="${w.level==='danger'?'alert-danger-line':'alert-warning-line'}"><i class="bi bi-exclamation-triangle-fill"></i>${w.msg}</div>`).join('')
      : (rows.length>=2 ? `<div class="alert-warning-line" style="background:var(--green-bg);color:var(--green)"><i class="bi bi-check-circle-fill"></i>No warnings.</div>` : '');
    return evalResult;
  }

  function formatTimer(sec) {
    const h = String(Math.floor(sec/3600)).padStart(2,'0');
    const m = String(Math.floor((sec%3600)/60)).padStart(2,'0');
    const s = String(sec%60).padStart(2,'0');
    return `${h}:${m}:${s}`;
  }

  function startBatch() {
    if (batchRunning) { App.toast('Batch already running', 'warning'); return; }
    batchRunning = true;
    timerSeconds = 0;
    document.getElementById('batchStatusBadge').outerHTML = '<span class="badge-run" id="batchStatusBadge"><i class="bi bi-record-circle-fill"></i> RUNNING</span>';
    timerInterval = setInterval(() => {
      timerSeconds++;
      document.getElementById('batchTimerDisplay').textContent = formatTimer(timerSeconds);
    }, 1000);
    App.toast('Batch started — timer running', 'success');
  }
  function stopBatch() {
    batchRunning = false;
    clearInterval(timerInterval);
  }

  function saveBatch(e) {
    e.preventDefault();
    const form = {
      batchNumber: document.getElementById('f_batchNumber').value,
      productName: document.getElementById('f_productName').value,
      packaging: document.getElementById('f_packaging').value,
      operator: document.getElementById('f_operator').value,
      machine: document.getElementById('f_machine').value,
      retortType: document.getElementById('f_retortType').value,
      initTemp: parseFloat(document.getElementById('f_initTemp').value),
      retortTemp: parseFloat(document.getElementById('f_retortTemp').value),
      comeUpTime: parseFloat(document.getElementById('f_comeUpTime').value),
      holdingTime: parseFloat(document.getElementById('f_holdingTime').value),
      pressure: parseFloat(document.getElementById('f_pressure').value),
      coolingTime: parseFloat(document.getElementById('f_coolingTime').value),
      coolingPressure: parseFloat(document.getElementById('f_coolingPressure').value),
      ventTime: parseFloat(document.getElementById('f_ventTime').value),
      steamPct: parseFloat(document.getElementById('f_steamPct').value),
      airPct: parseFloat(document.getElementById('f_airPct').value),
      targetF0: parseFloat(document.getElementById('f_targetF0').value),
      zValue: parseFloat(document.getElementById('f_zValue').value),
      refTemp: 121.1,
      qtyProduced: parseFloat(document.getElementById('f_qtyProduced').value) || 0,
      tempReadings: rows,
      elapsedSeconds: timerSeconds
    };
    const evalResult = Calc.evaluateBatch(form);
    form.totalF0 = evalResult.totalF0;
    form.maxTemp = evalResult.maxTemp;
    form.status = rows.length >= 2 ? (evalResult.pass ? 'PASS' : 'FAIL') : 'DRAFT';
    form.warnings = evalResult.warnings;

    let savedBatch;
    if (editingId) {
      savedBatch = DB.updateBatch(editingId, form);
      App.toast('Batch updated successfully', 'success');
    } else {
      savedBatch = DB.addBatch(form);
      App.toast('Batch saved successfully', 'success');
    }

    // Only move stock once per batch (skip re-deducting on every edit-save of an already-processed batch)
    if (!editingId || !DB.getBatch(savedBatch.id).stockProcessed) {
      const validConsumption = consumptionRows.filter(r => r.itemId && parseFloat(r.qty) > 0);
      if (validConsumption.length || savedBatch.qtyProduced > 0) {
        Stock.recordProductionMovement(savedBatch, validConsumption);
      }
      DB.updateBatch(savedBatch.id, { stockProcessed: true });
    }

    stopBatch();
    App.navigate('history');
  }

  function clearForm() {
    stopBatch();
    App.navigate('batch');
  }

  function init(batchToEdit) {
    rows = batchToEdit ? (batchToEdit.tempReadings || []) : [];
    consumptionRows = [];
    timerSeconds = batchToEdit ? (batchToEdit.elapsedSeconds || 0) : 0;
    batchRunning = false;
    renderRows();
    renderConsumptionRows();
    document.getElementById('batchTimerDisplay').textContent = formatTimer(timerSeconds);
    document.getElementById('batchAddReading').addEventListener('click', addReading);
    document.getElementById('batchAddConsumption').addEventListener('click', addConsumption);
    document.getElementById('btnStartBatch').addEventListener('click', startBatch);
    document.getElementById('btnClearForm').addEventListener('click', clearForm);
    document.getElementById('batchForm').addEventListener('submit', saveBatch);
    ['f_retortTemp','f_targetF0','f_zValue','f_holdingTime','f_coolingTime'].forEach(id => {
      document.getElementById(id).addEventListener('input', liveEval);
    });
  }

  return { render, init, _set: setRow, _remove: removeRow, _setConsumption: setConsumption, _removeConsumption: removeConsumption, PACKAGING_TYPES, RETORT_TYPES };
})();
