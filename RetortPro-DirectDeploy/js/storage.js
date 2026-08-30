/* ==========================================================================
   storage.js — LocalStorage offline database + CRUD helpers
   ========================================================================== */
const DB = (() => {
  const KEYS = {
    BATCHES: 'rp_batches',
    PRODUCTS: 'rp_products',
    SETTINGS: 'rp_settings',
    USER: 'rp_user',
    USERS: 'rp_users',
    SEQ: 'rp_batch_seq',
    STOCK: 'rp_stock_items',
    STOCK_TXN: 'rp_stock_txns',
    STOCK_SEQ: 'rp_stock_seq'
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('DB read error', key, e);
      return fallback;
    }
  }
  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ---------------- Batches CRUD ----------------
  function getBatches() { return read(KEYS.BATCHES, []); }
  function saveBatches(list) { write(KEYS.BATCHES, list); }
  function getBatch(id) { return getBatches().find(b => b.id === id); }
  function addBatch(batch) {
    const list = getBatches();
    batch.id = 'B' + Date.now() + Math.floor(Math.random() * 1000);
    batch.createdAt = new Date().toISOString();
    list.unshift(batch);
    saveBatches(list);
    return batch;
  }
  function updateBatch(id, patch) {
    const list = getBatches();
    const idx = list.findIndex(b => b.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
    saveBatches(list);
    return list[idx];
  }
  function deleteBatch(id) {
    const list = getBatches().filter(b => b.id !== id);
    saveBatches(list);
  }
  function nextBatchNumber() {
    let seq = read(KEYS.SEQ, 1000);
    seq += 1;
    write(KEYS.SEQ, seq);
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    return `RB-${ymd}-${seq}`;
  }

  // ---------------- Products CRUD ----------------
  function getProducts() { return read(KEYS.PRODUCTS, []); }
  function saveProducts(list) { write(KEYS.PRODUCTS, list); }

  // ---------------- Settings ----------------
  function getSettings() {
    return read(KEYS.SETTINGS, {
      companyName: 'Sunrise Food Processing Pvt. Ltd.',
      companyLogo: '',
      units: 'Metric',
      language: 'English',
      theme: 'light',
      zValue: 10,
      refTemp: 121.1
    });
  }
  function saveSettings(s) { write(KEYS.SETTINGS, s); }

  // ---------------- User / Users ----------------
  function getCurrentUser() { return read(KEYS.USER, null); }
  function setCurrentUser(u) { write(KEYS.USER, u); }
  function clearCurrentUser() { localStorage.removeItem(KEYS.USER); }

  // ---------------- Users (Admin-managed accounts) ----------------
  // No demo/placeholder users are seeded — the very first person to open the
  // app creates the real Admin account. Every account after that is created
  // by an Admin from User Management (add/remove), matching "Admin has full
  // control, decides who else gets in."
  function getUsers() { return read(KEYS.USERS, []); }
  function saveUsers(list) { write(KEYS.USERS, list); }
  function findUserByContact(contact) {
    const c = (contact || '').trim().toLowerCase();
    return getUsers().find(u => (u.contact || '').toLowerCase() === c);
  }
  function findUserById(id) { return getUsers().find(u => u.id === id); }
  function addUserRecord(user) {
    const list = getUsers();
    user.id = 'U' + Date.now() + Math.floor(Math.random() * 1000);
    user.createdAt = new Date().toISOString();
    list.push(user);
    saveUsers(list);
    return user;
  }
  function removeUserRecord(id) { saveUsers(getUsers().filter(u => u.id !== id)); }
  function countAdmins() { return getUsers().filter(u => u.role === 'Admin').length; }

  // ---------------- PIN hashing (Web Crypto, built into every browser) ----------------
  // This is an access-control layer appropriate for a single offline device
  // shared by a team — NOT a claim of bank-grade security. A PIN is never
  // stored in plain text; only a salted SHA-256 hash is kept. Anyone with
  // physical/devtools access to the device could still bypass client-side
  // checks — that is an inherent limit of any browser-only app with no
  // server, and is disclosed plainly in DEPLOYMENT.md.
  function randomSalt() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function hashPin(pin, salt) {
    const enc = new TextEncoder();
    const data = enc.encode(salt + ':' + pin);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function verifyPin(user, pin) {
    if (!user || !user.pinHash || !user.pinSalt) return false;
    const check = await hashPin(pin, user.pinSalt);
    return check === user.pinHash;
  }

  // ---------------- Stock / Inventory CRUD ----------------
  function getStockItems() { return read(KEYS.STOCK, []); }
  function saveStockItems(list) { write(KEYS.STOCK, list); }
  function getStockItem(id) { return getStockItems().find(s => s.id === id); }
  function addStockItem(item) {
    const list = getStockItems();
    item.id = 'S' + Date.now() + Math.floor(Math.random() * 1000);
    item.createdAt = new Date().toISOString();
    item.currentStock = parseFloat(item.currentStock) || 0;
    const openingQty = item.currentStock;
    item.currentStock = 0; // will be brought back up to openingQty by the OPENING txn below, so
                            // currentStock always equals opening + Σinward − Σoutward (single source of truth)
    list.unshift(item);
    saveStockItems(list);
    if (openingQty > 0) {
      addStockTxn({ itemId: item.id, type: 'IN', qty: openingQty, reason: 'Opening Balance', isOpening: true, by: (read(KEYS.USER, null) || {}).name || 'System' });
    }
    return getStockItem(item.id);
  }
  function updateStockItem(id, patch) {
    const list = getStockItems();
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
    saveStockItems(list);
    return list[idx];
  }
  function deleteStockItem(id) {
    saveStockItems(getStockItems().filter(s => s.id !== id));
    write(KEYS.STOCK_TXN, getStockTxns().filter(t => t.itemId !== id));
  }

  function getStockTxns() { return read(KEYS.STOCK_TXN, []); }
  function addStockTxn(txn) {
    const item = getStockItem(txn.itemId);
    if (!item) return null;
    const delta = txn.type === 'IN' ? txn.qty : -txn.qty;
    const newStock = Math.max(0, (item.currentStock || 0) + delta);
    updateStockItem(item.id, { currentStock: newStock });

    const txns = getStockTxns();
    txn.id = 'T' + Date.now() + Math.floor(Math.random() * 1000);
    txn.createdAt = new Date().toISOString();
    txns.unshift(txn);
    write(KEYS.STOCK_TXN, txns);
    return txn;
  }

  // ---------------- Backup / Restore ----------------
  function exportAll() {
    return {
      batches: getBatches(),
      products: getProducts(),
      settings: getSettings(),
      users: getUsers(),
      stockItems: getStockItems(),
      stockTxns: getStockTxns(),
      exportedAt: new Date().toISOString(),
      app: 'RETORT PRO'
    };
  }
  function importAll(data) {
    if (data.batches) saveBatches(data.batches);
    if (data.products) saveProducts(data.products);
    if (data.settings) saveSettings(data.settings);
    if (data.users) saveUsers(data.users);
    if (data.stockItems) saveStockItems(data.stockItems);
    if (data.stockTxns) write(KEYS.STOCK_TXN, data.stockTxns);
  }

  // ---------------- OTP (in-app, device-local) ----------------
  // Since there's no server, OTP is generated in the browser, shown to the
  // user on-screen (or printed/spoken by the Admin), and verified locally.
  // It expires in 5 minutes and is single-use (cleared after verify).
  // This is appropriate security for a shared factory device — it prevents
  // accidental/casual login without the account owner's involvement.
  const OTP_KEY = 'rp_otp_store';
  function generateOTP(userId) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const record = { userId, code, expiresAt: Date.now() + 5 * 60 * 1000, used: false };
    const store = read(OTP_KEY, {});
    store[userId] = record;
    write(OTP_KEY, store);
    return code;
  }
  function verifyOTP(userId, code) {
    const store = read(OTP_KEY, {});
    const record = store[userId];
    if (!record) return { ok: false, reason: 'No OTP generated for this user' };
    if (record.used) return { ok: false, reason: 'OTP already used' };
    if (Date.now() > record.expiresAt) return { ok: false, reason: 'OTP expired (5 min limit)' };
    if (record.code !== String(code).trim()) return { ok: false, reason: 'Incorrect OTP' };
    store[userId].used = true;
    write(OTP_KEY, store);
    return { ok: true };
  }
  function clearOTP(userId) {
    const store = read(OTP_KEY, {});
    delete store[userId];
    write(OTP_KEY, store);
  }

  // ---------------- Admin cross-user data view ----------------
  // Batches store the operator name as a string. To let Admin filter by
  // user, we match batchNumber prefix (auto-generated) or operator field.
  function getBatchesByOperator(operatorName) {
    return getBatches().filter(b => (b.operator || '').toLowerCase() === (operatorName || '').toLowerCase());
  }
  function getStockTxnsByUser(userName) {
    return getStockTxns().filter(t => (t.by || '').toLowerCase() === (userName || '').toLowerCase());
  }

  return {
    KEYS, getBatches, saveBatches, getBatch, addBatch, updateBatch, deleteBatch, nextBatchNumber,
    getProducts, saveProducts, getSettings, saveSettings,
    getCurrentUser, setCurrentUser, clearCurrentUser, getUsers, saveUsers,
    findUserByContact, findUserById, addUserRecord, removeUserRecord, countAdmins,
    randomSalt, hashPin, verifyPin,
    generateOTP, verifyOTP, clearOTP,
    getBatchesByOperator, getStockTxnsByUser,
    getStockItems, saveStockItems, getStockItem, addStockItem, updateStockItem, deleteStockItem,
    getStockTxns, addStockTxn,
    exportAll, importAll
  };
})();
