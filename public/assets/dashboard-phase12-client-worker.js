// public/assets/dashboard-phase12-client-worker.js
(() => {
  const root = document.querySelector('[data-dashboard-root]');
  if (!root || window.__taDashboardPhase12Loaded) return;
  window.__taDashboardPhase12Loaded = true;
  const money = (cents) => `$${(Number(cents || 0) / 100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fetchJson = async (url) => {
    const response = await fetch(url,{cache:'no-store',credentials:'same-origin',headers:{accept:'application/json'}});
    const result = await response.json().catch(()=>({}));
    if (!response.ok || result.ok === false) throw new Error(result.message || `Request failed: ${url}`);
    return result;
  };
  const setText = (selector,value) => { const el=document.querySelector(selector); if(el) el.textContent=value; };
  const mount = () => {
    if (document.querySelector('[data-phase12-client-worker]')) return;
    const after = document.querySelector('[data-phase5-executive-suite]') || document.querySelector('[data-phase4-finance-suite]') || document.querySelector('[data-phase3-workflow-suite]') || document.querySelector('[data-phase2-command-center]') || root.querySelector('.hero') || root.firstElementChild;
    const suite = document.createElement('section');
    suite.className = 'client-worker-suite';
    suite.dataset.phase12ClientWorker = 'true';
    suite.innerHTML = `
      <div class="client-worker-grid">
        <section class="client-upgrade-panel" id="client-tools-upgrade">
          <span class="eyebrow">Client Tools</span><h2>Client portal clarity</h2>
          <p>Customers should know exactly where their request stands, what they owe, what needs approval, and what happens next.</p>
          <div class="client-worker-kpis"><div class="client-worker-kpi"><span>Requests</span><strong data-client-kpi-requests>—</strong></div><div class="client-worker-kpi"><span>Quotes</span><strong data-client-kpi-quotes>—</strong></div><div class="client-worker-kpi"><span>Invoices</span><strong data-client-kpi-invoices>—</strong></div></div>
          <div class="client-progress-rail"><div class="progress-step" data-state="done"><strong>Request</strong><span>Submit details/photos.</span></div><div class="progress-step" data-state="active"><strong>Estimate</strong><span>Admin reviews draft.</span></div><div class="progress-step"><strong>Approve</strong><span>Accept quote.</span></div><div class="progress-step"><strong>Schedule</strong><span>Work gets scheduled.</span></div><div class="progress-step"><strong>Pay</strong><span>Invoice/receipt.</span></div></div>
          <div class="client-action-card"><strong>Next best step</strong><br><span data-client-next-step>Loading client status…</span></div>
          <div class="client-action-card"><strong>Payment clarity</strong><br><span data-client-payment-note>Open invoices and payment links show in Client Invoices.</span></div>
          <div class="client-worker-actions"><a class="btn btn-primary" href="/#estimate">New Request Estimate</a><a class="btn btn-soft" href="#client-requests">My Requests</a><a class="btn btn-soft" href="#client-quotes">My Quotes</a><a class="btn btn-soft" href="#client-invoices">My Invoices</a></div>
        </section>
        <section class="worker-upgrade-panel" id="worker-tools-upgrade">
          <span class="eyebrow">Worker Tools</span><h2>Field-ready workflow</h2>
          <p>Workers need fewer buttons, clearer job cards, blocked-job escalation, and a repeatable closeout checklist.</p>
          <div class="client-worker-kpis"><div class="client-worker-kpi"><span>Assigned</span><strong data-worker-kpi-assigned>—</strong></div><div class="client-worker-kpi"><span>In Progress</span><strong data-worker-kpi-progress>—</strong></div><div class="client-worker-kpi"><span>Blocked</span><strong data-worker-kpi-blocked>—</strong></div></div>
          <div class="worker-progress-rail"><div class="progress-step" data-state="done"><strong>Review</strong><span>Confirm scope/access.</span></div><div class="progress-step" data-state="active"><strong>Start</strong><span>Begin approved work.</span></div><div class="progress-step"><strong>Document</strong><span>Notes/photos/materials.</span></div><div class="progress-step"><strong>Closeout</strong><span>Submit completion.</span></div><div class="progress-step"><strong>Review</strong><span>Admin approves.</span></div></div>
          <div class="worker-check-card"><strong>Field checklist</strong><div class="worker-checklist-v2"><label><input type="checkbox" disabled checked> Verify customer, address, access notes, and approved scope.</label><label><input type="checkbox" disabled checked> Confirm shutoffs/power/safety before work starts.</label><label><input type="checkbox" disabled> Capture before photos and note hidden conditions.</label><label><input type="checkbox" disabled> Track used materials and changes from approved scope.</label><label><input type="checkbox" disabled> Submit completion notes/photos for admin review.</label></div></div>
          <div class="worker-blocked-note">If blocked: stop, document the reason, upload photos, and notify admin before doing extra work.</div>
          <div class="worker-field-actions"><a class="btn btn-primary" href="#worker-jobs">Assigned Jobs</a><button class="btn btn-soft" type="button" data-worker-scroll-jobs>Open Worker Section</button></div>
        </section>
      </div>`;
    after.parentNode.insertBefore(suite, after.nextSibling);
    suite.querySelector('[data-worker-scroll-jobs]')?.addEventListener('click',()=>document.querySelector('#worker-jobs')?.scrollIntoView({behavior:'smooth',block:'start'}));
  };
  const loadClientStats = async () => {
    try {
      const [requests,quotes,invoices] = await Promise.allSettled([fetchJson('/api/client/job-requests'),fetchJson('/api/client/quotes'),fetchJson('/api/client/invoices')]);
      const reqList = requests.status==='fulfilled' ? (requests.value.requests || requests.value.jobRequests || []) : [];
      const quoteList = quotes.status==='fulfilled' ? (quotes.value.quotes || []) : [];
      const invoiceList = invoices.status==='fulfilled' ? (invoices.value.invoices || []) : [];
      setText('[data-client-kpi-requests]', String(reqList.length)); setText('[data-client-kpi-quotes]', String(quoteList.length)); setText('[data-client-kpi-invoices]', String(invoiceList.length));
      const openInvoice = invoiceList.find((x)=>x.status==='open'); const quoteToReview = quoteList.find((x)=>['sent','draft'].includes(x.status)); const activeRequest = reqList.find((x)=>!['completed','cancelled'].includes(x.status));
      let next = 'Submit a Request Estimate when you are ready for new work.';
      if (openInvoice) next = `Invoice ready: ${openInvoice.title || 'Open invoice'} ${openInvoice.amountCents ? `(${money(openInvoice.amountCents)})` : ''}.`;
      else if (quoteToReview) next = `Quote waiting: ${quoteToReview.title || 'Review quote'}.`;
      else if (activeRequest) next = `Request in progress: ${activeRequest.serviceType || activeRequest.service || 'service request'}.`;
      setText('[data-client-next-step]', next); setText('[data-client-payment-note]', openInvoice ? 'Open Client Invoices to pay or view payment status.' : 'No open payment action found right now.');
    } catch { setText('[data-client-next-step]', 'Client tools load after sign-in.'); }
  };
  const loadWorkerStats = async () => {
    try {
      const result = await fetchJson('/api/worker/jobs'); const jobs = result.jobs || result.assignments || [];
      const assigned = jobs.filter((j)=>['assigned','accepted','scheduled'].includes(j.status || j.assignmentStatus)).length;
      const progress = jobs.filter((j)=>['in_progress'].includes(j.status || j.assignmentStatus)).length;
      const blocked = jobs.filter((j)=>['blocked'].includes(j.status || j.assignmentStatus)).length;
      setText('[data-worker-kpi-assigned]', String(assigned || jobs.length)); setText('[data-worker-kpi-progress]', String(progress)); setText('[data-worker-kpi-blocked]', String(blocked));
    } catch { setText('[data-worker-kpi-assigned]','—'); setText('[data-worker-kpi-progress]','—'); setText('[data-worker-kpi-blocked]','—'); }
  };
  mount(); setTimeout(()=>{loadClientStats();loadWorkerStats();},1300);
  window.addEventListener('ta:dashboard-refresh',()=>{loadClientStats();loadWorkerStats();});
})();