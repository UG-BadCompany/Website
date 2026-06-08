export const defaultRoles = ['owner', 'admin', 'manager', 'worker', 'client'];

export const defaultPermissions = [
  'dashboard.view', 'customers.view', 'customers.manage', 'requests.view', 'requests.manage',
  'quotes.view', 'quotes.manage', 'workorders.view', 'workorders.manage', 'workorders.assign',
  'schedule.view', 'schedule.manage', 'inventory.view', 'inventory.manage', 'invoices.view',
  'invoices.manage', 'finance.view', 'finance.manage', 'users.view', 'users.manage',
  'roles.manage', 'modules.view', 'modules.manage', 'theme.manage', 'homepage.manage',
  'system.view', 'system.manage', 'audit.view', 'impersonation.use'
];

export const coreModules = [
  { id: 'dashboard-overview', label: 'Dashboard / Overview', group: 'Main', route: '/dashboard/', permissions: ['dashboard.view'], manualFirst: true },
  { id: 'customers', label: 'Customers / Clients', group: 'Operations', route: '/dashboard/?module=customers', permissions: ['customers.view', 'customers.manage'], manualFirst: true },
  { id: 'request-estimate', label: 'Request Estimate', group: 'Operations', route: '/request-estimate/', permissions: ['requests.view', 'requests.manage'], manualFirst: true },
  { id: 'estimate-quote-center', label: 'Estimate & Quote Center', group: 'Operations', route: '/dashboard/?module=estimate-quote-center', permissions: ['quotes.view', 'quotes.manage'], manualFirst: true },
  { id: 'work-orders', label: 'Work Orders', group: 'Operations', route: '/dashboard/?module=work-orders', permissions: ['workorders.view', 'workorders.manage', 'workorders.assign'], manualFirst: true },
  { id: 'schedule-calendar', label: 'Schedule / Calendar', group: 'Operations', route: '/dashboard/?module=schedule-calendar', permissions: ['schedule.view', 'schedule.manage'], manualFirst: true },
  { id: 'inventory', label: 'Inventory', group: 'Operations', route: '/dashboard/?module=inventory', permissions: ['inventory.view', 'inventory.manage'], manualFirst: true },
  { id: 'invoices', label: 'Invoices', group: 'Financial', route: '/invoice/', permissions: ['invoices.view', 'invoices.manage'], manualFirst: true },
  { id: 'finance', label: 'Finance', group: 'Financial', route: '/dashboard/?module=finance', permissions: ['finance.view', 'finance.manage'], manualFirst: true },
  { id: 'payments', label: 'Payments', group: 'Financial', route: '/dashboard/?module=payments', permissions: ['finance.view'], manualFirst: true },
  { id: 'users-roles', label: 'Users & Roles', group: 'People', route: '/dashboard/?module=users-roles', permissions: ['users.view', 'roles.manage'] },
  { id: 'workspace-permissions', label: 'Workspace & Permissions', group: 'People', route: '/dashboard/?module=workspace-permissions', permissions: ['roles.manage'] },
  { id: 'ai-photo-estimate', label: 'AI Photo Estimate', group: 'AI Tools', route: '/dashboard/?module=ai-photo-estimate', permissions: ['quotes.view'], requires: ['OPENAI_API_KEY'] },
  { id: 'ai-quote-builder', label: 'AI Quote Builder', group: 'AI Tools', route: '/dashboard/?module=ai-quote-builder', permissions: ['quotes.manage'], requires: ['OPENAI_API_KEY'] },
  { id: 'ai-troubleshooting', label: 'AI Troubleshooting', group: 'AI Tools', route: '/dashboard/?module=ai-troubleshooting', permissions: ['workorders.view'], requires: ['OPENAI_API_KEY'] },
  { id: 'homepage-editor', label: 'Homepage Editor', group: 'System', route: '/dashboard/?module=homepage-editor', permissions: ['homepage.manage'] },
  { id: 'theme-manager', label: 'Theme Manager', group: 'System', route: '/dashboard/?module=theme-manager', permissions: ['theme.manage'] },
  { id: 'module-manager', label: 'Module Manager', group: 'System', route: '/dashboard/?module=module-manager', permissions: ['modules.view', 'modules.manage'] },
  { id: 'system-center', label: 'System Center', group: 'System', route: '/dashboard/?module=system-center', permissions: ['system.view'] },
  { id: 'platform-health', label: 'Platform Health', group: 'System', route: '/dashboard/?module=platform-health', permissions: ['system.view'] },
  { id: 'audit-logs', label: 'Audit Logs', group: 'System', route: '/dashboard/?module=audit-logs', permissions: ['audit.view'] },
  { id: 'cache-manager', label: 'Cache Manager', group: 'System', route: '/dashboard/?module=cache-manager', permissions: ['system.manage'] },
  { id: 'backup-restore', label: 'Backup / Restore', group: 'System', route: '/dashboard/?module=backup-restore', permissions: ['system.manage'] },
  { id: 'environment-integrations', label: 'Environment & Integrations', group: 'System', route: '/dashboard/?module=environment-integrations', permissions: ['system.view'] },
  { id: 'licensing', label: 'Licensing', group: 'System', route: '/dashboard/?module=licensing', permissions: ['system.view'] }
];

export const rolePermissions = {
  owner: defaultPermissions,
  admin: defaultPermissions.filter((p) => !['impersonation.use'].includes(p)),
  manager: ['dashboard.view','customers.view','customers.manage','requests.view','requests.manage','quotes.view','quotes.manage','workorders.view','workorders.manage','workorders.assign','schedule.view','schedule.manage','inventory.view','inventory.manage'],
  worker: ['dashboard.view','workorders.view','schedule.view','inventory.view'],
  client: ['dashboard.view','requests.view','quotes.view','invoices.view']
};
