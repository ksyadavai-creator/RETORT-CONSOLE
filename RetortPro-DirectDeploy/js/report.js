/* ==========================================================================
   report.js — Batch report generation: PDF (jsPDF+autotable), Excel (SheetJS), Print
   ========================================================================== */
const Report = (() => {

  function batchOptions() {
    const batches = DB.getBatches();
    return batches.map(b => `<option value="${b.id}">${b.batchNumber} — ${b.productName} (${new Date(b.createdAt).toLocaleDateString()})</option>`).join('') ||
      `<option value="">No batches saved yet</option>`;
  }

  function render() {
    return `
    <div class="section-title mb-3"><i class="bi bi-file-earmark-bar-graph-fill"></i> Reports</div>
    <div class="card-surface p-3 mb-3">
      <div class="row g-2 align-items-end">
        <div class="col-md-6">
          <label class="form-label">Select Batch</label>
          <select class="form-select" id="reportBatchSelect">${batchOptions()}</select>
        </div>
        <div class="col-md-6 d-flex gap-2 flex-wrap">
          <button class="btn btn-primary" id="btnGenPdf"><i class="bi bi-filetype-pdf me-1"></i>Generate PDF</button>
          <button class="btn btn-outline-primary" id="btnGenExcel"><i class="bi bi-filetype-xlsx me-1"></i>Generate Excel</button>
          <button class="btn btn-outline-secondary" id="btnPrint"><i class="bi bi-printer-fill me-1"></i>Print</button>
        </div>
      </div>
    </div>
    <div id="reportPreview" class="card-surface p-4"></div>`;
  }

  function previewHtml(batch) {
    if (!batch) return `<p class="text-muted text-center py-5">Select a batch to preview its report.</p>`;
    const settings = DB.getSettings();
    const ev = Calc.evaluateBatch(batch);
    return `
    <div id="printableReport">
      <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
        <div>
          <h5 class="mb-0 fw-bold">${settings.companyName}</h5>
          <small class="text-muted">Batch Process Report — RETORT PRO</small>
        </div>
        <div class="text-end">
          <div class="mono fw-bold">${batch.batchNumber}</div>
          <div>${ev.pass ? '<span class="badge-pass">PASS</span>' : (batch.status==='DRAFT'?'<span class="badge-run">DRAFT</span>':'<span class="badge-fail">FAIL</span>')}</div>
        </div>
      </div>
      <div class="row g-3 mb-3">
        <div class="col-md-3"><small class="text-muted d-block">Product</small><strong>${batch.productName}</strong></div>
        <div class="col-md-3"><small class="text-muted d-block">Packaging</small><strong>${batch.packaging}</strong></div>
        <div class="col-md-2"><small class="text-muted d-block">Operator</small><strong>${batch.operator}</strong></div>
        <div class="col-md-2"><small class="text-muted d-block">Machine</small><strong>${batch.machine}</strong></div>
        <div class="col-md-2"><small class="text-muted d-block">Date</small><strong>${new Date(batch.createdAt).toLocaleString()}</strong></div>
      </div>
      <div class="row g-3 mb-3">
        <div class="col-md-2"><small class="text-muted d-block">Retort Type</small>${batch.retortType}</div>
        <div class="col-md-2"><small class="text-muted d-block">Retort Temp</small>${batch.retortTemp} °C</div>
        <div class="col-md-2"><small class="text-muted d-block">Holding Time</small>${batch.holdingTime} min</div>
        <div class="col-md-2"><small class="text-muted d-block">Pressure</small>${batch.pressure} bar</div>
        <div class="col-md-2"><small class="text-muted d-block">Cooling Time</small>${batch.coolingTime} min</div>
        <div class="col-md-2"><small class="text-muted d-block">Target F0</small>${batch.targetF0}</div>
      </div>
      <div class="row g-3 mb-3 text-center">
        <div class="col-3"><div class="stat-card"><div class="stat-label">Achieved F0</div><div class="stat-value mono">${ev.totalF0.toFixed(2)}</div></div></div>
        <div class="col-3"><div class="stat-card"><div class="stat-label">Max Temp</div><div class="stat-value mono">${ev.maxTemp.toFixed(1)}</div></div></div>
        <div class="col-3"><div class="stat-card"><div class="stat-label">Actual Holding</div><div class="stat-value mono">${ev.actualHolding}</div></div></div>
        <div class="col-3"><div class="stat-card"><div class="stat-label">Result</div><div class="stat-value">${ev.pass?'PASS':'FAIL'}</div></div></div>
      </div>
      <h6 class="fw-bold">Temperature &amp; Pressure Table</h6>
      <div class="table-responsive mb-3" style="max-height:260px;overflow:auto">
        <table class="table table-industrial table-sm">
          <thead><tr><th>Min</th><th>Temp °C</th><th>Pressure bar</th><th>Cum. F0</th></tr></thead>
          <tbody>${ev.points.map((p,i)=>`<tr><td>${p.time}</td><td>${p.temp.toFixed(1)}</td><td>${(batch.tempReadings[i]&&batch.tempReadings[i].pressure)||0}</td><td>${p.cumF0.toFixed(2)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <h6 class="fw-bold">Warnings / Remarks</h6>
      ${ev.warnings.length ? ev.warnings.map(w=>`<div class="${w.level==='danger'?'alert-danger-line':'alert-warning-line'}">${w.msg}</div>`).join('') : '<p class="text-muted small">No warnings recorded — process within acceptable limits.</p>'}
      <hr>
      <div class="row text-center small text-muted mt-3">
        <div class="col-4">Prepared by: ${batch.operator}</div>
        <div class="col-4">QA Verified: ______________</div>
        <div class="col-4">Generated: ${new Date().toLocaleString()}</div>
      </div>
    </div>`;
  }

  function generatePdf(batch) {
    if (!batch) { App.toast('Select a batch first', 'danger'); return; }
    const settings = DB.getSettings();
    const ev = Calc.evaluateBatch(batch);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(16); doc.setFont(undefined,'bold');
    doc.text(settings.companyName, 40, 44);
    doc.setFontSize(10); doc.setFont(undefined,'normal');
    doc.text('Batch Process Report — RETORT PRO', 40, 60);
    doc.setFontSize(11);
    doc.text(`Batch No: ${batch.batchNumber}`, 400, 44);
    doc.text(`Status: ${ev.pass ? 'PASS' : (batch.status==='DRAFT'?'DRAFT':'FAIL')}`, 400, 60);

    doc.autoTable({
      startY: 78,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [19,80,143] },
      head: [['Product','Packaging','Operator','Machine','Retort Type','Date']],
      body: [[batch.productName, batch.packaging, batch.operator, batch.machine, batch.retortType, new Date(batch.createdAt).toLocaleString()]]
    });

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [19,80,143] },
      head: [['Retort Temp','Holding Time','Pressure','Cooling Time','Target F0','Achieved F0','Max Temp']],
      body: [[batch.retortTemp+' °C', batch.holdingTime+' min', batch.pressure+' bar', batch.coolingTime+' min', batch.targetF0, ev.totalF0.toFixed(2), ev.maxTemp.toFixed(1)+' °C']]
    });

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 14,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [35,119,204] },
      head: [['Min','Temp °C','Pressure bar','Cumulative F0']],
      body: ev.points.map((p,i)=>[p.time, p.temp.toFixed(1), (batch.tempReadings[i]&&batch.tempReadings[i].pressure)||0, p.cumF0.toFixed(2)])
    });

    let y = doc.lastAutoTable.finalY + 16;
    doc.setFont(undefined,'bold'); doc.text('Warnings / Remarks:', 40, y); y += 14;
    doc.setFont(undefined,'normal'); doc.setFontSize(9);
    if (ev.warnings.length) {
      ev.warnings.forEach(w => { doc.text('- ' + w.msg, 40, y, { maxWidth: 500 }); y += 14; });
    } else {
      doc.text('No warnings recorded — process within acceptable limits.', 40, y); y += 14;
    }
    y += 20;
    doc.text(`Prepared by: ${batch.operator}`, 40, y);
    doc.text('QA Verified: ______________', 220, y);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 400, y);

    doc.save(`${batch.batchNumber}_Report.pdf`);
    App.toast('PDF report generated', 'success');
  }

  function generateExcel(batch) {
    if (!batch) { App.toast('Select a batch first', 'danger'); return; }
    const ev = Calc.evaluateBatch(batch);
    const settings = DB.getSettings();
    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['RETORT PRO — Batch Report'],
      ['Company', settings.companyName],
      [],
      ['Batch Number', batch.batchNumber],
      ['Product', batch.productName],
      ['Packaging', batch.packaging],
      ['Operator', batch.operator],
      ['Machine', batch.machine],
      ['Retort Type', batch.retortType],
      ['Date', new Date(batch.createdAt).toLocaleString()],
      [],
      ['Retort Temp (°C)', batch.retortTemp],
      ['Holding Time (min)', batch.holdingTime],
      ['Pressure (bar)', batch.pressure],
      ['Cooling Time (min)', batch.coolingTime],
      ['Target F0', batch.targetF0],
      ['Achieved F0', ev.totalF0],
      ['Max Temp (°C)', ev.maxTemp],
      ['Actual Holding (min)', ev.actualHolding],
      ['Result', ev.pass ? 'PASS' : (batch.status==='DRAFT'?'DRAFT':'FAIL')],
      [],
      ['Warnings', ev.warnings.map(w=>w.msg).join(' | ') || 'None']
    ]);
    const dataSheet = XLSX.utils.json_to_sheet(ev.points.map((p,i)=>({
      Minute: p.time, 'Temp (°C)': p.temp, 'Pressure (bar)': (batch.tempReadings[i]&&batch.tempReadings[i].pressure)||0, 'Lethal Rate': p.lethalRate, 'Cumulative F0': p.cumF0
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(wb, dataSheet, 'Temperature Log');
    XLSX.writeFile(wb, `${batch.batchNumber}_Report.xlsx`);
    App.toast('Excel report generated', 'success');
  }

  function printReport(batch) {
    if (!batch) { App.toast('Select a batch first', 'danger'); return; }
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>${batch.batchNumber} Report</title>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/5.3.3/css/bootstrap.min.css" rel="stylesheet">
      <style>body{padding:30px;font-family:Inter,sans-serif} .badge-pass{background:#e4f7ef;color:#12805c;padding:4px 10px;border-radius:20px;font-weight:700} .badge-fail{background:#fdeaea;color:#c23b3b;padding:4px 10px;border-radius:20px;font-weight:700} .badge-run{background:#fff4e2;color:#c9770b;padding:4px 10px;border-radius:20px;font-weight:700} .alert-danger-line,.alert-warning-line{padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:13px}.alert-danger-line{background:#fdeaea}.alert-warning-line{background:#fff4e2} .stat-card{border:1px solid #eee;border-radius:8px;padding:10px} .table{width:100%;border-collapse:collapse} .table th,.table td{border:1px solid #ddd;padding:4px 8px;font-size:12px}</style>
      </head><body>${previewHtml(batch)}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  function init() {
    const sel = document.getElementById('reportBatchSelect');
    const preview = document.getElementById('reportPreview');
    function refresh() { preview.innerHTML = previewHtml(DB.getBatch(sel.value)); }
    refresh();
    sel.addEventListener('change', refresh);
    document.getElementById('btnGenPdf').addEventListener('click', () => generatePdf(DB.getBatch(sel.value)));
    document.getElementById('btnGenExcel').addEventListener('click', () => generateExcel(DB.getBatch(sel.value)));
    document.getElementById('btnPrint').addEventListener('click', () => printReport(DB.getBatch(sel.value)));
  }

  return { render, init, previewHtml, generatePdf, generateExcel, printReport };
})();
