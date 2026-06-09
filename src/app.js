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
const themePresets = [
  { id:'contractor-dark', name:'Contractor Dark', best:'Best for premium trades', mode:'dark', primary:'#f97316', accent:'#facc15', background:'#07111f', surface:'#111827', text:'#f8fafc', border:'#334155', button:'#f97316', buttonText:'#111827', sidebar:'#0f172a', sidebarText:'#f8fafc', mobileNav:'#111827', mobileNavText:'#f8fafc' },
  { id:'modern-blue', name:'Modern Blue', best:'Best for clean SaaS brands', mode:'light', primary:'#2563eb', accent:'#06b6d4', background:'#f8fafc', surface:'#ffffff', text:'#0f172a', border:'#dbe3ef', button:'#2563eb', buttonText:'#ffffff', sidebar:'#102a56', sidebarText:'#eff6ff', mobileNav:'#1d4ed8', mobileNavText:'#ffffff' },
  { id:'copper-canyon', name:'Copper Canyon', best:'Best for desert contractors', mode:'dark', primary:'#c2410c', accent:'#f59e0b', background:'#1c120c', surface:'#2a1a12', text:'#fff7ed', border:'#7c2d12', button:'#ea580c', buttonText:'#fff7ed', sidebar:'#27130a', sidebarText:'#fed7aa', mobileNav:'#431407', mobileNavText:'#ffedd5' },
  { id:'slate-pro', name:'Slate Pro', best:'Best for commercial teams', mode:'dark', primary:'#38bdf8', accent:'#a78bfa', background:'#0f172a', surface:'#182235', text:'#f8fafc', border:'#334155', button:'#38bdf8', buttonText:'#082f49', sidebar:'#020617', sidebarText:'#e2e8f0', mobileNav:'#111827', mobileNavText:'#f8fafc' },
  { id:'arizona-sand', name:'Arizona Sand', best:'Best for local service brands', mode:'light', primary:'#b45309', accent:'#14b8a6', background:'#fff7ed', surface:'#ffffff', text:'#292524', border:'#fed7aa', button:'#b45309', buttonText:'#ffffff', sidebar:'#78350f', sidebarText:'#fffbeb', mobileNav:'#92400e', mobileNavText:'#fffbeb' },
  { id:'clean-light', name:'Clean Light', best:'Best for simple modern sites', mode:'light', primary:'#0ea5e9', accent:'#22c55e', background:'#f8fafc', surface:'#ffffff', text:'#111827', border:'#e5e7eb', button:'#0ea5e9', buttonText:'#ffffff', sidebar:'#ffffff', sidebarText:'#111827', mobileNav:'#ffffff', mobileNavText:'#111827' },
  { id:'forest-service', name:'Forest Service', best:'Best for outdoor & maintenance', mode:'light', primary:'#166534', accent:'#84cc16', background:'#f7fee7', surface:'#ffffff', text:'#14532d', border:'#bbf7d0', button:'#166534', buttonText:'#ffffff', sidebar:'#052e16', sidebarText:'#dcfce7', mobileNav:'#14532d', mobileNavText:'#ecfccb' },
  { id:'high-contrast', name:'High Contrast', best:'Best for accessibility', mode:'dark', primary:'#facc15', accent:'#22d3ee', background:'#000000', surface:'#111111', text:'#ffffff', border:'#ffffff', button:'#facc15', buttonText:'#000000', sidebar:'#000000', sidebarText:'#ffffff', mobileNav:'#000000', mobileNavText:'#ffffff' }
];
const serviceTemplates = {
  'Handyman':['General Maintenance','Drywall','Painting','Carpentry','Appliance Repair','Windows & Doors'],
  'HVAC':['HVAC','Mini Splits','Water Heaters','General Maintenance'],
  'Plumbing':['Plumbing','Water Heaters','Appliance Repair','General Maintenance'],
  'Electrical':['Electrical','Commercial Maintenance','General Maintenance'],
  'Remodeling':['Remodeling','Drywall','Painting','Flooring','Carpentry','Windows & Doors'],
  'Property Maintenance':['Property Management','General Maintenance','Landscaping','Pressure Washing','Painting'],
  'Commercial Maintenance':['Commercial Maintenance','HVAC','Electrical','Plumbing','General Maintenance'],
  'General Contractor':['General Contracting','Roofing','Remodeling','Flooring','Carpentry','Drywall','Painting']
};
const suggestedServices = ['HVAC','Plumbing','Electrical','Roofing','Drywall','Painting','Remodeling','Flooring','Carpentry','Windows & Doors','Appliance Repair','Mini Splits','Water Heaters','General Maintenance','Landscaping','Pressure Washing','Property Management','Commercial Maintenance'];
const serviceIcons = ['🛠️','❄️','🚰','⚡','🏠','🎨','🧱','🌿','🚪','🔥'];
const homepageSectionDefaults = [
  ['services','Services','Show the core services you offer.'],['about','About','Tell visitors why they can trust your team.'],['projects','Projects','Feature recent jobs and transformations.'],['testimonials','Testimonials','Display customer proof and ratings.'],['service-areas','Service Areas','List cities and neighborhoods served.'],['faq','FAQ','Answer common estimate questions.'],['contact','Contact','Make it easy to call, email, or book.'],['request-estimate','Request Estimate','Promote your estimate form.'],['why-choose-us','Why Choose Us','Highlight guarantees and differentiators.']
];

function loadLocalDraft(){ try { return JSON.parse(localStorage.getItem('installerDraft') || '{}'); } catch { return {}; } }
function saveLocalDraft(){ localStorage.setItem('installerDraft', JSON.stringify(state.draft)); }
function setDraft(path, value){ const parts=path.split('.'); let node=state.draft; while(parts.length>1){ const p=parts.shift(); node[p] ||= {}; node=node[p]; } node[parts[0]]=value; saveLocalDraft(); scheduleDraftSave(); }
let draftTimer; function scheduleDraftSave(){ clearTimeout(draftTimer); draftTimer=setTimeout(()=>api('/api/install/draft',{method:'POST',body:JSON.stringify({draft:state.draft})}),400); }
function applyTheme(theme=state.draft.theme||{}){
  const root=document.documentElement;
  const mode=theme.mode||'system';
  const dark=window.matchMedia('(prefers-color-scheme: dark)').matches;
  const preset = themePresets.find(p=>p.id===theme.preset);
  const merged = { ...(preset||{}), ...theme };
  const resolved=mode==='system'?(dark?'dark':(preset?.mode||'light')):(mode==='custom'?(preset?.mode||'light'):mode);
  root.dataset.theme=resolved;
  const fallback = resolved==='dark' ? { background:'#08111f', surface:'#101b2d', text:'#f8fafc', border:'#263449' } : { background:'#f8fafc', surface:'#ffffff', text:'#0f172a', border:'#dbe3ef' };
  root.style.setProperty('--primary', merged.primary||'#2563eb');
  root.style.setProperty('--accent', merged.accent||'#f59e0b');
  root.style.setProperty('--color-background', merged.background||fallback.background);
  root.style.setProperty('--color-surface', merged.surface||fallback.surface);
  root.style.setProperty('--color-text', merged.text||fallback.text);
  root.style.setProperty('--border', merged.border||fallback.border);
  root.style.setProperty('--button', merged.button||merged.primary||'#2563eb');
  root.style.setProperty('--button-text', merged.buttonText||'#ffffff');
  root.style.setProperty('--sidebar', merged.customSidebar ? (merged.sidebar||'#0f172a') : (merged.surface||fallback.surface));
  root.style.setProperty('--sidebar-text', merged.customSidebar ? (merged.sidebarText||'#f8fafc') : (merged.text||fallback.text));
  root.style.setProperty('--mobile-nav', merged.customMobileNav ? (merged.mobileNav||'#111827') : (merged.surface||fallback.surface));
  root.style.setProperty('--mobile-nav-text', merged.customMobileNav ? (merged.mobileNavText||'#f8fafc') : (merged.text||fallback.text));
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{ if((state.draft.theme||{}).mode==='system') applyTheme(); });

window.addEventListener('error', e => renderFatal(e.message));
window.addEventListener('unhandledrejection', e => renderFatal(e.reason?.message || 'Unexpected installer error'));
function renderFatal(message){ app.innerHTML=`<main class="fatal"><h1>Installer recovery mode</h1><p>The app prevented a white screen.</p><pre>${escapeHtml(message)}</pre><button onclick="location.reload()">Retry</button></main>`; }
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

async function boot(){
  applyTheme();
  const status = await api('/api/install-status'); state.db=status;
  if (status.databaseConnected && status.canBootstrapSchema) {
    state.db = { ...status, bootstrapPhase: 'Creating tables...' };
    const bootstrapResult = await api('/api/install/bootstrap-database',{method:'POST',body:'{}'});
    state.db = { ...status, ...bootstrapResult };
  }
  const draft = await api('/api/install/draft'); if(draft.ok && draft.draft){ state.draft={...state.draft,...draft.draft}; applyTheme(); }
  const integrations = await api('/api/install/integration-status'); state.integrations = integrations.integrations || [];
  if (location.pathname.startsWith('/install')) {
  renderInstaller();
} else if (location.pathname.startsWith('/dashboard')) {
  renderDashboard();
} else {
  renderHomepage();
}

function renderHomepage(){
  applyTheme();

  const installed = Boolean(state.db?.installed || state.db?.installationComplete);
  const companyName = val('company.name', 'Your Contractor Company');
  const heroTitle = val('homepage.heroTitle', 'Reliable contractor service, fast estimates, and clear updates.');
  const heroSubtitle = val('homepage.heroSubtitle', 'A modern contractor platform for estimates, work orders, scheduling, invoices, and client communication.');

  app.innerHTML = `
    <main class="homepage public-home">

      <header class="public-header">
        <div class="brand">
          <div class="brand-logo">
            ${val('branding.logoData') ? `<img src="${val('branding.logoData')}" alt="">` : '🏗️'}
          </div>
          <div>
            <b>${escapeHtml(companyName)}</b>
            <div class="workspace">Contractor CMMS</div>
          </div>
        </div>

        <nav class="public-nav">
          <a href="#services">Services</a>
          <a href="#about">About</a>
          <a href="/dashboard">Dashboard</a>
          <a href="/install/">Install</a>
        </nav>
      </header>

      <section class="hero public-hero">
        <div>
          <h1>${escapeHtml(heroTitle)}</h1>
          <p>${escapeHtml(heroSubtitle)}</p>

          ${
            installed
              ? `<a href="/dashboard"><button>Open Dashboard</button></a>`
              : `<a href="/install/"><button>Install Platform</button></a>`
          }
        </div>

        <aside class="estimate-card">
          <b>Estimate Preview</b>
          <p>Quotes, Work Orders, Invoices, Inventory and AI Estimating.</p>
        </aside>
      </section>

      <section id="services" class="grid cols-3">
        <article class="card">
          <h3>Request Estimates</h3>
          <p>Customers can submit estimate requests online.</p>
        </article>

        <article class="card">
          <h3>Work Orders</h3>
          <p>Create, assign and complete jobs.</p>
        </article>

        <article class="card">
          <h3>Invoices</h3>
          <p>Track billing and payments.</p>
        </article>
      </section>

    </main>
  `;
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
  $('#retryDbInline')?.addEventListener('click', retryDatabase);
  $('#copyDiagnostics')?.addEventListener('click', copyDiagnostics);
  bindInputs();
}
function $$(sel, root=document){ return [...root.querySelectorAll(sel)]; }
async function nextStep(){ if(state.step===steps.length-1) return finishInstall(); await api('/api/install/draft',{method:'POST',body:JSON.stringify({draft:state.draft})}); state.step++; renderInstaller(); }
async function retryDatabase(){
  const btn=$('#retryDb'); if(btn){ btn.disabled=true; btn.textContent='Checking…'; }
  const res=await api('/api/install/bootstrap-database',{method:'POST',body:'{}'});
  state.db=res;
  const status = await api('/api/install-status');
  state.db={...res,...status};
  if(state.step===0 && state.db.connected && state.db.schemaReady && state.db.writeTestPassed) state.step=1;
  renderInstaller();
}
async function finishInstall(){
  const btn=$('#next'); btn.disabled=true; btn.textContent='Finishing…';
  const res=await api('/api/install/finish',{method:'POST',body:JSON.stringify({draft:state.draft})});
  if(!res.ok){ alert(res.error?.message || 'Install failed. Retry database check.'); btn.disabled=false; btn.textContent='Finish Install'; return; }
  history.pushState({},'', '/dashboard'); renderDashboard();
}
function bindInputs(){
  $$('[data-field]').forEach(el=>{ el.oninput=()=>{ if(el.classList.contains('hex-input') && !/^#[0-9a-fA-F]{6}$/.test(el.value)) return; setDraft(el.dataset.field, el.type==='checkbox'?el.checked:el.value); if(el.dataset.field.startsWith('theme.')){ setDraft('theme.updated_at', new Date().toISOString()); applyTheme(); renderInstaller(); } }; });
  $$('[data-module]').forEach(el=>{ el.onchange=()=>{ const enabled=new Set(state.draft.modules || coreModules.map(m=>m.id)); el.checked?enabled.add(el.dataset.module):enabled.delete(el.dataset.module); setDraft('modules',[...enabled]); }; });
  $$('[data-theme-mode]').forEach(b=>b.onclick=()=>{ updateTheme({ mode:b.dataset.themeMode, updated_at:new Date().toISOString() }); });
  $$('[data-preset]').forEach(b=>b.onclick=()=>applyPreset(b.dataset.preset));
  $$('[data-reset-color]').forEach(b=>b.onclick=()=>resetThemeColor(b.dataset.resetColor));
  $$('[data-template]').forEach(b=>b.onclick=()=>addServiceTemplate(b.dataset.template));
  $$('[data-suggest-service]').forEach(b=>b.onclick=()=>toggleService(b.dataset.suggestService));
  $('#addService')?.addEventListener('click',()=>addService());
  $$('[data-service-remove]').forEach(b=>b.onclick=()=>removeService(Number(b.dataset.serviceRemove)));
  $$('[data-service-toggle]').forEach(el=>el.onchange=()=>updateService(Number(el.dataset.serviceToggle),{active:el.checked}));
  $$('[data-service-field]').forEach(el=>el.oninput=()=>{ const [i,k]=el.dataset.serviceField.split(':'); updateService(Number(i),{[k]:el.type==='number'?(el.value?Number(el.value):''):el.value}, false); });
  $$('[data-service-move]').forEach(b=>b.onclick=()=>moveService(Number(b.dataset.serviceMove), Number(b.dataset.dir)));
  $$('[data-section-toggle]').forEach(el=>el.onchange=()=>updateSection(Number(el.dataset.sectionToggle),{enabled:el.checked}));
  $$('[data-section-field]').forEach(el=>el.oninput=()=>{ const [i,k]=el.dataset.sectionField.split(':'); updateSection(Number(i),{[k]:el.value}, false); });
  $$('[data-section-move]').forEach(b=>b.onclick=()=>moveSection(Number(b.dataset.sectionMove), Number(b.dataset.dir)));
  $('#addProject')?.addEventListener('click',()=>addProject());
  $('#addTestimonial')?.addEventListener('click',()=>addTestimonial());
  $$('[data-project-field]').forEach(el=>el.oninput=()=>{ const [i,k]=el.dataset.projectField.split(':'); updateProject(Number(i),{[k]:el.type==='checkbox'?el.checked:el.value}, false); });
  $$('[data-testimonial-field]').forEach(el=>el.oninput=()=>{ const [i,k]=el.dataset.testimonialField.split(':'); updateTestimonial(Number(i),{[k]:el.value}, false); });
  $$('[data-project-remove]').forEach(b=>b.onclick=()=>removeProject(Number(b.dataset.projectRemove)));
  $$('[data-testimonial-remove]').forEach(b=>b.onclick=()=>removeTestimonial(Number(b.dataset.testimonialRemove)));
  $('#logoUpload')?.addEventListener('change', e=>readAsset(e,'branding.logoData'));
  $('#faviconUpload')?.addEventListener('change', e=>readAsset(e,'branding.faviconData'));
  $('#heroUpload')?.addEventListener('change', e=>readAsset(e,'homepage.heroImageData'));
  $$('[data-project-upload]').forEach(el=>el.addEventListener('change', e=>readArrayAsset(e,'homepage.projects',Number(el.dataset.projectUpload),'imageData')));
  $$('[data-testimonial-upload]').forEach(el=>el.addEventListener('change', e=>readArrayAsset(e,'homepage.testimonials',Number(el.dataset.testimonialUpload),'photoData')));
}
function val(path, fallback=''){ return path.split('.').reduce((o,k)=>o?.[k], state.draft) ?? fallback; }
function renderStep(){ return [stepDatabase, stepCompany, stepBranding, stepTheme, stepOwner, stepModules, stepServices, stepHomepage, stepReview][state.step](); }
function statusLine(ok, good, bad){ return `<div class="${ok?'status-ok':'status-bad'}">${ok?'✓':'✗'} ${ok?good:bad}</div>`; }
function waitingLine(text){ return `<div class="muted">${text}</div>`; }
function sourceLabel(db){ return db.connectionSourceLabel || db.selectedConnectionSource || db.environmentVariableUsed || 'None detected'; }
function connectionAttemptLabel(db){ return db.connectionAttempt || (db.connected ? 'Succeeded' : (db.configured || db.databaseUrlDetected ? 'Failed' : 'Not Run')); }
function dbDiagnostics(db){
  return [
    `Database Client: ${db.databaseClientInstalled || db.clientInstalled ? 'Installed' : 'Missing'}`,
    `DATABASE_URL: ${db.databaseUrlEnvDetected ? 'Detected' : 'Missing'}`,
    `NETLIFY_DATABASE_URL: ${db.netlifyDatabaseUrlEnvDetected ? 'Detected' : 'Missing'}`,
    `getConnectionString(): ${db.getConnectionStringSucceeded ? 'Succeeded' : 'Failed'}`,
    `Selected Connection Source: ${sourceLabel(db)}`,
    `Connection Attempt: ${connectionAttemptLabel(db)}`,
    `Schema: ${db.schemaReady ? '✓ Ready' : 'Not Ready'}`,
    `Write Verification: ${db.writeTestPassed ? '✓ Passed' : (db.schemaReady ? 'Running...' : 'Waiting for schema bootstrap')}`,
    Number.isFinite(db.tablesDetected) ? `Tables Detected: ${db.tablesDetected}` : '',
    Number.isFinite(db.tablesCreated) ? `Tables Created: ${db.tablesCreated}` : '',
    Number.isFinite(db.indexesCreated) ? `Indexes Created: ${db.indexesCreated}` : '',
    Number.isFinite(db.seedRecordsInserted) ? `Seed Records Inserted: ${db.seedRecordsInserted}` : '',
    db.connectionError || db.safeDetails ? `Safe Error: ${db.connectionError || db.safeDetails}` : ''
  ].filter(Boolean).join('\n');
}
async function copyDiagnostics(){
  const text=dbDiagnostics(state.db||{});
  await navigator.clipboard?.writeText(text);
  alert('Diagnostics copied. Secret values were not included.');
}
function stepDatabase(){
  const db=state.db||{};
  const clientInstalled = db.databaseClientInstalled ?? db.clientInstalled ?? true;
  const connectionConfigured = Boolean(db.configured || db.databaseUrlDetected);
  const dbDetected = Boolean(db.connected || connectionConfigured);
  const dashboardUrl = 'https://app.netlify.com/';
  const manualLinkRequired = Boolean(db.manualDatabaseLinkRequired);
  const connectionFailed = connectionConfigured && !db.connected && connectionAttemptLabel(db) === 'Failed';
  const provisioningText = `<p><b>Waiting for Netlify Database provisioning...</b></p><p>This platform includes @netlify/database, so Netlify should automatically provision a database during deploy.</p><p>This can happen immediately after the first deploy. Redeploy or click Retry Database Check after Netlify finishes provisioning.</p>`;
  const manualLinkText = provisioningText;
  const readyFlow = db.connected ? `<div class="card"><p><b>Database connected.</b></p><p>Ensuring tables exist${Number.isFinite(db.tablesCreated)?`: ${db.tablesCreated} created, ${db.tablesDetected||0} detected`:''}.</p><p>Ensuring indexes exist${Number.isFinite(db.indexesCreated)?`: ${db.indexesCreated} created`:''}.</p><p>Seeding platform${Number.isFinite(db.seedRecordsInserted)?`: ${db.seedRecordsInserted} inserted`:''}.</p><p>Write Verification: <b>${db.writeTestPassed ? '✓ Passed' : (db.schemaReady ? 'Running...' : 'Waiting for schema bootstrap')}</b></p><p><b>${db.schemaReady && db.writeTestPassed ? 'Database ready.' : 'Database bootstrap can run now.'}</b></p></div>` : '';
  const failureText = connectionFailed ? `<div class="card status-bad"><p><b>A database connection string was found, but the connection attempt failed.</b></p><p>Review the diagnostics below for the safe error message.</p><pre>${escapeHtml(db.connectionError || db.safeDetails || 'No safe error was returned.')}</pre></div>` : '';
  return `<h2>Database Setup</h2>
    <p>The installer tracks the database client package, linked database resource, schema bootstrap, and write verification as four separate states.</p>
    <div class="grid cols-2">
      <div class="card"><b>Database Client</b>${statusLine(clientInstalled,'Installed','Missing')}</div>
      <div class="card"><b>Database Connection</b>${statusLine(Boolean(db.connected),'Connected', connectionConfigured ? 'Connection Failed' : 'No Database Linked')}</div>
      <div class="card"><b>Schema Bootstrap</b>${dbDetected ? statusLine(Boolean(db.schemaReady),'Schema Ready','Not Ready') : waitingLine('Waiting for database connection')}</div>
      <div class="card"><b>Write Verification</b>${db.schemaReady ? statusLine(Boolean(db.writeTestPassed),'Write Verification Passed','Failed') : waitingLine('Waiting for schema bootstrap')}</div>
    </div>
    ${readyFlow}
    ${failureText}
    ${dbDetected ? '' : `<div class="card">${manualLinkRequired ? manualLinkText : provisioningText}<p>Once connected, this installer will automatically:</p><ul><li>Create all required CMMS tables</li><li>Create indexes</li><li>Seed roles and permissions</li><li>Register modules</li><li>Create the owner account</li><li>Verify database writes</li></ul><p><b>No manual SQL is required.</b></p></div>`}
    ${manualLinkRequired ? `<div class="card"><h3>Manual database fallback</h3><ol><li>Open Netlify Dashboard</li><li>Open this Site</li><li>Storage → Database</li><li>Create or Link a Database</li><li>Redeploy if prompted</li><li>Return here</li><li>Click Retry Database Check</li></ol><p><a href="${dashboardUrl}" target="_blank" rel="noreferrer"><button type="button">Open Netlify Dashboard</button></a> <button type="button" class="secondary" id="retryDbInline">Retry Database Check</button> <button type="button" class="ghost" id="copyDiagnostics">Copy Diagnostics</button></p></div>` : `<div class="card"><button type="button" class="secondary" id="retryDbInline">Retry Database Check</button> <button type="button" class="ghost" id="copyDiagnostics">Copy Diagnostics</button></div>`}
    <details class="card"><summary><b>Diagnostics</b></summary><dl><dt>Database Client:</dt><dd>${clientInstalled?'Installed':'Missing'}</dd><dt>DATABASE_URL:</dt><dd>${db.databaseUrlEnvDetected?'Detected':'Missing'}</dd><dt>NETLIFY_DATABASE_URL:</dt><dd>${db.netlifyDatabaseUrlEnvDetected?'Detected':'Missing'}</dd><dt>getConnectionString():</dt><dd>${db.getConnectionStringSucceeded?'Succeeded':'Failed'}</dd><dt>Selected Connection Source:</dt><dd>${escapeHtml(sourceLabel(db))}</dd><dt>Connection Attempt:</dt><dd>${escapeHtml(connectionAttemptLabel(db))}</dd><dt>Schema:</dt><dd>${db.schemaReady?'✓ Ready':'Not Ready'}</dd><dt>Write Verification:</dt><dd>${db.writeTestPassed?'✓ Passed':(db.schemaReady?'Running...':'Waiting for schema bootstrap')}</dd><dt>Tables Detected:</dt><dd>${Number.isFinite(db.tablesDetected)?db.tablesDetected:'Unknown'}</dd><dt>Tables Created:</dt><dd>${Number.isFinite(db.tablesCreated)?db.tablesCreated:'Unknown'}</dd><dt>Indexes Created:</dt><dd>${Number.isFinite(db.indexesCreated)?db.indexesCreated:'Unknown'}</dd><dt>Seed Records Inserted:</dt><dd>${Number.isFinite(db.seedRecordsInserted)?db.seedRecordsInserted:'Unknown'}</dd><dt>Safe Error:</dt><dd>${escapeHtml(db.connectionError || db.safeDetails || 'None')}</dd></dl><p class="muted">Actual database URL values are never displayed.</p></details>`;
}
function stepCompany(){ return `<h2>Company Profile</h2><div class="form-row"><label class="field">Company name<input data-field="company.name" value="${escapeHtml(val('company.name',''))}"></label><label class="field">Email<input data-field="company.email" value="${escapeHtml(val('company.email',''))}"></label><label class="field">Phone<input data-field="company.phone" value="${escapeHtml(val('company.phone',''))}"></label><label class="field">Website<input data-field="company.website" value="${escapeHtml(val('company.website',''))}"></label></div><label class="field">Address<textarea data-field="company.address">${escapeHtml(val('company.address',''))}</textarea></label>`; }
function stepBranding(){ return `<h2>Branding Assets</h2><div class="form-row"><label class="field">Logo upload<input id="logoUpload" type="file" accept="image/*"></label><label class="field">Favicon upload<input id="faviconUpload" type="file" accept="image/*"></label></div><p class="muted">Assets are encoded into the installer draft and written through the database-backed file manager after install, rather than URL-only settings.</p><div class="brand-logo">${val('branding.logoData')?`<img src="${val('branding.logoData')}">`:'🏗️'}</div>`; }
function updateTheme(values){ state.draft.theme={...(state.draft.theme||{}),...values}; saveLocalDraft(); scheduleDraftSave(); applyTheme(); renderInstaller(); }
function applyPreset(id){ const p=themePresets.find(x=>x.id===id); if(!p) return; updateTheme({ ...p, preset:id, mode:p.mode, customSidebar:true, customMobileNav:true, updated_at:new Date().toISOString() }); }
function resetThemeColor(field){ const preset=themePresets.find(p=>p.id===(state.draft.theme||{}).preset); updateTheme({ [field]: preset?.[field] || resetValue(field), updated_at:new Date().toISOString() }); }
function resetValue(key){ return ({primary:'#2563eb',accent:'#f59e0b',background:'#f8fafc',surface:'#ffffff',text:'#0f172a',border:'#dbe3ef',button:'#2563eb',buttonText:'#ffffff',sidebar:'#0f172a',sidebarText:'#f8fafc',mobileNav:'#111827',mobileNavText:'#f8fafc'})[key]; }
function stepTheme(){ const t=state.draft.theme||{}; const colors=[['Primary Brand Color','primary'],['Accent Color','accent'],['Page Background','background'],['Card Background','surface'],['Text Color','text'],['Border Color','border'],['Button Color','button'],['Button Text','buttonText'],['Sidebar Background','sidebar'],['Sidebar Text','sidebarText'],['Mobile Nav Background','mobileNav'],['Mobile Nav Text','mobileNavText']]; return `<div class="builder-head"><div><h2>Theme Builder</h2><p class="muted">Choose a professional starting point, then fine tune plain-English color controls. Your selections apply across the homepage, dashboard, client portal, worker portal, quote viewer, and invoice viewer after install.</p></div></div>
  <div class="builder-layout"><div class="builder-main">
    <section class="builder-section"><h3>Theme Mode</h3><div class="segmented-cards">${[['system','System','Follows the visitor’s device setting.'],['light','Light','Bright, clean pages for daytime browsing.'],['dark','Dark','Premium low-glare experience for dashboards.'],['custom','Custom','Use your saved brand palette exactly.']].map(([id,name,desc])=>`<button type="button" class="segment-card ${((t.mode||'system')===id)?'active':''}" data-theme-mode="${id}"><b>${name}</b><span>${desc}</span></button>`).join('')}</div></section>
    <section class="builder-section"><h3>Professional Presets</h3><p class="muted">Click a preset to update the full live preview immediately.</p><div class="preset-grid">${themePresets.map(p=>presetCard(p,t.preset===p.id)).join('')}</div></section>
    <section class="builder-section"><h3>Custom Colors</h3><p class="muted">Large swatches, color pickers, hex inputs, and one-click resets keep this friendly for non-developers.</p><div class="toggle-row"><label><input type="checkbox" data-field="theme.customSidebar" ${t.customSidebar?'checked':''}> Use custom sidebar colors</label><label><input type="checkbox" data-field="theme.customMobileNav" ${t.customMobileNav?'checked':''}> Use custom mobile nav colors</label></div><div class="color-grid">${colors.map(([label,key])=>colorControl(label,key,t[key]||resetValue(key))).join('')}</div></section>
  </div><aside class="builder-preview sticky-preview"><h3>Live Theme Preview</h3>${themePreview()}</aside></div>`; }
function presetCard(p,active){ return `<button type="button" class="preset-card ${active?'active':''}" data-preset="${p.id}"><div class="palette">${['primary','accent','background','surface','text'].map(k=>`<span style="background:${p[k]}"></span>`).join('')}</div><div class="mini-card" style="background:${p.background};color:${p.text};border-color:${p.border}"><span style="background:${p.primary}"></span><b>${p.name}</b><small>${p.best}</small></div><b>${p.name}</b><small>${p.best}</small></button>`; }
function colorControl(label,key,value){ return `<div class="color-control"><div class="large-swatch" style="background:${escapeHtml(value)}"></div><label>${label}<input type="color" data-field="theme.${key}" value="${escapeHtml(value)}"></label><input class="hex-input" data-field="theme.${key}" value="${escapeHtml(value)}" pattern="#[0-9a-fA-F]{6}"><button type="button" class="secondary" data-reset-color="${key}">Reset</button></div>`; }
function themePreview(){ return `<div class="preview premium-preview"><header class="public-preview"><b>${escapeHtml(val('company.name','Your Contractor Co.'))}</b><nav>Services · Projects · Contact</nav><button>Request Estimate</button></header><div class="preview-shell"><aside class="preview-sidebar"><b>Dashboard</b><a>Overview</a><a class="active">Work Orders</a><a>Invoices</a></aside><main><div class="card dashboard-mini"><h4>Dashboard Card</h4><p class="muted">Open jobs, revenue, and schedule health.</p><input placeholder="Input field"><p><button>Primary Button</button> <button class="secondary">Secondary Button</button></p></div><div class="estimate-card"><b>Estimate #1042</b><p>Kitchen remodel consultation</p><strong>$4,800 - $6,200</strong></div></main></div><div class="mobile-preview"><span>Home</span><span>Jobs</span><span>Pay</span><span>Menu</span></div></div>`; }
function stepOwner(){ return `<h2>Owner Account</h2><div class="form-row"><label class="field">Full name<input data-field="owner.fullName" value="${escapeHtml(val('owner.fullName',''))}"></label><label class="field">Email<input type="email" data-field="owner.email" value="${escapeHtml(val('owner.email',''))}"></label><label class="field">Phone<input data-field="owner.phone" value="${escapeHtml(val('owner.phone',''))}"></label></div><p class="muted">Finish Install creates or verifies this owner, default roles, role permissions, workspace access, and audit logs.</p>`; }
function stepModules(){ const enabled=new Set(state.draft.modules||coreModules.map(m=>m.id)); return `<h2>Module Selection</h2><p>Drop-in module manifests are discovered automatically; no manual router, sidebar, navigation, or permission edits.</p>${sidebarGroups.map(g=>`<h3>${g}</h3>${coreModules.filter(m=>m.group===g).map(m=>`<label class="module-pill"><input type="checkbox" data-module="${m.id}" ${enabled.has(m.id)?'checked':''}> ${m.icon} ${m.label}</label>`).join('')}`).join('')}`; }
function defaultServiceItems(){ const raw=val('services.list','General Contracting, Plumbing, Electrical, HVAC, Roofing'); return String(raw).split(/[\n,]+/).map((name,i)=>name.trim()).filter(Boolean).map((name,i)=>({ name, category:'Core Services', icon:serviceIcons[i%serviceIcons.length], color:['#2563eb','#f97316','#16a34a','#7c3aed'][i%4], laborRate:'', active:true })); }
function services(){ state.draft.services ||= {}; state.draft.services.items ||= defaultServiceItems(); return state.draft.services.items; }
function persistServices(render=true){ state.draft.services.items=services(); state.draft.services.list=services().map(s=>s.name).join(', '); saveLocalDraft(); scheduleDraftSave(); if(render) renderInstaller(); }
function addService(name='New Service'){ services().push({ name, category:'Core Services', icon:'🛠️', color:'#2563eb', laborRate:'', active:true }); persistServices(); }
function toggleService(name){ const items=services(); const idx=items.findIndex(s=>s.name.toLowerCase()===name.toLowerCase()); idx>=0?items.splice(idx,1):items.push({ name, category:'Suggested', icon:'🛠️', color:'#2563eb', laborRate:'', active:true }); persistServices(); }
function addServiceTemplate(name){ (serviceTemplates[name]||[]).forEach(s=>{ if(!services().some(x=>x.name.toLowerCase()===s.toLowerCase())) services().push({ name:s, category:name, icon:'🛠️', color:'#2563eb', laborRate:'', active:true }); }); persistServices(); }
function updateService(i,patch,render=true){ Object.assign(services()[i]||{},patch); persistServices(render); }
function removeService(i){ services().splice(i,1); persistServices(); }
function moveService(i,dir){ const items=services(); const j=i+dir; if(j<0||j>=items.length) return; [items[i],items[j]]=[items[j],items[i]]; persistServices(); }
function stepServices(){ const items=services(); return `<div class="builder-head"><div><h2>Services Builder</h2><p class="muted">Build reusable service records with categories, icons, colors, rates, active status, and ordering. These save as structured installer draft records and seed service_categories on finish install.</p></div><button type="button" id="addService">Add Service</button></div><section class="builder-section"><h3>Quick Templates</h3><div class="chip-row">${Object.keys(serviceTemplates).map(t=>`<button type="button" class="secondary" data-template="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')}</div></section><section class="builder-section"><h3>Suggested Services</h3><div class="chip-row">${suggestedServices.map(s=>`<button type="button" class="service-chip ${items.some(i=>i.name===s)?'active':''}" data-suggest-service="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}</div></section><section class="builder-section"><h3>Selected Services</h3><div class="service-card-list">${items.map((svc,i)=>serviceCard(svc,i)).join('')}</div></section>`; }
function serviceCard(svc,i){ return `<article class="service-card"><div class="drag-handle">⋮⋮</div><div class="service-icon" style="background:${escapeHtml(svc.color||'#2563eb')}">${escapeHtml(svc.icon||'🛠️')}</div><div class="service-edit-grid"><label>Name<input data-service-field="${i}:name" value="${escapeHtml(svc.name)}"></label><label>Category / group<input data-service-field="${i}:category" value="${escapeHtml(svc.category||'Core Services')}"></label><label>Icon<select data-service-field="${i}:icon">${serviceIcons.map(ic=>`<option ${svc.icon===ic?'selected':''}>${ic}</option>`).join('')}</select></label><label>Color<input type="color" data-service-field="${i}:color" value="${escapeHtml(svc.color||'#2563eb')}"></label><label>Default labor rate optional<input type="number" min="0" step="1" data-service-field="${i}:laborRate" value="${escapeHtml(svc.laborRate||'')}"></label></div><div class="service-actions"><label class="switch"><input type="checkbox" data-service-toggle="${i}" ${svc.active!==false?'checked':''}> Active</label><button type="button" class="secondary" data-service-move="${i}" data-dir="-1">↑</button><button type="button" class="secondary" data-service-move="${i}" data-dir="1">↓</button><button type="button" class="ghost">Edit</button><button type="button" class="danger" data-service-remove="${i}">Remove</button></div></article>`; }
function sections(){ state.draft.homepage ||= {}; state.draft.homepage.sections ||= homepageSectionDefaults.map(([type,title,description],i)=>({type,title,description,enabled:true,sortOrder:i})); return state.draft.homepage.sections; }
function persistHomepage(render=true){ saveLocalDraft(); scheduleDraftSave(); if(render) renderInstaller(); }
function updateSection(i,patch,render=true){ Object.assign(sections()[i]||{},patch); persistHomepage(render); }
function moveSection(i,dir){ const a=sections(),j=i+dir; if(j<0||j>=a.length) return; [a[i],a[j]]=[a[j],a[i]]; persistHomepage(); }
function projects(){ state.draft.homepage ||= {}; state.draft.homepage.projects ||= []; return state.draft.homepage.projects; }
function testimonials(){ state.draft.homepage ||= {}; state.draft.homepage.testimonials ||= []; return state.draft.homepage.testimonials; }
function addProject(){ projects().push({title:'Featured Project',category:'Remodeling',description:'Describe the work, customer outcome, and craftsmanship.',imageData:'',beforeAfter:false,estimateRange:''}); persistHomepage(); }
function updateProject(i,patch,render=true){ Object.assign(projects()[i]||{},patch); persistHomepage(render); }
function removeProject(i){ projects().splice(i,1); persistHomepage(); }
function addTestimonial(){ testimonials().push({customerName:'Happy Customer',rating:'5',reviewText:'Fast, professional, and easy to work with.',photoData:''}); persistHomepage(); }
function updateTestimonial(i,patch,render=true){ Object.assign(testimonials()[i]||{},patch); persistHomepage(render); }
function removeTestimonial(i){ testimonials().splice(i,1); persistHomepage(); }
function stepHomepage(){ const h=state.draft.homepage||{}; const sec=sections(); return `<div class="builder-head"><div><h2>Homepage Builder</h2><p class="muted">A visual setup flow for your public site. Developer JSON is tucked away under Advanced Developer Settings.</p></div></div><div class="builder-layout"><div class="builder-main"><section class="builder-section"><h3>Hero Section</h3><div class="form-row"><label class="field">Hero title<input data-field="homepage.heroTitle" value="${escapeHtml(h.heroTitle||'')}" placeholder="Reliable service, fast estimates"></label><label class="field">Hero subtitle<textarea data-field="homepage.heroSubtitle">${escapeHtml(h.heroSubtitle||'')}</textarea></label><label class="field">Primary CTA text<input data-field="homepage.primaryCtaText" value="${escapeHtml(h.primaryCtaText||h.ctaLabel||'Request an Estimate')}"></label><label class="field">Primary CTA link<input data-field="homepage.primaryCtaLink" value="${escapeHtml(h.primaryCtaLink||'/request-estimate')}"></label><label class="field">Secondary CTA text<input data-field="homepage.secondaryCtaText" value="${escapeHtml(h.secondaryCtaText||'View Services')}"></label><label class="field">Secondary CTA link<input data-field="homepage.secondaryCtaLink" value="${escapeHtml(h.secondaryCtaLink||'#services')}"></label><label class="field">Hero image upload<input id="heroUpload" type="file" accept="image/*"></label><label class="field">Hero background style<select data-field="homepage.heroBackgroundStyle"><option ${h.heroBackgroundStyle==='gradient'?'selected':''}>gradient</option><option ${h.heroBackgroundStyle==='solid'?'selected':''}>solid</option><option ${h.heroBackgroundStyle==='image'?'selected':''}>image</option><option ${h.heroBackgroundStyle==='pattern'?'selected':''}>pattern</option></select></label><label class="field">Hero alignment<select data-field="homepage.heroAlignment"><option ${h.heroAlignment==='left'?'selected':''}>left</option><option ${h.heroAlignment==='center'?'selected':''}>center</option><option ${h.heroAlignment==='split'?'selected':''}>split</option></select></label><label class="switch"><input type="checkbox" data-field="homepage.showEstimatePreview" ${h.showEstimatePreview!==false?'checked':''}> Show estimate preview card</label></div></section><section class="builder-section"><h3>Company Info</h3><div class="form-row"><label class="field">Company description<textarea data-field="homepage.companyDescription">${escapeHtml(h.companyDescription||'')}</textarea></label><label class="field">Phone<input data-field="homepage.phone" value="${escapeHtml(h.phone||val('company.phone',''))}"></label><label class="field">Email<input data-field="homepage.email" value="${escapeHtml(h.email||val('company.email',''))}"></label><label class="field">Service area<input data-field="homepage.serviceArea" value="${escapeHtml(h.serviceArea||'')}"></label><label class="field">Business hours<input data-field="homepage.businessHours" value="${escapeHtml(h.businessHours||'Mon–Fri, 8am–5pm')}"></label><label class="field">License / ROC number optional<input data-field="homepage.licenseNumber" value="${escapeHtml(h.licenseNumber||'')}"></label><label class="switch"><input type="checkbox" data-field="homepage.emergencyService" ${h.emergencyService?'checked':''}> Emergency service available</label></div></section><section class="builder-section"><h3>Homepage Sections</h3><div class="section-card-list">${sec.map((x,i)=>sectionCard(x,i)).join('')}</div></section><section class="builder-section"><div class="builder-head"><h3>Featured Projects</h3><button type="button" id="addProject" class="secondary">Add Project</button></div>${projects().map((x,i)=>projectCard(x,i)).join('')||'<p class="muted">Add project cards with uploads, before/after flags, and estimate ranges.</p>'}</section><section class="builder-section"><div class="builder-head"><h3>Testimonials</h3><button type="button" id="addTestimonial" class="secondary">Add Testimonial</button></div>${testimonials().map((x,i)=>testimonialCard(x,i)).join('')||'<p class="muted">Add customer quotes, ratings, and optional photos.</p>'}</section><details class="builder-section"><summary><b>Advanced Developer Settings</b></summary><label class="field">Sections JSON<textarea data-field="homepage.sectionsText" rows="5">${escapeHtml(h.sectionsText||JSON.stringify(sec,null,2))}</textarea></label></details></div><aside class="builder-preview sticky-preview"><h3>Homepage Live Preview</h3>${homepagePreview(h,sec)}</aside></div>`; }
function sectionCard(x,i){ return `<article class="section-card"><div class="drag-handle">⋮⋮</div><label class="switch"><input type="checkbox" data-section-toggle="${i}" ${x.enabled!==false?'checked':''}> Enabled</label><label>Title<input data-section-field="${i}:title" value="${escapeHtml(x.title)}"></label><label>Short description<input data-section-field="${i}:description" value="${escapeHtml(x.description||'')}"></label><button type="button" class="secondary" data-section-move="${i}" data-dir="-1">↑</button><button type="button" class="secondary" data-section-move="${i}" data-dir="1">↓</button></article>`; }
function projectCard(x,i){ return `<article class="feature-card"><label>Title<input data-project-field="${i}:title" value="${escapeHtml(x.title||'')}"></label><label>Category<input data-project-field="${i}:category" value="${escapeHtml(x.category||'')}"></label><label>Description<textarea data-project-field="${i}:description">${escapeHtml(x.description||'')}</textarea></label><label>Image upload<input type="file" accept="image/*" data-project-upload="${i}"></label><label>Estimate range optional<input data-project-field="${i}:estimateRange" value="${escapeHtml(x.estimateRange||'')}"></label><label class="switch"><input type="checkbox" data-project-field="${i}:beforeAfter" ${x.beforeAfter?'checked':''}> Before/after project</label><button type="button" class="danger" data-project-remove="${i}">Remove</button></article>`; }
function testimonialCard(x,i){ return `<article class="feature-card"><label>Customer name<input data-testimonial-field="${i}:customerName" value="${escapeHtml(x.customerName||'')}"></label><label>Rating<input type="number" min="1" max="5" data-testimonial-field="${i}:rating" value="${escapeHtml(x.rating||'5')}"></label><label>Review text<textarea data-testimonial-field="${i}:reviewText">${escapeHtml(x.reviewText||'')}</textarea></label><label>Optional photo upload<input type="file" accept="image/*" data-testimonial-upload="${i}"></label><button type="button" class="danger" data-testimonial-remove="${i}">Remove</button></article>`; }
function homepagePreview(h,sec){ const enabled=sec.filter(s=>s.enabled!==false).slice(0,5); return `<div class="homepage-preview"><div class="device desktop"><div class="hero ${h.heroAlignment||'left'}"><div><b>${escapeHtml(h.heroTitle||'Reliable contractor service')}</b><p>${escapeHtml(h.heroSubtitle||'Fast estimates, trusted work, and clear updates.')}</p><button>${escapeHtml(h.primaryCtaText||'Request an Estimate')}</button><button class="secondary">${escapeHtml(h.secondaryCtaText||'View Services')}</button></div>${h.showEstimatePreview!==false?'<aside class="estimate-card"><b>Estimate preview</b><p>2 day turnaround</p><strong>$1,200+</strong></aside>':''}</div>${enabled.map(s=>`<section><b>${escapeHtml(s.title)}</b><p>${escapeHtml(s.description||'')}</p></section>`).join('')}</div><div class="device mobile"><b>${escapeHtml(h.heroTitle||'Reliable service')}</b><button>${escapeHtml(h.primaryCtaText||'Request Estimate')}</button>${enabled.slice(0,3).map(s=>`<span>${escapeHtml(s.title)}</span>`).join('')}</div></div>`; }
function stepReview(){ return `<h2>Review & Finish</h2><div class="grid cols-2"><div class="card"><h3>Database</h3><p>Connected: ${state.db?.connected?'Yes':'No'}</p><p>Schema: ${state.db?.schemaReady?'Ready':'Pending'}</p><p>Write Verification: ${state.db?.writeTestPassed?'Passed':'Run Retry Database Check'}</p></div><div class="card"><h3>Optional Integrations</h3><p>These integrations can be configured later in System Center.</p>${state.integrations.map(i=>`<p><b>${i.key}</b>: ${i.configured?'Configured':'Not configured; platform will use manual mode.'}</p>`).join('')}</div></div>`; }
function readAsset(e,path){ const file=e.target.files?.[0]; if(!file) return; const r=new FileReader(); r.onload=()=>{ setDraft(path,r.result); renderInstaller(); }; r.readAsDataURL(file); }
function readArrayAsset(e,path,index,key){ const file=e.target.files?.[0]; if(!file) return; const r=new FileReader(); r.onload=()=>{ const parts=path.split('.'); let node=state.draft; while(parts.length){ const p=parts.shift(); node[p] ||= parts.length ? {} : []; node=node[p]; } node[index] ||= {}; node[index][key]=r.result; saveLocalDraft(); scheduleDraftSave(); renderInstaller(); }; r.readAsDataURL(file); }

async function renderDashboard(){
  applyTheme();
  const data=await api('/api/dashboard/bootstrap');
  if(data.theme) applyTheme(themeFromDatabase(data.theme));
  const modules=(data.modules?.length?data.modules:coreModules.map(m=>({id:m.id,label:m.label,nav_group:m.group}))).filter(m=>visibleForRole(m.id,state.view));
  const company=data.company?.company_name || val('company.name','Contractor CMMS');
  app.innerHTML=`<div class="app-shell"><aside class="sidebar"><div class="brand"><div class="brand-logo">${val('branding.logoData')?`<img src="${val('branding.logoData')}">`:'🏗️'}</div><div><b>${escapeHtml(company)}</b><div class="workspace">Primary workspace</div></div></div>${ownerSwitcher()}${nav(modules)}</aside><main class="content"><div class="topbar"><div><h1>${escapeHtml(labelFor(state.active))}</h1><p class="muted">Premium CMMS dashboard loaded from database-backed settings when installed.</p></div><button class="secondary" onclick="location.href='/install/'">Installer</button><button class="secondary" onclick="location.href='/'">Installer</button></div>${state.view!=='owner'?`<div class="banner">Testing ${cap(state.view)} View as Owner <button class="secondary" id="exitView">Exit Test View</button></div>`:''}${dashboardContent()}</main><nav class="mobile-nav">${modules.slice(0,5).map(m=>`<a href="#${m.id}" data-nav="${m.id}">${labelFor(m.id).split(' ')[0]}</a>`).join('')}</nav></div>`;
  $$('[data-nav]').forEach(a=>a.onclick=e=>{e.preventDefault(); state.active=a.dataset.nav; renderDashboard();});
  $('#viewSelect')?.addEventListener('change', e=>{state.view=e.target.value; sessionStorage.setItem('ownerView',state.view); state.active='dashboard-overview'; renderDashboard();});
  $('#exitView')?.addEventListener('click',()=>{state.view='owner';sessionStorage.setItem('ownerView','owner');renderDashboard();});
}
function themeFromDatabase(row={}){ const custom=row.custom||{}; return { ...custom, mode:custom.mode||row.mode||'system', primary:custom.primary||row.primary_color, accent:custom.accent||row.accent_color, background:custom.background||row.background_color, surface:custom.surface||row.surface_color, text:custom.text||row.text_color, border:custom.border||row.border_color, button:custom.button||row.button_color, buttonText:custom.buttonText||row.button_text_color, sidebar:custom.sidebar||row.sidebar_color, sidebarText:custom.sidebarText||row.sidebar_text_color, mobileNav:custom.mobileNav||row.mobile_nav_color, mobileNavText:custom.mobileNavText||row.mobile_nav_text_color }; }
function ownerSwitcher(){ return `<div class="view-switcher"><b>Viewing as: ${cap(state.view)}</b><label class="field">Switch View<select id="viewSelect">${defaultRoles.map(r=>`<option value="${r}" ${state.view===r?'selected':''}>${cap(r)} View</option>`).join('')}</select></label></div>`; }
function nav(modules){ return sidebarGroups.map(g=>{ const items=modules.filter(m=>(m.nav_group||m.group)===g); if(!items.length) return ''; return `<section class="nav-section"><div class="nav-title">${g}</div>${items.map(m=>`<a class="nav-item ${state.active===m.id?'active':''}" href="#${m.id}" data-nav="${m.id}"><span>${iconFor(m.id)}</span><span>${escapeHtml(labelFor(m.id))}</span></a>`).join('')}</section>`; }).join(''); }
function visibleForRole(id,role){ const m=coreModules.find(x=>x.id===id); return !m || m.roles.includes(role) || role==='owner'; }
function labelFor(id){ return coreModules.find(m=>m.id===id)?.label || id; } function iconFor(id){ return coreModules.find(m=>m.id===id)?.icon || '•'; } function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
function dashboardContent(){ const m=coreModules.find(x=>x.id===state.active); if(m?.ai && !state.integrations.find(i=>i.key==='OPENAI_API_KEY')?.configured) return `<section class="card"><h2>${m.label}</h2><p>AI is not configured yet.</p><p>Configure OpenAI in System Center → Environment & Integrations.</p></section>`; return `<section class="grid cols-3"><div class="card"><div class="stat">12</div><b>Open work orders</b><p class="muted">Workflow-driven operations.</p></div><div class="card"><div class="stat">$8.4k</div><b>Draft invoices</b><p class="muted">Manual payment tracking works without Square.</p></div><div class="card"><div class="stat">9</div><b>Core modules</b><p class="muted">Basic non-AI modules are active.</p></div></section><section class="card"><h2>${m?.label||'Dashboard'}</h2><p>${m?.description||'Dashboard overview.'}</p><div class="grid cols-2"><button>Create record</button><button class="secondary">View recent activity</button></div></section>`; }

boot();
