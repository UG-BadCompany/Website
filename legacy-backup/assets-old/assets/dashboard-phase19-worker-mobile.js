// public/assets/dashboard-phase19-worker-mobile.js
// Phase 19: mobile-first worker field experience.

(() => {
  const root = document.querySelector('[data-dashboard-root]');
  if (!root || window.__taWorkerMobilePhase19Loaded) return;
  window.__taWorkerMobilePhase19Loaded = true;

  const fetchJson = async (url) => {
    const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', headers: { accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.message || `Request failed: ${url}`);
    return data;
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));

  const statusOf = (job) => job.assignmentStatus || job.status || 'assigned';

  const mount = () => {
    if (document.querySelector('[data-worker-mobile-suite]')) return;
    const after = document.querySelector('[data-phase12-client-worker]') ||
      document.querySelector('[data-phase3-workflow-suite]') ||
      root.firstElementChild;

    const section = document.createElement('section');
    section.className = 'worker-mobile-suite';
    section.dataset.workerMobileSuite = 'true';
    section.id = 'worker-mobile-field';
    section.innerHTML = `
      <section class="worker-mobile-panel">
        <span class="eyebrow">Mobile Worker Mode</span>
        <h2>Today’s field work</h2>
        <p>Fast mobile view for assigned jobs, safety checks, blocked-job notes, and completion closeout.</p>

        <div class="worker-mobile-toolbar">
          <div class="worker-mobile-kpis">
            <div class="worker-mobile-kpi"><span>Jobs</span><strong data-worker-mobile-total>—</strong></div>
            <div class="worker-mobile-kpi"><span>Active</span><strong data-worker-mobile-active>—</strong></div>
            <div class="worker-mobile-kpi"><span>Blocked</span><strong data-worker-mobile-blocked>—</strong></div>
          </div>
          <div class="worker-mobile-actions">
            <button class="btn btn-primary" type="button" data-worker-mobile-refresh>Refresh</button>
            <a class="btn btn-soft" href="#worker-jobs">Full Jobs</a>
          </div>
        </div>

        <div class="worker-mobile-list" data-worker-mobile-list>
          <div class="worker-mobile-empty">Worker jobs load after sign-in.</div>
        </div>
      </section>

      <nav class="worker-mobile-bottom-bar" aria-label="Worker mobile quick actions">
        <a class="btn btn-primary" href="#worker-mobile-field">Today</a>
        <a class="btn btn-soft" href="#worker-jobs">Jobs</a>
        <button class="btn btn-soft" type="button" data-worker-mobile-refresh-bottom>Refresh</button>
      </nav>
    `;

    after.parentNode.insertBefore(section, after.nextSibling);
    section.querySelector('[data-worker-mobile-refresh]')?.addEventListener('click', loadJobs);
    section.querySelector('[data-worker-mobile-refresh-bottom]')?.addEventListener('click', loadJobs);
  };

  const renderJobs = (jobs = []) => {
    const list = document.querySelector('[data-worker-mobile-list]');
    const total = document.querySelector('[data-worker-mobile-total]');
    const active = document.querySelector('[data-worker-mobile-active]');
    const blocked = document.querySelector('[data-worker-mobile-blocked]');

    if (total) total.textContent = String(jobs.length);
    if (active) active.textContent = String(jobs.filter((job) => ['accepted', 'assigned', 'scheduled', 'in_progress'].includes(statusOf(job))).length);
    if (blocked) blocked.textContent = String(jobs.filter((job) => statusOf(job) === 'blocked').length);

    if (!list) return;

    if (!jobs.length) {
      list.innerHTML = '<div class="worker-mobile-empty">No assigned worker jobs found right now.</div>';
      return;
    }

    list.innerHTML = jobs.slice(0, 8).map((job) => {
      const title = job.serviceType || job.service || job.title || 'Assigned job';
      const address = [job.streetAddress, job.city].filter(Boolean).join(', ');
      const status = statusOf(job);
      const notes = job.description || job.notes || job.assignmentNotes || '';
      return `
        <article class="worker-mobile-card">
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(address || 'Address will show when available.')}</p>
          <div class="worker-mobile-card-meta">
            <span class="worker-mobile-pill">${escapeHtml(status.replaceAll('_', ' '))}</span>
            ${job.scheduledDate ? `<span class="worker-mobile-pill">${escapeHtml(job.scheduledDate)}</span>` : ''}
            ${job.startTime ? `<span class="worker-mobile-pill">${escapeHtml(job.startTime)}</span>` : ''}
          </div>
          <p>${escapeHtml(String(notes).slice(0, 180))}${String(notes).length > 180 ? '…' : ''}</p>
          <div class="worker-mobile-checklist">
            <label><input type="checkbox"> Before photos taken</label>
            <label><input type="checkbox"> Scope and safety confirmed</label>
            <label><input type="checkbox"> Materials/parts documented</label>
            <label><input type="checkbox"> Completion notes ready</label>
          </div>
          <div class="worker-field-actions">
            <a class="btn btn-primary" href="#worker-jobs">Open job</a>
            <button class="btn btn-soft" type="button" data-worker-mobile-blocked>Blocked</button>
          </div>
        </article>
      `;
    }).join('');

    list.querySelectorAll('[data-worker-mobile-blocked]').forEach((button) => {
      button.addEventListener('click', () => {
        window.TAUX?.toast?.({
          title: 'Blocked job note',
          message: 'Document the issue with photos and notify admin before extra work.',
          type: 'warn',
        });
      });
    });
  };

  const loadJobs = async () => {
    const list = document.querySelector('[data-worker-mobile-list]');
    if (list) list.innerHTML = '<div class="worker-mobile-empty">Loading assigned jobs…</div>';

    try {
      const data = await fetchJson('/api/worker/jobs');
      renderJobs(data.jobs || data.assignments || []);
    } catch (error) {
      if (list) list.innerHTML = `<div class="worker-mobile-empty">${escapeHtml(error.message || 'Worker jobs load after sign-in.')}</div>`;
    }
  };

  mount();
  setTimeout(loadJobs, 1600);
  window.addEventListener('ta:dashboard-refresh', loadJobs);
})();
