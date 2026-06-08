export const permissions = [
  'dashboard.view', 'customers.view', 'customers.manage', 'requests.view', 'requests.manage',
  'quotes.view', 'quotes.manage', 'workorders.view', 'workorders.manage', 'workorders.assign',
  'schedule.view', 'schedule.manage', 'inventory.view', 'inventory.manage', 'invoices.view',
  'invoices.manage', 'finance.view', 'finance.manage', 'payments.view', 'payments.manage',
  'users.view', 'users.manage', 'roles.manage', 'modules.view', 'modules.manage',
  'theme.manage', 'homepage.manage', 'system.view', 'system.manage', 'audit.view',
  'impersonation.use', 'files.view', 'files.manage', 'reports.view', 'portal.client',
  'portal.worker', 'backup.manage', 'cache.manage', 'licensing.manage', 'health.view',
];

export const rolePermissions = {
  owner: permissions,
  admin: [
    'dashboard.view', 'customers.view', 'customers.manage', 'requests.view', 'requests.manage',
    'quotes.view', 'quotes.manage', 'workorders.view', 'workorders.manage', 'workorders.assign',
    'schedule.view', 'schedule.manage', 'inventory.view', 'inventory.manage', 'invoices.view',
    'invoices.manage', 'finance.view', 'finance.manage', 'payments.view', 'users.view',
    'modules.view', 'system.view', 'audit.view', 'health.view', 'files.view', 'files.manage',
  ],
  manager: [
    'dashboard.view', 'customers.view', 'customers.manage', 'requests.view', 'requests.manage',
    'quotes.view', 'quotes.manage', 'workorders.view', 'workorders.manage', 'workorders.assign',
    'schedule.view', 'schedule.manage', 'inventory.view', 'inventory.manage', 'files.view', 'files.manage',
  ],
  worker: [
    'dashboard.view', 'workorders.view', 'schedule.view', 'inventory.view', 'files.view',
    'files.manage', 'portal.worker',
  ],
  client: [
    'requests.view', 'requests.manage', 'quotes.view', 'invoices.view', 'payments.view',
    'files.view', 'portal.client',
  ],
};

export const roleDefinitions = Object.keys(rolePermissions).map((key) => ({
  key,
  label: key[0].toUpperCase() + key.slice(1),
  description: `${key} workspace role`,
}));

export const sidebarGroups = ['Main', 'Operations', 'Financial', 'People', 'AI Tools', 'System'];

export const modules = [
  { id: 'dashboard-overview', label: 'Dashboard / Overview', group: 'Main', icon: '📊', route: '/dashboard/', permission: 'dashboard.view', api: '/api/dashboard/summary' },
  { id: 'customers', label: 'Customers / Clients', group: 'Operations', icon: '👥', route: '/dashboard/customers', permission: 'customers.view', api: '/api/customers' },
  { id: 'request-estimate', label: 'Request Estimate', group: 'Operations', icon: '📝', route: '/dashboard/requests', permission: 'requests.view', api: '/api/requests' },
  { id: 'estimate-quote-center', label: 'Estimate & Quote Center', group: 'Operations', icon: '💬', route: '/dashboard/quotes', permission: 'quotes.view', api: '/api/quotes' },
  { id: 'work-orders', label: 'Work Orders', group: 'Operations', icon: '🧰', route: '/dashboard/work-orders', permission: 'workorders.view', api: '/api/work-orders' },
  { id: 'schedule-calendar', label: 'Schedule / Calendar', group: 'Operations', icon: '📅', route: '/dashboard/schedule', permission: 'schedule.view', api: '/api/schedule' },
  { id: 'inventory', label: 'Inventory', group: 'Operations', icon: '📦', route: '/dashboard/inventory', permission: 'inventory.view', api: '/api/inventory' },
  { id: 'file-photo-manager', label: 'File / Photo Manager', group: 'Operations', icon: '🖼️', route: '/dashboard/files', permission: 'files.view', api: '/api/files' },
  { id: 'maintenance-plans', label: 'Maintenance Plans', group: 'Operations', icon: '🔁', route: '/dashboard/maintenance', permission: 'workorders.manage', api: '/api/maintenance' },
  { id: 'invoices', label: 'Invoices', group: 'Financial', icon: '🧾', route: '/dashboard/invoices', permission: 'invoices.view', api: '/api/invoices' },
  { id: 'finance', label: 'Finance', group: 'Financial', icon: '💵', route: '/dashboard/finance', permission: 'finance.view', api: '/api/finance' },
  { id: 'payments', label: 'Payments', group: 'Financial', icon: '💳', route: '/dashboard/payments', permission: 'payments.view', api: '/api/payments' },
  { id: 'users-roles', label: 'Users & Roles', group: 'People', icon: '🔐', route: '/dashboard/users', permission: 'users.view', api: '/api/users' },
  { id: 'workspace-permissions', label: 'Workspace & Permissions', group: 'People', icon: '🏢', route: '/dashboard/workspaces', permission: 'roles.manage', api: '/api/workspaces' },
  { id: 'ai-photo-estimate', label: 'AI Photo Estimate', group: 'AI Tools', icon: '🤖', route: '/dashboard/ai-photo', permission: 'requests.manage', api: '/api/ai/photo-estimate' },
  { id: 'ai-quote-builder', label: 'AI Quote Builder', group: 'AI Tools', icon: '✨', route: '/dashboard/ai-quote', permission: 'quotes.manage', api: '/api/ai/quote-builder' },
  { id: 'ai-troubleshooting', label: 'AI Troubleshooting', group: 'AI Tools', icon: '🛠️', route: '/dashboard/ai-troubleshooting', permission: 'workorders.view', api: '/api/ai/troubleshooting' },
  { id: 'homepage-editor', label: 'Homepage Editor', group: 'System', icon: '🏠', route: '/dashboard/homepage-editor', permission: 'homepage.manage', api: '/api/homepage' },
  { id: 'theme-manager', label: 'Theme Manager', group: 'System', icon: '🎨', route: '/dashboard/theme', permission: 'theme.manage', api: '/api/theme' },
  { id: 'module-manager', label: 'Module Manager', group: 'System', icon: '🧩', route: '/dashboard/modules', permission: 'modules.view', api: '/api/modules' },
  { id: 'system-center', label: 'System Center', group: 'System', icon: '⚙️', route: '/dashboard/system', permission: 'system.view', api: '/api/system' },
  { id: 'platform-health', label: 'Platform Health', group: 'System', icon: '🩺', route: '/dashboard/health', permission: 'health.view', api: '/api/health' },
  { id: 'audit-logs', label: 'Audit Logs', group: 'System', icon: '📜', route: '/dashboard/audit', permission: 'audit.view', api: '/api/audit' },
  { id: 'cache-manager', label: 'Cache Manager', group: 'System', icon: '⚡', route: '/dashboard/cache', permission: 'cache.manage', api: '/api/cache' },
  { id: 'backup-restore', label: 'Backup / Restore', group: 'System', icon: '💾', route: '/dashboard/backup', permission: 'backup.manage', api: '/api/backup' },
  { id: 'environment-integrations', label: 'Environment & Integrations', group: 'System', icon: '🔌', route: '/dashboard/integrations', permission: 'system.manage', api: '/api/system/integration-status' },
  { id: 'licensing', label: 'Licensing', group: 'System', icon: '📄', route: '/dashboard/licensing', permission: 'licensing.manage', api: '/api/licensing' },
  { id: 'reports', label: 'Reports', group: 'System', icon: '📈', route: '/dashboard/reports', permission: 'reports.view', api: '/api/reports' },
  { id: 'client-portal', label: 'Client Portal', group: 'Main', icon: '🙋', route: '/portal/client', permission: 'portal.client', api: '/api/portal/client' },
  { id: 'worker-portal', label: 'Worker Portal', group: 'Main', icon: '👷', route: '/portal/worker', permission: 'portal.worker', api: '/api/portal/worker' },
].map((module) => ({
  ...module,
  version: '1.0.0',
  enabled: true,
  lifecycle: ['install', 'enable', 'disable', 'upgrade'],
  capabilities: ['ui', 'api', 'database', 'permissions', 'audit', 'mobile', 'desktop', 'role-filtering'],
}));

export const serviceCategories = [
  'Roofing', 'HVAC', 'Plumbing', 'Electrical', 'Remodeling', 'Painting',
  'Landscaping', 'General Maintenance', 'Emergency Repair', 'Preventive Maintenance',
];
