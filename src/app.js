import { coreModules, sidebarGroups, defaultRoles } from './modules/moduleData.mjs';

const $ = (sel, root=document) => root.querySelector(sel);
const app = $('#app');
const api = async (path, options={}) => {
  try {
    const res = await fetch(path, { headers:{'content-type':'application/json'}, ...options });
    const text = await res.text();
    return JSON.parse(text || '{}');
  } catch (error) {
    return { ok:false, error:{ code:'NETWORK_OR_JSON_ERROR', message:error.message } };
  }
};
const state = { step:0, draft: loadLocalDraft(), db:null, integrations:[], view: sessionStorage.getItem('ownerView') || 'owner', active:'dashboard-overview' };
const steps = ['Database','Company','Branding','Theme','Owner','Modules','Services','Homepage','Review'];

function loadLocalDraft(){ try { return JSON.parse(localStorage.getItem('installerDraft') || '{}'); } catch { return {}; } }
function saveLocalDraft(){ localStorage.setItem('installerDraft', JSON.stringify(state.draft)); }
function setDraft(path, value){ const parts=path.split('.'); let node=state.draft; while(parts.length>1){ const p=parts.shift(); node[p] ||= {}; node=node[p]; } node[parts[0]]=value; saveLocalDraft(); scheduleDraftSave(); }
let draftTimer; function scheduleDraftSave(){ clearTimeout(draftTimer); draftTimer=setTimeout(()=>api('/api/install/draft',{method:'POST',body:JSON.stringify({draft:state.draft})}),400); }
function applyTheme(theme=state.draft.theme||{}){
  const root=document.documentElement;
  let mode=theme.mode||'system';
  const dark=window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved=mode==='system'?(dark?'dark':'light'):mode;
  root.dataset.theme=resolved;
  root.style.setProperty('--primary', theme.primary||'#2563eb');
  root.style.setProperty('--accent', theme.accent||'#f59e0b');
  root.style.setProperty('--color-background', theme.background||(resolved==='dark'?'#08111f':'#f8fafc'));
  root.style.setProperty('--color-surface', theme.surface||(resolved==='dark'?'#101b2d':'#ffffff'));
  root.style.setProperty('--color-text', theme.text||(resolved==='dark'?'#f8fafc':'#0f172a'));
  root.style.setProperty('--sidebar', theme.sidebar||'#0f172a');
  root.style.setProperty('--mobile-nav', theme.mobileNav||'#111827');
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{ if((state.draft.theme||{}).mode==='system') applyTheme(); });

window.addEventListener('error', e => renderFatal(e.message));
window.addEventListener('unhandledrejection', e => renderFatal(e.reason?.message || 'Unexpected installer error'));
function renderFatal(message){ app.innerHTML=`<main class="fatal"><h1>Installer recovery mode</h1><p>The app prevented a white screen.</p><pre>${escapeHtml(message)}</pre><button onclick="location.reload()">Retry</button></main>`; }
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

async function boot(){
  applyTheme();
  const status = await api('/api/install-status'); state.db=status;
  const draft = await api('/api/install/draft'); if(draft.ok && draft.draft){ state.draft={...state.draft,...draft.draft}; applyTheme(); }
  const integrations = await api('/api/install/integration-status'); state.integrations = integrations.integrations || [];
  if(location.pathname.startsWith('/dashboard') || status.installed) renderDashboard(); else renderInstaller();
}

function renderInstaller(){
  applyTheme();
  const pct=((state.step+1)/steps.length)*100;
  app.innerHTML=`<main class="installer">
    <header class="installer-header"><div><h1>Guided Platform Installer</h1><p class="muted">Automatic database bootstrap, white-label setup, modules, services, and owner account.</p></div><button class="secondary" id="retryDb">Retry Database Check</button></header>
    <div class="progress"><span style="width:${pct}%"></span></div>
    <nav class="step-tabs">${steps.map((s,i)=>`<button class="${i===state.step?'':'secondary'}" data-step="${i}">${i+1}. ${s}</button>`).join('')}</nav>
    <section class="card">${renderStep()}</section>
    <footer class="topbar"><button class="secondary" id="prev" ${state.step===0?'disabled':''}>Back</button><div><button class="ghost" id="saveDraft">Save Draft</button> <button id="next">${state.step===steps.length-1?'Finish Install':'Save & Continue'}</button></div></footer>
  </main>`;
  $$('.step-tabs button').forEach(b=>b.onclick=()=>{state.step=Number(b.dataset.step); renderInstaller();});
  $('#prev').onclick=()=>{state.step=Math.max(0,state.step-1);renderInstaller();};
  $('#next').onclick=nextStep; $('#saveDraft').onclick=async()=>{await api('/api/install/draft',{method:'POST',body:JSON.stringify({draft:state.draft})}); alert('Draft saved to the database when connected.');};
  $('#retryDb').onclick=retryDatabase;
  bindInputs();
}
function $$(sel, root=document){ return [...root.querySelectorAll(sel)]; }
async function nextStep(){ if(state.step===steps.length-1) return finishInstall(); await api('/api/install/draft',{method:'POST',body:JSON.stringify({draft:state.draft})}); state.step++; renderInstaller(); }
async function retryDatabase(){ const res=await api('/api/install/bootstrap-database',{method:'POST',body:'{}'}); state.db=res; renderInstaller(); }
async function finishInstall(){
  const btn=$('#next'); btn.disabled=true; btn.textContent='Finishing…';
  const res=await api('/api/install/finish',{method:'POST',body:JSON.stringify({draft:state.draft})});
  if(!res.ok){ alert(res.error?.message || 'Install failed. Retry database check.'); btn.disabled=false; btn.textContent='Finish Install'; return; }
  history.pushState({},'', '/dashboard'); renderDashboard();
}
function bindInputs(){
  $$('[data-field]').forEach(el=>{ el.oninput=()=>{ setDraft(el.dataset.field, el.type==='checkbox'?el.checked:el.value); if(el.dataset.field.startsWith('theme.')){ applyTheme(); renderInstaller(); } }; });
  $$('[data-module]').forEach(el=>{ el.onchange=()=>{ const enabled=new Set(state.draft.modules || coreModules.map(m=>m.id)); el.checked?enabled.add(el.dataset.module):enabled.delete(el.dataset.module); setDraft('modules',[...enabled]); }; });
  $('#logoUpload')?.addEventListener('change', e=>readAsset(e,'branding.logoData'));
  $('#faviconUpload')?.addEventListener('change', e=>readAsset(e,'branding.faviconData'));
}
function val(path, fallback=''){ return path.split('.').reduce((o,k)=>o?.[k], state.draft) ?? fallback; }
function renderStep(){ return [stepDatabase, stepCompany, stepBranding, stepTheme, stepOwner, stepModules, stepServices, stepHomepage, stepReview][state.step](); }
function stepDatabase(){ const db=state.db||{}; return `<h2>Real Database Architecture</h2><p>The installer uses Netlify Database and never relies on production memory fallback.</p><div class="grid cols-3"><div class="card"><b>Connected</b><div class="${db.connected?'status-ok':'status-bad'}">${db.connected?'Yes':'No'}</div></div><div class="card"><b>Schema ready</b><div class="${db.schemaReady?'status-ok':'status-bad'}">${db.schemaReady?'Yes':'No'}</div></div><div class="card"><b>Write test</b><div class="${db.writeTestPassed?'status-ok':'status-bad'}">${db.writeTestPassed?'Passed':'Pending'}</div></div></div><p class="muted">If the database is not connected, deploy with the @netlify/database dependency and use Retry Database Check after Netlify provisions the database.</p>`; }
function stepCompany(){ return `<h2>Company Profile</h2><div class="form-row"><label class="field">Company name<input data-field="company.name" value="${escapeHtml(val('company.name',''))}"></label><label class="field">Email<input data-field="company.email" value="${escapeHtml(val('company.email',''))}"></label><label class="field">Phone<input data-field="company.phone" value="${escapeHtml(val('company.phone',''))}"></label><label class="field">Website<input data-field="company.website" value="${escapeHtml(val('company.website',''))}"></label></div><label class="field">Address<textarea data-field="company.address">${escapeHtml(val('company.address',''))}</textarea></label>`; }
function stepBranding(){ return `<h2>Branding Assets</h2><div class="form-row"><label class="field">Logo upload<input id="logoUpload" type="file" accept="image/*"></label><label class="field">Favicon upload<input id="faviconUpload" type="file" accept="image/*"></label></div><p class="muted">Assets are encoded into the installer draft and written through the database-backed file manager after install, rather than URL-only settings.</p><div class="brand-logo">${val('branding.logoData')?`<img src="${val('branding.logoData')}">`:'🏗️'}</div>`; }
function stepTheme(){ const t=state.draft.theme||{}; return `<h2>Theme & Live Preview</h2><div class="form-row"><label class="field">Theme mode<select data-field="theme.mode"><option ${t.mode==='system'?'selected':''}>system</option><option ${t.mode==='light'?'selected':''}>light</option><option ${t.mode==='dark'?'selected':''}>dark</option><option ${t.mode==='custom'?'selected':''}>custom</option></select></label>${color('Primary','theme.primary',t.primary||'#2563eb')}${color('Accent','theme.accent',t.accent||'#f59e0b')}${color('Background','theme.background',t.background||'#f8fafc')}${color('Surface','theme.surface',t.surface||'#ffffff')}${color('Text','theme.text',t.text||'#0f172a')}${color('Sidebar','theme.sidebar',t.sidebar||'#0f172a')}${color('Mobile nav','theme.mobileNav',t.mobileNav||'#111827')}</div>${themePreview()}`; }
function color(label,field,value){return `<label class="field">${label}<input type="color" data-field="${field}" value="${escapeHtml(value)}"></label>`;}
function themePreview(){ return `<div class="preview"><div class="preview-header"><b>Header preview</b><button>Button</button></div><div class="preview-body grid cols-2"><div class="card"><h3>Dashboard card</h3><p class="muted">Cards, inputs, sidebar, buttons, and mobile nav update immediately.</p><input placeholder="Input preview"></div><div class="card"><h3>Public homepage card</h3><p>Reliable contractor service with your saved colors.</p><button>Request Estimate</button></div></div></div>`; }
function stepOwner(){ return `<h2>Owner Account</h2><div class="form-row"><label class="field">Full name<input data-field="owner.fullName" value="${escapeHtml(val('owner.fullName',''))}"></label><label class="field">Email<input type="email" data-field="owner.email" value="${escapeHtml(val('owner.email',''))}"></label><label class="field">Phone<input data-field="owner.phone" value="${escapeHtml(val('owner.phone',''))}"></label></div><p class="muted">Finish Install creates or verifies this owner, default roles, role permissions, workspace access, and audit logs.</p>`; }
function stepModules(){ const enabled=new Set(state.draft.modules||coreModules.map(m=>m.id)); return `<h2>Module Selection</h2><p>Drop-in module manifests are discovered automatically; no manual router, sidebar, navigation, or permission edits.</p>${sidebarGroups.map(g=>`<h3>${g}</h3>${coreModules.filter(m=>m.group===g).map(m=>`<label class="module-pill"><input type="checkbox" data-module="${m.id}" ${enabled.has(m.id)?'checked':''}> ${m.icon} ${m.label}</label>`).join('')}`).join('')}`; }
function stepServices(){ const services=val('services.list','General Contracting, Plumbing, Electrical, HVAC, Roofing'); return `<h2>Services Builder</h2><label class="field">Services and trades<textarea data-field="services.list" rows="6">${escapeHtml(services)}</textarea></label><p class="muted">One service per comma or line. Defaults seed service_categories.</p>${String(services).split(/[\n,]+/).filter(Boolean).map(s=>`<span class="service-pill">${escapeHtml(s.trim())}</span>`).join('')}`; }
function stepHomepage(){ return `<h2>Homepage Builder</h2><div class="form-row"><label class="field">Hero title<input data-field="homepage.heroTitle" value="${escapeHtml(val('homepage.heroTitle',''))}"></label><label class="field">CTA label<input data-field="homepage.ctaLabel" value="${escapeHtml(val('homepage.ctaLabel','Request an Estimate'))}"></label></div><label class="field">Hero subtitle<textarea data-field="homepage.heroSubtitle">${escapeHtml(val('homepage.heroSubtitle',''))}</textarea></label><label class="field">Sections JSON<textarea data-field="homepage.sectionsText" rows="5">${escapeHtml(val('homepage.sectionsText','[{"type":"services"},{"type":"testimonials"},{"type":"request-estimate"}]'))}</textarea></label>`; }
function stepReview(){ return `<h2>Review & Finish</h2><div class="grid cols-2"><div class="card"><h3>Database</h3><p>Connected: ${state.db?.connected?'Yes':'No'}</p><p>Schema: ${state.db?.schemaReady?'Ready':'Pending'}</p><p>Write Test: ${state.db?.writeTestPassed?'Passed':'Run Retry Database Check'}</p></div><div class="card"><h3>Optional Integrations</h3><p>These integrations can be configured later in System Center.</p>${state.integrations.map(i=>`<p><b>${i.key}</b>: ${i.configured?'Configured':'Not configured; platform will use manual mode.'}</p>`).join('')}</div></div>`; }
function readAsset(e,path){ const file=e.target.files?.[0]; if(!file) return; const r=new FileReader(); r.onload=()=>{ setDraft(path,r.result); renderInstaller(); }; r.readAsDataURL(file); }

async function renderDashboard(){
  applyTheme();
  const data=await api('/api/dashboard/bootstrap');
  const modules=(data.modules?.length?data.modules:coreModules.map(m=>({id:m.id,label:m.label,nav_group:m.group}))).filter(m=>visibleForRole(m.id,state.view));
  const company=data.company?.company_name || val('company.name','Contractor CMMS');
  app.innerHTML=`<div class="app-shell"><aside class="sidebar"><div class="brand"><div class="brand-logo">${val('branding.logoData')?`<img src="${val('branding.logoData')}">`:'🏗️'}</div><div><b>${escapeHtml(company)}</b><div class="workspace">Primary workspace</div></div></div>${ownerSwitcher()}${nav(modules)}</aside><main class="content"><div class="topbar"><div><h1>${escapeHtml(labelFor(state.active))}</h1><p class="muted">Premium CMMS dashboard loaded from database-backed settings when installed.</p></div><button class="secondary" onclick="location.href='/'">Installer</button></div>${state.view!=='owner'?`<div class="banner">Testing ${cap(state.view)} View as Owner <button class="secondary" id="exitView">Exit Test View</button></div>`:''}${dashboardContent()}</main><nav class="mobile-nav">${modules.slice(0,5).map(m=>`<a href="#${m.id}" data-nav="${m.id}">${labelFor(m.id).split(' ')[0]}</a>`).join('')}</nav></div>`;
  $$('[data-nav]').forEach(a=>a.onclick=e=>{e.preventDefault(); state.active=a.dataset.nav; renderDashboard();});
  $('#viewSelect')?.addEventListener('change', e=>{state.view=e.target.value; sessionStorage.setItem('ownerView',state.view); state.active='dashboard-overview'; renderDashboard();});
  $('#exitView')?.addEventListener('click',()=>{state.view='owner';sessionStorage.setItem('ownerView','owner');renderDashboard();});
}
function ownerSwitcher(){ return `<div class="view-switcher"><b>Viewing as: ${cap(state.view)}</b><label class="field">Switch View<select id="viewSelect">${defaultRoles.map(r=>`<option value="${r}" ${state.view===r?'selected':''}>${cap(r)} View</option>`).join('')}</select></label></div>`; }
function nav(modules){ return sidebarGroups.map(g=>{ const items=modules.filter(m=>(m.nav_group||m.group)===g); if(!items.length) return ''; return `<section class="nav-section"><div class="nav-title">${g}</div>${items.map(m=>`<a class="nav-item ${state.active===m.id?'active':''}" href="#${m.id}" data-nav="${m.id}"><span>${iconFor(m.id)}</span><span>${escapeHtml(labelFor(m.id))}</span></a>`).join('')}</section>`; }).join(''); }
function visibleForRole(id,role){ const m=coreModules.find(x=>x.id===id); return !m || m.roles.includes(role) || role==='owner'; }
function labelFor(id){ return coreModules.find(m=>m.id===id)?.label || id; } function iconFor(id){ return coreModules.find(m=>m.id===id)?.icon || '•'; } function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
function dashboardContent(){ const m=coreModules.find(x=>x.id===state.active); if(m?.ai && !state.integrations.find(i=>i.key==='OPENAI_API_KEY')?.configured) return `<section class="card"><h2>${m.label}</h2><p>AI is not configured yet.</p><p>Configure OpenAI in System Center → Environment & Integrations.</p></section>`; return `<section class="grid cols-3"><div class="card"><div class="stat">12</div><b>Open work orders</b><p class="muted">Workflow-driven operations.</p></div><div class="card"><div class="stat">$8.4k</div><b>Draft invoices</b><p class="muted">Manual payment tracking works without Square.</p></div><div class="card"><div class="stat">9</div><b>Core modules</b><p class="muted">Basic non-AI modules are active.</p></div></section><section class="card"><h2>${m?.label||'Dashboard'}</h2><p>${m?.description||'Dashboard overview.'}</p><div class="grid cols-2"><button>Create record</button><button class="secondary">View recent activity</button></div></section>`; }

boot();
