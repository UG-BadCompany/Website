export const permissions = ['dashboard.view','customers.view','customers.manage','requests.view','requests.manage','quotes.view','quotes.manage','workorders.view','workorders.manage','workorders.assign','schedule.view','schedule.manage','inventory.view','inventory.manage','invoices.view','invoices.manage','finance.view','finance.manage','users.view','users.manage','roles.manage','modules.view','modules.manage','theme.manage','homepage.manage','system.view','system.manage','audit.view','impersonation.use','files.view','files.manage','payments.manage','reports.view','portal.client','portal.worker'];
export const roles = {
  owner: permissions,
  admin: ['dashboard.view','customers.view','customers.manage','requests.view','requests.manage','quotes.view','quotes.manage','workorders.view','workorders.manage','workorders.assign','schedule.view','schedule.manage','inventory.view','inventory.manage','invoices.view','invoices.manage','finance.view','users.view','modules.view','system.view','audit.view'],
  manager: ['dashboard.view','customers.view','customers.manage','requests.view','requests.manage','quotes.view','quotes.manage','workorders.view','workorders.manage','workorders.assign','schedule.view','schedule.manage','inventory.view','inventory.manage','users.view'],
  worker: ['dashboard.view','workorders.view','schedule.view','inventory.view','files.manage','portal.worker'],
  client: ['requests.view','requests.manage','quotes.view','invoices.view','files.view','portal.client']
};
export const modules = [
  ['dashboard-overview','Dashboard / Overview','Main','📊','/dashboard/','dashboard.view'],
  ['customers','Customers / Clients','Operations','👥','/dashboard/customers','customers.view'],
  ['request-estimate','Request Estimate','Operations','📝','/dashboard/requests','requests.view'],
  ['estimate-quote-center','Estimate & Quote Center','Operations','💬','/dashboard/quotes','quotes.view'],
  ['work-orders','Work Orders','Operations','🧰','/dashboard/work-orders','workorders.view'],
  ['schedule-calendar','Schedule / Calendar','Operations','📅','/dashboard/schedule','schedule.view'],
  ['inventory','Inventory','Operations','📦','/dashboard/inventory','inventory.view'],
  ['invoices','Invoices','Financial','🧾','/dashboard/invoices','invoices.view'],
  ['finance','Finance','Financial','💵','/dashboard/finance','finance.view'],
  ['payments','Payments','Financial','💳','/dashboard/payments','payments.manage'],
  ['users-roles','Users & Roles','People','🔐','/dashboard/users','users.view'],
  ['workspace-permissions','Workspace & Permissions','People','🏢','/dashboard/workspaces','roles.manage'],
  ['ai-photo-estimate','AI Photo Estimate','AI Tools','🤖','/dashboard/ai-photo','requests.manage'],
  ['ai-quote-builder','AI Quote Builder','AI Tools','✨','/dashboard/ai-quote','quotes.manage'],
  ['ai-troubleshooting','AI Troubleshooting','AI Tools','🛠️','/dashboard/ai-troubleshooting','workorders.view'],
  ['homepage-editor','Homepage Editor','System','🏠','/dashboard/homepage-editor','homepage.manage'],
  ['theme-manager','Theme Manager','System','🎨','/dashboard/theme','theme.manage'],
  ['module-manager','Module Manager','System','🧩','/dashboard/modules','modules.view'],
  ['system-center','System Center','System','⚙️','/dashboard/system','system.view'],
  ['platform-health','Platform Health','System','🩺','/dashboard/health','system.view'],
  ['audit-logs','Audit Logs','System','📜','/dashboard/audit','audit.view'],
  ['cache-manager','Cache Manager','System','⚡','/dashboard/cache','system.manage'],
  ['backup-restore','Backup / Restore','System','💾','/dashboard/backup','system.manage'],
  ['environment-integrations','Environment & Integrations','System','🔌','/dashboard/integrations','system.manage'],
  ['licensing','Licensing','System','📄','/dashboard/licensing','system.manage'],
  ['reports','Reports','System','📈','/dashboard/reports','reports.view'],
  ['file-photo-manager','File / Photo Manager','Operations','🖼️','/dashboard/files','files.view'],
  ['maintenance-plans','Maintenance Plans','Operations','🔁','/dashboard/maintenance','workorders.manage'],
  ['client-portal','Client Portal','Main','🙋','/portal/client','portal.client'],
  ['worker-portal','Worker Portal','Main','👷','/portal/worker','portal.worker']
].map(([id,label,group,icon,route,permission])=>({id,label,group,icon,route,permission,enabled:true,version:'1.0.0'}));
export const services=['Roofing','HVAC','Plumbing','Electrical','Remodeling','Painting','Landscaping','General Maintenance'];
