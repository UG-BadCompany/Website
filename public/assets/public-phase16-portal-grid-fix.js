// public/assets/public-phase16-portal-grid-fix.js
(() => {
  const phrases = [
    'Request quotes',
    'Approve or deny quotes',
    'Track repair status',
    'Manage multiple properties',
    'Review quote history',
    'Payments and invoices next'
  ];

  const makeDark = (el) => {
    if (!el) return;
    el.classList.add('portal-feature-dark-fix');

    let parent = el.parentElement;
    let depth = 0;
    while (parent && depth < 2) {
      parent.classList.add('portal-feature-dark-fix-parent');
      parent = parent.parentElement;
      depth += 1;
    }
  };

  document.querySelectorAll('article, li, div, section').forEach((el) => {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return;

    const matched = phrases.some((phrase) => text.includes(phrase));
    if (!matched) return;

    const card = el.closest('article, li, .card, .feature-card, .portal-card, .benefit-card, .feature, .benefit') || el;
    makeDark(card);
  });
})();
