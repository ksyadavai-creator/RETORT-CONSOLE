/* ==========================================================================
   products.js — Product Library (100+ retort products) + generator
   Each base product is expanded across its typical packaging formats to
   produce realistic, distinct process parameter sets (this is how retort
   process authorities actually differ a product: by pack format).
   ========================================================================== */
const Products = (() => {

  // Base products grouped by category (category drives default kinetics)
  const BASE = [
    // Pulses / Dal / Legumes
    ['Yellow Dal Tadka','Legume'], ['Chana Dal','Legume'], ['Rajma Masala','Legume'],
    ['Chole Masala','Legume'], ['Black Dal Makhani','Legume'], ['Moong Dal','Legume'],
    ['Toor Dal','Legume'], ['Lobia Curry','Legume'], ['Green Peas Curry','Legume'],
    ['Sprouts Curry','Legume'],
    // Rice / Grain
    ['Jeera Rice','Grain'], ['Veg Pulao','Grain'], ['Khichdi','Grain'],
    ['Lemon Rice','Grain'], ['Biryani Rice','Grain'], ['Curd Rice','Grain'],
    // Vegetable Curry
    ['Mixed Vegetable Curry','VegCurry'], ['Paneer Butter Masala','VegCurry'],
    ['Aloo Matar','VegCurry'], ['Baingan Bharta','VegCurry'], ['Bhindi Masala','VegCurry'],
    ['Kadai Paneer','VegCurry'], ['Palak Paneer','VegCurry'], ['Malai Kofta','VegCurry'],
    ['Corn Curry','VegCurry'], ['Mushroom Masala','VegCurry'],
    // Non-Veg Curry
    ['Chicken Curry','NonVeg'], ['Butter Chicken','NonVeg'], ['Chicken Tikka Masala','NonVeg'],
    ['Fish Curry','NonVeg'], ['Mutton Curry','NonVeg'], ['Egg Curry','NonVeg'],
    ['Prawn Masala','NonVeg'], ['Keema Curry','NonVeg'],
    // Soup
    ['Tomato Soup','Soup'], ['Sweet Corn Soup','Soup'], ['Mixed Veg Soup','Soup'],
    ['Chicken Clear Soup','Soup'], ['Mushroom Soup','Soup'],
    // Sauce / Puree
    ['Tomato Puree','Sauce'], ['Pasta Sauce','Sauce'], ['Pizza Sauce','Sauce'],
    ['Mango Pulp','Sauce'], ['Schezwan Sauce','Sauce'], ['White Sauce','Sauce'],
    // Baby Food / Dairy
    ['Baby Food Cereal Mix','BabyFood'], ['Baby Food Fruit Mix','BabyFood'],
    ['Flavoured Milk','Dairy'], ['Rice Kheer','Dairy'], ['Rabri','Dairy'],
    // Pet Food
    ['Pet Food Chicken & Rice','PetFood'], ['Pet Food Beef Chunks','PetFood'],
    ['Pet Food Fish & Vegetable','PetFood'],
    // Fruit (true acid fruit — pH < 4.6, pasteurization-grade schedule)
    ['Fruit Cocktail in Syrup','Fruit'], ['Pineapple Slices','Fruit'], ['Mango Slices in Syrup','Fruit'],
    ['Guava Halves in Syrup','Fruit'], ['Litchi in Syrup','Fruit'],
    // Vegetable (low-acid — pH > 4.6, needs FULL retort schedule like Legume, not fruit-style)
    ['Sweet Corn Kernels','Vegetable'], ['Sweet Corn Cob','Vegetable'], ['Baby Corn Brine','Vegetable'],
    ['Green Beans Plain','Vegetable'], ['Mixed Vegetables Plain','Vegetable'], ['Carrot Peas Plain','Vegetable'],
    ['Whole Potatoes Brine','Vegetable'], ['Green Peas Plain','Vegetable']
  ];

  const PACK_BY_CATEGORY = {
    Legume: ['Can','Retortable Tray','Vacuum Pouch'],
    Grain: ['Cup Tray','Retortable Tray','PP Bowl'],
    VegCurry: ['Retortable Tray','Vacuum Pouch','Can'],
    NonVeg: ['Retortable Tray','Can','Aluminium Pouch'],
    Soup: ['Cup Tray','Can','PET Jar'],
    Sauce: ['Glass Bottle','PET Jar','Vacuum Pouch'],
    BabyFood: ['Glass Bottle','Cup Tray'],
    Dairy: ['Cup Tray','Glass Bottle'],
    PetFood: ['Can','Aluminium Tray','Aluminium Pouch'],
    Fruit: ['Can','Glass Bottle'],
    Vegetable: ['Can','Aluminium Pouch','Retortable Tray']
  };

  // Category kinetics profile: [retortTempRange, holdingTimeRange(min), pressureRange(bar),
  //                             targetF0Range, pH, waterActivity]
  const PROFILE = {
    Legume:   { rt:[121,124], ht:[18,28], pr:[1.6,2.0], f0:[6,8],  ph:[5.8,6.4], wa:[0.97,0.99] },
    Grain:    { rt:[121,123], ht:[20,30], pr:[1.5,1.9], f0:[6,8],  ph:[6.0,6.5], wa:[0.97,0.99] },
    VegCurry: { rt:[121,124], ht:[15,25], pr:[1.6,2.1], f0:[5,7],  ph:[5.5,6.0], wa:[0.97,0.98] },
    NonVeg:   { rt:[122,126], ht:[25,40], pr:[1.8,2.3], f0:[8,12], ph:[5.8,6.3], wa:[0.97,0.99] },
    Soup:     { rt:[121,123], ht:[12,18], pr:[1.4,1.8], f0:[4,6],  ph:[4.6,5.2], wa:[0.98,0.99] },
    Sauce:    { rt:[118,121], ht:[10,16], pr:[1.2,1.6], f0:[3,5],  ph:[3.8,4.3], wa:[0.98,0.99] },
    BabyFood: { rt:[121,123], ht:[15,22], pr:[1.5,1.8], f0:[6,8],  ph:[4.8,5.5], wa:[0.98,0.99] },
    Dairy:    { rt:[118,121], ht:[10,15], pr:[1.3,1.6], f0:[4,6],  ph:[6.2,6.8], wa:[0.98,0.99] },
    PetFood:  { rt:[122,126], ht:[30,45], pr:[1.9,2.4], f0:[9,13], ph:[5.6,6.2], wa:[0.98,0.99] },
    Fruit:    { rt:[100,105], ht:[10,20], pr:[0.5,1.0], f0:[2,4],  ph:[3.4,4.0], wa:[0.98,0.99] },
    Vegetable:{ rt:[121,124], ht:[20,35], pr:[1.6,2.1], f0:[6,9],  ph:[5.5,6.5], wa:[0.98,0.99] }
  };

  function rnd(min, max, decimals = 1) {
    const v = min + Math.random() * (max - min);
    return Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function fillWeightFor(pack) {
    const table = {
      'Can': [280,450], 'Vacuum Pouch': [150,300], 'Ready To Eat Pouch': [200,350],
      'Glass Bottle': [200,500], 'Cup Tray': [150,250], 'PP Bowl': [200,300],
      'PET Jar': [250,500], 'Aluminium Tray': [250,400], 'Retortable Tray': [250,400],
      'Aluminium Pouch': [180,320]
    };
    const r = table[pack] || [200,350];
    return Math.round(rnd(r[0], r[1], 0));
  }

  function generate() {
    const list = [];
    let idx = 1;
    BASE.forEach(([name, cat]) => {
      const packs = PACK_BY_CATEGORY[cat] || ['Can'];
      const prof = PROFILE[cat];
      // Whole-piece / large-particulate items heat by slow conduction to the
      // geometric center, so they need extra holding time and a bigger jar/pouch.
      const isWholePiece = /Cob|Whole Potatoes|Litchi|Guava Halves/i.test(name);

      packs.forEach(pack => {
        const retortTemp = rnd(prof.rt[0], prof.rt[1], 1);
        let holdingTime = Math.round(rnd(prof.ht[0], prof.ht[1], 0));
        const pressure = rnd(prof.pr[0], prof.pr[1], 2);
        let targetF0 = rnd(prof.f0[0], prof.f0[1], 1);
        const ph = rnd(prof.ph[0], prof.ph[1], 2);
        const wa = rnd(prof.wa[0], prof.wa[1], 2);
        let fillWeight = fillWeightFor(pack);

        if (isWholePiece) {
          holdingTime = Math.round(holdingTime * 1.4);   // slower conduction heating
          targetF0 = Math.round((targetF0 + 1) * 10) / 10;
          fillWeight = Math.round(fillWeight * 1.3);      // whole pieces per pack = more weight
        }

        list.push({
          id: 'P' + String(idx).padStart(4, '0'),
          name, category: cat,
          packaging: pack,
          fillWeight,
          headspace: Math.round(rnd(4, 12, 0)),
          initialTemp: Math.round(rnd(18, 55, 0)),
          retortTemp,
          holdingTime,
          pressure,
          coolingTime: Math.round(rnd(15, 30, 0)),
          targetF0,
          ph,
          waterActivity: wa,
          remarks: (ph < 4.6
            ? 'Acid food — process for commercial sterility per pasteurization schedule.'
            : 'Low-acid food — full retort schedule mandatory to achieve 12D Cl. botulinum reduction.')
            + (isWholePiece ? ' Whole-piece format heats by slow conduction — holding time and F0 target increased above the diced/kernel equivalent to guarantee center-point lethality.' : '')
        });
        idx++;
      });
    });
    return list;
  }

  const CATALOG_VERSION = 2; // bump this whenever BASE/PROFILE/PACK_BY_CATEGORY changes,
                              // so returning users automatically get the refreshed product data
  function ensureSeeded() {
    const storedVersion = parseInt(localStorage.getItem('rp_products_version') || '0', 10);
    let list = DB.getProducts();
    if (!list || list.length < 100 || storedVersion < CATALOG_VERSION) {
      list = generate();
      DB.saveProducts(list);
      localStorage.setItem('rp_products_version', String(CATALOG_VERSION));
    }
    return list;
  }

  function all() { return ensureSeeded(); }

  function search(query, category, packaging) {
    let list = all();
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    if (category) list = list.filter(p => p.category === category);
    if (packaging) list = list.filter(p => p.packaging === packaging);
    return list;
  }

  function byId(id) { return all().find(p => p.id === id); }
  function byName(name) { return all().find(p => p.name === name); }
  function categories() { return Object.keys(PROFILE); }

  return { ensureSeeded, all, search, byId, byName, categories, PACK_BY_CATEGORY };
})();


/* ---------------- Product Library View ---------------- */
const ProductsView = (() => {
  function render() {
    const cats = Products.categories();
    return `
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <div class="section-title mb-0"><i class="bi bi-box-seam-fill"></i> Product Library <span class="chip ms-2">${Products.all().length} entries</span></div>
      <div class="d-flex gap-2 flex-wrap">
        <input type="text" class="form-control form-control-sm" id="prodSearch" placeholder="Search product..." style="width:200px">
        <select class="form-select form-select-sm" id="prodCategory" style="width:160px"><option value="">All Categories</option>${cats.map(c=>`<option>${c}</option>`).join('')}</select>
        <select class="form-select form-select-sm" id="prodPackaging" style="width:170px"><option value="">All Packaging</option>${BatchView.PACKAGING_TYPES.map(p=>`<option>${p}</option>`).join('')}</select>
      </div>
    </div>
    <div class="row g-3" id="prodGrid"></div>
    <div class="modal fade" id="prodModal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content" id="prodModalContent"></div>
      </div>
    </div>`;
  }

  function cardHtml(p) {
    return `
    <div class="col-md-6 col-xl-4">
      <div class="card-surface p-3 product-card h-100" onclick="ProductsView.openDetail('${p.id}')">
        <div class="d-flex justify-content-between align-items-start mb-1">
          <strong>${p.name}</strong>
          <span class="chip">${p.category}</span>
        </div>
        <div class="text-muted small mb-2"><i class="bi bi-box2-heart me-1"></i>${p.packaging}</div>
        <div class="row small g-1">
          <div class="col-6">Target F0: <strong class="mono">${p.targetF0}</strong></div>
          <div class="col-6">Retort Temp: <strong class="mono">${p.retortTemp}°C</strong></div>
          <div class="col-6">Holding: <strong class="mono">${p.holdingTime} min</strong></div>
          <div class="col-6">pH: <strong class="mono">${p.ph}</strong></div>
        </div>
      </div>
    </div>`;
  }

  function detailHtml(p) {
    return `
      <div class="modal-header">
        <h5 class="modal-title">${p.name} <span class="chip ms-2">${p.packaging}</span></h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="row g-3">
          <div class="col-6"><small class="text-muted d-block">Category</small><strong>${p.category}</strong></div>
          <div class="col-6"><small class="text-muted d-block">Fill Weight</small><strong>${p.fillWeight} g</strong></div>
          <div class="col-6"><small class="text-muted d-block">Headspace</small><strong>${p.headspace} mm</strong></div>
          <div class="col-6"><small class="text-muted d-block">Initial Temp</small><strong>${p.initialTemp} °C</strong></div>
          <div class="col-6"><small class="text-muted d-block">Retort Temp</small><strong>${p.retortTemp} °C</strong></div>
          <div class="col-6"><small class="text-muted d-block">Holding Time</small><strong>${p.holdingTime} min</strong></div>
          <div class="col-6"><small class="text-muted d-block">Pressure</small><strong>${p.pressure} bar</strong></div>
          <div class="col-6"><small class="text-muted d-block">Cooling Time</small><strong>${p.coolingTime} min</strong></div>
          <div class="col-6"><small class="text-muted d-block">Target F0</small><strong>${p.targetF0}</strong></div>
          <div class="col-6"><small class="text-muted d-block">pH</small><strong>${p.ph}</strong></div>
          <div class="col-6"><small class="text-muted d-block">Water Activity</small><strong>${p.waterActivity}</strong></div>
        </div>
        <hr>
        <small class="text-muted d-block mb-1">Remarks</small>
        <p class="mb-0">${p.remarks}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="ProductsView.useInBatch('${p.id}')"><i class="bi bi-plus-square me-1"></i>Use in New Batch</button>
      </div>`;
  }

  function refreshGrid() {
    const q = document.getElementById('prodSearch').value;
    const cat = document.getElementById('prodCategory').value;
    const pack = document.getElementById('prodPackaging').value;
    const list = Products.search(q, cat, pack);
    document.getElementById('prodGrid').innerHTML = list.length ? list.map(cardHtml).join('') : '<p class="text-muted text-center py-5 w-100">No products match your filters.</p>';
  }

  function openDetail(id) {
    const p = Products.byId(id);
    document.getElementById('prodModalContent').innerHTML = detailHtml(p);
    new bootstrap.Modal(document.getElementById('prodModal')).show();
  }

  function useInBatch(id) {
    const p = Products.byId(id);
    App.navigate('batch');
    setTimeout(() => {
      document.getElementById('f_productName').value = p.name;
      document.getElementById('f_packaging').value = p.packaging;
      document.getElementById('f_retortTemp').value = p.retortTemp;
      document.getElementById('f_holdingTime').value = p.holdingTime;
      document.getElementById('f_pressure').value = p.pressure;
      document.getElementById('f_coolingTime').value = p.coolingTime;
      document.getElementById('f_targetF0').value = p.targetF0;
      document.getElementById('f_initTemp').value = p.initialTemp;
      App.toast(`Loaded ${p.name} defaults into New Batch form`, 'success');
    }, 150);
  }

  function init() {
    refreshGrid();
    document.getElementById('prodSearch').addEventListener('input', refreshGrid);
    document.getElementById('prodCategory').addEventListener('change', refreshGrid);
    document.getElementById('prodPackaging').addEventListener('change', refreshGrid);
  }

  return { render, init, openDetail, useInBatch };
})();
