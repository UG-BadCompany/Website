// public/assets/dashboard-phase7-ux.js
// Phase 7: smoother dashboard feedback, toasts, custom confirms/prompts, transitions.

(() => {
  if (window.__taPhase7UxLoaded) return;
  window.__taPhase7UxLoaded = true;

  const createToastRegion = () => {
    let region = document.querySelector('.ta-toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'ta-toast-region';
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-label', 'Dashboard notifications');
      document.body.appendChild(region);
    }
    return region;
  };

  const toast = ({ title = 'Update', message = '', type = 'success', timeout = 3600 } = {}) => {
    const region = createToastRegion();
    const item = document.createElement('article');
    item.className = `ta-toast ${type}`;
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(message)}</span>
      </div>
      <button type="button" aria-label="Close notification">×</button>
    `;

    const close = () => {
      item.dataset.state = 'leaving';
      setTimeout(() => item.remove(), 190);
    };

    item.querySelector('button')?.addEventListener('click', close);
    region.appendChild(item);

    if (timeout) setTimeout(close, timeout);
    return close;
  };

  const dialog = ({ title = 'Confirm', message = '', confirmText = 'Confirm', cancelText = 'Cancel', input = false, defaultValue = '' } = {}) => new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'ta-dialog-backdrop';
    backdrop.innerHTML = `
      <section class="ta-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
        ${input ? `<textarea data-dialog-input>${escapeHtml(defaultValue)}</textarea>` : ''}
        <div class="ta-dialog-actions">
          <button class="btn btn-soft" type="button" data-dialog-cancel>${escapeHtml(cancelText)}</button>
          <button class="btn btn-primary" type="button" data-dialog-confirm>${escapeHtml(confirmText)}</button>
        </div>
      </section>
    `;

    const cleanup = (value) => {
      backdrop.dataset.state = 'leaving';
      setTimeout(() => {
        backdrop.remove();
        resolve(value);
      }, 170);
    };

    backdrop.querySelector('[data-dialog-cancel]')?.addEventListener('click', () => cleanup(input ? null : false));
    backdrop.querySelector('[data-dialog-confirm]')?.addEventListener('click', () => {
      const text = backdrop.querySelector('[data-dialog-input]')?.value;
      cleanup(input ? text : true);
    });

    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) cleanup(input ? null : false);
    });

    document.addEventListener('keydown', function onKey(event) {
      if (!document.body.contains(backdrop)) {
        document.removeEventListener('keydown', onKey);
        return;
      }
      if (event.key === 'Escape') cleanup(input ? null : false);
    });

    document.body.appendChild(backdrop);
    const field = backdrop.querySelector('[data-dialog-input]');
    const first = field || backdrop.querySelector('[data-dialog-confirm]');
    setTimeout(() => first?.focus(), 40);
  });

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));

  window.TAUX = {
    toast,
    confirm: (options) => dialog(options),
    prompt: (options) => dialog({ ...options, input: true }),
  };

  // Non-invasive action feedback for existing buttons.
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button, a.btn');
    if (!button) return;

    const text = (button.textContent || '').trim().toLowerCase();
    if (!text) return;

    if (text.includes('refresh')) {
      toast({ title: 'Refreshing', message: 'Updating dashboard data…', type: 'warn', timeout: 1400 });
    }
  }, true);

  // Smooth anchor scroll for dashboard jumps.
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Replace native confirm/prompt only after dashboard assets load.
  const nativeConfirm = window.confirm.bind(window);
  const nativePrompt = window.prompt.bind(window);

  window.TAUX.nativeConfirm = nativeConfirm;
  window.TAUX.nativePrompt = nativePrompt;
})();
