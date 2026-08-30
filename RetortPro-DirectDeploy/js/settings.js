/* ==========================================================================
   settings.js — Company profile, units, language, theme, backup/restore
   ========================================================================== */
const SettingsView = (() => {
  function render() {
    const s = DB.getSettings();
    return `
    <div class="section-title mb-3"><i class="bi bi-sliders"></i> Settings</div>
    <div class="row g-3">
      <div class="col-lg-6">
        <div class="card-surface p-3 mb-3">
          <div class="section-title"><i class="bi bi-building"></i> Company Profile</div>
          <label class="form-label">Company Name</label>
          <input type="text" class="form-control mb-3" id="s_companyName" value="${s.companyName}">
          <label class="form-label">Company Logo</label>
          <input type="file" accept="image/*" class="form-control mb-2" id="s_companyLogo">
          <div id="logoPreview">${s.companyLogo ? `<img src="${s.companyLogo}" style="height:50px;border-radius:6px">` : '<small class="text-muted">No logo uploaded</small>'}</div>
        </div>
        <div class="card-surface p-3">
          <div class="section-title"><i class="bi bi-globe"></i> Preferences</div>
          <div class="row g-3">
            <div class="col-6">
              <label class="form-label">Units</label>
              <select class="form-select" id="s_units"><option ${s.units==='Metric'?'selected':''}>Metric</option><option ${s.units==='Imperial'?'selected':''}>Imperial</option></select>
            </div>
            <div class="col-6">
              <label class="form-label">Language</label>
              <select class="form-select" id="s_language"><option ${s.language==='English'?'selected':''}>English</option><option ${s.language==='Hindi'?'selected':''}>Hindi</option></select>
            </div>
            <div class="col-6">
              <label class="form-label">Reference Temp (°C)</label>
              <input type="number" step="0.1" class="form-control" id="s_refTemp" value="${s.refTemp}">
            </div>
            <div class="col-6">
              <label class="form-label">Default z Value</label>
              <input type="number" step="0.1" class="form-control" id="s_zValue" value="${s.zValue}">
            </div>
          </div>
          <button class="btn btn-primary mt-3" id="btnSaveSettings"><i class="bi bi-save-fill me-1"></i>Save Settings</button>
        </div>
      </div>
      <div class="col-lg-6">
        <div class="card-surface p-3 mb-3">
          <div class="section-title"><i class="bi bi-moon-stars-fill"></i> Theme</div>
          <div class="btn-group w-100" role="group">
            <button class="btn btn-outline-primary ${s.theme==='light'?'active':''}" id="themeLight"><i class="bi bi-sun-fill me-1"></i>Light</button>
            <button class="btn btn-outline-primary ${s.theme==='dark'?'active':''}" id="themeDark"><i class="bi bi-moon-stars-fill me-1"></i>Dark</button>
          </div>
        </div>
        <div class="card-surface p-3">
          <div class="section-title"><i class="bi bi-hdd-fill"></i> Backup &amp; Restore</div>
          <p class="text-muted small">All batch, product and settings data is stored locally in this browser. Export a backup file regularly.</p>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-outline-primary" id="btnBackup"><i class="bi bi-download me-1"></i>Download Backup (.json)</button>
            <label class="btn btn-outline-secondary mb-0">
              <i class="bi bi-upload me-1"></i>Restore from File
              <input type="file" accept=".json" id="btnRestore" class="d-none">
            </label>
          </div>
          <hr>
          <button class="btn btn-outline-danger btn-sm" id="btnFactoryReset"><i class="bi bi-exclamation-triangle me-1"></i>Erase All Local Data</button>
        </div>
      </div>
    </div>`;
  }

  function init() {
    document.getElementById('s_companyLogo').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { document.getElementById('logoPreview').innerHTML = `<img src="${reader.result}" style="height:50px;border-radius:6px">`; document.getElementById('logoPreview').dataset.value = reader.result; };
      reader.readAsDataURL(file);
    });

    document.getElementById('btnSaveSettings').addEventListener('click', () => {
      const s = DB.getSettings();
      s.companyName = document.getElementById('s_companyName').value;
      const logoImg = document.getElementById('logoPreview').querySelector('img');
      if (logoImg) s.companyLogo = logoImg.src;
      s.units = document.getElementById('s_units').value;
      s.language = document.getElementById('s_language').value;
      s.refTemp = parseFloat(document.getElementById('s_refTemp').value) || 121.1;
      s.zValue = parseFloat(document.getElementById('s_zValue').value) || 10;
      DB.saveSettings(s);
      App.toast('Settings saved', 'success');
    });

    document.getElementById('themeLight').addEventListener('click', () => App.setTheme('light'));
    document.getElementById('themeDark').addEventListener('click', () => App.setTheme('dark'));

    document.getElementById('btnBackup').addEventListener('click', () => {
      const data = DB.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `RetortPro_Backup_${Date.now()}.json`;
      a.click();
      App.toast('Backup downloaded', 'success');
    });

    document.getElementById('btnRestore').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          DB.importAll(data);
          App.toast('Data restored — reloading', 'success');
          setTimeout(() => location.reload(), 900);
        } catch (err) { App.toast('Invalid backup file', 'danger'); }
      };
      reader.readAsText(file);
    });

    document.getElementById('btnFactoryReset').addEventListener('click', () => {
      if (confirm('This will permanently erase all batches, products and settings from this browser. Continue?')) {
        localStorage.clear();
        location.reload();
      }
    });
  }

  return { render, init };
})();
