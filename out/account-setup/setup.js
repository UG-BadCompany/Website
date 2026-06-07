(async () => {
  const form = document.getElementById('account-setup-form');
  const status = document.getElementById('account-setup-status');
  const setStatus = (message, tone = '') => { status.textContent = message; status.dataset.tone = tone; };
  await window.TACompany?.load?.();
  const me = await window.TAAuth?.me?.().catch(() => ({ authenticated: false }));
  if (!me?.authenticated) {
    setStatus('Your setup session expired. Request a new magic link to continue.', 'error');
    form.querySelector('button[type="submit"]').disabled = true;
    return;
  }
  if (me.user?.accountSetupComplete) {
    location.replace('/dashboard/#client.overview');
    return;
  }
  form.email.value = me.user?.email || '';
  form.fullName.value = me.user?.fullName || '';
  form.phone.value = me.user?.phone || '';
  form.companyName.value = me.user?.companyName || '';
  setStatus('Verified email loaded. Complete the required fields to enter your Client Workspace.');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus('Creating your client account…');
    const data = Object.fromEntries(new FormData(form).entries());
    data.acceptedTerms = form.acceptedTerms.checked;
    data.requireTerms = true;
    data.email = form.email.value;
    try {
      const result = await window.TAApi.post('/api/auth/client-account', data);
      setStatus('Account created. Opening your Client Workspace…', 'success');
      location.replace(result.location || '/dashboard/#client.overview');
    } catch (error) {
      setStatus(error.message || 'Could not create your account. Please try again.', 'error');
      button.disabled = false;
    }
  });
})();
