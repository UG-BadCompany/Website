(() => {
  const isElementRoot = (value) => Boolean(value?.querySelector);
  const resolve = (context) => {
    if (isElementRoot(context)) return context;
    if (isElementRoot(context?.root)) return context.root;
    if (isElementRoot(context?.element)) return context.element;
    return document.getElementById('module-root') || document.querySelector('[data-module-root]');
  };
  window.TAModuleRoot = { resolve };
})();
