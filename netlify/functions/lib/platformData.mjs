// System roles that cannot be deleted
export const systemRoles = ['owner', 'admin', 'manager', 'dispatcher', 'worker', 'client', 'guest'];

// All default roles (includes system roles)
export const defaultRoles = ['owner', 'admin', 'manager', 'dispatcher', 'worker', 'client', 'guest'];

// Complete permission list organized by module
export const permissions = [
  // Dashboard
  'dashboard.view',
  
  // Customers
  'customers.view',
  'customers.create',
  'customers.edit',
  'customers.delete',
  
  // Requests
  'requests.view',
  'requests.create',
  'requests.edit',
  'requests.delete',
  
  // Quotes
  'quotes.view',
  'quotes.create',
  'quotes.edit',
  'quotes.delete',
  'quotes.approve',
  
  // Work Orders
  'workorders.view',
  'workorders.create',
  'workorders.edit',
  'workorders.delete',
  'workorders.assign',
  'workorders.complete',
  
  // Schedule
  'schedule.view',
  'schedule.create',
  'schedule.edit',
  'schedule.delete',
  
  // Inventory
  'inventory.view',
  'inventory.create',
  'inventory.edit',
  'inventory.delete',
  
  // Invoices
  'invoices.view',
  'invoices.create',
  'invoices.edit',
  'invoices.delete',
  
  // Payments
  'payments.view',
  'payments.create',
  'payments.edit',
  'payments.delete',
  
  // Finance
  'finance.view',
  'finance.manage',
  
  // Users
  'users.view',
  'users.create',
  'users.edit',
  'users.delete',
  'users.deactivate',
  'users.reactivate',
  
  // Roles
  'roles.view',
  'roles.create',
  'roles.edit',
  'roles.delete',
  'roles.assign',
  
  // Permissions
  'permissions.view',
  'permissions.manage',
  
  // Modules
  'modules.view',
  'modules.enable',
  'modules.disable',
  'modules.configure',
  
  // Theme
  'theme.view',
  'theme.edit',
  
  // Homepage
  'homepage.view',
  'homepage.edit',
  
  // System
  'system.view',
  'system.manage',
  
  // Audit
  'audit.view',
  
  // Files
  'files.view',
  'files.upload',
  'files.delete',
  
  // Licensing
  'licensing.view',
  'licensing.manage',
  
  // Impersonation (Owner only)
  'impersonation.use'
];

// Role permission mappings
export const rolePermissions = {
  owner: permissions, // Owner has ALL permissions
  
  admin: [
    'dashboard.view',
    'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
    'requests.view', 'requests.create', 'requests.edit', 'requests.delete',
    'quotes.view', 'quotes.create', 'quotes.edit', 'quotes.delete', 'quotes.approve',
    'workorders.view', 'workorders.create', 'workorders.edit', 'workorders.delete', 'workorders.assign', 'workorders.complete',
    'schedule.view', 'schedule.create', 'schedule.edit', 'schedule.delete',
    'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete',
    'payments.view', 'payments.create', 'payments.edit',
    'finance.view',
    'users.view', 'users.create', 'users.edit', 'users.deactivate', 'users.reactivate',
    'roles.view', 'roles.assign',
    'permissions.view',
    'modules.view', 'modules.configure',
    'theme.view', 'theme.edit',
    'homepage.view', 'homepage.edit',
    'system.view',
    'audit.view',
    'files.view', 'files.upload', 'files.delete'
  ],
  
  manager: [
    'dashboard.view',
    'customers.view', 'customers.create', 'customers.edit',
    'requests.view', 'requests.create', 'requests.edit',
    'quotes.view', 'quotes.create', 'quotes.edit', 'quotes.approve',
    'workorders.view', 'workorders.create', 'workorders.edit', 'workorders.assign',
    'schedule.view', 'schedule.create', 'schedule.edit',
    'inventory.view',
    'invoices.view', 'invoices.create', 'invoices.edit',
    'payments.view',
    'finance.view',
    'users.view',
    'files.view', 'files.upload'
  ],
  
  dispatcher: [
    'dashboard.view',
    'customers.view',
    'requests.view',
    'quotes.view',
    'workorders.view', 'workorders.assign',
    'schedule.view', 'schedule.create', 'schedule.edit',
    'users.view',
    'files.view'
  ],
  
  worker: [
    'dashboard.view',
    'workorders.view', 'workorders.complete',
    'schedule.view',
    'inventory.view',
    'files.view', 'files.upload'
  ],
  
  client: [
    'dashboard.view',
    'requests.view', 'requests.create',
    'quotes.view', 'quotes.approve',
    'invoices.view',
    'payments.view', 'payments.create',
    'finance.view'
  ],
  
  guest: [] // No permissions - public website only
};

// Role descriptions
export const roleDescriptions = {
  owner: 'Full system access. Can manage licenses, modules, permissions, and impersonate other roles.',
  admin: 'Nearly full access. Cannot delete owner or change license settings.',
  manager: 'Manage customers, requests, quotes, work orders, and view reporting.',
  dispatcher: 'Manage schedules, assign work orders, and track workers.',
  worker: 'View assigned work, upload photos, complete work orders, and update statuses.',
  client: 'View requests, quotes, invoices, make payments, and submit new requests.',
  guest: 'Public website access only. No dashboard access.'
};
export const coreModules = [
  ['dashboard-overview','Dashboard / Overview','Main'],['customers','Customers / Clients','Operations'],['request-estimate','Request Estimate','Operations'],['estimate-quote-center','Estimate & Quote Center','Operations'],['work-orders','Work Orders','Operations'],['schedule-calendar','Schedule / Calendar','Operations'],['inventory','Inventory','Operations'],['invoices','Invoices','Financial'],['finance','Finance','Financial'],['payments','Payments','Financial'],['worker-jobs','Worker Jobs','People'],['users-roles','Users & Roles','People'],['ai-photo-estimate','AI Photo Estimate','AI Tools'],['ai-quote-builder','AI Quote Builder','AI Tools'],['ai-troubleshooting','AI Troubleshooting','AI Tools'],['file-manager','File / Photo Manager','System'],['homepage-editor','Homepage Editor','System'],['theme-manager','Theme Manager','System'],['module-manager','Module Manager','System'],['system-center','System Center','System'],['platform-health','Platform Health','System'],['audit-logs','Audit Logs','System'],['cache-manager','Cache Manager','System'],['backup-restore','Backup / Restore','System'],['environment-integrations','Environment & Integrations','System'],['licensing','Licensing','System']
];
export const defaultServices = ['General Contracting','Plumbing','Electrical','HVAC','Roofing','Painting','Flooring','Landscaping','Emergency Repair'];
