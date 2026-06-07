window.TAModules = window.TAModules || { modules:new Map(), register(m){this.modules.set(m.id,m)} };
window.TAModules.register({
  id: "finance", version: "1.0.0",
  async mount(context) {
    const html = await fetch("/modules/finance/frontend/module.html").then(r=>r.text());
    context.root.innerHTML = html;
    const slot = context.root.querySelector("[data-module-content]");
    if (slot) slot.innerHTML = `<p><strong>Workspace:</strong> ${context.workspace}</p><p><strong>Permission-aware:</strong> ${context.permissions.includes("*") ? "Owner bypass active" : "Filtered"}</p>`;
  },
  async unmount(context) { context.root.innerHTML = ""; },
  async refresh(context) { return this.mount(context); },
  getActions() { return []; }
});
