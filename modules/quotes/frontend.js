window.TAModules = window.TAModules || { registry: {}, register(module) { this.registry[module.id] = module; } };
window.TAModules.register({
  id: document.currentScript?.dataset?.moduleId || 'drop-in-module',
  version: '1.0.0',
  async mount(context) {
    context.root.innerHTML = `<section class="module-card"><h2>${context.module.title}</h2><p>${context.module.description}</p></section>`;
  },
  async unmount(context) { context.root.innerHTML = ''; },
  async refresh() {},
  getActions() { return []; }
});
