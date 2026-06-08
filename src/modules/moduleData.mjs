export const coreModules = [
  {id:'dashboard-overview',label:'Dashboard / Overview',group:'Main',icon:'📊',roles:['owner','admin','manager','worker','client'],permissions:['dashboard.view'],description:'Quick stats, recent activity, quick actions, and setup checklist.'},
  {id:'customers',label:'Customers / Clients',group:'Operations',icon:'👥',roles:['owner','admin','manager'],permissions:['customers.view','customers.manage'],description:'Create, view, and edit customers and properties.'},
  {id:'request-estimate',label:'Request Estimate',group:'Operations',icon:'📝',roles:['owner','admin','manager','client'],permissions:['requests.view','requests.manage'],description:'Manual request form with photo upload support.'},
  {id:'estimate-quote-center',label:'Estimate & Quote Center',group:'Operations',icon:'💬',roles:['owner','admin','manager','client'],permissions:['quotes.view','quotes.manage'],description:'Create, edit, and send quotes manually; AI optional.'},
  {id:'work-orders',label:'Work Orders',group:'Operations',icon:'🛠️',roles:['owner','admin','manager','worker'],permissions:['workorders.view','workorders.manage'],description:'Create, assign, schedule, and complete work orders.'},
  {id:'schedule-calendar',label:'Schedule / Calendar',group:'Operations',icon:'📅',roles:['owner','admin','manager','worker'],permissions:['schedule.view','schedule.manage'],description:'Calendar and list views for scheduled work.'},
  {id:'inventory',label:'Inventory',group:'Operations',icon:'📦',roles:['owner','admin','manager','worker'],permissions:['inventory.view','inventory.manage'],description:'Stock, materials, and inventory transactions.'},
  {id:'invoices',label:'Invoices',group:'Financial',icon:'🧾',roles:['owner','admin','client'],permissions:['invoices.view','invoices.manage'],description:'Create, view, download, and send invoices.'},
  {id:'finance',label:'Finance',group:'Financial',icon:'💵',roles:['owner','admin'],permissions:['finance.view','finance.manage'],description:'Revenue, invoices, payments, and manual tracking.'},
  {id:'payments',label:'Payments',group:'Financial',icon:'💳',roles:['owner','admin','client'],permissions:['finance.view'],description:'Manual payments and optional Square support.'},
  {id:'worker-jobs',label:'Worker Jobs',group:'People',icon:'🧰',roles:['owner','worker'],permissions:['workorders.view'],description:'Assigned jobs, job photos, materials, and completion submission.'},
  {id:'users-roles',label:'Users & Roles',group:'People',icon:'🔐',roles:['owner','admin'],permissions:['users.view','users.manage','roles.manage'],description:'Manage users, default roles, and permissions.'},
  {id:'ai-photo-estimate',label:'AI Photo Estimate',group:'AI Tools',icon:'🤖',roles:['owner','admin','manager'],permissions:['quotes.manage'],ai:true,description:'AI-assisted photo estimates when OpenAI is configured.'},
  {id:'ai-quote-builder',label:'AI Quote Builder',group:'AI Tools',icon:'✨',roles:['owner','admin','manager'],permissions:['quotes.manage'],ai:true,description:'AI quote drafting when OpenAI is configured.'},
  {id:'ai-troubleshooting',label:'AI Troubleshooting',group:'AI Tools',icon:'🧠',roles:['owner','admin','manager','worker'],permissions:['workorders.view'],ai:true,description:'AI troubleshooting when OpenAI is configured.'},
  {id:'file-manager',label:'File / Photo Manager',group:'System',icon:'🖼️',roles:['owner','admin','manager','worker','client'],permissions:['system.view'],description:'Unified uploaded asset manager backed by uploaded_files.'},
  {id:'homepage-editor',label:'Homepage Editor',group:'System',icon:'🏠',roles:['owner','admin'],permissions:['homepage.manage'],description:'Database-driven public homepage builder.'},
  {id:'theme-manager',label:'Theme Manager',group:'System',icon:'🎨',roles:['owner','admin'],permissions:['theme.manage'],description:'White-label theme and sidebar controls.'},
  {id:'module-manager',label:'Module Manager',group:'System',icon:'🧩',roles:['owner'],permissions:['modules.view','modules.manage'],description:'Drop-in module registry and settings.'},
  {id:'system-center',label:'System Center',group:'System',icon:'⚙️',roles:['owner'],permissions:['system.view','system.manage'],description:'System configuration center.'},
  {id:'platform-health',label:'Platform Health',group:'System',icon:'❤️',roles:['owner'],permissions:['system.view'],description:'Health checks and schema status.'},
  {id:'audit-logs',label:'Audit Logs',group:'System',icon:'📜',roles:['owner'],permissions:['audit.view'],description:'Platform audit trail.'},
  {id:'cache-manager',label:'Cache Manager',group:'System',icon:'⚡',roles:['owner'],permissions:['system.manage'],description:'Cache controls.'},
  {id:'backup-restore',label:'Backup / Restore',group:'System',icon:'💾',roles:['owner'],permissions:['system.manage'],description:'Backup and restore center.'},
  {id:'environment-integrations',label:'Environment & Integrations',group:'System',icon:'🔌',roles:['owner'],permissions:['system.manage'],description:'Environment detection and integration setup.'},
  {id:'licensing',label:'Licensing',group:'System',icon:'🏷️',roles:['owner'],permissions:['system.manage'],description:'Future license activation center.'}
];
export const sidebarGroups = ['Main','Operations','Financial','People','AI Tools','System'];
export const defaultRoles = ['owner','admin','manager','worker','client'];
export const permissions = ['dashboard.view','customers.view','customers.manage','requests.view','requests.manage','quotes.view','quotes.manage','workorders.view','workorders.manage','workorders.assign','schedule.view','schedule.manage','inventory.view','inventory.manage','invoices.view','invoices.manage','finance.view','finance.manage','users.view','users.manage','roles.manage','modules.view','modules.manage','theme.manage','homepage.manage','system.view','system.manage','audit.view','impersonation.use'];
