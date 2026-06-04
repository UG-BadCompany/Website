(() => {
  const esc = (value = '') => (window.TAModuleKit?.escapeHtml ? TAModuleKit.escapeHtml(value) : String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
  const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
  const pct = (value) => {
    const number = Number(value || 0);
    return `${Math.round(number <= 1 ? number * 100 : number)}%`;
  };
  const confidenceValue = (plan = {}) => {
    const c = plan.confidenceBreakdown || {};
    return Number(c.overallConfidence ?? plan.confidenceScore ?? 0);
  };
  const confidenceLevel = (plan = {}) => {
    const normalized = confidenceValue(plan);
    const score = normalized <= 1 ? normalized * 100 : normalized;
    if (score >= 75) return { label: 'High Confidence', className: 'high' };
    if (score >= 45) return { label: 'Medium Confidence', className: 'medium' };
    return { label: 'Low Confidence', className: 'low' };
  };
  const describeItem = (item) => {
    if (typeof item === 'string') return item;
    if (item.cause) return `${item.cause}${item.probability !== undefined ? ` — ${item.probability}%` : item.probabilityPercent !== undefined ? ` — ${item.probabilityPercent}%` : ''}`;
    if (item.test) return `${item.test}${item.expectedReading ? ` — Expected: ${item.expectedReading}` : ''}${item.tool ? ` — Tool: ${item.tool}` : ''}`;
    if (item.step) return `${item.step}${item.expected ? ` — Expected: ${item.expected}` : ''}`;
    if (item.part) return `${item.part}${item.reason ? ` — ${item.reason}` : ''}`;
    if (item.title || item.url) return `${item.title || item.url}${item.url ? ` — ${item.url}` : ''}`;
    return item.name || item.label || JSON.stringify(item);
  };
  const badge = (label, className = '') => `<span class="trouble-badge ${esc(className)}">${esc(label)}</span>`;
  const renderList = (title, items, { icon = '•', className = '' } = {}) => {
    const rows = asArray(items).filter(Boolean).map((item) => `<li>${esc(describeItem(item))}</li>`).join('') || '<li>Not provided. Confirm on site before quoting.</li>';
    return `<section class="trouble-section ${esc(className)}"><div class="trouble-section-head"><h4><span class="section-icon">${esc(icon)}</span> ${esc(title)}</h4></div><ul>${rows}</ul></section>`;
  };
  const renderText = (title, text, { icon = '•', className = '' } = {}) => `<section class="trouble-section ${esc(className)}"><div class="trouble-section-head"><h4><span class="section-icon">${esc(icon)}</span> ${esc(title)}</h4></div><p>${esc(text || 'Not provided. Confirm with manufacturer data and field readings.')}</p></section>`;
  const renderMode = (mode = {}) => `<div class="technician-modes"><article class="tech-mode-card"><h4>⚡ Quick Mode</h4>${renderList('Homeowner-safe checks', mode.quickFix || mode.quick || [])}</article><article class="tech-mode-card"><h4>🧪 Advanced Mode</h4>${renderList('Field technician diagnostics', mode.advancedDiagnosis || mode.advanced || [])}</article><article class="tech-mode-card"><h4>🎯 Expert Mode</h4>${renderList('Factory-service diagnostics', mode.expertMode || mode.expert || [])}</article></div>`;
  const renderStatus = (items = []) => `<div class="research-status"><h4>Research Status</h4>${asArray(items).map((item) => `<span class="research-pill ${esc(item.state || 'pending')}">${esc(item.label || item)} <strong>${esc(item.state || 'done')}</strong></span>`).join('') || '<span class="research-pill skipped">Research status unavailable <strong>needs confirmation</strong></span>'}</div>`;
  const renderConfidence = (plan = {}) => {
    const c = plan.confidenceBreakdown || {};
    return `<div class="analysis-grid confidence-grid"><span>Research Confidence<strong>${pct(c.researchConfidence ?? plan.confidenceScore)}</strong></span><span>Equipment Confidence<strong>${pct(c.equipmentConfidence ?? c.modelMatch ?? 0)}</strong></span><span>Repair Confidence<strong>${pct(c.repairConfidence ?? 0)}</strong></span><span>Overall Confidence<strong>${pct(c.overallConfidence ?? plan.confidenceScore)}</strong></span><span>Model Match<strong>${pct(c.modelMatch ?? 0)}</strong></span><span>Manufacturer Match<strong>${pct(c.manufacturerMatch ?? 0)}</strong></span><span>Error Code Match<strong>${pct(c.errorCodeMatch ?? 0)}</strong></span><span>Data Completeness<strong>${pct(c.dataCompleteness ?? 0)}</strong></span></div>`;
  };
  const renderSummary = (plan = {}, payload = {}, response = {}) => {
    const id = plan.equipmentIdentification || {};
    const conf = confidenceLevel(plan);
    const sources = asArray(plan.researchSourcesUsed || response.researchContext?.sources).length;
    const hasSafety = asArray(plan.safetyWarnings).filter(Boolean).length > 0;
    return `<section class="summary-card"><div class="trouble-output-header"><div><h3>AI Diagnostic Workflow</h3><p>Scan the verified equipment, fault, and confidence before moving into diagnostic steps.</p></div><div class="trouble-badges">${badge(conf.label, conf.className)}${hasSafety ? badge('Safety', 'safety') : ''}${badge(sources ? 'Research Verified' : 'Needs Confirmation', sources ? 'verified' : 'medium')}</div></div><div class="summary-grid"><span class="summary-item">Manufacturer<strong>${esc(id.manufacturer || payload.manufacturer || 'Unknown')}</strong></span><span class="summary-item">Model<strong>${esc(id.model || payload.model || 'Unknown')}</strong></span><span class="summary-item">Equipment<strong>${esc(id.equipmentType || payload.component || payload.systemType || 'Unknown')}</strong></span><span class="summary-item">Error Code<strong>${esc(plan.errorCode || payload.errorCode || 'None provided')}</strong></span><span class="summary-item">Detected Fault<strong>${esc(plan.detectedFault || plan.firstThingToCheck || plan.summary || 'Not provided')}</strong></span><span class="summary-item">Overall Confidence<strong>${pct(confidenceValue(plan))}</strong></span></div></section>`;
  };
  const formMarkup = `<form id="trouble" class="module-card card stack trouble-form"><div class="trouble-form-head"><h3>Diagnostic inputs</h3><p>Keep the form compact, then run the workflow for a field-ready result panel.</p></div><div class="form-grid"><label class="field"><span>Trade</span><select name="systemType"><option>HVAC</option><option>Electrical</option><option>Plumbing</option><option>Appliance</option><option>Water Heater</option><option>Mini Split</option><option>Heat Pump</option><option>Boiler</option><option>Generator</option><option>Pool Equipment</option><option>Commercial RTU</option><option>VRF System</option><option>Roofing</option><option>Drywall</option><option>Painting</option><option>Flooring</option><option>Doors</option><option>Windows</option><option>Commercial Maintenance</option><option>Property Maintenance</option><option>Handyman</option></select></label><label class="field"><span>Equipment / Component</span><input name="component" placeholder="Mini split, condenser, water heater, breaker, generator"></label><label class="field"><span>Manufacturer</span><input name="manufacturer" placeholder="Daikin, Mitsubishi, Carrier, AO Smith, Generac"></label><label class="field"><span>Model Number</span><input name="model" placeholder="Exact model from nameplate"></label><label class="field"><span>Serial Number</span><input name="serial" placeholder="Serial number"></label><label class="field"><span>Approximate Age</span><input name="age" placeholder="Approximate age or install year"></label><label class="field form-row-wide"><span>Customer Complaint</span><textarea name="customerComplaint" placeholder="Example: No cooling, outdoor unit hums, indoor fan runs"></textarea></label><label class="field form-row-wide"><span>Symptoms Observed</span><textarea name="symptoms" placeholder="What you observed, when it fails, intermittent/constant, sounds, smells, leaks"></textarea></label><label class="field"><span>Error Code</span><input name="errorCode" placeholder="E3, P4, U4, FVS ignition lockout"></label><label class="field"><span>Technician Mode</span><select name="technicianModeRequested"><option value="expert">Expert Mode</option><option value="advanced">Advanced Mode</option><option value="quick">Quick Mode</option></select></label><label class="field form-row-wide"><span>Readings / Checked Already</span><textarea name="readings" placeholder="Voltage, amps, capacitor MFD, pressures, temperatures, resistance, checks already performed"></textarea></label><label class="field form-row-wide"><span>Photos / Video Metadata</span><textarea name="photos" placeholder="Photo file names/notes; video upload future-ready URL or notes"></textarea></label></div><button class="btn" type="submit">Run AI Diagnostic Workflow</button></form>`;
  window.TAModules.register({
    id:'worker.troubleshooting', role:'worker', title:'Troubleshooting', icon:'🧰', permissions:[],
    async mount({ root }) {
      root.innerHTML = `<section class="module-page stack ai-troubleshooting-2"><div class="module-hero module-header card"><div><p class="eyebrow">Worker AI Tools</p><h2 class="module-title">🧰 AI Troubleshooting 2.0</h2><p class="module-description">Research-backed diagnostics using trade, manufacturer, model/serial, age, complaint, symptoms, fault codes, photos, and technician mode.</p></div></div><div class="trouble-layout">${formMarkup}<div id="trouble-output" class="module-card card stack trouble-output"><h3>Diagnostic output</h3><p class="module-empty">Run the assistant to research manufacturer/model/error data, analyze findings, cache successful lookups, and build a technician-grade workflow.</p></div></div></section>`;
      root.querySelector('#trouble').onsubmit = async (event) => {
        event.preventDefault();
        const out = root.querySelector('#trouble-output');
        out.innerHTML = `<h3>Researching...</h3>${renderStatus(['Searching Manufacturer Data...', 'Searching Model Database...', 'Searching Error Code Database...', 'Analyzing Results...', 'Building Diagnostic Workflow...'])}<p class="module-loading">Validating inputs, checking cache, running online research, and building an enriched OpenAI prompt.</p>`;
        try {
          const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
          payload.issue = [payload.customerComplaint, payload.symptoms].filter(Boolean).join('\n');
          const response = await TAAI.workerTroubleshoot(payload);
          const plan = response.troubleshootingPlan || response.result || {};
          out.innerHTML = `${renderSummary(plan, payload, response)}${response.warning ? `<p class="module-error">${esc(response.warning)}</p>` : ''}${renderStatus(plan.researchStatus || response.researchStatus)}<div class="result-sections">${renderText('Official Error Meaning', plan.officialErrorMeaning || 'I could not positively identify this exact model/error combination.', { icon: '📘', className: 'strong' })}${renderList('Safety Warning', plan.safetyWarnings, { icon: '⚠️', className: 'safety' })}${renderList('Most Likely Causes', plan.likelyCauses, { icon: '🎯' })}${renderList('Diagnostic Steps', plan.diagnosticSteps, { icon: '✅' })}${renderList('Expected Readings', plan.expectedReadings, { icon: '📟' })}${renderList('Required Tools', plan.requiredTools || plan.toolsMetersNeeded, { icon: '🧰' })}${renderList('Parts / Materials Likely Needed', plan.partsLikelyNeeded, { icon: '🔩' })}${renderText('Repair Recommendation', plan.repairEstimateRecommendation || plan.estimateRecommendation || 'Document readings before quoting repair.', { icon: '🛠️' })}${renderText('Replacement Recommendation', plan.replacementRecommendation || 'Consider replacement when repair cost, age, safety, or availability makes repair poor value.', { icon: '🔁' })}${renderText('Technician Notes', plan.workOrderNotes || plan.customerExplanation || 'No technician notes provided.', { icon: '📝', className: 'wide' })}${renderList('Research Sources / Confidence', plan.researchSourcesUsed || response.researchContext?.sources, { icon: '🔎', className: 'wide strong' })}${renderConfidence(plan)}<p class="confidence-note">${esc(plan.confidenceExplanation?.explanation || 'Verify all recommendations against manufacturer service data and company safety policy.')}</p>${renderMode(plan.technicianMode || {})}${renderList('Diagnostic Tests', plan.diagnosticTests, { icon: '🧪', className: 'wide' })}${renderList('Stop / Escalate If', plan.stopAndEscalateIf, { icon: '🚫', className: 'wide safety' })}${renderList('Next Diagnostic Steps', plan.nextDiagnosticSteps || plan.diagnosticSteps, { icon: '➡️', className: 'wide' })}</div><div class="module-actions"><button class="btn secondary" type="button">Save Report</button><button class="btn secondary" type="button">Create Work Order</button><button class="btn secondary" type="button">Create Estimate</button><button class="btn secondary" type="button">Export PDF</button></div>`;
        } catch (err) {
          const manual = err.data?.manualTroubleshooting || {};
          out.innerHTML = `<h3>AI troubleshooting unavailable</h3><p class="module-error">${esc(err.data?.message || err.message || 'AI unavailable. Continue manually.')}</p><section class="trouble-section safety"><h4>⚠️ Safety Warning</h4><p>${esc(manual.safetyWarning || manual.safety_warning || 'Use safety policy and continue manual diagnostics.')}</p></section>`;
        }
      };
    },
    async destroy(){}, async refresh(){}
  });
})();
