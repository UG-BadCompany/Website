import './generate-module-registry.mjs';
const registry=(await import('../generated/module-registry.mjs?x='+Date.now())).default;
if(!registry.modules.length) throw new Error('No modules discovered');
console.log(`Module audit passed: ${registry.modules.length} drop-in modules.`);
