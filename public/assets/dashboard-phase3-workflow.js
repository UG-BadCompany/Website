// public/assets/dashboard-phase3-workflow.js
// Phase 3 dashboard upgrade: admin work-order flow, client timeline, worker action flow.

(() => {
  const root = document.querySelector('[data-dashboard-root]');
  if (!root || window.__taDashboardPhase3Loaded) return;
  window.__taDashboardPhase3Loaded = true;

  const money = (cents) => `$${(Number(cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));

  const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { accept: 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) throw new Error(result.message || `Request failed: ${url}`);
    return result;
  };

  const mount = () => {
    if (document.querySelector('[data-phase3-workflow-suite]')) return;

    const phase2 = document.querySelector('[data-phase2-command-center]');
    const after = phase2 || root.querySelector('.hero') || root.firstElementChild;

    const suite = document.createElement('section');
    suite.className = 'workflow-suite';
    suite.dataset.phase3WorkflowSuite = 'true';
    suite.innerHTML = `
      <div class="workflow-tabs" role="tablist" aria-label="Dashboard workflow upgrades">
        <button class="workflow-tab" type="button" role="tab" aria-selected="true" data-workflow-tab="admin">Admin Pipeline</button>
        <button class="workflow-tab" type="button" role="tab" aria-selected="false" data-workflow-tab="client">Client View</button>
        <button class="workflow-tab" type="button" role="tab" aria-selected="false" data-workflow-tab="worker">Worker Flow</button>
      </div>

      <section class="workflow-panel" data-workflow-panel="admin" data-active="true">
        <div class="workflow-panel-header">
          <div>
            <span class="eyebrow">Admin Work Orders</span>
            <h2>Work-order pipeline</h2>
            <p>Approved estimates should move into scheduling, assignment, field work, completion review, invoice, and closeout.</p>
          </div>
          <div class="work-order-actions">
            <button class="btn btn-primary" type="button" data-phase3-refresh-work-orders>Refresh work orders</button>
            <a class="btn btn-soft" href="#estimate-review">Estimate Review</a>
          </div>
        </div>
        <p class="session-status" data-work-order-status>Loading work orders…</p>
        <div class="pipeline-board" data-work-order-board></div>
      </section>

      <section class="workflow-panel" data-workflow-panel="client">
        <div class="workflow-panel-header">
          <div>
            <span class="eyebrow">Client Experience</span>
            <h2>Clear customer timeline</h2>
            <p>Clients need to know where they are: request, estimate, approval, schedule, work, invoice, complete.</p>
          </div>
          <div class="client-action-row">
            <a class="btn btn-primary" href="/#estimate">Submit Request Estimate</a>
            <a class="btn btn-soft" href="#client-quotes">My Quotes</a>
            <a class="btn btn-soft" href="#client-invoices">Invoices</a>
          </div>
        </div>
        <div class="client-timeline-card">
          <h4>Recommended client portal flow</h4>
          <div class="timeline-steps">
            <div class="timeline-step" data-state="done"><strong>1. Request</strong><span>Customer submits Request Estimate.</span></div>
            <div class="timeline-step" data-state="active"><strong>2. Estimate</strong><span>Admin reviews the draft estimate.</span></div>
            <div class="timeline-step"><strong>3. Approval</strong><span>Customer accepts quote.</span></div>
            <div class="timeline-step"><strong>4. Schedule</strong><span>Admin schedules and assigns worker.</span></div>
            <div class="timeline-step"><strong>5. Complete</strong><span>Work, invoice, payment, closeout.</span></div>
          </div>
        </div>
        <div class="client-timeline-card">
          <h4>Portal improvements added</h4>
          <p>Customer-facing dashboard wording stays simple. They see Request Estimate, My Requests, My Quotes, My Invoices, and job progress — not backend AI tools.</p>
        </div>
      </section>

      <section class="workflow-panel" data-workflow-panel="worker">
        <div class="workflow-panel-header">
          <div>
            <span class="eyebrow">Worker Field Flow</span>
            <h2>Technician-ready job cards</h2>
            <p>Workers need a simple field flow: accept, start, note blockers, use inventory, submit completion evidence, and request admin review.</p>
          </div>
          <div class="worker-action-row">
            <a class="btn btn-primary" href="#worker-jobs">Assigned Jobs</a>
            <button class="btn btn-soft" type="button" data-phase3-scroll-worker>Open worker section</button>
          </div>
        </div>
        <div class="worker-flow-card">
          <h4>Standard worker closeout checklist</h4>
          <div class="worker-checklist">
            <label><input type="checkbox" disabled checked> Confirm scope and customer/property access.</label>
            <label><input type="checkbox" disabled checked> Protect work area and verify utilities/safety.</label>
            <label><input type="checkbox" disabled> Complete approved work or mark blocked with reason.</label>
            <label><input type="checkbox" disabled> Add notes, used materials, and completion photos.</label>
            <label><input type="checkbox" disabled> Submit for admin completion review.</label>
          </div>
        </div>
      </section>
    `;

    after.parentNode.insertBefore(suite, after.nextSibling);

    suite.querySelectorAll('[data-workflow-tab]').forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.workflowTab;
        suite.querySelectorAll('[data-workflow-tab]').forEach((button) => {
          button.setAttribute('aria-selected', String(button === tab));
        });
        suite.querySelectorAll('[data-workflow-panel]').forEach((panel) => {
          panel.dataset.active = String(panel.dataset.workflowPanel === target);
        });
      });
    });

    suite.querySelector('[data-phase3-scroll-worker]')?.addEventListener('click', () => {
      document.querySelector('#worker-jobs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const columnLabels = {
    accepted: 'Accepted',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    pending_review: 'Review',
  };

  const renderWorkOrders = (workOrders = []) => {
    const board = document.querySelector('[data-work-order-board]');
    const status = document.querySelector('[data-work-order-status]');
    if (!board) return;

    if (status) status.textContent = `${workOrders.length} active work order(s).`;

    const groups = {
      accepted: [],
      scheduled: [],
      in_progress: [],
      pending_review: [],
    };

    workOrders.forEach((item) => {
      const key = groups[item.status] ? item.status : 'accepted';
      groups[key].push(item);
    });

    board.innerHTML = Object.entries(groups).map(([key, items]) => `
      <section class="pipeline-column" data-pipeline-column="${key}">
        <h3>${columnLabels[key]} <span class="pipeline-count">${items.length}</span></h3>
        ${items.length ? items.map(renderWorkOrderCard).join('') : '<div class="workflow-empty">Nothing here yet.</div>'}
      </section>
    `).join('');

    board.querySelectorAll('[data-work-order-next]').forEach((button) => {
      button.addEventListener('click', async () => {
        const jobRequestId = button.dataset.workOrderNext;
        const nextStatus = button.dataset.nextStatus;
        button.disabled = true;
        button.textContent = 'Updating…';
        try {
          await fetchJson('/api/admin/work-orders', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ jobRequestId, status: nextStatus }),
          });
          window.TAUX?.toast({ title: 'Work order updated', message: `Moved to ${nextStatus.replaceAll('_', ' ')}.`, type: 'success' });
          await loadWorkOrders();
        } catch (error) {
          (window.TAUX ? window.TAUX.toast({ title: 'Work order error', message: error.message || 'Could not update work order.', type: 'error' }) : alert(error.message || 'Could not update work order.'));
          button.disabled = false;
        }
      });
    });
  };

  const nextStepFor = (status) => {
    if (status === 'accepted') return ['scheduled', 'Schedule'];
    if (status === 'scheduled') return ['in_progress', 'Start'];
    if (status === 'in_progress') return ['pending_review', 'Submit review'];
    if (status === 'pending_review') return ['completed', 'Complete'];
    return ['', ''];
  };


  const renderAutomationPlan = (automation = {}) => {
    const priority = automation.priority || {};
    const level = priority.level || 'normal';
    const actions = Array.isArray(automation.actions) ? automation.actions : [];
    const warnings = Array.isArray(automation.warnings) ? automation.warnings : [];
    return `
      <div class="work-order-automation-box automation-priority-${escapeHtml(level)}">
        <strong>Automation: ${escapeHtml(level)} priority (${Number(priority.score || 0)}/100)</strong>
        <p>Suggested schedule: ${escapeHtml(automation.suggestedScheduleWindow || 'next available')}</p>
        ${automation.assignmentNeeded ? '<p>Assignment needed before dispatch.</p>' : ''}
        ${automation.overdue ? '<p>Overdue/escalation review needed.</p>' : ''}
        ${actions.length ? `<ul>${actions.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
        ${warnings.length ? `<ul>${warnings.slice(0, 2).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
      </div>
    `;
  };

  const renderWorkOrderCard = (item) => {
    const [nextStatus, nextLabel] = nextStepFor(item.status);
    const blocked = item.assignmentStatus === 'blocked';
    const unassigned = !item.workerId;
    return `
      <article class="work-order-card">
        <h4>${escapeHtml(item.serviceType || 'Work order')}</h4>
        <p><strong>${escapeHtml(item.requesterName || 'Customer')}</strong><br>${escapeHtml(item.streetAddress || '')} ${escapeHtml(item.city || '')}</p>
        <div class="work-order-meta">
          <span class="workflow-pill ${blocked ? 'hot' : 'good'}">${escapeHtml(item.status || 'active')}</span>
          <span class="workflow-pill ${unassigned ? 'warn' : 'good'}">${unassigned ? 'unassigned' : escapeHtml(item.workerName || 'assigned')}</span>
          <span class="workflow-pill">${money(item.quoteAmountCents)}</span>
          ${item.scheduledDate ? `<span class="workflow-pill">${escapeHtml(item.scheduledDate)}</span>` : ''}
        </div>
        <p>${escapeHtml((item.description || '').slice(0, 160))}${(item.description || '').length > 160 ? '…' : ''}</p>
        ${renderAutomationPlan(item.automation || {})}
        <div class="work-order-actions">
          ${nextStatus ? `<button class="btn btn-primary" type="button" data-work-order-next="${escapeHtml(item.jobRequestId)}" data-next-status="${nextStatus}">${nextLabel}</button>` : ''}
          <a class="btn btn-soft" href="#admin-requests">Open request</a>
          <a class="btn btn-soft" href="#worker-jobs">Worker jobs</a>
        </div>
      </article>
    `;
  };

  const loadWorkOrders = async () => {
    const status = document.querySelector('[data-work-order-status]');
    if (status) status.textContent = 'Loading work orders…';

    try {
      const result = await fetchJson('/api/admin/work-orders?status=active&limit=80');
      renderWorkOrders(result.workOrders || []);
    } catch (error) {
      if (status) status.textContent = error.message || 'Could not load work orders.';
      const board = document.querySelector('[data-work-order-board]');
      if (board) board.innerHTML = '<div class="workflow-empty">Work-order pipeline requires an admin session.</div>';
    }
  };

  mount();

  document.querySelectorAll('[data-phase3-refresh-work-orders]').forEach((button) => {
    button.addEventListener('click', loadWorkOrders);
  });

  window.addEventListener('ta:dashboard-refresh', loadWorkOrders);

  setTimeout(loadWorkOrders, 1200);
})();
