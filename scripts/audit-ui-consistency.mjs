import { readFileSync } from 'node:fs';
const base=readFileSync('public/assets/css/base.css','utf8');
const dashboard=readFileSync('public/dashboard/index.html','utf8');
for (const token of ['--color-primary','--color-accent','--color-background','--color-surface','--color-text','[data-theme="dark"]','[data-theme="light"]']) {
  if (!base.includes(token)) throw new Error(`Missing global theme token ${token}`);
}
if (!dashboard.includes('/assets/js/module-loader.js') || !dashboard.includes('/assets/js/dashboard-router.js')) throw new Error('Dashboard shell must use the clean loader/router.');
console.log('Clean UI theme and dashboard consistency checks passed.');
