// public/assets/dashboard-phase47-quote-editor-controller.js
// Independent controller for Estimate Review visible quote editor buttons.
// This does NOT depend on the older Phase 2 handlers.

(() => {
  if (window.__taPhase47QuoteEditorControllerLoaded) return;
  window.__taPhase47QuoteEditorControllerLoaded = true;

  const moneyFromCents = (cents) => (Number(cents || 0) / 100).toFixed(2);

  const centsFromValue = (value) => {
    const normalized = String(value ?? '').replace(/[^0-9.]/g, '');
    const number = Number(normalized);
    if (!Number.isFinite(number) || number < 0) return 0;
    return Math.round(number * 100);
  };

  const toast = (title, message, type = 'info') => {
    if (window.TAUX?.toast) window.TAUX.toast({ title, message, type });
    else console.log(`${title}: ${message}`);
  };

  const confirmAction = async (title, message, confirmText = 'Continue') => {
    if (window.TAUX?.confirm) return window.TAUX.confirm({ title, message, confirmText });
    return window.confirm(message || title);
  };

  const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { accept: 'application/json', ...(options.headers || {}) },
      ...options,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.message || `Request failed: ${url}`);
    }

    return data;
  };

  const findForm = (target) => target?.closest?.('[data-estimate-edit-form]') || null;

  const findQuoteId = (form) => (
    form?.dataset?.estimateEditForm ||
    form?.closest?.('[data-estimate-draft-card]')?.dataset?.estimateDraftCard ||
    ''
  );

  const formStatus = (form, message = '') => {
    const status = form?.querySelector?.('[data-estimate-edit-status]');
    if (status) status.textContent = message;
  };

  const setBusy = (form, busy = false) => {
    form?.querySelectorAll?.('button')?.forEach((button) => {
      button.disabled = busy;
    });
  };

  const payloadFromForm = (form, action = 'save') => ({
    quoteId: findQuoteId(form),
    action,
    title: form?.querySelector?.('[data-estimate-title]')?.value || '',
    summary: form?.querySelector?.('[data-estimate-summary]')?.value || '',
    amountCents: centsFromValue(form?.querySelector?.('[data-estimate-amount]')?.value || '0'),
    missingInfo: form?.querySelector?.('[data-estimate-missing-info]')?.value || '',
    rewriteStyle: 'customer_ready',
  });

  const restoreFromCard = (form) => {
    const quoteId = findQuoteId(form);
    const draft = (window.__latestEstimateDrafts || []).find((item) => item.quoteId === quoteId);
    if (!draft) {
      formStatus(form, 'Could not restore. Refresh the page to reload this draft.');
      return;
    }

    const title = form.querySelector('[data-estimate-title]');
    const amount = form.querySelector('[data-estimate-amount]');
    const summary = form.querySelector('[data-estimate-summary]');
    const missing = form.querySelector('[data-estimate-missing-info]');
    const notes = form.querySelector('[data-estimate-rewrite-notes]');

    if (title) title.value = draft.title || 'Estimate draft';
    if (amount) amount.value = moneyFromCents(draft.amountCents || 0);
    if (summary) summary.value = draft.summary || '';
    if (missing) missing.value = '';
    if (notes) notes.textContent = '';

    formStatus(form, 'Cancelled. Fields restored to the last loaded draft.');
  };

  const saveForm = async (form, action = 'save') => {
    const payload = payloadFromForm(form, action);
    if (!payload.quoteId) throw new Error('Quote ID missing. Refresh the page and try again.');

    setBusy(form, true);
    formStatus(form, action === 'send' ? 'Saving and sending quote…' : 'Saving draft…');

    try {
      await fetchJson('/api/admin/estimate-review', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      formStatus(form, action === 'send' ? 'Saved and sent.' : 'Draft saved.');
      toast(action === 'send' ? 'Quote sent' : 'Draft saved', 'Estimate Review was updated.', 'success');

      // Reload queue after a short delay so sent quotes leave the draft queue when applicable.
      setTimeout(() => {
        if (typeof window.loadEstimateReview === 'function') window.loadEstimateReview();
        else window.dispatchEvent(new CustomEvent('ta:dashboard-refresh'));
      }, 700);
    } finally {
      setBusy(form, false);
    }
  };

  const rewriteForm = async (form) => {
    const payload = payloadFromForm(form, 'save');
    if (!payload.quoteId) throw new Error('Quote ID missing. Refresh the page and try again.');

    setBusy(form, true);
    formStatus(form, 'AI is rewriting this quote…');

    try {
      const result = await fetchJson('/api/admin/estimate-rewrite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const rewrite = result.rewrite || {};
      const title = form.querySelector('[data-estimate-title]');
      const amount = form.querySelector('[data-estimate-amount]');
      const summary = form.querySelector('[data-estimate-summary]');
      const notes = form.querySelector('[data-estimate-rewrite-notes]');

      if (title && rewrite.title) title.value = rewrite.title;
      if (amount && Number.isFinite(Number(rewrite.amountCents))) amount.value = moneyFromCents(rewrite.amountCents);
      if (summary && rewrite.summary) summary.value = rewrite.summary;

      const noteLines = [
        rewrite.aiEnhanced ? 'AI rewrite applied.' : 'Fallback rewrite applied.',
        ...(rewrite.rewriteNotes || []),
        ...(rewrite.missingInfoResolved?.length ? ['Missing info resolved:', ...rewrite.missingInfoResolved.map((item) => `- ${item}`)] : []),
        ...(rewrite.remainingQuestions?.length ? ['Remaining questions:', ...rewrite.remainingQuestions.map((item) => `- ${item}`)] : []),
        ...(rewrite.riskFlags?.length ? ['Risk flags:', ...rewrite.riskFlags.map((item) => `- ${item}`)] : []),
        ...(rewrite.exclusions?.length ? ['Exclusions:', ...rewrite.exclusions.map((item) => `- ${item}`)] : []),
      ];

      if (notes) notes.textContent = noteLines.join('\n');
      formStatus(form, 'Rewrite ready. Review it, then Save Draft or Save & Send.');
      toast('Quote rewritten', 'Review the updated quote before saving or sending.', 'success');
    } finally {
      setBusy(form, false);
    }
  };

  document.addEventListener('click', async (event) => {
    const aiButton = event.target.closest('[data-ai-rewrite-estimate]');
    const cancelButton = event.target.closest('[data-cancel-estimate-edit]');
    const saveSendButton = event.target.closest('[data-save-send-estimate]');

    if (!aiButton && !cancelButton && !saveSendButton) return;

    const form = findForm(event.target);
    if (!form) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    try {
      if (aiButton) {
        await rewriteForm(form);
        return;
      }

      if (cancelButton) {
        const confirmed = await confirmAction('Cancel edits?', 'This will restore the fields to the last loaded draft.', 'Cancel edits');
        if (confirmed) restoreFromCard(form);
        return;
      }

      if (saveSendButton) {
        const confirmed = await confirmAction('Save and send quote?', 'This saves your edits and moves the quote forward.', 'Save & send');
        if (confirmed) await saveForm(form, 'send');
      }
    } catch (error) {
      formStatus(form, error.message || 'Action failed.');
      toast('Quote editor error', error.message || 'Action failed.', 'error');
    }
  }, true);

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-estimate-edit-form]');
    if (!form) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    try {
      await saveForm(form, 'save');
    } catch (error) {
      formStatus(form, error.message || 'Could not save draft.');
      toast('Save failed', error.message || 'Could not save draft.', 'error');
    }
  }, true);
})();
