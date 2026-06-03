// public/assets/public-phase15-home-section-fix.js
(() => {
  const phrases = [
    'Your project details, quotes, and repair status in one clean portal.',
    'Tell us what needs to get handled.'
  ];

  document.querySelectorAll('section, div, article').forEach((el) => {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (phrases.some((phrase) => text.includes(phrase))) {
      el.classList.add('home-dark-panel-fix');
      let parent = el.parentElement;
      let depth = 0;
      while (parent && depth < 2) {
        parent.classList.add('home-dark-panel-fix-parent');
        parent = parent.parentElement;
        depth += 1;
      }
    }
  });
})();
