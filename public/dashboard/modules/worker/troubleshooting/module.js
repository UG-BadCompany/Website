window.TAModules.register({
  id:'worker.troubleshooting',role:'worker',title:'Troubleshooting',icon:'🧰',permissions:[],
  async mount({root}){
    root.innerHTML=`<section class="module-page stack"><div class="module-hero module-header card"><div><p class="eyebrow">Worker AI Tools</p><h2 class="module-title">🧰 AI Troubleshooting</h2><p class="module-description">Enter trade, equipment, model, symptoms, photos metadata, and error codes to generate a structured diagnostic plan. AI guidance never replaces safety policy or supervisor approval.</p></div></div><div class="module-grid grid grid-2"><form id="trouble" class="module-card card stack"><div class="form-grid"><label class="field"><span>Trade</span><input name="systemType" placeholder="HVAC, plumbing, electrical"></label><label class="field"><span>Equipment / component</span><input name="component" placeholder="Mini split, condenser, faucet, breaker"></label><label class="field"><span>Model number</span><input name="model" placeholder="Model or serial if available"></label><label class="field"><span>Error codes</span><input name="errorCode" placeholder="Blink/fault/error codes"></label><label class="field form-row-wide"><span>Symptoms</span><textarea name="issue" placeholder="Describe what the customer sees and what you observed"></textarea></label><label class="field form-row-wide"><span>Photos metadata / readings</span><textarea name="readings" placeholder="Photo notes, measurements, voltage, pressure, temperature, etc."></textarea></label></div><button class="btn" type="submit">Run AI Troubleshooting</button></form><div id="trouble-output" class="module-card card stack"><h3>Diagnostic output</h3><p class="module-empty">Run the assistant to see safety warnings, likely causes, first checks, diagnostic steps, tools, likely parts, estimated labor, escalation conditions, and technician notes.</p></div></div></section>`;
    root.querySelector('#trouble').onsubmit=async(e)=>{
      e.preventDefault();
      const out=root.querySelector('#trouble-output');
      out.innerHTML='<h3>Analyzing...</h3><p class="module-loading">Checking AI troubleshooting engine and historical context.</p>';
      try{
        const payload=Object.fromEntries(new FormData(e.currentTarget).entries());
        const r=await TAAI.workerTroubleshoot(payload);
        const plan=r.troubleshootingPlan||r.result||{};
        const list=(title,items)=>`<div><h4>${title}</h4><ul>${(Array.isArray(items)?items:[items]).filter(Boolean).map((item)=>`<li>${TAModuleKit.escapeHtml(typeof item==='string'?item:JSON.stringify(item))}</li>`).join('')}</ul></div>`;
        out.innerHTML=`<h3>AI troubleshooting guidance</h3>${r.warning?`<p class="module-error">${TAModuleKit.escapeHtml(r.warning)}</p>`:''}${list('Safety warning',plan.safetyWarnings||plan.safety_warning)}${list('Likely causes',plan.likelyCauses||plan.likely_causes)}${list('First checks / diagnostics',plan.diagnosticSteps||plan.step_by_step_diagnostics||plan.first_checks)}${list('Required tools',plan.toolsMetersNeeded||plan.required_tools)}${list('Likely parts',plan.partsLikelyNeeded||plan.likely_parts)}${list('Escalate if',plan.stopAndEscalateIf||plan.escalation_conditions)}<h4>Estimated labor / notes</h4><p>${TAModuleKit.escapeHtml(plan.estimateRecommendation||plan.estimated_labor||plan.workOrderNotes||plan.technician_notes||'Admin review required.')}</p>`;
      }catch(err){
        const manual=err.data?.manualTroubleshooting||{};
        out.innerHTML=`<h3>AI troubleshooting unavailable</h3><p class="module-error">${TAModuleKit.escapeHtml(err.data?.message||err.message||'AI unavailable. Continue manually.')}</p><p>${TAModuleKit.escapeHtml(manual.safetyWarning||manual.safety_warning||'Use safety policy and continue manual diagnostics.')}</p>`;
      }
    };
  },
  async destroy(){},async refresh(){}
});
