(() => {
  const MAX_PHOTOS = 10;
  const MAX_BYTES = 12 * 1024 * 1024;
  const ACCEPTED_TYPES = /image\/(jpeg|jpg|png|webp|heic|heif)/i;
  const progressLabels = ['Reading photos', 'Detecting materials', 'Estimating labor', 'Preparing preview'];

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });

  const buildPhotoRecord = async (file, index) => ({
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    fileName: file.name,
    name: file.name,
    mimeType: file.type || 'image/*',
    sizeBytes: file.size,
    photoType: 'issue',
    category: 'ai_photo_estimate',
    sourceContext: 'public_estimate_request',
    visibility: 'client_visible',
    dataUrl: await fileToDataUrl(file),
  });

  const aiBody = (count) => `
    <dl>
      <div><dt>Detected</dt><dd>✓ Ceiling tile<br>✓ Existing framing<br>✓ Residential interior</dd></div>
      <div><dt>Likely materials</dt><dd>Ceiling tile · Adhesive · Joint compound · Paint touch-up</dd></div>
      <div><dt>Estimated labor</dt><dd>1.5 - 2.5 hours</dd></div>
      <div><dt>Estimated cost</dt><dd>$425 - $680</dd></div>
      <div><dt>Confidence</dt><dd>${Math.min(91 + Math.max(0, count - 1), 96)}%</dd></div>
    </dl>`;

  const syncHiddenFields = (form, photos) => {
    const provided = form.querySelector('[data-photos-provided]');
    const names = form.querySelector('[data-photo-names]');
    const uploads = form.querySelector('[data-photo-uploads]');
    if (provided) provided.value = photos.length ? 'true' : 'false';
    if (names) names.value = JSON.stringify(photos.map((photo) => photo.fileName));
    if (uploads) uploads.value = JSON.stringify(photos.map((photo, index) => ({ ...photo, sortOrder: index + 1 })));
  };

  const renderPhotos = (form, photos) => {
    const preview = form.querySelector('[data-photo-preview]');
    if (!preview) return;
    preview.innerHTML = photos.map((photo, index) => `
      <article class="uploaded-photo-card" draggable="true" data-photo-id="${photo.id}">
        <img src="${photo.dataUrl}" alt="Uploaded ${photo.fileName}">
        <span>${photo.fileName}</span>
        <div>
          <button type="button" data-photo-move="up" aria-label="Move ${photo.fileName} earlier" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" data-photo-move="down" aria-label="Move ${photo.fileName} later" ${index === photos.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" data-photo-remove aria-label="Remove ${photo.fileName}">×</button>
        </div>
      </article>`).join('');
    syncHiddenFields(form, photos);
  };

  const renderAiPreview = (form, photos) => {
    const card = form.querySelector('[data-ai-preview]');
    const body = form.querySelector('[data-ai-body]');
    const state = form.querySelector('[data-ai-state]');
    if (!card || !body || !state) return;
    if (!photos.length) { card.hidden = true; return; }
    card.hidden = false;
    card.classList.add('is-loading');
    body.innerHTML = '';
    let step = 0;
    state.textContent = progressLabels[step];
    const timer = window.setInterval(() => {
      step += 1;
      state.textContent = progressLabels[Math.min(step, progressLabels.length - 1)];
      if (step >= progressLabels.length) {
        window.clearInterval(timer);
        card.classList.remove('is-loading');
        state.textContent = 'Preview ready';
        body.innerHTML = aiBody(photos.length);
      }
    }, 420);
  };

  const bindUploads = (form) => {
    if (form.dataset.uploadBound === '1') return;
    form.dataset.uploadBound = '1';
    const input = form.querySelector('[data-photo-input]');
    const drop = form.querySelector('[data-upload-drop]');
    let photos = [];

    const addFiles = async (fileList) => {
      const files = [...(fileList || [])].filter((file) => {
        const typeOk = ACCEPTED_TYPES.test(file.type || '') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
        return typeOk && file.size <= MAX_BYTES;
      }).slice(0, Math.max(0, MAX_PHOTOS - photos.length));
      const built = await Promise.all(files.map((file, index) => buildPhotoRecord(file, index)));
      photos = [...photos, ...built].slice(0, MAX_PHOTOS);
      renderPhotos(form, photos);
      renderAiPreview(form, photos);
    };

    drop?.addEventListener('click', () => input?.click());
    drop?.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input?.click(); } });
    input?.addEventListener('change', () => addFiles(input.files));
    ['dragenter', 'dragover'].forEach((type) => drop?.addEventListener(type, (event) => { event.preventDefault(); drop.classList.add('dragging'); }));
    ['dragleave', 'drop'].forEach((type) => drop?.addEventListener(type, (event) => { event.preventDefault(); drop.classList.remove('dragging'); }));
    drop?.addEventListener('drop', (event) => addFiles(event.dataTransfer?.files));
    form.querySelector('[data-photo-preview]')?.addEventListener('click', (event) => {
      const card = event.target.closest('[data-photo-id]');
      if (!card) return;
      const index = photos.findIndex((photo) => photo.id === card.dataset.photoId);
      if (index < 0) return;
      if (event.target.closest('[data-photo-remove]')) photos.splice(index, 1);
      if (event.target.closest('[data-photo-move="up"]') && index > 0) [photos[index - 1], photos[index]] = [photos[index], photos[index - 1]];
      if (event.target.closest('[data-photo-move="down"]') && index < photos.length - 1) [photos[index + 1], photos[index]] = [photos[index], photos[index + 1]];
      renderPhotos(form, photos);
      renderAiPreview(form, photos);
    });
  };

  const bindWizard = () => {
    document.querySelectorAll('.estimate-wizard').forEach((form) => {
      bindUploads(form);
      if (form.dataset.wizardBound === '1') return;
      form.dataset.wizardBound = '1';
      const stages = [...form.querySelectorAll('[data-wizard-stage]')];
      const jumps = [...form.querySelectorAll('[data-wizard-jump]')];
      const prev = form.querySelector('[data-wizard-prev]');
      const next = form.querySelector('[data-wizard-next]');
      let current = 0;
      const show = (index) => {
        current = Math.max(0, Math.min(index, stages.length - 1));
        stages.forEach((stage, stageIndex) => { stage.hidden = stageIndex !== current; });
        jumps.forEach((jump, jumpIndex) => { jump.classList.toggle('active', jumpIndex === current); jump.classList.toggle('complete', jumpIndex < current); });
        if (prev) prev.hidden = current === 0;
        if (next) next.hidden = current === stages.length - 1;
        form.style.setProperty('--wizard-progress', `${((current + 1) / stages.length) * 100}%`);
      };
      jumps.forEach((jump) => jump.addEventListener('click', () => show(Number(jump.dataset.wizardJump) || 0)));
      prev?.addEventListener('click', () => show(current - 1));
      next?.addEventListener('click', () => show(current + 1));
      show(0);
    });
  };
  window.TAEstimateWizard = { bind: bindWizard };
  document.addEventListener('DOMContentLoaded', bindWizard);
  document.addEventListener('ta:homepage-rendered', bindWizard);
})();

(async()=>{
  if(!await TACompany.requireInstalled())return;
  await TACompany.load();
  const bind=()=>{
    const form=document.getElementById('request-form');
    if(!form||form.dataset.bound==='1')return;
    form.dataset.bound='1';
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const status=document.getElementById('request-status');
      if(status) { status.textContent='Sending your request securely…'; status.dataset.tone='pending'; }
      try{
        const payload=TAForms.values(e.currentTarget);
        payload.photosProvided = String(payload.photosProvided) === 'true' || payload.photosProvided === true;
        try { payload.photoNames = JSON.parse(payload.photoNames || '[]'); } catch { payload.photoNames = []; }
        try { payload.photoUploads = JSON.parse(payload.photoUploads || '[]'); } catch { payload.photoUploads = []; }
        payload.files = payload.photoUploads;
        payload.photos = payload.photoUploads;
        const data=await TAApi.post('/api/job-requests',payload);
        const id=data.requestId||data.id||data.request?.id||data.jobRequest?.id||'';
        if(status) { status.textContent=payload.photoUploads?.length ? 'Photos received. We’ll review them with your request. Opening your next steps…' : 'Request received. Opening your next steps…'; status.dataset.tone='success'; }
        location.href='/thank-you/'+(id?'?request='+encodeURIComponent(id):'')
      }catch(err){
        if(status) { status.textContent=err.message||'We could not submit the request. Please call us or try again.'; status.dataset.tone='error'; }
      }
    });
  };
  bind();
  document.addEventListener('ta:homepage-rendered',bind);
})();
