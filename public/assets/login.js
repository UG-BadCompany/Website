(() => {
  const queryMessages = {
    'missing-token': ['That magic link is missing its token. Request a new sign-in link.', 'error'],
    expired: ['That magic link is expired or was already used. Request a fresh sign-in link.', 'error'],
    error: ['We could not complete that sign-in link. Request a new link or contact T&A Contracting.', 'error'],
  };

  const applyInitialStatus = (setStatus) => {
    const params = new URLSearchParams(window.location.search);

    if (params.has('signed-out')) {
      setStatus('Signed out. Request a new magic link when you are ready to return.', 'success');
      return;
    }

    const authState = params.get('auth');
    if (queryMessages[authState]) {
      setStatus(...queryMessages[authState]);
    }
  };

  const bindMagicLinkForm = (form) => {
    const status = form.querySelector('.status');
    const button = form.querySelector('button[type="submit"]');

    if (!status || !button || form.dataset.bound) {
      return;
    }

    form.dataset.bound = 'true';

    const setStatus = (message, state = '') => {
      status.textContent = message;
      status.dataset.state = state;
    };

    applyInitialStatus(setStatus);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const payload = Object.fromEntries(new FormData(form).entries());
      button.disabled = true;
      setStatus('Sending secure sign-in link…');

      try {
        const response = await fetch(form.dataset.endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        setStatus(result.message || 'If that email is on file, a secure sign-in link will be sent shortly.', response.ok && result.ok ? 'success' : 'error');

        if (result.devMagicLink && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
          const link = document.createElement('a');
          link.href = result.devMagicLink;
          link.textContent = 'Open development magic link';
          link.style.display = 'block';
          link.style.marginTop = '8px';
          status.appendChild(link);
        }
      } catch {
        setStatus('We could not request a sign-in link right now. Please try again or contact T&A Contracting.', 'error');
      } finally {
        button.disabled = false;
      }
    });
  };

  document.querySelectorAll('[data-auth-form]').forEach(bindMagicLinkForm);
})();
