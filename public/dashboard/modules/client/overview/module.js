window.TAModules.register({
  id:'client.overview',
  role:'client',
  title:'My Project',
  icon:'🏠',
  permissions:[],
  async mount(ctx){
    const root = ctx.mountRoot || ctx.root || document.querySelector('[data-module-root]') || document.body;
    const esc = (v='') => String(v ?? '').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const api = window.TAApi;
    let data = { requests: [], quotes: [], invoices: [] };
    try {
      const [requests, quotes, invoices] = await Promise.all([
        api.get('/api/client/job-requests').catch(()=>({ requests: [] })),
        api.get('/api/client/quotes').catch(()=>({ quotes: [] })),
        api.get('/api/client/invoices').catch(()=>({ invoices: [] })),
      ]);
      data = { ...requests, ...quotes, ...invoices };
    } catch {}
    const request = (data.requests || [])[0] || {};
    const customer = request.requesterName || request.name || window.TAAuth?.currentUser?.fullName || 'Thomas';
    const project = request.title || request.service || request.description?.slice(0, 48) || 'Kitchen Ceiling Repair';
    const status = request.status || 'worker_assigned';
    const steps = [
      ['Request Received', true], ['Quote Ready', ['quoted','approved','worker_assigned','scheduled','in_progress','completed','invoice_sent','paid'].includes(status)],
      ['Approved', ['approved','worker_assigned','scheduled','in_progress','completed','invoice_sent','paid'].includes(status)],
      ['Worker Assigned', ['worker_assigned','scheduled','in_progress','completed','invoice_sent','paid'].includes(status)],
      ['Scheduled', ['scheduled','in_progress','completed','invoice_sent','paid'].includes(status)],
      ['Complete', ['completed','invoice_sent','paid'].includes(status)], ['Invoice', ['invoice_sent','paid'].includes(status)]
    ];
    const complete = Math.max(1, steps.filter(([,done])=>done).length);
    const percent = Math.round((complete / steps.length) * 100);
    root.innerHTML = `<section class="module-page client-project-page">
      <div class="client-project-hero card">
        <div><p class="eyebrow">My Project</p><h2>${esc(customer)}</h2><p>${esc(project)}</p></div>
        <a class="btn" href="/#estimate">Request New Estimate</a>
      </div>
      <article class="client-project-card card">
        <header><div><p class="eyebrow">Active project</p><h2>${esc(project)}</h2></div><strong>${percent}% Complete</strong></header>
        <div class="client-progress-track"><i style="width:${percent}%"></i></div>
        <div class="client-project-layout">
          <ol class="client-timeline">${steps.map(([label, done], index)=>`<li class="${done ? 'done' : index === complete ? 'current' : ''}"><span>${done ? '✓' : index === complete ? '→' : '○'}</span>${esc(label)}</li>`).join('')}</ol>
          <aside class="client-project-side">
            <div><span>Worker</span><strong>${esc(request.workerName || 'Assigned after approval')}</strong></div>
            <div><span>Photos</span><strong>${Number(request.photoNames?.length || request.photoUploads?.length || 0)} uploaded</strong></div>
            <div><span>Property</span><strong>${esc(request.streetAddress || request.propertyAddress || 'Address on file')}</strong></div>
          </aside>
        </div>
      </article>
      <div class="client-project-grid">
        <article class="card"><p class="eyebrow">Photos</p><h3>Project documentation</h3><p>Before photos, estimate photos, worker updates, and completion images stay connected to this project.</p></article>
        <article class="card"><p class="eyebrow">Updates</p><h3>Simple timeline</h3><p>No tables. Just clear steps, worker assignment, quote status, invoice status, and next actions.</p></article>
        <article class="card"><p class="eyebrow">Billing</p><h3>Quotes & invoices</h3><p>${(data.quotes || []).length} quotes and ${(data.invoices || []).length} invoices are available for this account.</p></article>
      </div>
    </section>`;
    return { destroy(){} };
  },
  async destroy(){},
  async refresh(){}
});
