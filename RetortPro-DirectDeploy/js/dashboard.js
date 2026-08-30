/* ==========================================================================
   dashboard.js — Dashboard view: KPI cards, machine status, recent batches
   ========================================================================== */
const Dashboard = (() => {
  function todayStr() { return new Date().toDateString(); }

  function stats() {
    const batches = DB.getBatches();
    const today = batches.filter(b => new Date(b.createdAt).toDateString() === todayStr());
    const pass = today.filter(b => b.status === 'PASS').length;
    const fail = today.filter(b => b.status === 'FAIL').length;
    const f0s = today.filter(b => typeof b.totalF0 === 'number').map(b => b.totalF0);
    const avgF0 = f0s.length ? (f0s.reduce((a,b)=>a+b,0)/f0s.length) : 0;
    return { totalToday: today.length, pass, fail, avgF0, batches };
  }

  function machineStatus() {
    const batches = DB.getBatches();
    const machines = ['RT-01','RT-02','RT-03','RT-04'];
    return machines.map(m => {
      const running = batches.find(b => b.machine === m && b.status === 'DRAFT');
      const last = batches.find(b => b.machine === m);
      return { machine: m, status: running ? 'RUNNING' : 'IDLE', last };
    });
  }

  function render() {
    const s = stats();
    const recent = s.batches.slice(0, 8);
    const machines = machineStatus();
    const settings = DB.getSettings();
    const stockSummary = (typeof Stock !== 'undefined') ? Stock.summary() : { lowCount: 0, low: [] };
    const user = DB.getCurrentUser();
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    return `
    <div class="hero-banner mb-4">
      <div class="hero-content">
        <div class="hero-eyebrow"><i class="bi bi-broadcast"></i> LIVE OPERATIONS</div>
        <h2>${greeting}, ${user ? user.name : 'Operator'}</h2>
        <p>${settings.companyName} &middot; ${new Date().toLocaleDateString('en-IN',{weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p>
        <div class="d-flex gap-2 flex-wrap mt-3">
          <a href="#" class="btn btn-light btn-sm fw-bold quick-btn-hero" data-view="batch"><i class="bi bi-play-fill me-1"></i>Start New Batch</a>
          <a href="#" class="btn btn-outline-light btn-sm fw-bold quick-btn-hero" data-view="reports"><i class="bi bi-file-earmark-bar-graph-fill me-1"></i>View Reports</a>
        </div>
      </div>
      <div class="hero-retort-icon">
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 14 V10.5 a4.5 4.5 0 0 1 4.5-4.5 h9 a4.5 4.5 0 0 1 4.5 4.5 V14" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          <rect x="9" y="14" width="30" height="24" rx="5" fill="#fff" fill-opacity=".14"/>
          <circle cx="24" cy="21" r="6" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.6"/>
        </svg>
      </div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-6 col-md-4 col-xl-2">
        <div class="stat-card"><div class="stat-icon"><i class="bi bi-collection-fill"></i></div><div class="stat-label">Today's Batch</div><div class="stat-value">${s.totalToday}</div></div>
      </div>
      <div class="col-6 col-md-4 col-xl-2">
        <div class="stat-card"><div class="stat-icon"><i class="bi bi-boxes"></i></div><div class="stat-label">Total Production</div><div class="stat-value">${s.batches.length}</div></div>
      </div>
      <div class="col-6 col-md-4 col-xl-2">
        <div class="stat-card accent-green"><div class="stat-icon"><i class="bi bi-check-circle-fill"></i></div><div class="stat-label">Today's PASS</div><div class="stat-value">${s.pass}</div></div>
      </div>
      <div class="col-6 col-md-4 col-xl-2">
        <div class="stat-card accent-red"><div class="stat-icon"><i class="bi bi-x-circle-fill"></i></div><div class="stat-label">Today's FAIL</div><div class="stat-value">${s.fail}</div></div>
      </div>
      <div class="col-6 col-md-4 col-xl-2">
        <div class="stat-card accent-amber"><div class="stat-icon"><i class="bi bi-thermometer-sun"></i></div><div class="stat-label">Average F0</div><div class="stat-value">${s.avgF0.toFixed(1)}</div></div>
      </div>
      <div class="col-6 col-md-4 col-xl-2">
        <div class="stat-card ${stockSummary.lowCount ? 'accent-red' : ''}"><div class="stat-icon"><i class="bi bi-boxes"></i></div><div class="stat-label">Low Stock Items</div><div class="stat-value">${stockSummary.lowCount}</div></div>
      </div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-lg-5">
        <div class="card-surface p-3 h-100">
          <div class="section-title"><i class="bi bi-pie-chart-fill"></i> Today's Result Split</div>
          <canvas id="dashPassFailChart" height="200"></canvas>
        </div>
      </div>
      <div class="col-lg-7">
        <div class="card-surface p-3 h-100">
          <div class="section-title"><i class="bi bi-hdd-rack-fill"></i> Machine Status</div>
          <div class="row g-2">
            ${machines.map(m => `
              <div class="col-6">
                <div class="machine-tile ${m.status==='RUNNING'?'running':''}">
                  <div class="d-flex align-items-center justify-content-between">
                    <strong><i class="bi bi-gear-fill me-2"></i>${m.machine}</strong>
                    <span class="${m.status==='RUNNING'?'badge-run':'chip'}">${m.status}</span>
                  </div>
                </div>
              </div>`).join('')}
          </div>
          ${stockSummary.lowCount ? `
          <hr>
          <div class="section-title mb-2"><i class="bi bi-exclamation-triangle-fill"></i> Restock Needed</div>
          ${stockSummary.low.slice(0,4).map(i => `<div class="alert-danger-line py-1"><i class="bi bi-box-seam"></i>${i.name} — ${i.currentStock} ${i.unit} left</div>`).join('')}
          ` : ''}
        </div>
      </div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-12">
        <div class="card-surface p-3">
          <div class="section-title"><i class="bi bi-clock-history"></i> Recent Batches</div>
          <div class="table-responsive">
          <table class="table table-industrial table-hover">
            <thead><tr><th>Batch #</th><th>Product</th><th>Machine</th><th>F0</th><th>Status</th><th>Date</th><th></th></tr></thead>
            <tbody>
              ${recent.length ? recent.map(b => `
                <tr>
                  <td class="mono">${b.batchNumber}</td>
                  <td>${b.productName}</td>
                  <td>${b.machine}</td>
                  <td class="mono">${(b.totalF0||0).toFixed(1)}</td>
                  <td>${b.status==='PASS'?'<span class="badge-pass">PASS</span>':b.status==='FAIL'?'<span class="badge-fail">FAIL</span>':'<span class="badge-run">DRAFT</span>'}</td>
                  <td class="small text-muted">${new Date(b.createdAt).toLocaleDateString()}</td>
                  <td><button class="btn btn-sm btn-outline-primary" onclick="App.viewBatchReport('${b.id}')"><i class="bi bi-eye"></i></button></td>
                </tr>`).join('') : `<tr><td colspan="7" class="text-center text-muted py-4">No batches yet — start your first batch.</td></tr>`}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>

    <div class="card-surface p-3">
      <div class="section-title"><i class="bi bi-lightning-charge-fill"></i> Quick Actions</div>
      <div class="row g-3">
        <div class="col-6 col-md-2"><a href="#" class="quick-btn" data-view="batch"><i class="bi bi-plus-square-fill"></i><span>New Batch</span></a></div>
        <div class="col-6 col-md-2"><a href="#" class="quick-btn" data-view="calculator"><i class="bi bi-calculator-fill"></i><span>Calculator</span></a></div>
        <div class="col-6 col-md-2"><a href="#" class="quick-btn" data-view="products"><i class="bi bi-box-seam-fill"></i><span>Products</span></a></div>
        <div class="col-6 col-md-2"><a href="#" class="quick-btn" data-view="stock"><i class="bi bi-boxes"></i><span>Stock</span></a></div>
        <div class="col-6 col-md-2"><a href="#" class="quick-btn" data-view="guide"><i class="bi bi-journal-text"></i><span>Guide</span></a></div>
        <div class="col-6 col-md-2"><a href="#" class="quick-btn" data-view="reports"><i class="bi bi-file-earmark-bar-graph-fill"></i><span>Reports</span></a></div>
      </div>
    </div>`;
  }

  let chartInstance = null;
  function drawChart() {
    const s = stats();
    const ctx = document.getElementById('dashPassFailChart');
    if (!ctx) return;
    if (chartInstance) chartInstance.destroy();
    const drafts = s.totalToday - s.pass - s.fail;
    chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pass', 'Fail', 'In Progress / Draft'],
        datasets: [{ data: [s.pass, s.fail, Math.max(0,drafts)], backgroundColor: ['#12805c', '#c23b3b', '#c9770b'], borderWidth: 0 }]
      },
      options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } }, cutout: '65%' }
    });
  }

  function init() {
    document.querySelectorAll('#content .quick-btn[data-view], #content .quick-btn-hero[data-view]').forEach(el => {
      el.addEventListener('click', (e) => { e.preventDefault(); App.navigate(el.dataset.view); });
    });
    drawChart();
  }

  return { render, init };
})();
