// public/js/site.js
// Site helper:
// - Keeps site dark-mode only
// - Removes visible AI Quote links/buttons from customer-facing pages
// - Does NOT remove the backend AI engine
// - Does NOT touch magic-link auth

(() => {
  document.documentElement.removeAttribute('data-theme');

  try {
    localStorage.removeItem('ta-theme');
  } catch {}

  document.querySelectorAll('[data-theme-toggle]').forEach((el) => el.remove());

  // Remove customer-facing AI Quote buttons/links.
  // Request Estimate is the public AI quote flow now.
  const aiLinkPatterns = [
    '/ai-quote',
    '/ai-quotes',
    '/admin/ai-quotes',
    '/api/ai-quote-draft'
  ];

  document.querySelectorAll('a, button').forEach((el) => {
    const text = (el.textContent || '').trim().toLowerCase();
    const href = (el.getAttribute('href') || '').trim().toLowerCase();
    const dataAction = (el.getAttribute('data-action') || '').trim().toLowerCase();

    const looksLikeAiQuote =
      text === 'ai quote' ||
      text === 'ai quotes' ||
      text === 'generate ai quote' ||
      text === 'ai quote drafts' ||
      text.includes('ai quote') ||
      dataAction.includes('ai-quote') ||
      aiLinkPatterns.some((pattern) => href.includes(pattern));

    const isRequestEstimate =
      text.includes('request estimate') ||
      href === '/#estimate' ||
      href.endsWith('/#estimate');

    // Keep Request Estimate even though it uses AI internally.
    if (looksLikeAiQuote && !isRequestEstimate) {
      el.remove();
    }
  });

  // Rename labels if any old admin/customer text is still rendered.
  document.querySelectorAll('h1, h2, h3, h4, p, span, strong, label, th, td, a, button').forEach((el) => {
    if (!el.childNodes || el.childNodes.length !== 1) return;
    const node = el.childNodes[0];
    if (!node || node.nodeType !== Node.TEXT_NODE) return;

    node.textContent = node.textContent
      .replace(/\bAI Quote Drafts\b/g, 'Estimate Drafts')
      .replace(/\bAI Quote Draft\b/g, 'Estimate Draft')
      .replace(/\bAI Quote Queue\b/g, 'Estimate Review')
      .replace(/\bGenerate AI Quote\b/g, 'Build Estimate')
      .replace(/\bAI Quotes\b/g, 'Estimates')
      .replace(/\bAI Quote\b/g, 'Estimate');
  });
})();
