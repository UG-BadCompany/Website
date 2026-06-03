// public/js/request-form.js
// Unified Request Estimate flow.
// Public users should only see/use Request Estimate.
// The form posts only to /api/job-requests.
// Server creates the AI-powered estimate draft behind the scenes.

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

  const buildPayload = (formData) => {
    const payload = Object.fromEntries(formData.entries());
    const photo = formData.get('photos');
    const hasUpload = window.File && photo instanceof File && photo.size > 0;

    payload.photosProvided = hasUpload;
    payload.photoNames = hasUpload ? [photo.name] : [];
    payload.hasUpload = hasUpload;

    return payload;
  };

  const submitWithNetlifyForms = () => {
    setStatus('Saving with form fallback so the attachment is not lost…');
    HTMLFormElement.prototype.submit.call(form);
  };

  const saveBrowserBackup = (result) => {
    try {
      const draft = result?.aiDraft || result?.estimateDraft || null;
      if (draft) sessionStorage.setItem('lastEstimateDraft', JSON.stringify(draft));

      const existing = JSON.parse(localStorage.getItem('estimateDraftBackups') || '[]');
      if (draft) existing.unshift({ savedAt: new Date().toISOString(), draft });
      localStorage.setItem('estimateDraftBackups', JSON.stringify(existing.slice(0, 25)));
    } catch {}
  };

  const renderPreview = (draft) => {
    if (!preview || !draft) return;

    preview.dataset.visible = 'true';
    preview.innerHTML = `
      <div class="draft-card">
        <h3>Estimate draft created for review</h3>
        <p><strong>${escapeHtml(draft.job_summary || 'Estimate draft')}</strong></p>
        <p>Estimated range: <strong>$${Number(draft?.totals?.total_low || 0).toFixed(2)}–$${Number(draft?.totals?.total_high || 0).toFixed(2)}</strong></p>
        <p>${draft.quote_ready ? 'The request has enough information for review.' : 'We may need a few more details before final pricing.'}</p>
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
        // Keep current safe upload fallback until file storage is wired into Netlify Blobs.
        submitWithNetlifyForms();
        return;
      }

      setStatus('Saving request and building estimate draft…');

      // IMPORTANT:
      // This is the only frontend endpoint for Request Estimate.
      // /api/job-requests handles saving + estimate generation server-side.
      const result = await postJson('/api/job-requests', payload);

      saveBrowserBackup(result);
      renderPreview(result.aiDraft || result.estimateDraft);

      setStatus('Request received. Estimate draft created for review. Redirecting…', 'success');
      setTimeout(() => window.location.assign('/thank-you/'), 850);
    } catch (error) {
      console.warn('Request Estimate flow failed; using form fallback.', error);
      setStatus('Something failed while saving. Using form fallback…', 'error');
      submitWithNetlifyForms();
    } finally {
      submitButton.disabled = false;
    }
  });

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[c]));
  }
})();
