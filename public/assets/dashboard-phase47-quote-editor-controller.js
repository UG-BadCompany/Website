// public/assets/dashboard-phase47-quote-editor-controller.js
// Phase 48 hardened quote editor controller.
// Handles visible Estimate Review editor buttons independently from older handlers.

(() => {
  if (window.__taPhase48QuoteEditorControllerLoaded) return;
  window.__taPhase48QuoteEditorControllerLoaded = true;

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
    if (!response.ok || data.ok === false) throw new Error(data.message || `Request failed: ${url}`);
    return data;
  };

  const findForm = (target) => target?.closest?.('[data-estimate-edit-form]') || null;

  const findQuoteId = (form) => (
    form?.dataset?.estimateEditForm ||
    form?.closest?.('[data-estimate-draft-card]')?.dataset?.estimateDraftCard ||
    ''
  );

  const getStatus = (form) => form?.querySelector?.('[data-estimate-edit-status]');
  const setStatus = (form, message = '') => {
    const status = getStatus(form);
    if (status) status.textContent = message;
  };

  const setBusy = (form, busy = false) => {
    form?.querySelectorAll?.('button, input, textarea')?.forEach((control) => {
      if (control.matches('[data-cancel-estimate-edit]')) control.disabled = false;
      else control.disabled = busy;
    });
    form?.classList?.toggle('is-busy', busy);
  };

  const payloadFromForm = (form, action = 'save') => ({
    quoteId: findQuoteId(form),
    action,
    title: form?.querySelector?.('[data-estimate-title]')?.value?.trim() || '',
    summary: form?.querySelector?.('[data-estimate-summary]')?.value?.trim() || '',
    amountCents: centsFromValue(form?.querySelector?.('[data-estimate-amount]')?.value || '0'),
    missingInfo: form?.querySelector?.('[data-estimate-missing-info]')?.value?.trim() || '',
    rewriteStyle: 'customer_ready',
  });

  const validatePayload = (payload) => {
    if (!payload.quoteId) return 'Quote ID missing. Refresh the page and try again.';
    if (!payload.title) return 'Add a quote title before saving.';
    if (!payload.summary || payload.summary.length < 20) return 'Add more detail to the final quote summary before saving.';
    if (!Number.isFinite(payload.amountCents) || payload.amountCents <= 0) return 'Enter a valid quote amount before saving.';
    return '';
  };

  const restoreFromDraft = (form) => {
    const quoteId = findQuoteId(form);
    const draft = (window.__latestEstimateDrafts || []).find((item) => item.quoteId === quoteId);
    if (!draft) {
      setStatus(form, 'Could not restore. Refresh the page to reload this draft.');
      return;
    }

    form.querySelector('[data-estimate-title]').value = draft.title || 'Estimate draft';
    form.querySelector('[data-estimate-amount]').value = moneyFromCents(draft.amountCents || 0);
    form.querySelector('[data-estimate-summary]').value = draft.summary || '';
    const missing = form.querySelector('[data-estimate-missing-info]');
    const notes = form.querySelector('[data-estimate-rewrite-notes]');
    if (missing) missing.value = '';
    if (notes) notes.textContent = '';
    setStatus(form, 'Cancelled. Fields restored to the last loaded draft.');
  };

  const showRewriteNotes = (form, rewrite = {}) => {
    const notes = form.querySelector('[data-estimate-rewrite-notes]');
    if (!notes) return;

    const list = (title, items) => Array.isArray(items) && items.length
      ? [title, ...items.map((item) => `- ${typeof item === 'string' ? item : item.name || item.label || item.notes || JSON.stringify(item)}`)]
      : [];

    const lines = [
      rewrite.aiEnhanced ? 'AI rewrite applied.' : 'Fallback rewrite applied.',
      ...list('Rewrite notes:', rewrite.rewriteNotes),
      ...list('Missing info resolved:', rewrite.missingInfoResolved),
      ...list('Remaining questions:', rewrite.remainingQuestions),
      ...list('Risk flags:', rewrite.riskFlags),
      ...list('Exclusions:', rewrite.exclusions),
      ...list('Admin review checklist:', rewrite.adminReviewChecklist),
      ...list('Customer clarifications:', rewrite.customerClarifications),
    ];

    notes.textContent = lines.filter(Boolean).join('\n');
  };

  const applyRewrite = (form, rewrite = {}) => {
    const title = form.querySelector('[data-estimate-title]');
    const amount = form.querySelector('[data-estimate-amount]');
    const summary = form.querySelector('[data-estimate-summary]');
    if (title && rewrite.title) title.value = rewrite.title;
    if (amount && Number.isFinite(Number(rewrite.amountCents))) amount.value = moneyFromCents(rewrite.amountCents);
    if (summary && rewrite.summary) summary.value = rewrite.summary;
    showRewriteNotes(form, rewrite);
  };

  const saveForm = async (form, action = 'save') => {
    const payload = payloadFromForm(form, action);
    const validationError = validatePayload(payload);
    if (validationError) throw new Error(validationError);

    setBusy(form, true);
    setStatus(form, action === 'send' ? 'Saving and sending quote…' : 'Saving draft…');

    try {
      await fetchJson('/api/admin/estimate-review', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setStatus(form, action === 'send' ? 'Saved and sent.' : 'Draft saved.');
      toast(action === 'send' ? 'Quote sent' : 'Draft saved', 'Estimate Review was updated.', 'success');
      setTimeout(() => window.dispatchEvent(new CustomEvent('ta:dashboard-refresh')), 700);
    } finally {
      setBusy(form, false);
    }
  };

  const rewriteForm = async (form) => {
    const payload = payloadFromForm(form, 'save');
    if (!payload.quoteId) throw new Error('Quote ID missing. Refresh the page and try again.');

    setBusy(form, true);
    setStatus(form, 'AI is rewriting this quote with updated information…');

    try {
      const result = await fetchJson('/api/admin/estimate-rewrite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      applyRewrite(form, result.rewrite || {});
      setStatus(form, 'Rewrite ready. Review it, then Save Draft or Save & Send.');
      toast('Quote rewritten', 'Review the updated quote before saving or sending.', 'success');
    } finally {
      setBusy(form, false);
    }
  };

  document.addEventListener('click', async (event) => {
    const aiButton = event.target.closest('[data-ai-rewrite-estimate]');
    const cancelButton = event.target.closest('[data-cancel-estimate-edit]');
    const sendButton = event.target.closest('[data-save-send-estimate]');
    if (!aiButton && !cancelButton && !sendButton) return;

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
        const ok = await confirmAction('Cancel edits?', 'This restores the quote fields to the last loaded draft.', 'Cancel edits');
        if (ok) restoreFromDraft(form);
        return;
      }

      if (sendButton) {
        const ok = await confirmAction('Save and send quote?', 'This saves your edits and moves the quote forward.', 'Save & send');
        if (ok) await saveForm(form, 'send');
      }
    } catch (error) {
      setStatus(form, error.message || 'Action failed.');
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
      setStatus(form, error.message || 'Could not save draft.');
      toast('Save failed', error.message || 'Could not save draft.', 'error');
    }
  }, true);
})();
