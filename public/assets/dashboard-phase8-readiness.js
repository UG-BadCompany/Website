// public/assets/dashboard-phase8-readiness.js
// Phase 8: system readiness, cleanup checks, and deploy confidence layer.

(() => {
  const root = document.querySelector('[data-dashboard-root]');
  if (!root || window.__taDashboardPhase8Loaded) return;
  window.__taDashboardPhase8Loaded = true;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const fetchJson = async (url) => {
    const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', headers: { accept: 'application/json' } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) throw new Error(result.message || `Request failed: ${url}`);
    return result;
  };

  const mount = () => {
    if (document.querySelector('[data-phase8-readiness-suite]')) return;
    const phase5 = document.querySelector('[data-phase5-executive-suite]');
    const phase4 = document.querySelector('[data-phase4-finance-suite]');
    const phase3 = document.querySelector('[data-phase3-workflow-suite]');
    const after = phase5 || phase4 || phase3 || root.querySelector('.hero') || root.firstElementChild;

    const suite = document.createElement('section');
    suite.className = 'readiness-suite';
    suite.dataset.phase8ReadinessSuite = 'true';
    suite.innerHTML = `
      <section class="readiness-panel" id="system-readiness">
        <div class="readiness-header">
          <div>
            <span class="eyebrow">System Readiness</span>
            <h2>Deployment and workflow health</h2>
            <p>Checks the important routes, integrations, database connection, and dashboard cleanup items so the portal stays in working order.</p>
          </div>
          <div class="readiness-actions">
            <button class="btn btn-primary" type="button" data-readiness-refresh>Run health check</button>
            <a class="btn btn-soft" href="#executive-overview">Owner View</a>
          </div>
        </div>
        <p class="session-status" data-readiness-status>Health check not run yet.</p>
        <div class="readiness-grid">
          <section class="readiness-card">
            <h3>Integration readiness</h3>
            <div class="readiness-list" data-readiness-env></div>
          </section>
          <section class="readiness-card">
            <h3>Warnings</h3>
            <div class="readiness-list" data-readiness-warnings></div>
          </section>
        </div>
        <section class="readiness-card" style="margin-top:16px">
          <h3>Critical API routes</h3>
          <div class="readiness-route-grid" data-readiness-routes></div>
        </section>
      </section>
    `;
    after.parentNode.insertBefore(suite, after.nextSibling);
    suite.querySelector('[data-readiness-refresh]')?.addEventListener('click', loadReadiness);
  };

  const item = (state, title, text) => `
    <article class="readiness-item ${state}">
      <i class="readiness-dot" aria-hidden="true"></i>
      <div><strong>${escapeHtml(title)}</strong><br><span>${escapeHtml(text)}</span></div>
    </article>
  `;

  const renderReadiness = (result) => {
    const status = document.querySelector('[data-readiness-status]');
    if (status) status.textContent = `Checked ${new Date(result.checkedAt || Date.now()).toLocaleString()}.`;

    const env = result.env || {};
    const db = result.database || {};
    const envBox = document.querySelector('[data-readiness-env]');
    if (envBox) {
      envBox.innerHTML = [
        item(db.ok ? 'good' : 'hot', 'Netlify Database', db.ok ? 'Database connection responded.' : db.message || 'Database check failed.'),
        item(env.openaiConfigured ? 'good' : 'warn', 'OpenAI estimating', env.openaiConfigured ? 'Configured.' : 'Missing OPENAI_API_KEY. Local estimate fallback will still work.'),
        item(env.resendConfigured ? 'good' : 'hot', 'Magic-link email', env.resendConfigured ? 'Configured.' : 'Missing RESEND_API_KEY or MAGIC_LINK_FROM_EMAIL.'),
        item(env.squareConfigured ? 'good' : 'warn', 'Square payments', env.squareConfigured ? 'Configured.' : 'Missing Square credentials.'),
        item(env.recaptchaConfigured ? 'good' : 'warn', 'reCAPTCHA', env.recaptchaConfigured ? 'Configured.' : 'Missing RECAPTCHA_SECRET_KEY or intentionally disabled.'),
      ].join('');
    }

    const warnings = document.querySelector('[data-readiness-warnings]');
    if (warnings) {
      warnings.innerHTML = (result.warnings || []).length
        ? result.warnings.map((warning) => item('warn', 'Needs attention', warning)).join('')
        : item('good', 'Clean', 'No readiness warnings found.');
    }

    const routes = document.querySelector('[data-readiness-routes]');
    if (routes) {
      routes.innerHTML = (result.routeChecks || []).map((route) => `
        <article class="readiness-route">
          <strong>${escapeHtml(route.label)}</strong>
          <code>${escapeHtml(route.route)}</code>
          <span>${escapeHtml(route.functionName)}</span>
        </article>
      `).join('');
    }
  };

  const loadReadiness = async () => {
    const status = document.querySelector('[data-readiness-status]');
    if (status) status.textContent = 'Running health check…';
    try {
      const result = await fetchJson('/api/system-health');
      renderReadiness(result);
      window.TAUX?.toast({ title: 'Health check complete', message: 'System readiness was refreshed.', type: 'success' });
    } catch (error) {
      if (status) status.textContent = error.message || 'Health check failed.';
      window.TAUX?.toast({ title: 'Health check failed', message: error.message || 'Could not run system readiness check.', type: 'error' });
    }
  };

  mount();
  setTimeout(loadReadiness, 1800);
})();
