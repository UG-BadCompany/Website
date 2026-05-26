(() => {
  let resolvedRecaptchaSiteKey = '';
  let recaptchaReadyPromise = null;

  const resolveRecaptchaSiteKey = async () => {
    if (resolvedRecaptchaSiteKey) return resolvedRecaptchaSiteKey;
    const metaValue = document.querySelector('meta[name="recaptcha-site-key"]')?.content?.trim() || '';
    if (metaValue) {
      resolvedRecaptchaSiteKey = metaValue;
      return resolvedRecaptchaSiteKey;
    }
    try {
      const response = await fetch('/api/public-config', { headers: { accept: 'application/json' }, cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      resolvedRecaptchaSiteKey = (result?.recaptchaSiteKey || '').trim();
      return resolvedRecaptchaSiteKey;
    } catch {
      return '';
    }
  };

  const ensureRecaptchaReady = async (siteKey) => {
    if (!siteKey) return false;
    if (!recaptchaReadyPromise) {
      recaptchaReadyPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-recaptcha-loader="true"]');
        const onReady = () => {
          if (!window.grecaptcha?.ready) {
            reject(new Error('reCAPTCHA library unavailable.'));
            return;
          }
          window.grecaptcha.ready(() => resolve(true));
        };
        if (existing) {
          onReady();
          return;
        }
        const scriptSources = [
          `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`,
          `https://www.recaptcha.net/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`,
        ];
        let attempt = 0;
        const loadNext = () => {
          if (attempt >= scriptSources.length) {
            reject(new Error('reCAPTCHA script failed to load from Google and fallback CDN.'));
            return;
          }
          const script = document.createElement('script');
          script.src = scriptSources[attempt];
          script.async = true;
          script.defer = true;
          script.dataset.recaptchaLoader = 'true';
          script.onload = onReady;
          script.onerror = () => {
            script.remove();
            attempt += 1;
            loadNext();
          };
          document.head.appendChild(script);
        };
        loadNext();
      });
      recaptchaReadyPromise = recaptchaReadyPromise.catch((error) => {
        recaptchaReadyPromise = null;
        throw error;
      });
    }
    return recaptchaReadyPromise;
  };

  const queryMessages = {
    'missing-token': ['That magic link is missing its token. Request a new sign-in link.', 'error'],
    expired: ['That magic link is expired. Request a fresh sign-in link.', 'error'],
    used: ['That magic link was already used. Request a fresh link, then open the newest email only once.', 'error'],
    error: ['We could not complete that sign-in link. Request a new link or contact T&A Contracting.', 'error'],
  };

  const getParams = () => new URLSearchParams(window.location.search);

  const isSignedOutReturn = () => getParams().has('signed-out');

  const applyInitialStatus = (setStatus) => {
    const params = getParams();

    if (params.has('signed-out')) {
      setStatus('Signed out. Request a new magic link when you are ready to return.', 'success');
      return;
    }

    const authState = params.get('auth');
    if (queryMessages[authState]) {
      setStatus(...queryMessages[authState]);
    }
  };

  const appendMagicLink = (status, magicLinkUrl) => {
    if (!magicLinkUrl) return;

    const link = document.createElement('a');
    link.href = magicLinkUrl;
    link.textContent = 'Open secure sign-in link';
    link.style.display = 'block';
    link.style.marginTop = '8px';
    link.rel = 'nofollow noopener';
    status.appendChild(link);
  };

  const redirectExistingSession = async () => {
    if (isSignedOutReturn()) return;

    try {
      const response = await fetch('/api/me?optional=1', {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok && result.authenticated) {
        window.location.replace('/dashboard/');
      }
    } catch {
      // Stay on the login form when the session check is unavailable.
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
      const recaptchaSiteKey = await resolveRecaptchaSiteKey();
      if (recaptchaSiteKey) {
        try {
          await ensureRecaptchaReady(recaptchaSiteKey);
          payload.recaptchaToken = await window.grecaptcha.execute(recaptchaSiteKey, { action: 'login_magic_link' });
        } catch (error) {
          setStatus(`reCAPTCHA unavailable (${error?.message || 'unknown error'}). Continuing without token…`, 'error');
        }
      }
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
        appendMagicLink(status, result.devMagicLink);
      } catch {
        setStatus('We could not request a sign-in link right now. Please try again or contact T&A Contracting.', 'error');
      } finally {
        button.disabled = false;
      }
    });
  };

  redirectExistingSession();
  document.querySelectorAll('[data-auth-form]').forEach(bindMagicLinkForm);
})();
