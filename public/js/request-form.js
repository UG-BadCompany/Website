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

  const saveBrowserBackup = (aiDraft) => {
    try {
      sessionStorage.setItem('lastAiQuoteDraft', JSON.stringify(aiDraft));
      const existing = JSON.parse(localStorage.getItem('aiQuoteDraftBackups') || '[]');
      existing.unshift({ savedAt: new Date().toISOString(), aiDraft });
      localStorage.setItem('aiQuoteDraftBackups', JSON.stringify(existing.slice(0, 25)));
    } catch {}
  };

  const renderPreview = (draft) => {
    if (!preview) return;
    preview.dataset.visible = 'true';
    preview.innerHTML = `
      <div class="draft-card">
        <h3>AI draft created for admin review</h3>
        <p><strong>${escapeHtml(draft.job_summary || 'Quote draft')}</strong></p>
        <p>Estimated total: <strong>$${Number(draft?.totals?.total_low || 0).toFixed(2)}–$${Number(draft?.totals?.total_high || 0).toFixed(2)}</strong></p>
        <p>${draft.quote_ready ? 'The draft has enough information for admin review.' : 'The draft needs more information before a final quote.'}</p>
      </div>
    `;
  };

  const submitWithNetlifyForms = () => {
    setStatus('Saving with the standard form fallback…');
    HTMLFormElement.prototype.submit.call(form);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const payload = buildPayload(formData);
    submitButton.disabled = true;

    try {
      if (payload.hasUpload) {
        setStatus('Saving file upload with form fallback so the attachment is not lost…');
        submitWithNetlifyForms();
        return;
      }

      setStatus('Saving request…');
      let savedRequest = null;
      try {
        savedRequest = await postJson('/api/job-requests', payload);
      } catch (requestError) {
        console.warn('Primary /api/job-requests failed. Continuing with AI quote draft only.', requestError);
      }

      setStatus('Building AI quote draft…');
      const aiDraft = await postJson('/api/ai-quote-draft', { ...payload, savedRequest });

      saveBrowserBackup(aiDraft);
      renderPreview(aiDraft);

      try {
        await postJson('/api/ai-quote-drafts', {
          requestPayload: payload,
          savedRequest,
          aiDraft,
        });
      } catch (saveDraftError) {
        console.warn('AI draft storage unavailable. Browser backup saved.', saveDraftError);
      }

      setStatus('Request received. AI quote draft created for admin review. Redirecting…', 'success');
      setTimeout(() => window.location.assign('/thank-you/'), 850);
    } catch (error) {
      console.warn('AI request flow failed; using Netlify Forms fallback.', error);
      setStatus('Something failed while saving. Using standard form fallback…', 'error');
      submitWithNetlifyForms();
    } finally {
      submitButton.disabled = false;
    }
  });

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }
})();
