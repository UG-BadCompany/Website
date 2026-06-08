import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const modules = [
['dashboard','Dashboard / Overview','layout-dashboard','owner,admin,manager,worker,client'],
['customers','Customers / Clients','users','owner,admin,manager'],
['request-estimate','Request Estimate','clipboard-plus','owner,admin,manager,client'],
['quote-center','Estimate & Quote Center','file-pen','owner,admin,manager,client'],
['ai-photo-estimate','AI Photo Estimate','camera','owner,admin,manager,client'],
['ai-quote-builder','AI Quote Builder','sparkles','owner,admin,manager'],
['ai-troubleshooting','AI Troubleshooting','bot','owner,admin,manager,worker,client'],
['work-orders','Work Orders','wrench','owner,admin,manager,worker'],
['schedule','Schedule / Calendar','calendar','owner,admin,manager,worker,client'],
['worker-jobs','Worker Jobs','hard-hat','owner,admin,manager,worker'],
['inventory','Inventory','boxes','owner,admin,manager,worker'],
['invoices','Invoices','receipt','owner,admin,manager,client'],
['payments','Payments / Square Support','credit-card','owner,admin,manager,client'],
['finance','Finance','chart-line','owner,admin'],
['files','File / Photo Manager','folder-image','owner,admin,manager,worker,client'],
['users-roles','Users & Roles','user-cog','owner,admin'],
['workspace-permissions','Workspace & Permissions','shield-check','owner,admin'],
['theme-manager','Theme Manager','palette','owner,admin'],
['homepage-editor','Homepage Editor','home-edit','owner,admin'],
['module-manager','Module Manager','puzzle','owner,admin'],
['reports','Reports','bar-chart','owner,admin,manager'],
['platform-health','Platform Health','activity','owner,admin'],
['cache-manager','Cache Manager','database-zap','owner,admin'],
['audit-logs','Audit Logs','scroll-text','owner,admin'],
['backup-restore','Backup / Restore Foundation','archive-restore','owner,admin'],
['system-center','System Center','settings','owner,admin'],
['environment-integrations','Environment & Integrations','plug','owner,admin'],
['licensing','Licensing','badge-check','owner'],
['maintenance-plans','Maintenance Plans','repeat','owner,admin,manager,client'],
['client-portal','Client Portal','door-open','owner,admin,client'],
['worker-portal','Worker Portal','briefcase','owner,admin,manager,worker']
];
for (const [id,name,icon,roles] of modules) {
  const dir = join('modules', id);
  mkdirSync(dir, { recursive: true });
  const primary = roles.split(',')[0];
  writeFileSync(join(dir, 'module.json'), JSON.stringify({
    id, name, icon,
    version: '1.0.0',
    enabledByDefault: true,
    category: id.includes('ai-') ? 'AI' : id.includes('portal') ? 'Portal' : id.includes('system') || id.includes('environment') || id.includes('health') || id.includes('cache') || id.includes('backup') || id.includes('audit') || id.includes('licensing') ? 'System' : 'Operations',
    route: `/dashboard/modules/${id}`,
    apiBase: `/api/modules/${id}`,
    nav: { sidebar: true, mobile: true, order: modules.findIndex(m => m[0] === id) + 10 },
    workspaces: roles.split(','),
    permissions: ['view','create','update','delete','approve','export'].map(action => ({ key: `${id}.${action}`, action, roles: action === 'view' ? roles.split(',') : ['owner','admin'].concat(primary === 'worker' ? ['manager'] : []) })),
    emptyState: { title: `No ${name} records yet`, body: `Use ${name} to manage this part of your contractor CMMS workflow.`, action: `Open ${name}` },
    workflowCapabilities: ['request-estimate','quote-center','work-orders','schedule','worker-jobs','invoices','payments','maintenance-plans'].includes(id)
  }, null, 2));
}
