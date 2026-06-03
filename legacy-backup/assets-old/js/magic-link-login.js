// public/js/magic-link-login.js
// Restores magic-link login behavior.
// Works with /.netlify/functions/request-magic-link and /.netlify/functions/verify-magic-link.

(() => {
  const form = document.querySelector('[data-magic-link-form]');
  if (!form) return;

  const status = form.querySelector('[data-magic-link-status]');
  const nextField = form.querySelector('[data-next-field]');
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next') || '/dashboard/';
  if (nextField) nextField.value = next.startsWith('/') ? next : '/dashboard/';

  const setStatus = (message, state = '') => {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(form).entries());
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus('Sending magic link…');

    try {
      const response = await fetch('/.netlify/functions/request-magic-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) {
        throw new Error(result.message || 'Could not send magic link.');
      }

      if (result.devMagicLink) {
        setStatus('Magic link created. Dev mode link is shown below.', 'success');
        const link = document.createElement('p');
        link.className = 'form-note';
        link.innerHTML = `<a class="btn" href="${result.devMagicLink}">Open Magic Link</a>`;
        form.appendChild(link);
      } else {
        setStatus('Magic link sent. Check your email.', 'success');
      }
    } catch (error) {
      setStatus(error.message || 'Could not send magic link.', 'error');
    } finally {
      button.disabled = false;
    }
  });
})();
