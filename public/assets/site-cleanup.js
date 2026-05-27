// public/assets/site-cleanup.js
// Controlled cleanup for T&A Contracting.
// Keeps Request Estimate as the public estimate flow.
// Removes visible AI Quote buttons/labels and light-mode controls.
// Does not modify magic-link login behavior.

(() => {
  document.documentElement.dataset.theme = 'dark';

  try {
    localStorage.removeItem('ta-theme');
  } catch {}

  document.querySelectorAll('[data-theme-toggle], .theme-toggle').forEach((el) => el.remove());

  const aiLinkPatterns = ['/ai-quote', '/ai-quotes', '/admin/ai-quotes', '/api/ai-quote-draft'];

  document.querySelectorAll('a, button').forEach((el) => {
    const text = (el.textContent || '').trim().toLowerCase();
    const href = (el.getAttribute('href') || '').trim().toLowerCase();
    const action = (el.getAttribute('data-action') || '').trim().toLowerCase();

    const isRequestEstimate =
      text.includes('request estimate') ||
      href === '/#estimate' ||
      href.endsWith('/#estimate') ||
      href.includes('#estimate');

    const looksLikeVisibleAiQuote =
      text === 'ai quote' ||
      text === 'ai quotes' ||
      text === 'generate ai quote' ||
      text === 'ai quote drafts' ||
      text.includes('ai quote') ||
      action.includes('ai-quote') ||
      aiLinkPatterns.some((pattern) => href.includes(pattern));

    if (looksLikeVisibleAiQuote && !isRequestEstimate) {
      el.remove();
    }
  });

  const replacements = [
    [/\bAI Quote Drafts\b/g, 'Estimate Drafts'],
    [/\bAI Quote Draft\b/g, 'Estimate Draft'],
    [/\bAI Quote Queue\b/g, 'Estimate Review'],
    [/\bGenerate AI Quote\b/g, 'Build Estimate'],
    [/\bAI Quotes\b/g, 'Estimates'],
    [/\bAI Quote\b/g, 'Estimate'],
    [/\bAI Request Estimate\b/g, 'Request Estimate']
  ];

  document.querySelectorAll('h1,h2,h3,h4,p,span,strong,label,th,td,a,button,li').forEach((el) => {
    if (!el.childNodes || el.childNodes.length !== 1) return;
    const node = el.childNodes[0];
    if (!node || node.nodeType !== Node.TEXT_NODE) return;

    let value = node.textContent;
    for (const [pattern, replacement] of replacements) {
      value = value.replace(pattern, replacement);
    }
    node.textContent = value;
  });
})();
