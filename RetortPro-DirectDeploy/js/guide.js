/* ==========================================================================
   guide.js — Process Guide: SOP per packaging format, HACCP/CCP, mistakes
   ========================================================================== */
const Guide = (() => {
  const SOP = {
    'Can': {
      icon:'bi-inboxes-fill',
      steps: ['Inspect empty cans for seam defects, dents and rust before filling.',
        'Fill product to specified fill weight leaving correct headspace.',
        'Exhaust or steam-flow closure to remove headspace air (for thermal exhausting lines).',
        'Seam the can immediately; verify double-seam parameters every 30 minutes.',
        'Load sealed cans into retort crates in the approved stacking pattern.',
        'Close retort door and confirm gasket seal before starting cycle.',
        'Vent the retort fully per schedule to purge air before come-up begins.',
        'Bring retort to process temperature within the specified come-up time.',
        'Hold at process temperature for the full scheduled holding time — do not shortcut.',
        'Cool under counter-pressure air/water to prevent can paneling or seam strain.',
        'Dry cans on the discharge conveyor to prevent external corrosion.',
        'Inspect a sample for seam integrity, denting and swelling before casing.',
        'Store in a dry, ventilated warehouse away from direct sunlight.'],
      ccp: ['Retort come-up and holding time/temperature is the Critical Control Point for commercial sterility.','Double seam integrity is a CCP for post-process container integrity.'],
      mistakes: ['Overfilling reduces headspace and risks seam damage.','Skipping venting causes cold spots and under-processing.','Rapid cooling without counter-pressure causes can peaking or seam strain.']
    },
    'Glass Bottle': {
      icon:'bi-cup-straw',
      steps: ['Inspect bottles for cracks, chips or thermal stress marks.',
        'Fill to correct fill weight, leaving adequate headspace for expansion.',
        'Cap or lid the bottle ensuring proper torque/vacuum seal.',
        'Load bottles into retort crates with dividers to avoid glass-to-glass contact.',
        'Use a slow, controlled come-up rate to avoid thermal shock.',
        'Hold at process temperature for the scheduled holding time.',
        'Cool gradually under water spray with counter-air pressure to prevent breakage.',
        'Inspect for cracked glass, popped lids or loss of vacuum after cooling.',
        'Label and case only fully dried, inspected bottles.'],
      ccp: ['Controlled come-up/cool-down rate is a CCP to prevent thermal shock breakage.','Cap seal/vacuum is a CCP for container integrity.'],
      mistakes: ['Fast heating/cooling causes glass breakage.','Insufficient counter-pressure during cooling can pop lids.']
    },
    'Vacuum Pouch': {
      icon:'bi-bag-fill',
      steps: ['Inspect pouch material for pinholes or seal-area contamination.',
        'Fill product avoiding contamination of the seal area.',
        'Draw full vacuum before sealing to eliminate entrapped air.',
        'Heat seal and verify seal width and strength.',
        'Load pouches flat, single-layer, in the retort basket to ensure uniform heat transfer.',
        'Come up to process temperature using water immersion or cascade retort.',
        'Hold for the scheduled time — pouches heat and cool faster than rigid packs.',
        'Cool fully under water spray/immersion before removal from retort.',
        'Inspect every pouch for seal integrity and leaks before packing.'],
      ccp: ['Seal integrity is the primary CCP for vacuum pouches.','Vacuum level prior to sealing is a CCP affecting heat penetration.'],
      mistakes: ['Product or liquid trapped in the seal area causes seal failure.','Overlapping pouches in the retort basket blocks heat penetration.']
    },
    'Ready To Eat Pouch': {
      icon:'bi-basket2-fill',
      steps: ['Inspect laminate pouches for print/seal defects.',
        'Fill to exact fill weight for uniform heat penetration.',
        'Vacuum and heat seal; test seal strength on samples.',
        'Rack pouches vertically or lay flat per validated retort pattern.',
        'Run validated come-up and holding schedule for the product/pouch size.',
        'Hold at process temperature for the full scheduled time.',
        'Cool under water spray with counter-pressure to protect the seal.',
        'Perform incubation/hold-and-test sampling per QA plan.',
        'Pack only pouches that pass visual and seal inspection.'],
      ccp: ['Retort schedule validated for the specific pouch thickness/size is a CCP.','Seal strength testing is a CCP for shelf-stability.'],
      mistakes: ['Using a schedule validated for a different pouch size.','Skipping incubation testing on a new product/pouch combination.']
    },
    'Cup Tray': {
      icon:'bi-cup-fill',
      steps: ['Inspect cups/trays and lidding film for defects.',
        'Fill product to fill-weight tolerance.',
        'Heat-seal or induction-seal the lidding film.',
        'Load into retort crates without stacking overlap.',
        'Come up to process temperature per validated schedule.',
        'Hold for the scheduled holding time.',
        'Cool under water spray with counter-pressure to prevent lid doming or delamination.',
        'Inspect lid seal and check for leakage before casing.'],
      ccp: ['Lid seal integrity is a CCP.','Come-up/holding schedule validated for the cup depth is a CCP.'],
      mistakes: ['Stacking trays blocks heat penetration to the center layer.','Rapid depressurization can burst or dome lids.']
    },
    'PP Bowl': {
      icon:'bi-egg-fried',
      steps: ['Inspect PP bowls for warping or contamination.',
        'Fill to specified weight and headspace.',
        'Seal with heat-seal film rated for retort temperatures.',
        'Load flat in single layers into the retort crate.',
        'Run the validated come-up and holding schedule.',
        'Cool under counter-pressure water spray.',
        'Inspect seal and bowl shape (no warping) before labeling.'],
      ccp: ['Film seal integrity at retort temperature is a CCP.','Bowl material heat-resistance rating is a CCP.'],
      mistakes: ['Using bowls not rated for retort temperature causes deformation.']
    },
    'PET Jar': {
      icon:'bi-droplet-fill',
      steps: ['Inspect PET jars for stress marks or deformation.',
        'Fill to correct fill weight and headspace.',
        'Cap and verify torque/seal.',
        'Load with dividers to prevent jar-to-jar contact.',
        'Use gradual come-up to avoid thermal deformation of PET.',
        'Hold at validated process temperature (PET has lower max temp tolerance).',
        'Cool gradually under counter-pressure.',
        'Inspect for deformation, cap seal and vacuum before casing.'],
      ccp: ['Maximum process temperature vs PET heat tolerance is a CCP.','Cap torque/seal is a CCP.'],
      mistakes: ['Exceeding PET-safe process temperature causes jar deformation.']
    },
    'Aluminium Tray': {
      icon:'bi-square-fill',
      steps: ['Inspect trays for dents or coating damage.',
        'Fill to specified weight.',
        'Double-seam or heat-seal lid per tray design.',
        'Load into retort crates in approved stacking pattern.',
        'Run come-up and holding schedule for the tray depth.',
        'Cool under counter-pressure to protect the seam.',
        'Inspect seam/seal and tray shape before casing.'],
      ccp: ['Seam/seal integrity is a CCP.','Schedule validated for tray depth is a CCP.'],
      mistakes: ['Deep trays processed with a shallow-tray schedule under-process the center.']
    },
    'Aluminium Pouch': {
      icon:'bi-bookmark-fill',
      steps: ['Inspect foil-laminate pouches for pinholes, delamination or seal-area creases.',
        'Fill product avoiding contamination of the inner seal area with liquid or particulates.',
        'Draw vacuum (where specified) and heat-seal; the aluminium foil layer blocks light and oxygen completely.',
        'Verify seal width and check for foil crease-cracking at the seal, a common foil-specific defect.',
        'Load pouches flat, single-layer, in the retort basket for even heat transfer.',
        'Run the validated come-up and holding schedule for the pouch thickness and product viscosity.',
        'Hold at process temperature for the full scheduled holding time.',
        'Cool fully under water spray with counter-pressure to protect the foil seal.',
        'Inspect every pouch for seal integrity, foil cracks and leaks before packing.'],
      ccp: ['Seal integrity across the foil layer is the primary CCP — foil creases at the seal are a common failure point.','Schedule validated for the specific pouch thickness is a CCP.'],
      mistakes: ['Sharp folds or creases in the foil at the seal line crack the barrier layer.','Metal detection is not usable downstream — visual/seal inspection must be relied on instead.']
    },
    'Retortable Tray': {
      icon:'bi-grid-3x3-gap-fill',
      steps: ['Inspect multi-layer retortable trays for seal-area contamination.',
        'Fill to fill-weight tolerance leaving correct headspace.',
        'Heat-seal lidding film; verify seal width.',
        'Load flat in single layers into the retort crate.',
        'Run validated come-up/holding schedule for tray depth and product viscosity.',
        'Hold for the full scheduled holding time.',
        'Cool under water spray with counter-pressure to protect the seal.',
        'Inspect every tray for seal defects and leakage before packing.'],
      ccp: ['Seal integrity is the primary CCP.','Schedule validated for tray depth/product viscosity is a CCP.'],
      mistakes: ['Uneven fill weight across trays causes inconsistent heat penetration.','Stacking trays during retort blocks heat transfer.']
    }
  };

  function render() {
    const keys = Object.keys(SOP);
    return `
    <div class="section-title mb-3"><i class="bi bi-journal-text"></i> Process Guide — Standard Operating Procedures</div>
    <ul class="nav nav-tabs mb-3" id="guideTabs">
      ${keys.map((k,i)=>`<li class="nav-item"><button class="nav-link ${i===0?'active':''}" data-key="${k}">${k}</button></li>`).join('')}
    </ul>
    <div id="guideContent"></div>`;
  }

  function renderPackaging(key) {
    const d = SOP[key];
    return `
    <div class="row g-3">
      <div class="col-lg-7">
        <div class="card-surface p-3">
          <div class="section-title"><i class="bi ${d.icon}"></i> ${key} — Standard Operating Procedure</div>
          ${d.steps.map((s,i)=>`<div class="sop-step"><div class="step-num">${i+1}</div><div>${s}</div></div>`).join('')}
        </div>
      </div>
      <div class="col-lg-5">
        <div class="card-surface p-3 mb-3">
          <div class="section-title"><i class="bi bi-shield-fill-exclamation"></i> HACCP / Critical Control Points</div>
          ${d.ccp.map(c=>`<div class="alert-warning-line"><i class="bi bi-flag-fill"></i>${c}</div>`).join('')}
        </div>
        <div class="card-surface p-3">
          <div class="section-title"><i class="bi bi-exclamation-triangle-fill"></i> Common Mistakes</div>
          ${d.mistakes.map(m=>`<div class="alert-danger-line"><i class="bi bi-x-octagon-fill"></i>${m}</div>`).join('')}
        </div>
      </div>
    </div>`;
  }

  function init() {
    const tabs = document.querySelectorAll('#guideTabs .nav-link');
    const first = tabs[0].dataset.key;
    document.getElementById('guideContent').innerHTML = renderPackaging(first);
    tabs.forEach(t => t.addEventListener('click', () => {
      tabs.forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      document.getElementById('guideContent').innerHTML = renderPackaging(t.dataset.key);
    }));
  }

  return { render, init };
})();
