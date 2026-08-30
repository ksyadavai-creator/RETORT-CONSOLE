/* ==========================================================================
   stock.js — Stock / Inventory Management: raw materials, packaging
   materials and finished goods, with Stock-In/Stock-Out transactions,
   reorder-level low-stock alerts, and a movement log.
   ========================================================================== */
const Stock = (() => {
  const CATEGORIES = ['Raw Material', 'Packaging Material', 'Finished Goods', 'Consumable'];
  const UNITS = ['kg', 'g', 'ltr', 'ml', 'pcs', 'box', 'roll', 'bag'];

  // Starter templates so a brand-new company doesn't stare at an empty
  // table — mirrors the packaging types and common raw materials already
  // used across the Product Library. Quantities start at 0; the user just
  // needs to set real opening stock via Edit or an Inward Entry.
  const QUICK_TEMPLATES = [
    { name: 'Empty Cans 400g', category: 'Packaging Material', unit: 'pcs', reorderLevel: 2000, unitCost: 8 },
    { name: 'Retort Pouch Film (Laminate)', category: 'Packaging Material', unit: 'roll', reorderLevel: 5, unitCost: 4500 },
    { name: 'Vacuum Pouch Film', category: 'Packaging Material', unit: 'roll', reorderLevel: 5, unitCost: 3800 },
    { name: 'Glass Bottles 250ml', category: 'Packaging Material', unit: 'pcs', reorderLevel: 1000, unitCost: 12 },
    { name: 'PET Jars', category: 'Packaging Material', unit: 'pcs', reorderLevel: 1000, unitCost: 9 },
    { name: 'Cup Tray + Lidding Film Set', category: 'Packaging Material', unit: 'pcs', reorderLevel: 1500, unitCost: 6 },
    { name: 'Aluminium Foil Pouches', category: 'Packaging Material', unit: 'pcs', reorderLevel: 1000, unitCost: 10 },
    { name: 'Corrugated Shipping Cartons', category: 'Packaging Material', unit: 'pcs', reorderLevel: 200, unitCost: 25 },
    { name: 'Sweet Corn (Raw)', category: 'Raw Material', unit: 'kg', reorderLevel: 100, unitCost: 35 },
    { name: 'Rice (Raw)', category: 'Raw Material', unit: 'kg', reorderLevel: 200, unitCost: 55 },
    { name: 'Chana Dal (Raw)', category: 'Raw Material', unit: 'kg', reorderLevel: 100, unitCost: 90 },
    { name: 'Rajma (Raw)', category: 'Raw Material', unit: 'kg', reorderLevel: 100, unitCost: 130 },
    { name: 'Chicken (Raw, Boneless)', category: 'Raw Material', unit: 'kg', reorderLevel: 50, unitCost: 260 },
    { name: 'Paneer (Raw)', category: 'Raw Material', unit: 'kg', reorderLevel: 50, unitCost: 320 },
    { name: 'Tomato Puree Base', category: 'Raw Material', unit: 'kg', reorderLevel: 100, unitCost: 45 },
    { name: 'Cooking Oil', category: 'Raw Material', unit: 'ltr', reorderLevel: 50, unitCost: 130 },
    { name: 'Salt', category: 'Raw Material', unit: 'kg', reorderLevel: 50, unitCost: 20 },
    { name: 'Spice Mix (Standard)', category: 'Raw Material', unit: 'kg', reorderLevel: 20, unitCost: 400 },
    { name: 'Citric Acid (Acidulant)', category: 'Consumable', unit: 'kg', reorderLevel: 5, unitCost: 250 },
    { name: 'Batch Labels / Stickers', category: 'Consumable', unit: 'box', reorderLevel: 5, unitCost: 350 }
  ];

  function summary() {
    const items = DB.getStockItems();
    const low = items.filter(i => i.currentStock <= (i.reorderLevel || 0));
    const totalValue = items.reduce((sum, i) => sum + (i.currentStock || 0) * (i.unitCost || 0), 0);
    return { totalItems: items.length, lowCount: low.length, low, totalValue };
  }

  // ---------------- Ledger: Opening / Inward / Outward / Closing for a date range ----------------
  // This is the standard factory "Bin Card" / Stock Register format — every
  // number is derived purely from the transaction log, never edited directly,
  // so Opening(t) + Inward − Outward always equals Closing = currentStock.
  function ledgerFor(itemId, fromDate, toDate) {
    const item = DB.getStockItem(itemId);
    if (!item) return null;
    const txns = DB.getStockTxns().filter(t => t.itemId === itemId).sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt));
    const from = fromDate ? new Date(fromDate + 'T00:00:00') : null;
    const to = toDate ? new Date(toDate + 'T23:59:59') : null;

    let opening = 0, inward = 0, outward = 0;
    txns.forEach(t => {
      const d = new Date(t.createdAt);
      const delta = t.type === 'IN' ? t.qty : -t.qty;
      if (from && d < from) { opening += delta; return; }
      if (to && d > to) return; // ignore movements after the range end
      if (t.type === 'IN') inward += t.qty; else outward += t.qty;
    });
    return { item, opening, inward, outward, closing: opening + inward - outward };
  }

  function fullLedger(fromDate, toDate) {
    return DB.getStockItems().map(i => ledgerFor(i.id, fromDate, toDate));
  }

  function render() {
    const s = summary();
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0,10);
    const todayStr = today.toISOString().slice(0,10);
    return `
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <div class="section-title mb-0"><i class="bi bi-boxes"></i> Stock Management</div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-success btn-sm" id="btnQuickAdd"><i class="bi bi-lightning-fill me-1"></i>Quick Add Common Items</button>
        <button class="btn btn-outline-primary btn-sm" id="btnStockIn"><i class="bi bi-box-arrow-in-down me-1"></i>Inward Entry</button>
        <button class="btn btn-outline-secondary btn-sm" id="btnStockOut"><i class="bi bi-box-arrow-up me-1"></i>Outward Entry</button>
        <button class="btn btn-primary btn-sm" id="btnAddItem"><i class="bi bi-plus-lg me-1"></i>New Item</button>
      </div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-icon"><i class="bi bi-boxes"></i></div><div class="stat-label">Total Items</div><div class="stat-value">${s.totalItems}</div></div></div>
      <div class="col-6 col-md-3"><div class="stat-card accent-red"><div class="stat-icon"><i class="bi bi-exclamation-triangle-fill"></i></div><div class="stat-label">Low Stock</div><div class="stat-value">${s.lowCount}</div></div></div>
      <div class="col-6 col-md-3"><div class="stat-card accent-green"><div class="stat-icon"><i class="bi bi-currency-rupee"></i></div><div class="stat-label">Stock Value</div><div class="stat-value" style="font-size:20px">₹${s.totalValue.toLocaleString('en-IN',{maximumFractionDigits:0})}</div></div></div>
      <div class="col-6 col-md-3"><div class="stat-card accent-amber"><div class="stat-icon"><i class="bi bi-arrow-left-right"></i></div><div class="stat-label">Movements Logged</div><div class="stat-value">${DB.getStockTxns().length}</div></div></div>
    </div>

    ${s.lowCount ? `<div class="alert-danger-line mb-3"><i class="bi bi-exclamation-octagon-fill"></i>${s.lowCount} item(s) at or below reorder level — restock soon: ${s.low.map(i=>i.name).join(', ')}</div>` : ''}

    <ul class="nav nav-tabs mb-3" id="stockTabs">
      <li class="nav-item"><button class="nav-link active" data-tab="items">Inventory</button></li>
      <li class="nav-item"><button class="nav-link" data-tab="ledger">Stock Ledger (OP / Inward / Outward / CLO)</button></li>
      <li class="nav-item"><button class="nav-link" data-tab="movements">Movement Log</button></li>
    </ul>

    <div id="stockTabItems">
      <div class="card-surface p-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div class="section-title mb-0"><i class="bi bi-clipboard-data-fill"></i> Inventory</div>
          <input type="text" class="form-control form-control-sm" id="stockSearch" placeholder="Search item..." style="width:200px">
        </div>
        <div class="table-responsive">
        <table class="table table-industrial table-hover">
          <thead><tr><th>Item</th><th>Category</th><th>Current Stock</th><th>Reorder At</th><th>Unit Cost</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="stockBody"></tbody>
        </table>
        </div>
      </div>
    </div>

    <div id="stockTabLedger" class="d-none">
      <div class="card-surface p-3">
        <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div class="section-title mb-0"><i class="bi bi-journal-arrow-down"></i> Stock Ledger</div>
          <div class="d-flex gap-2 align-items-center">
            <label class="form-label mb-0 small">From</label>
            <input type="date" class="form-control form-control-sm" id="ledgerFrom" value="${monthStart}">
            <label class="form-label mb-0 small">To</label>
            <input type="date" class="form-control form-control-sm" id="ledgerTo" value="${todayStr}">
          </div>
        </div>
        <div class="table-responsive">
        <table class="table table-industrial">
          <thead><tr><th>Item</th><th>Unit</th><th>Opening (OP)</th><th>Inward</th><th>Outward</th><th>Closing (CLO)</th></tr></thead>
          <tbody id="ledgerBody"></tbody>
        </table>
        </div>
        <p class="text-muted small mb-0 mt-2">Closing = Opening + Inward − Outward. Closing balance for "today" always matches the live stock figure in the Inventory tab.</p>
      </div>
    </div>

    <div id="stockTabMovements" class="d-none">
      <div class="card-surface p-3">
        <div class="section-title"><i class="bi bi-clock-history"></i> Inward / Outward Movement Log</div>
        <div class="table-responsive">
        <table class="table table-industrial table-hover">
          <thead><tr><th>Date</th><th>Item</th><th>Type</th><th>Qty</th><th>Reason</th><th>Reference</th><th>By</th></tr></thead>
          <tbody id="movementBody"></tbody>
        </table>
        </div>
      </div>
    </div>

    <div class="modal fade" id="stockModal" tabindex="-1"><div class="modal-dialog modal-dialog-scrollable"><div class="modal-content" id="stockModalContent"></div></div></div>
    `;
  }

  function statusBadge(item) {
    if (item.currentStock <= (item.reorderLevel || 0)) return '<span class="badge-fail">LOW</span>';
    if (item.currentStock <= (item.reorderLevel || 0) * 1.5) return '<span class="badge-run">WATCH</span>';
    return '<span class="badge-pass">OK</span>';
  }

  function quickAddTemplates() {
    const existingNames = new Set(DB.getStockItems().map(i => i.name));
    const toAdd = QUICK_TEMPLATES.filter(t => !existingNames.has(t.name));
    if (!toAdd.length) { App.toast('All template items are already in your inventory', 'primary'); return; }
    toAdd.forEach(t => DB.addStockItem({ name: t.name, category: t.category, unit: t.unit, currentStock: 0, reorderLevel: t.reorderLevel, unitCost: t.unitCost, supplier: '', location: '' }));
    App.toast(`Added ${toAdd.length} common items — set real opening stock via Edit or Inward Entry`, 'success');
    App.navigate('stock');
  }

  function refreshTable() {
    const q = (document.getElementById('stockSearch').value || '').toLowerCase();
    const items = DB.getStockItems().filter(i => i.name.toLowerCase().includes(q));
    document.getElementById('stockBody').innerHTML = items.length ? items.map(i => `
      <tr>
        <td><strong>${i.name}</strong>${i.supplier ? `<div class="text-muted small">${i.supplier}</div>` : ''}</td>
        <td><span class="chip">${i.category}</span></td>
        <td class="mono">${i.currentStock} ${i.unit}</td>
        <td class="mono text-muted">${i.reorderLevel} ${i.unit}</td>
        <td class="mono">₹${(i.unitCost||0).toLocaleString('en-IN')}</td>
        <td>${statusBadge(i)}</td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-secondary" onclick="Stock.openEdit('${i.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="Stock.remove('${i.id}')" title="Delete"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('') : `<tr><td colspan="7" class="text-center text-muted py-4">No stock items yet. Click "Quick Add Common Items" for a starter list, or "New Item" to add your own.</td></tr>`;
  }

  function refreshLedger() {
    const from = document.getElementById('ledgerFrom').value;
    const to = document.getElementById('ledgerTo').value;
    const rows = fullLedger(from, to);
    document.getElementById('ledgerBody').innerHTML = rows.length ? rows.map(r => `
      <tr>
        <td><strong>${r.item.name}</strong></td>
        <td class="text-muted">${r.item.unit}</td>
        <td class="mono">${r.opening.toFixed(2)}</td>
        <td class="mono text-success">+${r.inward.toFixed(2)}</td>
        <td class="mono text-danger">-${r.outward.toFixed(2)}</td>
        <td class="mono fw-bold">${r.closing.toFixed(2)}</td>
      </tr>`).join('') : `<tr><td colspan="6" class="text-center text-muted py-4">No stock items yet.</td></tr>`;
  }

  function refreshMovements() {
    const txns = DB.getStockTxns();
    const items = DB.getStockItems();
    document.getElementById('movementBody').innerHTML = txns.length ? txns.map(t => {
      const item = items.find(i => i.id === t.itemId);
      return `<tr>
        <td class="small text-muted">${new Date(t.createdAt).toLocaleString('en-IN')}</td>
        <td>${item ? item.name : '<span class="text-muted">Deleted item</span>'}</td>
        <td>${t.type === 'IN' ? '<span class="badge-pass">INWARD</span>' : '<span class="badge-fail">OUTWARD</span>'}</td>
        <td class="mono">${t.qty} ${item ? item.unit : ''}</td>
        <td>${t.reason || '—'}</td>
        <td class="mono small">${t.reference || '—'}</td>
        <td class="small">${t.by || '—'}</td>
      </tr>`;
    }).join('') : `<tr><td colspan="7" class="text-center text-muted py-4">No movements logged yet.</td></tr>`;
  }

  function itemFormHtml(item) {
    const i = item || {};
    return `
      <div class="modal-header"><h5 class="modal-title">${item ? 'Edit Item' : 'New Stock Item'}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body">
        <label class="form-label">Item Name</label>
        <input type="text" class="form-control mb-2" id="si_name" value="${i.name||''}" placeholder="e.g. Empty Cans 400g, Sweet Corn (Raw), Retort Pouch Film">
        <div class="row g-2">
          <div class="col-6"><label class="form-label">Category</label>
            <select class="form-select" id="si_category">${CATEGORIES.map(c=>`<option ${i.category===c?'selected':''}>${c}</option>`).join('')}</select>
          </div>
          <div class="col-6"><label class="form-label">Unit</label>
            <select class="form-select" id="si_unit">${UNITS.map(u=>`<option ${i.unit===u?'selected':''}>${u}</option>`).join('')}</select>
          </div>
          <div class="col-6"><label class="form-label">Opening Stock</label><input type="number" step="0.01" class="form-control" id="si_stock" value="${i.currentStock??0}"></div>
          <div class="col-6"><label class="form-label">Reorder Level</label><input type="number" step="0.01" class="form-control" id="si_reorder" value="${i.reorderLevel??0}"></div>
          <div class="col-6"><label class="form-label">Unit Cost (₹)</label><input type="number" step="0.01" class="form-control" id="si_cost" value="${i.unitCost??0}"></div>
          <div class="col-6"><label class="form-label">Supplier</label><input type="text" class="form-control" id="si_supplier" value="${i.supplier||''}"></div>
          <div class="col-12"><label class="form-label">Storage Location</label><input type="text" class="form-control" id="si_location" value="${i.location||''}" placeholder="e.g. Warehouse A, Rack 3"></div>
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-primary w-100" id="btnSaveItem">${item ? 'Save Changes' : 'Add Item'}</button></div>`;
  }

  function txnFormHtml(type) {
    const items = DB.getStockItems();
    return `
      <div class="modal-header"><h5 class="modal-title">${type === 'IN' ? 'Inward Entry' : 'Outward Entry'}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body">
        <label class="form-label">Item</label>
        <select class="form-select mb-2" id="tx_item">${items.map(i=>`<option value="${i.id}">${i.name} (${i.currentStock} ${i.unit} in stock)</option>`).join('') || '<option value="">No items — add a stock item first</option>'}</select>
        <label class="form-label">Quantity</label>
        <input type="number" step="0.01" class="form-control mb-2" id="tx_qty" value="1" min="0.01">
        <label class="form-label">Reason</label>
        <input type="text" class="form-control mb-2" id="tx_reason" placeholder="${type==='IN' ? 'e.g. Purchase from supplier' : 'e.g. Consumed in production'}">
        <label class="form-label">Reference (Batch # / PO #, optional)</label>
        <input type="text" class="form-control" id="tx_ref">
      </div>
      <div class="modal-footer"><button class="btn btn-primary w-100" id="btnSaveTxn" data-type="${type}">Confirm ${type === 'IN' ? 'Inward' : 'Outward'}</button></div>`;
  }

  function openModal(html) {
    document.getElementById('stockModalContent').innerHTML = html;
    new bootstrap.Modal(document.getElementById('stockModal')).show();
  }

  function openAdd() {
    openModal(itemFormHtml(null));
    document.getElementById('btnSaveItem').addEventListener('click', () => saveItem(null));
  }
  function openEdit(id) {
    const item = DB.getStockItem(id);
    openModal(itemFormHtml(item));
    document.getElementById('btnSaveItem').addEventListener('click', () => saveItem(id));
  }
  function saveItem(id) {
    const data = {
      name: document.getElementById('si_name').value.trim(),
      category: document.getElementById('si_category').value,
      unit: document.getElementById('si_unit').value,
      currentStock: parseFloat(document.getElementById('si_stock').value) || 0,
      reorderLevel: parseFloat(document.getElementById('si_reorder').value) || 0,
      unitCost: parseFloat(document.getElementById('si_cost').value) || 0,
      supplier: document.getElementById('si_supplier').value.trim(),
      location: document.getElementById('si_location').value.trim()
    };
    if (!data.name) { App.toast('Item name is required', 'danger'); return; }
    if (id) DB.updateStockItem(id, data); else DB.addStockItem(data);
    bootstrap.Modal.getInstance(document.getElementById('stockModal')).hide();
    App.toast(id ? 'Item updated' : 'Item added', 'success');
    App.navigate('stock');
  }

  function remove(id) {
    if (confirm('Delete this stock item and its movement history?')) {
      DB.deleteStockItem(id);
      App.toast('Item deleted', 'success');
      App.navigate('stock');
    }
  }

  function openTxn(type) {
    if (!DB.getStockItems().length) { App.toast('Add a stock item first', 'danger'); return; }
    openModal(txnFormHtml(type));
    document.getElementById('btnSaveTxn').addEventListener('click', () => {
      const itemId = document.getElementById('tx_item').value;
      const qty = parseFloat(document.getElementById('tx_qty').value) || 0;
      if (!itemId || qty <= 0) { App.toast('Select an item and a valid quantity', 'danger'); return; }
      DB.addStockTxn({
        itemId, type,
        qty,
        reason: document.getElementById('tx_reason').value.trim(),
        reference: document.getElementById('tx_ref').value.trim(),
        by: (DB.getCurrentUser()||{}).name || 'Unknown'
      });
      bootstrap.Modal.getInstance(document.getElementById('stockModal')).hide();
      App.toast(`Stock ${type === 'IN' ? 'in' : 'out'} recorded`, 'success');
      App.navigate('stock');
    });
  }

  function init() {
    refreshTable();
    refreshLedger();
    refreshMovements();
    document.getElementById('stockSearch').addEventListener('input', refreshTable);
    document.getElementById('btnAddItem').addEventListener('click', openAdd);
    document.getElementById('btnQuickAdd').addEventListener('click', quickAddTemplates);
    document.getElementById('btnStockIn').addEventListener('click', () => openTxn('IN'));
    document.getElementById('btnStockOut').addEventListener('click', () => openTxn('OUT'));
    document.getElementById('ledgerFrom').addEventListener('change', refreshLedger);
    document.getElementById('ledgerTo').addEventListener('change', refreshLedger);

    const tabs = document.querySelectorAll('#stockTabs .nav-link');
    const panels = { items: document.getElementById('stockTabItems'), ledger: document.getElementById('stockTabLedger'), movements: document.getElementById('stockTabMovements') };
    tabs.forEach(t => t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      Object.keys(panels).forEach(k => panels[k].classList.toggle('d-none', k !== t.dataset.tab));
    }));
  }

  // Called by batch.js when a batch is saved: logs OUTWARD for consumed
  // materials and INWARD for finished goods produced, all referencing the
  // batch number so the movement log and ledger tie directly to production.
  function recordProductionMovement(batch, consumedRows) {
    const by = (DB.getCurrentUser() || {}).name || batch.operator || 'System';
    (consumedRows || []).forEach(row => {
      if (!row.itemId || !row.qty) return;
      DB.addStockTxn({ itemId: row.itemId, type: 'OUT', qty: parseFloat(row.qty), reason: 'Production consumption', reference: batch.batchNumber, by });
    });

    if (batch.qtyProduced && parseFloat(batch.qtyProduced) > 0) {
      const fgName = `${batch.productName} (${batch.packaging})`;
      let fgItem = DB.getStockItems().find(i => i.category === 'Finished Goods' && i.name === fgName);
      if (!fgItem) {
        fgItem = DB.addStockItem({ name: fgName, category: 'Finished Goods', unit: 'pcs', currentStock: 0, reorderLevel: 0, unitCost: 0, supplier: '', location: '' });
      }
      DB.addStockTxn({ itemId: fgItem.id, type: 'IN', qty: parseFloat(batch.qtyProduced), reason: 'Batch production output', reference: batch.batchNumber, by });
    }
  }

  return { render, init, openEdit, remove, summary, ledgerFor, fullLedger, recordProductionMovement, CATEGORIES, UNITS };
})();
