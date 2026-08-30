/* ==========================================================================
   app.js — Application shell: auth/login, routing, theme, clock, toasts,
   plus History / Alarms / User Management views (not complex enough to
   warrant their own file, wired in here as part of the shell).
   ========================================================================== */
const App = (() => {
  const VIEW_META = {
    dashboard: { title: 'Dashboard', sub: "Overview of today's retort operations" },
    batch: { title: 'New Batch', sub: 'Log and evaluate a retort process batch' },
    calculator: { title: 'F0 Calculator', sub: 'Real-time lethality (F0) calculation engine' },
    graph: { title: 'Graphs', sub: 'Temperature, pressure and F0 vs time' },
    products: { title: 'Product Library', sub: 'Retort process parameters by product & packaging' },
    stock: { title: 'Stock Management', sub: 'Raw materials, packaging & finished goods inventory' },
    guide: { title: 'Process Guide', sub: 'SOPs, HACCP points and common mistakes by packaging type' },
    history: { title: 'Batch History', sub: 'Search, filter, edit and review past batches' },
    reports: { title: 'Reports', sub: 'Generate PDF / Excel reports and print batch records' },
    alarms: { title: 'Alarms', sub: 'Live process alarms across recent batches' },
    users: { title: 'User Management', sub: 'Roles and permissions' },
    settings: { title: 'Settings', sub: 'Company profile, theme, backup & restore' }
  };

  let currentView = 'dashboard';
  let editingBatchId = null;

  // ---------------- Toasts ----------------
  function toast(msg, type = 'primary') {
    const host = document.getElementById('toastHost');
    const el = document.createElement('div');
    el.className = `rp-toast ${type}`;
    const icon = type === 'success' ? 'bi-check-circle-fill' : type === 'danger' ? 'bi-x-circle-fill' : 'bi-info-circle-fill';
    el.innerHTML = `<i class="bi ${icon}"></i><span>${msg}</span>`;
    host.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = '.3s'; setTimeout(() => el.remove(), 300); }, 3000);
  }

  // ---------------- Theme ----------------
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const s = DB.getSettings(); s.theme = theme; DB.saveSettings(s);
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars';
    if (currentView === 'settings') render();
  }

  // ---------------- Clock ----------------
  function startClock() {
    const el = document.querySelector('#liveClock span');
    function tick() { el.textContent = new Date().toLocaleString('en-IN', { hour12: true }); }
    tick(); setInterval(tick, 1000);
  }

  // ---------------- Router ----------------
  function navigate(view, payload) {
    currentView = view;
    editingBatchId = payload && payload.batchId ? payload.batchId : null;
    document.querySelectorAll('.nav-link-item').forEach(a => a.classList.toggle('active', a.dataset.view === view));
    document.getElementById('viewTitle').textContent = VIEW_META[view].title;
    document.getElementById('viewSubtitle').textContent = VIEW_META[view].sub;
    render();
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('content').scrollTop = 0;
    window.scrollTo(0,0);
  }

  function accessDenied() {
    return `<div class="card-surface p-5 text-center">
      <i class="bi bi-shield-lock" style="font-size:40px;color:var(--red)"></i>
      <h5 class="mt-3">Admin Access Only</h5>
      <p class="text-muted">User Management is restricted to Admin accounts. Ask your Admin to make changes here.</p>
    </div>`;
  }

  function render() {
    const content = document.getElementById('content');
    switch (currentView) {
      case 'dashboard': content.innerHTML = Dashboard.render(); Dashboard.init(); break;
      case 'batch': content.innerHTML = BatchView.render(editingBatchId ? DB.getBatch(editingBatchId) : null); BatchView.init(editingBatchId ? DB.getBatch(editingBatchId) : null); break;
      case 'calculator': content.innerHTML = Calc.render(); Calc.init(); break;
      case 'graph': content.innerHTML = GraphView.render(); GraphView.init(); break;
      case 'products': content.innerHTML = ProductsView.render(); ProductsView.init(); break;
      case 'stock': content.innerHTML = Stock.render(); Stock.init(); break;
      case 'guide': content.innerHTML = Guide.render(); Guide.init(); break;
      case 'history': content.innerHTML = History.render(); History.init(); break;
      case 'reports': content.innerHTML = Report.render(); Report.init(); break;
      case 'alarms': content.innerHTML = Alarms.render(); Alarms.init(); break;
      case 'users': if (isAdmin()) { content.innerHTML = Users.render(); Users.init(); } else { content.innerHTML = accessDenied(); } break;
      case 'settings': content.innerHTML = SettingsView.render(); SettingsView.init(); break;
    }
  }

  function viewBatchReport(id) { navigate('reports'); setTimeout(() => { const sel = document.getElementById('reportBatchSelect'); if (sel) { sel.value = id; sel.dispatchEvent(new Event('change')); } }, 100); }
  function editBatch(id) { navigate('batch', { batchId: id }); }

  // ---------------- Login / Auth ----------------
  const ROLE_ICONS = { Admin: 'bi-shield-lock', Supervisor: 'bi-person-badge', QA: 'bi-clipboard2-check', Production: 'bi-gear-wide-connected', Operator: 'bi-person-workspace' };

  function showLoginState(state) {
    ['setupForm','accountPicker','contactLoginForm','pinForm'].forEach(id => document.getElementById(id).classList.add('d-none'));
    document.getElementById(state).classList.remove('d-none');
  }

  function renderAccountList() {
    const users = DB.getUsers();
    document.getElementById('accountList').innerHTML = users.map(u => `
      <button type="button" class="account-tile" data-userid="${u.id}">
        <div class="avatar">${u.name.charAt(0).toUpperCase()}</div>
        <div><div class="acc-name">${u.name}</div><div class="acc-role">${u.role}</div></div>
        <i class="bi bi-chevron-right ms-auto text-muted"></i>
      </button>`).join('');
    document.querySelectorAll('.account-tile').forEach(tile => {
      tile.addEventListener('click', () => openPinForm(DB.findUserById(tile.dataset.userid)));
    });
  }

  let pendingUser = null;
  let otpTimerInterval = null;

  function openPinForm(user) {
    pendingUser = user;
    document.getElementById('pinAvatar').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('pinUserName').textContent = user.name;
    document.getElementById('pinUserRole').textContent = user.role;
    document.getElementById('pinError').classList.add('d-none');
    document.getElementById('pinInput').value = '';
    showLoginState('pinForm');
    setTimeout(() => document.getElementById('pinInput').focus(), 100);
  }

  function startOTPFlow(user) {
    pendingUser = user;
    document.getElementById('otpUserName').textContent = user.name;
    document.getElementById('otpInput').value = '';
    document.getElementById('otpError').classList.add('d-none');
    showLoginState('otpForm');
    issueOTP(user);
  }

  function issueOTP(user) {
    const code = DB.generateOTP(user.id);
    document.getElementById('otpCode').textContent = code;
    if (otpTimerInterval) clearInterval(otpTimerInterval);
    let remaining = 300; // 5 min in seconds
    const countdownEl = document.getElementById('otpCountdown');
    function tick() {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      countdownEl.textContent = `${m}:${String(s).padStart(2,'0')}`;
      if (remaining <= 0) {
        clearInterval(otpTimerInterval);
        countdownEl.textContent = 'Expired';
        document.getElementById('otpCode').textContent = '------';
      }
      remaining--;
    }
    tick();
    otpTimerInterval = setInterval(tick, 1000);
  }

  async function attemptLogin(user, pin, errorElId) {
    const ok = await DB.verifyPin(user, pin);
    if (!ok) {
      if (errorElId) document.getElementById(errorElId).classList.remove('d-none');
      return false;
    }
    // PIN correct — now go to OTP step
    startOTPFlow(user);
    return true;
  }

  function finishLogin(user) {
    if (otpTimerInterval) clearInterval(otpTimerInterval);
    DB.clearOTP(user.id);
    DB.setCurrentUser({ id: user.id, name: user.name, role: user.role, loginAt: new Date().toISOString() });
    bootUp();
  }

  function initLogin() {
    const hasUsers = DB.getUsers().length > 0;
    showLoginState(hasUsers ? 'accountPicker' : 'setupForm');
    if (hasUsers) renderAccountList();

    // First-run: create the Admin account
    document.getElementById('setupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('setupName').value.trim();
      const contact = document.getElementById('setupContact').value.trim();
      const pin = document.getElementById('setupPin').value;
      const pinConfirm = document.getElementById('setupPinConfirm').value;
      if (!/^[0-9]{4,6}$/.test(pin)) { toast('PIN must be 4–6 digits', 'danger'); return; }
      if (pin !== pinConfirm) { toast('PINs do not match', 'danger'); return; }
      if (DB.findUserByContact(contact)) { toast('This email/phone is already registered', 'danger'); return; }

      const salt = DB.randomSalt();
      const hash = await DB.hashPin(pin, salt);
      const admin = DB.addUserRecord({ name, role: 'Admin', contact, pinSalt: salt, pinHash: hash });
      DB.setCurrentUser({ id: admin.id, name: admin.name, role: admin.role, loginAt: new Date().toISOString() });
      bootUp();
    });

    // Account tile -> PIN entry -> OTP
    document.getElementById('pinForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = document.getElementById('pinInput').value;
      await attemptLogin(pendingUser, pin, 'pinError');
    });
    document.getElementById('btnCancelPin').addEventListener('click', () => showLoginState('accountPicker'));

    // OTP verification
    document.getElementById('btnVerifyOTP').addEventListener('click', () => {
      const code = document.getElementById('otpInput').value.trim();
      const result = DB.verifyOTP(pendingUser.id, code);
      if (result.ok) {
        finishLogin(pendingUser);
      } else {
        document.getElementById('otpError').classList.remove('d-none');
        document.getElementById('otpErrorMsg').textContent = result.reason;
      }
    });
    document.getElementById('otpInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btnVerifyOTP').click();
    });
    document.getElementById('btnRegenerateOTP').addEventListener('click', () => {
      document.getElementById('otpError').classList.add('d-none');
      document.getElementById('otpInput').value = '';
      issueOTP(pendingUser);
    });
    document.getElementById('btnCancelOTP').addEventListener('click', () => {
      if (otpTimerInterval) clearInterval(otpTimerInterval);
      showLoginState('accountPicker');
    });

    // Email/phone + PIN login
    document.getElementById('btnShowContactLogin').addEventListener('click', () => showLoginState('contactLoginForm'));
    document.getElementById('btnBackToPicker').addEventListener('click', () => { showLoginState('accountPicker'); renderAccountList(); });
    document.getElementById('contactLoginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const contact = document.getElementById('loginContact').value.trim();
      const pin = document.getElementById('loginContactPin').value;
      const user = DB.findUserByContact(contact);
      if (!user) { toast('No account found with that email/phone', 'danger'); return; }
      const ok = await DB.verifyPin(user, pin);
      if (!ok) { toast('Incorrect PIN', 'danger'); return; }
      startOTPFlow(user);
    });
  }

  function isAdmin() { const u = DB.getCurrentUser(); return u && u.role === 'Admin'; }

  function bootUp() {
    const user = DB.getCurrentUser();
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('appShell').classList.remove('d-none');
    document.getElementById('userNameDisplay').textContent = user.name;
    document.getElementById('userRoleDisplay').textContent = user.role;
    document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();

    // Admin-only nav items are hidden entirely for other roles
    document.querySelectorAll('.nav-link-item[data-admin-only]').forEach(el => {
      el.classList.toggle('d-none', !isAdmin());
    });

    const settings = DB.getSettings();
    setTheme(settings.theme || 'light');

    document.querySelectorAll('.nav-link-item').forEach(a => {
      a.addEventListener('click', (e) => { e.preventDefault(); navigate(a.dataset.view); });
    });
    document.getElementById('logoutBtn').addEventListener('click', () => {
      DB.clearCurrentUser();
      location.reload();
    });
    document.getElementById('sidebarToggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    document.getElementById('themeToggle').addEventListener('click', () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

    startClock();
    navigate('dashboard');
  }

  function init() {
    Products.ensureSeeded();
    const user = DB.getCurrentUser();
    if (user) {
      bootUp();
    } else {
      initLogin();
    }
  }

  return { init, navigate, toast, setTheme, viewBatchReport, editBatch, isAdmin };
})();

/* ==========================================================================
   History view — search / filter / edit / delete / view batches
   ========================================================================== */
const History = (() => {
  function render() {
    return `
    <div class="section-title mb-3"><i class="bi bi-clock-history"></i> Batch History</div>
    <div class="card-surface p-3 mb-3">
      <div class="row g-2">
        <div class="col-md-4"><input type="text" class="form-control form-control-sm" id="hSearch" placeholder="Search by batch # or product..."></div>
        <div class="col-md-3"><input type="date" class="form-control form-control-sm" id="hDate"></div>
        <div class="col-md-3">
          <select class="form-select form-select-sm" id="hMachine"><option value="">All Machines</option>${['RT-01','RT-02','RT-03','RT-04'].map(m=>`<option>${m}</option>`).join('')}</select>
        </div>
        <div class="col-md-2">
          <select class="form-select form-select-sm" id="hStatus"><option value="">All Status</option><option>PASS</option><option>FAIL</option><option>DRAFT</option></select>
        </div>
      </div>
    </div>
    <div class="card-surface p-3">
      <div class="table-responsive">
      <table class="table table-industrial table-hover">
        <thead><tr><th>Batch #</th><th>Product</th><th>Packaging</th><th>Machine</th><th>Operator</th><th>F0</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody id="hBody"></tbody>
      </table>
      </div>
    </div>`;
  }

  function refresh() {
    const q = document.getElementById('hSearch').value.toLowerCase();
    const date = document.getElementById('hDate').value;
    const machine = document.getElementById('hMachine').value;
    const status = document.getElementById('hStatus').value;
    let list = DB.getBatches();
    if (q) list = list.filter(b => b.batchNumber.toLowerCase().includes(q) || b.productName.toLowerCase().includes(q));
    if (date) list = list.filter(b => new Date(b.createdAt).toISOString().slice(0,10) === date);
    if (machine) list = list.filter(b => b.machine === machine);
    if (status) list = list.filter(b => b.status === status);

    document.getElementById('hBody').innerHTML = list.length ? list.map(b => `
      <tr>
        <td class="mono">${b.batchNumber}</td>
        <td>${b.productName}</td>
        <td>${b.packaging}</td>
        <td>${b.machine}</td>
        <td>${b.operator}</td>
        <td class="mono">${(b.totalF0||0).toFixed(1)}</td>
        <td>${b.status==='PASS'?'<span class="badge-pass">PASS</span>':b.status==='FAIL'?'<span class="badge-fail">FAIL</span>':'<span class="badge-run">DRAFT</span>'}</td>
        <td class="small text-muted">${new Date(b.createdAt).toLocaleDateString()}</td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-primary" title="View Report" onclick="App.viewBatchReport('${b.id}')"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-outline-secondary" title="Edit" onclick="App.editBatch('${b.id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="History.remove('${b.id}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('') : `<tr><td colspan="9" class="text-center text-muted py-4">No batches match your search.</td></tr>`;
  }

  function remove(id) {
    if (confirm('Delete this batch record permanently?')) {
      DB.deleteBatch(id);
      App.toast('Batch deleted', 'success');
      refresh();
    }
  }

  function init() {
    refresh();
    ['hSearch','hDate','hMachine','hStatus'].forEach(id => document.getElementById(id).addEventListener('input', refresh));
  }

  return { render, init, remove };
})();

/* ==========================================================================
   Alarms view — derived from batch warning data
   ========================================================================== */
const Alarms = (() => {
  function render() {
    const batches = DB.getBatches();
    const alarmed = batches.filter(b => (b.warnings||[]).length > 0).slice(0, 50);
    const counts = { temp:0, holding:0, pressure:0, cooling:0, f0:0 };
    alarmed.forEach(b => (b.warnings||[]).forEach(w => {
      if (/temperature/i.test(w.msg)) counts.temp++;
      else if (/holding/i.test(w.msg)) counts.holding++;
      else if (/pressure/i.test(w.msg)) counts.pressure++;
      else if (/cooling/i.test(w.msg)) counts.cooling++;
      else if (/f0/i.test(w.msg)) counts.f0++;
    }));
    return `
    <div class="section-title mb-3"><i class="bi bi-bell-fill"></i> Alarms</div>
    <div class="row g-3 mb-3">
      <div class="col-6 col-md-2"><div class="stat-card accent-red"><div class="stat-icon"><i class="bi bi-thermometer-low"></i></div><div class="stat-label">Temp Alarm</div><div class="stat-value">${counts.temp}</div></div></div>
      <div class="col-6 col-md-2"><div class="stat-card accent-amber"><div class="stat-icon"><i class="bi bi-speedometer"></i></div><div class="stat-label">Pressure Alarm</div><div class="stat-value">${counts.pressure}</div></div></div>
      <div class="col-6 col-md-2"><div class="stat-card accent-red"><div class="stat-icon"><i class="bi bi-hourglass-split"></i></div><div class="stat-label">Holding Time</div><div class="stat-value">${counts.holding}</div></div></div>
      <div class="col-6 col-md-2"><div class="stat-card accent-amber"><div class="stat-icon"><i class="bi bi-snow"></i></div><div class="stat-label">Cooling Error</div><div class="stat-value">${counts.cooling}</div></div></div>
      <div class="col-6 col-md-2"><div class="stat-card accent-red"><div class="stat-icon"><i class="bi bi-graph-down"></i></div><div class="stat-label">Low F0 Alarm</div><div class="stat-value">${counts.f0}</div></div></div>
      <div class="col-6 col-md-2"><div class="stat-card"><div class="stat-icon"><i class="bi bi-x-octagon-fill"></i></div><div class="stat-label">Process Failure</div><div class="stat-value">${batches.filter(b=>b.status==='FAIL').length}</div></div></div>
    </div>
    <div class="card-surface p-3">
      <div class="section-title"><i class="bi bi-list-ul"></i> Alarm Log</div>
      ${alarmed.length ? alarmed.map(b => `
        <div class="border-bottom py-2">
          <div class="d-flex justify-content-between">
            <strong class="mono">${b.batchNumber}</strong>
            <span class="text-muted small">${new Date(b.createdAt).toLocaleString()}</span>
          </div>
          ${(b.warnings||[]).map(w => `<div class="${w.level==='danger'?'alert-danger-line':'alert-warning-line'} mt-1"><i class="bi bi-exclamation-triangle-fill"></i>${w.msg}</div>`).join('')}
        </div>`).join('') : '<p class="text-muted text-center py-4">No alarms recorded. All processes within limits.</p>'}
    </div>`;
  }
  function init() {}
  return { render, init };
})();

/* ==========================================================================
   User Management view — Admin-only: add/remove users, view any user's data
   ========================================================================== */
const Users = (() => {
  const ROLES = ['Admin', 'Supervisor', 'QA', 'Production', 'Operator'];

  function render() {
    const users = DB.getUsers();
    const currentUser = DB.getCurrentUser();
    return `
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <div class="section-title mb-0"><i class="bi bi-people-fill"></i> User Management</div>
      <button class="btn btn-primary btn-sm" id="btnAddUser"><i class="bi bi-person-plus-fill me-1"></i>Add User</button>
    </div>
    <div class="card-surface p-3 mb-3">
      <div class="table-responsive">
      <table class="table table-industrial">
        <thead><tr><th>Name</th><th>Role</th><th>Email / Phone</th><th>Added</th><th>Actions</th></tr></thead>
        <tbody>
          ${users.map(u => {
            const userBatches = DB.getBatchesByOperator(u.name);
            const userTxns = DB.getStockTxnsByUser(u.name);
            return `<tr>
              <td><i class="bi bi-person-circle me-2 text-muted"></i><strong>${u.name}</strong>${u.id===currentUser.id ? ' <span class="chip">You</span>' : ''}</td>
              <td><span class="chip">${u.role}</span></td>
              <td class="mono small">${u.contact || '—'}</td>
              <td class="small text-muted">${new Date(u.createdAt).toLocaleDateString()}</td>
              <td class="text-nowrap">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="Users.viewData('${u.id}')"><i class="bi bi-eye me-1"></i>Data</button>
                <button class="btn btn-sm btn-outline-danger" onclick="Users.remove('${u.id}')" ${u.id===currentUser.id && DB.countAdmins()<=1 ? 'disabled title="Cannot remove the only Admin"' : ''}><i class="bi bi-trash"></i></button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      </div>
    </div>

    <!-- User data panel (shown when Admin clicks View Data) -->
    <div id="userDataPanel" class="d-none">
      <div class="section-title"><i class="bi bi-database-fill"></i> <span id="userDataTitle">User Activity</span></div>
      <ul class="nav nav-tabs mb-3" id="userDataTabs">
        <li class="nav-item"><button class="nav-link active" data-tab="batches">Batches</button></li>
        <li class="nav-item"><button class="nav-link" data-tab="stock">Stock Movements</button></li>
      </ul>
      <div id="userBatchesTab">
        <div class="card-surface p-3">
          <div class="table-responsive">
          <table class="table table-industrial table-hover">
            <thead><tr><th>Batch #</th><th>Product</th><th>Machine</th><th>F0</th><th>Status</th><th>Date</th><th></th></tr></thead>
            <tbody id="userBatchBody"></tbody>
          </table>
          </div>
        </div>
      </div>
      <div id="userStockTab" class="d-none">
        <div class="card-surface p-3">
          <div class="table-responsive">
          <table class="table table-industrial">
            <thead><tr><th>Date</th><th>Item</th><th>Type</th><th>Qty</th><th>Reason</th><th>Reference</th></tr></thead>
            <tbody id="userStockBody"></tbody>
          </table>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="userModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content" id="userModalContent"></div></div></div>`;
  }

  function viewData(userId) {
    const user = DB.findUserById(userId);
    if (!user) return;
    document.getElementById('userDataPanel').classList.remove('d-none');
    document.getElementById('userDataTitle').textContent = `${user.name}'s Activity`;

    const batches = DB.getBatchesByOperator(user.name);
    document.getElementById('userBatchBody').innerHTML = batches.length ? batches.map(b => `
      <tr>
        <td class="mono">${b.batchNumber}</td>
        <td>${b.productName}</td>
        <td>${b.machine}</td>
        <td class="mono">${(b.totalF0||0).toFixed(1)}</td>
        <td>${b.status==='PASS'?'<span class="badge-pass">PASS</span>':b.status==='FAIL'?'<span class="badge-fail">FAIL</span>':'<span class="badge-run">DRAFT</span>'}</td>
        <td class="small text-muted">${new Date(b.createdAt).toLocaleDateString()}</td>
        <td><button class="btn btn-sm btn-outline-primary" onclick="App.viewBatchReport('${b.id}')"><i class="bi bi-eye"></i></button></td>
      </tr>`).join('') : `<tr><td colspan="7" class="text-center text-muted py-3">No batches by ${user.name} yet.</td></tr>`;

    const txns = DB.getStockTxnsByUser(user.name);
    const items = DB.getStockItems();
    document.getElementById('userStockBody').innerHTML = txns.length ? txns.map(t => {
      const item = items.find(i => i.id === t.itemId);
      return `<tr>
        <td class="small">${new Date(t.createdAt).toLocaleDateString()}</td>
        <td>${item ? item.name : '—'}</td>
        <td>${t.type==='IN'?'<span class="badge-pass">INWARD</span>':'<span class="badge-fail">OUTWARD</span>'}</td>
        <td class="mono">${t.qty} ${item?item.unit:''}</td>
        <td>${t.reason||'—'}</td>
        <td class="mono small">${t.reference||'—'}</td>
      </tr>`;
    }).join('') : `<tr><td colspan="6" class="text-center text-muted py-3">No stock movements by ${user.name} yet.</td></tr>`;

    document.getElementById('userDataPanel').scrollIntoView({ behavior: 'smooth' });

    // Tab switching
    const tabs = document.querySelectorAll('#userDataTabs .nav-link');
    tabs.forEach(t => t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      document.getElementById('userBatchesTab').classList.toggle('d-none', t.dataset.tab !== 'batches');
      document.getElementById('userStockTab').classList.toggle('d-none', t.dataset.tab !== 'stock');
    }));
  }

  function formHtml() {
    return `
      <div class="modal-header"><h5 class="modal-title">Add Team Member</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body">
        <label class="form-label">Name</label>
        <input type="text" class="form-control mb-2" id="nu_name" required>
        <label class="form-label">Role</label>
        <select class="form-select mb-2" id="nu_role">${ROLES.map(r=>`<option>${r}</option>`).join('')}</select>
        <label class="form-label">Email or Phone Number</label>
        <input type="text" class="form-control mb-2" id="nu_contact" placeholder="e.g. name@company.com or 9876543210" required>
        <div class="row g-2">
          <div class="col-6"><label class="form-label">Set PIN (4–6 digits)</label><input type="password" inputmode="numeric" maxlength="6" class="form-control" id="nu_pin" required></div>
          <div class="col-6"><label class="form-label">Confirm PIN</label><input type="password" inputmode="numeric" maxlength="6" class="form-control" id="nu_pinConfirm" required></div>
        </div>
        <p class="text-muted small mt-2 mb-0">Share the PIN with them directly — no SMS/email is sent from this offline app.</p>
      </div>
      <div class="modal-footer"><button class="btn btn-primary w-100" id="btnSaveUser">Add User</button></div>`;
  }

  function openAdd() {
    document.getElementById('userModalContent').innerHTML = formHtml();
    new bootstrap.Modal(document.getElementById('userModal')).show();
    document.getElementById('btnSaveUser').addEventListener('click', saveUser);
  }

  async function saveUser() {
    const name = document.getElementById('nu_name').value.trim();
    const role = document.getElementById('nu_role').value;
    const contact = document.getElementById('nu_contact').value.trim();
    const pin = document.getElementById('nu_pin').value;
    const pinConfirm = document.getElementById('nu_pinConfirm').value;
    if (!name || !contact) { App.toast('Name and email/phone are required', 'danger'); return; }
    if (!/^[0-9]{4,6}$/.test(pin)) { App.toast('PIN must be 4–6 digits', 'danger'); return; }
    if (pin !== pinConfirm) { App.toast('PINs do not match', 'danger'); return; }
    if (DB.findUserByContact(contact)) { App.toast('This email/phone is already registered', 'danger'); return; }
    const salt = DB.randomSalt();
    const hash = await DB.hashPin(pin, salt);
    DB.addUserRecord({ name, role, contact, pinSalt: salt, pinHash: hash });
    bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
    App.toast(`${name} added successfully`, 'success');
    App.navigate('users');
  }

  function remove(id) {
    const user = DB.findUserById(id);
    const currentUser = DB.getCurrentUser();
    if (user.role === 'Admin' && DB.countAdmins() <= 1) { App.toast('Cannot remove the only Admin account', 'danger'); return; }
    if (id === currentUser.id) {
      if (!confirm('This is your own account. Remove it and log out?')) return;
      DB.removeUserRecord(id);
      DB.clearCurrentUser();
      location.reload();
      return;
    }
    if (confirm(`Remove ${user.name}'s login? Their batches/reports stay in the system.`)) {
      DB.removeUserRecord(id);
      App.toast('User removed', 'success');
      App.navigate('users');
    }
  }

  function init() {
    document.getElementById('btnAddUser').addEventListener('click', openAdd);
  }

  return { render, init, remove, viewData };
})();

document.addEventListener('DOMContentLoaded', App.init);
