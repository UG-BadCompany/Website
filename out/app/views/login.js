import { api } from '../core/api.js';

export function renderLogin(app) {
  const params = new URLSearchParams(location.search);
  app.innerHTML = `
    <main class="main auth-page">
      <section class="card narrow">
        <h1>Passwordless Login</h1>
        <p>Enter your email to receive a secure one-time magic link. New clients can complete account setup after verification.</p>
        <form id="magic" class="grid">
          <label>Email<input name="email" type="email" required value="${params.get('email') || ''}"></label>
          ${params.get('token') ? `<label>Setup Token<input name="token" value="${params.get('token')}"></label><label>Full Name<input name="full_name"></label><label>Phone<input name="phone"></label>` : ''}
          <button>${params.get('token') ? 'Verify & Setup Account' : 'Send magic link'}</button>
        </form>
        <div id="loginResult" aria-live="polite"></div>
      </section>
    </main>`;
  document.querySelector('#magic').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const result = document.querySelector('#loginResult');
    result.innerHTML = '<div class="loading">Working…</div>';
    try {
      const response = data.token
        ? await api('/auth/verify', { method: 'POST', body: { email: data.email, token: data.token, profile: data } })
        : await api('/auth/magic-link', { method: 'POST', body: { email: data.email } });
      result.innerHTML = `<div class="banner">${response.message || 'Signed in.'} ${response.setupLink ? `<a href="${response.setupLink}">Open setup link</a>` : ''}</div>`;
    } catch (error) {
      result.innerHTML = `<div class="error">${error.message}</div>`;
    }
  });
}
