window.TAModules.register({
  id: 'ai-troubleshooting',
  version: '1.0.0',
  async mount(context) {
    const root = context.root;
    const slot = root.querySelector('[data-module-content]') || root;
    const cards = [
      ['Workspace', context.workspace],
      ['Status', context.module.enabled ? 'Enabled' : 'Available'],
      ['Category', context.module.category],
      ['Version', context.module.version]
    ];
    slot.innerHTML = `<div class="module-grid">${cards.map(([label,value])=>`<article class="metric-card"><strong>${label}</strong><span>${value}</span></article>`).join('')}</div><p class="muted">This drop-in module was discovered from its manifest and mounted through the shared runtime.</p>`;
  },
  async unmount() {},
  async refresh(context) { return this.mount(context); },
  getActions() { return [{ label: 'Refresh', action: 'refresh' }]; }
});
