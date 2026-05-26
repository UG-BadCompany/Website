// public/assets/login.js
// Real magic-link login for T&A Contracting.
// Matches login page form:
// <form data-auth-form data-endpoint="/api/auth/magic-link">

(() => {
  const form = document.querySelector('[data-auth-form]');
  if (!form || !window.fetch) return;

  const endpoint = form.dataset.endpoint || '/api/auth/magic-link';
  const status = form.querySelector('.status');
  const submitButton = form.querySelector('button[type="submit"]');
  const siteKey = document.querySelector('meta[name="recaptcha-site-key"]')?.content || '';

  const setStatus = (message, state = '') => {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
  };

  const getRecaptchaToken = async () => {
    if (!siteKey || !window.grecaptcha?.execute) return '';
    await new Promise((resolve) => window.grecaptcha.ready(resolve));
    return window.grecaptcha.execute(siteKey, { action: 'magic_link' });
  };

  const getNext = () => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next') || '/dashboard/';
    return next.startsWith('/') ? next : '/dashboard/';
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();
    const botField = String(formData.get('bot-field') || '').trim();

    if (!email) {
      setStatus('Enter your email first.', 'error');
      return;
    }

    submitButton.disabled = true;
    setStatus('Sending secure sign-in link…');

    try {
      const recaptchaToken = await getRecaptchaToken();

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          email,
          next: getNext(),
          botField,
          recaptchaToken,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.ok === false) {
        throw new Error(result.message || 'We could not send the magic link.');
      }

      setStatus('Secure link sent. Check your email and open the link to sign in.', 'success');
      form.reset();
    } catch (error) {
      setStatus(error.message || 'We could not send the magic link.', 'error');
    } finally {
      submitButton.disabled = false;
    }
  });
})();
