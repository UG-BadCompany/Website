// public/js/request-form.js
// Unified Request Estimate flow.
// Request Estimate is the AI quoting flow.
// The form calls only /api/job-requests.
// The server saves request + generates/stores AI quote draft.

(() => {
  const form = document.querySelector('[data-job-request-form]');
  if (!form || !window.fetch) return;
  if (form.dataset.aiSubmitEnhanced === 'true') return;
  form.dataset.aiSubmitEnhanced = 'true';

  const status = form.querySelector('[data-job-request-status]');
  const submitButton = form.querySelector('button[type="submit"]');
  const preview = document.querySelector('[data-ai-preview]');

  const setStatus = (message, state = '') => {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
  };

  const postJson = async (url, payload) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) {
      throw new Error(result.message || result.error || `Request failed: ${url}`);
    }
    return result;
  };

  const submitWithNetlifyForms = () => {
    setStatus('Saving with form fallback so the attachment is not lost…');
    HTMLFormElement.prototype.submit.call(form);
  };

  const buildPayload = (formData) => {
    const payload = Object.fromEntries(formData.entries());
    const photo = formData.get('photos');
    const hasUpload = window.File && photo instanceof File && photo.size > 0;
    payload.photosProvided = hasUpload;
    payload.photoNames = hasUpload ? [photo.name] : [];
    payload.hasUpload = hasUpload;
    return payload;
  };

  const saveBrowserBackup = (result) => {
    try {
      if (result?.aiDraft) sessionStorage.setItem('lastAiQuoteDraft', JSON.stringify(result.aiDraft));
      const existing = JSON.parse(localStorage.getItem('aiQuoteDraftBackups') || '[]');
      if (result?.aiDraft) existing.unshift({ savedAt: new Date().toISOString(), aiDraft: result.aiDraft });
      localStorage.setItem('aiQuoteDraftBackups', JSON.stringify(existing.slice(0, 25)));
    } catch {}
  };

  const renderPreview = (draft) => {
    if (!preview || !draft) return;
    preview.dataset.visible = 'true';
    preview.innerHTML = `
      <div class="draft-card">
        <h3>AI quote draft created for admin review</h3>
        <p><strong>${escapeHtml(draft.job_summary || 'Quote draft')}</strong></p>
        <p>Estimated total: <strong>$${Number(draft?.totals?.total_low || 0).toFixed(2)}–$${Number(draft?.totals?.total_high || 0).toFixed(2)}</strong></p>
        <p>${draft.quote_ready ? 'The draft has enough information for admin review.' : 'The draft needs more information before a final quote.'}</p>
      </div>
    `;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const payload = buildPayload(formData);
    submitButton.disabled = true;

    try {
      if (payload.hasUpload) {
        submitWithNetlifyForms();
        return;
      }

      setStatus('Saving request and building AI quote draft…');
      const result = await postJson('/api/job-requests', payload);

      saveBrowserBackup(result);
      renderPreview(result.aiDraft);

      setStatus('Request received. AI quote draft created for admin review. Redirecting…', 'success');
      setTimeout(() => window.location.assign('/thank-you/'), 850);
    } catch (error) {
      console.warn('Unified request/AI quote flow failed; using Netlify Forms fallback.', error);
      setStatus('Something failed while saving. Using form fallback…', 'error');
      submitWithNetlifyForms();
    } finally {
      submitButton.disabled = false;
    }
  });

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }
})();
