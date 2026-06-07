import { api } from '../core/api-client.js';
import { redirectIfInstalled } from '../core/install-lock.js';

const GROUPS = {
  Required: [
    ['SITE_URL', 'Site URL', 'Canonical deployed site URL', 'Required', 'Netlify site settings or deployed URL', 'https://docs.netlify.com/site-deploys/overview/', 'Copy your production URL and save it as SITE_URL.'],
    ['MAGIC_LINK_FROM_EMAIL', 'Magic-link sender email', 'Verified email used for sign-in links', 'Required', 'Resend verified sender/domain', 'https://resend.com/docs/send-with-domains', 'Verify a sender/domain in Resend, then enter the from email.'],
    ['RESEND_API_KEY', 'Resend API key', 'Sends magic links and owner setup email', 'Required', 'Resend API Keys', 'https://resend.com/api-keys', 'Create a restricted Resend key and paste it into Netlify environment variables.']
  ],
  AI: [['OPENAI_API_KEY', 'OpenAI API key', 'AI quote, photo estimate, troubleshooting', 'Optional', 'OpenAI dashboard', 'https://platform.openai.com/api-keys', 'Create an API key and store only in Netlify environment variables.']],
  Payments: [
    ['SQUARE_ACCESS_TOKEN', 'Square access token', 'Invoice payment collection', 'Optional', 'Square Developer dashboard', 'https://developer.squareup.com/', 'Create an app token for the active environment.'],
    ['SQUARE_LOCATION_ID', 'Square location ID', 'Payment location routing', 'Optional', 'Square locations', 'https://developer.squareup.com/docs/locations-api', 'Copy the location ID used for payments.']
  ],
  Security: [['SESSION_SECRET', 'Session secret', 'Signs secure sessions', 'Recommended', 'Password manager', 'https://docs.netlify.com/environment-variables/overview/', 'Generate a long random value.']],
  Advanced: [['DATABASE_URL', 'Database URL', 'Postgres connection override', 'Optional', 'Netlify Database', 'https://docs.netlify.com/storage/netlify-database/', 'Use Netlify Database connection details when not auto-injected.']],
  Future: [['STRIPE_SECRET_KEY', 'Stripe key', 'Future payment provider', 'Future optional', 'Stripe dashboard', 'https://stripe.com/docs/keys', 'Leave blank unless enabling future Stripe integration.']]
};

let active = 'Required';

function renderEnv() {
  const tabs = document.querySelector('#env-tabs');
  const panel = document.querySelector('#env-panel');
  tabs.innerHTML = Object.keys(GROUPS).map(group => `<button type="button" class="tab" aria-selected="${group === active}">${group}</button>`).join('');
  tabs.querySelectorAll('button').forEach(button => button.onclick = () => { active = button.textContent; renderEnv(); });
  panel.innerHTML = GROUPS[active].map(([name, label, purpose, required, where, link, steps]) => `
    <article class="card">
      <label>${label}<input type="password" name="env_${name}" data-env-name="${name}" placeholder="${name}"></label>
      <p><strong>${name}</strong> · ${required}</p>
      <p class="muted">${purpose}</p>
      <p>Where: ${where} · <a href="${link}" target="_blank" rel="noreferrer">Help</a></p>
      <p class="muted">${steps}</p>
      <button type="button" class="secondary" data-test-env="${name}">Test</button>
    </article>`).join('');
  panel.querySelectorAll('[data-test-env]').forEach(button => button.onclick = async () => {
    button.textContent = 'Testing…';
    const result = await api('/api/install/health');
    button.textContent = result.ok ? 'Detected safely' : 'Check manually';
  });
}

async function init() {
  try {
    await redirectIfInstalled();
    renderEnv();
    const health = await api('/api/install/health');
    document.querySelector('#installer-alert').textContent = health.ok ? 'Installer ready. Secrets are checked server-side and never exposed.' : 'Installer API unavailable; fallback shell remains visible.';
    document.querySelector('#install-form').addEventListener('submit', finish);
  } catch (error) {
    document.querySelector('#installer-alert').textContent = `Installer fallback active after script error: ${error.message}`;
  }
}

async function finish(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const env = {};
  for (const [key, value] of form.entries()) if (key.startsWith('env_') && value) env[key.slice(4)] = '__provided__';
  const payload = {
    company: { name: form.get('companyName'), site_url: form.get('siteUrl') },
    owner: { name: form.get('ownerName'), email: form.get('ownerEmail') },
    theme: { mode: form.get('themeMode') },
    homepage: { headline: form.get('headline') },
    env
  };
  const output = document.querySelector('#install-output');
  output.textContent = 'Finishing installation…';
  const result = await api('/api/install/finish', { method: 'POST', body: JSON.stringify(payload) });
  output.textContent = JSON.stringify(result.data, null, 2);
  if (result.ok && result.data.installation_complete) location.href = '/dashboard/';
}

init();
