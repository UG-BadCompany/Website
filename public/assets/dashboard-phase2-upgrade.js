// public/assets/dashboard-phase2-upgrade.js
// Phase 2 dashboard upgrade.
// Adds an admin command center and an Estimate Review queue for auto-generated Request Estimate drafts.
// Preserves the existing dashboard app and API logic.

(() => {

  const dollarsFromCents = (cents) => {
    const amount = Number(cents || 0);
    return (amount / 100).toFixed(2);
  };


  const root = document.querySelector('[data-dashboard-root]');
  if (!root || window.__taDashboardPhase2Loaded) return;
  window.__taDashboardPhase2Loaded = true;

  const money = (cents) => `$${(Number(cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));

  const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { accept: 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) {
      throw new Error(result.message || `Request failed: ${url}`);
    }
    return result;
  };

  const buildShell = () => {
    if (document.querySelector('[data-phase2-command-center]')) return;

    const hero = root.querySelector('.hero');
    const shell = document.createElement('section');
    shell.className = 'dashboard-command-center';
    shell.dataset.phase2CommandCenter = 'true';
    shell.innerHTML = `
      <div class="dashboard-command-grid">
        <section class="dashboard-command-panel">
          <span class="eyebrow">Operations Command Center</span>
          <h2>Estimate, schedule, invoice, and track work from one dashboard.</h2>
          <p>This dashboard now treats every Request Estimate as the start of a real job pipeline: request, estimate draft, admin review, customer approval, scheduling, work order, invoice, payment, and completion.</p>
          <div class="dashboard-kpi-grid">
            <div class="dashboard-kpi"><span>Estimate Drafts</span><strong data-phase2-draft-count>—</strong></div>
            <div class="dashboard-kpi"><span>Ready Drafts</span><strong data-phase2-ready-count>—</strong></div>
            <div class="dashboard-kpi"><span>Needs Review</span><strong data-phase2-review-count>—</strong></div>
            <div class="dashboard-kpi"><span>Request Flow</span><strong>AI</strong></div>
          </div>
          <div class="dashboard-action-strip">
            <a class="btn btn-primary" href="/#estimate">New Request Estimate</a>
            <button class="btn btn-soft" type="button" data-phase2-refresh>Refresh Dashboard</button>
            <button class="btn btn-soft" type="button" data-open-requests-workspace>Open Requests</button>
            <button class="btn btn-soft" type="button" data-open-quotes-workspace>Open Quotes</button>
          </div>
        </section>

        <section class="dashboard-health-panel">
          <span class="eyebrow">System Health</span>
          <h2>What changed</h2>
          <p>Request Estimate now builds a draft estimate automatically, then sends it to admin review instead of creating a disconnected quote system.</p>
          <div class="dashboard-empty-upgraded">
            <strong>Public customer wording:</strong> Request Estimate<br>
            <strong>Backend engine:</strong> automatic estimate draft<br>
            <strong>Admin action:</strong> review, edit, send
          </div>
        </section>
      </div>

      <section class="estimate-review-panel" id="estimate-review" data-phase2-estimate-review>
        <span class="eyebrow">Admin Review</span>
        <h2>Estimate Review Queue</h2>
        <p>Drafts created automatically from the public Request Estimate form show here first. Admin should verify labor, materials, licensing, photos, and final price before sending.</p>
        <p class="session-status" data-phase2-estimate-status>Loading estimate drafts…</p>
        <div class="estimate-review-list" data-phase2-estimate-list></div>
      </section>
    `;

    if (hero && hero.nextSibling) {
      hero.parentNode.insertBefore(shell, hero.nextSibling);
    } else {
      root.prepend(shell);
    }
  };


  const renderDetailList = (title, items = [], className = '') => {
    if (!Array.isArray(items) || !items.length) return '';
    return `
      <div class="estimate-detail-box ${className}">
        <h4>${escapeHtml(title)}</h4>
        <ul>${items.slice(0, 8).map((item) => `<li>${escapeHtml(typeof item === 'string' ? item : `${item.name || item.label || 'Item'}: ${item.notes || item.lowHours || item.lowCents || ''}`)}</li>`).join('')}</ul>
      </div>
    `;
  };

  const renderLaborList = (items = []) => {
    if (!Array.isArray(items) || !items.length) return '';
    return `
      <div class="estimate-detail-box">
        <h4>Labor phases</h4>
        <ul>${items.slice(0, 7).map((item) => `<li>${escapeHtml(item.name || 'Labor')}: ${escapeHtml(item.lowHours ?? '')}-${escapeHtml(item.highHours ?? '')} hrs — ${escapeHtml(item.notes || '')}</li>`).join('')}</ul>
      </div>
    `;
  };

  const renderMaterialList = (items = []) => {
    if (!Array.isArray(items) || !items.length) return '';
    return `
      <div class="estimate-detail-box">
        <h4>Material allowances</h4>
        <ul>${items.slice(0, 8).map((item) => `<li>${escapeHtml(item.name || 'Material')}: ${money(item.lowCents || 0)}–${money(item.highCents || 0)} — ${escapeHtml(item.notes || '')}</li>`).join('')}</ul>
      </div>
    `;
  };


  const renderAccuracyReview = (items = []) => {
    if (!Array.isArray(items) || !items.length) return '';
    return `
      <div class="estimate-accuracy-box">
        <h4>Accuracy review</h4>
        <ul>${items.slice(0, 10).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
    `;
  };

  const renderQuoteOptions = (items = []) => {
    if (!Array.isArray(items) || !items.length) return '';
    return `
      <div class="estimate-options-box">
        <h4>Quote options</h4>
        <ul>${items.slice(0, 5).map((item) => `<li>${escapeHtml(item.name || 'Option')}: ${item.lowAmountCents ? `${money(item.lowAmountCents)}–${money(item.highAmountCents)}` : money(item.amountCents || 0)} — ${escapeHtml(item.notes || '')}</li>`).join('')}</ul>
      </div>
    `;
  };


  const renderSupplierPricing = (plan = {}) => {
    const items = Array.isArray(plan.supplierItems) ? plan.supplierItems : [];
    if (!items.length) return '';
    return `
      <div class="supplier-pricing-box">
        <h4>Supplier / pricing review</h4>
        <ul>
          <li>${escapeHtml(plan.summary || 'Verify supplier pricing before sending if needed.')}</li>
          ${items.slice(0, 8).map((item) => `<li>${escapeHtml(item.name || 'Material')}: ${escapeHtml(item.preferredSupplier || 'verify')} | fallback: ${escapeHtml((item.fallbackSuppliers || []).join(', '))} | ${escapeHtml(item.priceFreshness || '')}</li>`).join('')}
        </ul>
      </div>
    `;
  };


  const renderTroubleshootingPlan = (plan = {}) => {
    const issues = Array.isArray(plan.issues) ? plan.issues : [];
    if (!issues.length) return '';
    return `
      <div class="troubleshooting-box">
        <h4>Troubleshooting / diagnostic review</h4>
        <ul>
          <li>Mode: ${escapeHtml(plan.recommendedMode || 'review')}</li>
          ${issues.slice(0, 5).map((issue) => `<li>${escapeHtml(issue.cause || 'Possible cause')} | probability: ${escapeHtml(issue.probability || 'unknown')} | tests: ${escapeHtml((issue.tests || []).join('; '))} | ${escapeHtml(issue.repairRange || '')}</li>`).join('')}
          ${(plan.safetyStopFlags || []).map((flag) => `<li>Safety/licensed flag: ${escapeHtml(flag)}</li>`).join('')}
        </ul>
      </div>
    `;
  };

  const renderDrafts = (drafts = []) => {
    const list = document.querySelector('[data-phase2-estimate-list]');
    const status = document.querySelector('[data-phase2-estimate-status]');
    const draftCount = document.querySelector('[data-phase2-draft-count]');
    const readyCount = document.querySelector('[data-phase2-ready-count]');
    const reviewCount = document.querySelector('[data-phase2-review-count]');

    if (draftCount) draftCount.textContent = String(drafts.length);
    const ready = drafts.filter((draft) => Number(draft.amountCents || 0) > 0);
    if (readyCount) readyCount.textContent = String(ready.length);
    if (reviewCount) reviewCount.textContent = String(drafts.length - ready.length);

    if (!list) return;

    if (!drafts.length) {
      if (status) status.textContent = 'No estimate drafts are waiting right now.';
      list.innerHTML = '<div class="dashboard-empty-upgraded">Submit a Request Estimate from the homepage to create the first automatic draft.</div>';
      return;
    }

    if (status) status.textContent = `${drafts.length} estimate draft(s) waiting for review.`;

    list.innerHTML = drafts.map((draft) => {
      const amount = money(draft.amountCents);
      const lowAmount = draft.lowAmountCents ? money(draft.lowAmountCents) : null;
      const readyClass = Number(draft.amountCents || 0) > 0 ? 'ready' : 'warn';
      const readyLabel = draft.quoteReady ? 'quote-ready' : Number(draft.amountCents || 0) > 0 ? 'review needed' : 'needs price';
      const confidence = Number(draft.confidence || 0);
      const summary = String(draft.summary || '').split('\n').slice(0, 12).join('\n');

      return `
        <article class="estimate-draft-card" data-estimate-draft-card="${escapeHtml(draft.quoteId)}">
          <div class="estimate-draft-top">
            <div>
              <h3>${escapeHtml(draft.title || 'Estimate draft')}</h3>
              <div class="estimate-draft-meta">
                <span class="estimate-pill ${readyClass}">${readyLabel}</span>
                <span class="estimate-range">${lowAmount ? `${lowAmount}–${amount}` : amount}</span>
                ${confidence ? `<span class="estimate-confidence">${confidence}/100 confidence</span>` : ''}
                <span class="estimate-pill">${escapeHtml(draft.serviceType || 'service')}</span>
                <span class="estimate-pill">${escapeHtml(draft.city || '')}</span>
              </div>
            </div>
            <div class="estimate-draft-actions">
              <button class="btn btn-soft" type="button" data-copy-estimate="${escapeHtml(draft.quoteId)}">Copy summary</button>
              <button class="btn btn-soft" type="button" data-edit-estimate="${escapeHtml(draft.quoteId)}">Edit draft</button>
              <button class="btn btn-primary" type="button" data-send-estimate="${escapeHtml(draft.quoteId)}">Mark/send</button>
            </div>
          </div>
          <p><strong>${escapeHtml(draft.requesterName || 'Customer')}</strong> • ${escapeHtml(draft.requesterPhone || '')} • ${escapeHtml(draft.requesterEmail || '')}</p>
          <p>${escapeHtml(draft.streetAddress || '')} ${escapeHtml(draft.city || '')}</p>
          <pre class="estimate-draft-summary">${escapeHtml(summary || draft.requestDescription || 'No summary available.')}</pre>
          <form class="estimate-edit-form" data-estimate-edit-form="${escapeHtml(draft.quoteId)}" hidden>
            <div class="estimate-edit-grid">
              <label>Quote title
                <input data-estimate-title value="${escapeHtml(draft.title || 'Estimate draft')}">
              </label>
              <label>Amount
                <input data-estimate-amount inputmode="decimal" value="${escapeHtml((typeof dollarsFromCents === 'function'
? dollarsFromCents(draft.amountCents || 0)
: ((Number(draft.amountCents || 0) / 100).toFixed(2))))}" >
              </label>
            </div>
            <label>Customer/admin quote summary
              <textarea data-estimate-summary>${escapeHtml(draft.summary || '')}</textarea>
            </label>
            <div class="estimate-edit-actions">
              <button class="btn btn-primary" type="submit">Save draft</button>
              <button class="btn btn-soft" type="button" data-cancel-estimate-edit="${escapeHtml(draft.quoteId)}">Cancel</button>
              <button class="btn btn-soft" type="button" data-save-send-estimate="${escapeHtml(draft.quoteId)}">Save & send</button>
            </div>
            <p class="estimate-edit-status" data-estimate-edit-status="${escapeHtml(draft.quoteId)}"></p>
          </form>
          <div class="estimate-draft-detail-grid">
            ${renderAccuracyReview(draft.accuracyReview || [])}
            ${renderQuoteOptions(draft.quoteOptions || [])}
            ${renderSupplierPricing(draft.supplierPricingPlan || {})}
            ${renderTroubleshootingPlan(draft.troubleshootingPlan || {})}
            ${renderLaborList(draft.laborItems || [])}
            ${renderMaterialList(draft.materials || [])}
            ${renderDetailList('Missing questions', draft.missingInfoQuestions || [], 'estimate-question-list')}
            ${renderDetailList('Risk flags', draft.riskFlags || [], 'estimate-risk-list')}
          </div>
        </article>
      `;
    }).join('');

    list.querySelectorAll('[data-copy-estimate]').forEach((button) => {
      button.addEventListener('click', async () => {
        const draft = drafts.find((item) => item.quoteId === button.dataset.copyEstimate);
        if (!draft) return;
        const text = `${draft.title || 'Estimate draft'}\n\n${draft.summary || ''}`;
        try {
          await navigator.clipboard.writeText(text);
          button.textContent = 'Copied';
          setTimeout(() => { button.textContent = 'Copy summary'; }, 1200);
        } catch {
          button.textContent = 'Copy failed';
          setTimeout(() => { button.textContent = 'Copy summary'; }, 1200);
        }
      });
    });


    list.querySelectorAll('[data-edit-estimate]').forEach((button) => {
      button.addEventListener('click', () => {
        const form = list.querySelector(`[data-estimate-edit-form="${CSS.escape(button.dataset.editEstimate)}"]`);
        if (!form) return;
        form.hidden = !form.hidden;
        if (!form.hidden) form.querySelector('[data-estimate-title]')?.focus();
      });
    });

    list.querySelectorAll('[data-cancel-estimate-edit]').forEach((button) => {
      button.addEventListener('click', () => {
        const form = list.querySelector(`[data-estimate-edit-form="${CSS.escape(button.dataset.cancelEstimateEdit)}"]`);
        if (form) form.hidden = true;
      });
    });

    const saveDraft = async (quoteId, action = 'save') => {
      const form = list.querySelector(`[data-estimate-edit-form="${CSS.escape(quoteId)}"]`);
      if (!form) return;
      const status = form.querySelector(`[data-estimate-edit-status="${CSS.escape(quoteId)}"]`);
      const title = form.querySelector('[data-estimate-title]')?.value || '';
      const summaryValue = form.querySelector('[data-estimate-summary]')?.value || '';
      const amountCents = centsFromInput(form.querySelector('[data-estimate-amount]')?.value || '0');

      if (status) status.textContent = action === 'send' ? 'Saving and sending…' : 'Saving…';

      await fetchJson('/api/admin/estimate-review', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ quoteId, action, title, summary: summaryValue, amountCents }),
      });

      if (status) status.textContent = action === 'send' ? 'Saved and sent.' : 'Saved.';
      window.TAUX?.toast?.({
        title: action === 'send' ? 'Estimate saved and sent' : 'Estimate saved',
        message: 'The estimate review queue was updated.',
        type: 'success',
      });
      setTimeout(loadEstimateReview, 450);
    };

    list.querySelectorAll('[data-estimate-edit-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const quoteId = form.dataset.estimateEditForm;
        try {
          await saveDraft(quoteId, 'save');
        } catch (error) {
          const status = form.querySelector(`[data-estimate-edit-status="${CSS.escape(quoteId)}"]`);
          if (status) status.textContent = error.message || 'Could not save estimate.';
          window.TAUX?.toast?.({ title: 'Save failed', message: error.message || 'Could not save estimate.', type: 'error' });
        }
      });
    });

    list.querySelectorAll('[data-save-send-estimate]').forEach((button) => {
      button.addEventListener('click', async () => {
        const quoteId = button.dataset.saveSendEstimate;
        const confirmed = window.TAUX ? await window.TAUX.confirm({ title: 'Save and send estimate?', message: 'This saves your edits and moves the estimate forward.', confirmText: 'Save & send' }) : window.confirm('Save and send this estimate?');
        if (!confirmed) return;
        try {
          await saveDraft(quoteId, 'send');
        } catch (error) {
          window.TAUX?.toast?.({ title: 'Send failed', message: error.message || 'Could not send estimate.', type: 'error' });
        }
      });
    });


    list.querySelectorAll('[data-send-estimate]').forEach((button) => {
      button.addEventListener('click', async () => {
        const quoteId = button.dataset.sendEstimate;
        const draft = drafts.find((item) => item.quoteId === quoteId);
        if (!draft) return;

        const confirmed = window.TAUX ? await window.TAUX.confirm({ title: 'Mark estimate sent?', message: 'Review the price and wording first. This will move the estimate forward.', confirmText: 'Mark sent' }) : window.confirm('Mark this estimate as sent? Review the price and wording first.');
        if (!confirmed) return;

        button.disabled = true;
        button.textContent = 'Sending…';

        try {
          await fetchJson('/api/admin/estimate-review', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              quoteId,
              action: 'send',
              title: draft.title,
              summary: draft.summary,
              amountCents: Number(draft.amountCents || 0),
            }),
          });
          button.textContent = 'Sent';
          window.TAUX?.toast({ title: 'Estimate marked sent', message: 'The estimate was moved forward successfully.', type: 'success' });
          setTimeout(loadEstimateReview, 500);
        } catch (error) {
          button.textContent = 'Error';
          (window.TAUX ? window.TAUX.toast({ title: 'Estimate error', message: error.message || 'Could not send estimate.', type: 'error' }) : alert(error.message || 'Could not send estimate.'));
        } finally {
          button.disabled = false;
        }
      });
    });
  };

  const loadEstimateReview = async () => {
    const status = document.querySelector('[data-phase2-estimate-status]');
    if (status) status.textContent = 'Loading estimate drafts…';

    try {
      const result = await fetchJson('/api/admin/estimate-review?status=draft&limit=20');
      renderDrafts(result.drafts || []);
    } catch (error) {
      if (status) status.textContent = error.message || 'Could not load estimate drafts.';
      const list = document.querySelector('[data-phase2-estimate-list]');
      if (list) {
        list.innerHTML = '<div class="dashboard-empty-upgraded">Estimate review requires an admin session. Sign in as admin and refresh.</div>';
      }
    }
  };

  buildShell();

  document.querySelectorAll('[data-phase2-refresh]').forEach((button) => {
    button.addEventListener('click', () => {
      loadEstimateReview();
      window.dispatchEvent(new CustomEvent('ta:dashboard-refresh'));
    });
  });

  document.querySelectorAll('[data-open-requests-workspace]').forEach((button) => {
    button.addEventListener('click', () => switchWorkspace('requests'));
  });

  document.querySelectorAll('[data-open-quotes-workspace]').forEach((button) => {
    button.addEventListener('click', () => switchWorkspace('quotes'));
  });

  // Wait briefly so the original dashboard auth/rendering can finish first.
  setTimeout(loadEstimateReview, 900);
})();
