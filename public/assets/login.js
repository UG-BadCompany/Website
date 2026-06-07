(() => {
  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const present = (value) => String(value ?? '').trim();
  const asArray = (value, fallback = []) => Array.isArray(value) && value.length ? value : fallback;

  const defaultPortal = {
    badge: 'Secure customer access',
    headline: 'Secure Client Portal',
    subheadline: 'Manage your entire project online with one secure email link.',
    description: 'Access your estimates, approved quotes, work orders, project photos, invoices, payment history, and real-time project updates from one place.',
    features: ['Review estimates', 'Approve quotes', 'Track work progress', 'View before & after photos', 'Download invoices', 'Pay securely online', 'Message your contractor', 'Access AI Photo Estimates'],
    previewCards: [
      { title: 'Estimate', status: '✓ AI Reviewed', description: 'Ready for approval' },
      { title: 'Work Order', status: 'Scheduled', description: 'Worker Assigned' },
      { title: 'Invoice', status: 'Ready to Pay', description: 'Secure checkout' },
    ],
    aiPhotoEstimate: {
      title: 'AI Photo Estimate',
      status: 'Demo intake ready',
      bullets: ['✓ Upload photos', '✓ AI analyzes project', '✓ Receive estimate', '✓ Approve online'],
    },
    loginEyebrow: 'Client Portal',
    loginTitle: 'Send secure sign-in link',
    loginCopy: 'Use the same email you used for your estimate or account.',
    submitLabel: 'Send Secure Link',
    trustItems: ['✓ Passwordless login', '✓ Secure one-time access', '✓ Quotes, invoices, and scheduling'],
    trustMessage: 'Passwordless access uses a secure one-time email link. New customers will complete setup after verification.',
    estimatePrompt: 'Need an estimate first?',
    requestEstimateLabel: 'Request Estimate',
    requestEstimateLink: '/#estimate',
    backgroundImage: '',
    accentColor: '',
  };

  const queryMessages = {
    'signed-out': 'You have been signed out. Request a new secure link whenever you need access.',
    expired: 'That magic link expired. Enter your email and we’ll send a fresh secure link.',
    used: 'That magic link was already used. Enter your email to receive a new one-time link.',
    error: 'We could not verify that magic link. Request a new secure link to continue.',
    'missing-token': 'The magic-link token was missing. Request a new secure link to continue.',
  };

  const applyInitialStatus = (setStatus) => {
    const params = new URLSearchParams(window.location.search);
    const authState = params.get('auth');
    const signedOut = params.has('signed-out') || params.get('signedOut') === '1';
    if (signedOut) setStatus(queryMessages['signed-out'], 'success');
    else if (authState && queryMessages[authState]) setStatus(queryMessages[authState], 'error');
  };

  const portalFromSettings = (settings = {}) => ({ ...defaultPortal, ...(settings.portal || settings.clientPortal || {}) });

  const renderBrandLockup = (company = {}) => {
    const mount = document.querySelector('[data-portal-logo]');
    if (!mount) return;
    const name = company.displayName || company.companyName || 'Client Portal';
    const logo = company.logoUrl || company.logo || company.logo_url || '';
    mount.innerHTML = `<div class="hero-brand-lockup hero-logo-compact">${logo ? `<span class="hero-logo-mark"><img src="${esc(logo)}" alt=""></span>` : `<span class="hero-logo-mark">${esc(name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'CP')}</span>`}<span><em>Customer workspace</em><strong>${esc(name)}</strong></span></div>`;
  };

  const renderPortal = (portal, company = {}) => {
    renderBrandLockup(company);
    if (portal.backgroundImage) document.body.style.setProperty('--portal-bg-image', `url("${portal.backgroundImage.replace(/"/g, '%22')}")`);
    if (portal.accentColor) document.body.style.setProperty('--portal-accent', portal.accentColor);
    const setText = (selector, value) => { const el = document.querySelector(selector); if (el && present(value)) el.textContent = value; };
    setText('[data-portal-badge]', portal.badge);
    setText('[data-portal-headline]', portal.headline);
    setText('[data-portal-subheadline]', portal.subheadline);
    setText('[data-portal-description]', portal.description);
    setText('[data-portal-card-eyebrow]', portal.loginEyebrow);
    setText('[data-portal-card-title]', portal.loginTitle);
    setText('[data-portal-login-copy]', portal.loginCopy);
    setText('[data-portal-submit]', portal.submitLabel);
    setText('[data-portal-estimate-copy]', portal.estimatePrompt);
    setText('[data-portal-estimate-link]', portal.requestEstimateLabel);
    const estimateLink = document.querySelector('[data-portal-estimate-link]');
    if (estimateLink) estimateLink.href = portal.requestEstimateLink || '/#estimate';

    const features = document.querySelector('[data-portal-features]');
    if (features) features.innerHTML = asArray(portal.features, defaultPortal.features).map((item) => `<li>✓ ${esc(item).replace(/^✓\s*/, '')}</li>`).join('');

    const cards = document.querySelector('[data-portal-preview-cards]');
    if (cards) cards.innerHTML = asArray(portal.previewCards, defaultPortal.previewCards).slice(0, 3).map((card) => `<article class="portal-mini-card"><span>${esc(card.title || 'Portal item')}</span><strong>${esc(card.status || 'Ready')}</strong><p>${esc(card.description || card.subtitle || 'Available in your workspace')}</p></article>`).join('');

    const trust = document.querySelector('[data-portal-trust-list]');
    if (trust) trust.innerHTML = asArray(portal.trustItems, defaultPortal.trustItems).map((item) => `<span>${esc(item)}</span>`).join('');

    const status = document.getElementById('login-status');
    if (status && present(portal.trustMessage)) status.textContent = portal.trustMessage;

    const ai = { ...defaultPortal.aiPhotoEstimate, ...(portal.aiPhotoEstimate || {}) };
    const aiCard = document.querySelector('[data-portal-ai-card]');
    if (aiCard) aiCard.innerHTML = `<div><p class="eyebrow">${esc(ai.title || 'AI Photo Estimate')}</p><h2>${esc(ai.status || 'Upload photos. Get project guidance faster.')}</h2></div><ul>${asArray(ai.bullets, defaultPortal.aiPhotoEstimate.bullets).map((bullet) => `<li>${esc(bullet)}</li>`).join('')}</ul>`;
  };

  const syncPortalNav = async () => {
    const portalLinks = document.querySelectorAll('[data-portal-link]');
    const dashboardLinks = document.querySelectorAll('[data-dashboard-link]');
    let authenticated = false;
    try {
      const me = await window.TAApi?.get?.('/api/me?optional=1');
      authenticated = Boolean(me?.authenticated || me?.user || me?.session);
    } catch {
      authenticated = false;
    }
    portalLinks.forEach((link) => { link.hidden = authenticated; link.textContent = link.dataset.label || 'Client Portal'; link.href = '/login/'; });
    dashboardLinks.forEach((link) => { link.hidden = !authenticated; link.textContent = link.dataset.label || 'Dashboard'; link.href = '/dashboard/'; });
    document.body.classList.toggle('is-authenticated', authenticated);
    return authenticated;
  };

  const redirectExistingSession = async () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('signed-out') || params.has('auth')) return false;
    try {
      const response = await fetch('/api/me?optional=1', { credentials: 'same-origin', headers: { accept: 'application/json' } });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.authenticated) {
        window.location.replace('/dashboard/');
        return true;
      }
    } catch {}
    return false;
  };

  const bindHeader = () => {
    const header = document.querySelector('.site-header');
    const toggle = document.querySelector('.mobile-menu-toggle');
    const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 28);
    onScroll();
    document.addEventListener('scroll', onScroll, { passive: true });
    toggle?.addEventListener('click', () => {
      const open = header.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  };

  const bindLogin = () => {
    const form = document.getElementById('login-form');
    const status = document.getElementById('login-status');
    const setStatus = (message, tone = '') => { if (status) { status.textContent = message; status.dataset.tone = tone; } };
    applyInitialStatus(setStatus);
    if (!form || form.dataset.bound) return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const email = new FormData(form).get('email');
      button.disabled = true;
      setStatus('Sending your secure one-time link…');
      try {
        await window.TAAuth.login(email);
        setStatus('Check your email for your secure sign-in link. New customers will finish account setup after opening it.', 'success');
      } catch (error) {
        setStatus(error.message || 'Unable to send link right now.', 'error');
      } finally {
        button.disabled = false;
      }
    });
  };

  document.addEventListener('DOMContentLoaded', async () => {
    bindHeader();
    let company = window.TACompany?.current || {};
    try {
      if (!await window.TACompany?.requireInstalled?.()) return;
      company = await window.TACompany?.load?.() || company;
    } catch {}
    let portal = { ...defaultPortal };
    try {
      const data = await window.TAApi.get('/.netlify/functions/homepage-settings');
      portal = portalFromSettings(data.settings || data.homepage || data);
    } catch {}
    renderPortal(portal, company);
    await syncPortalNav();
    bindLogin();
    await redirectExistingSession();
  });
})();
