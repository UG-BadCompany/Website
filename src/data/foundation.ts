import type { DashboardWidget, PageSection, Permission, Role, WorkRequest, Quote, Job, Invoice, MessageThread } from '../types/domain';

export const foundationComponents = [
  'System Foundation','Authentication Foundation','Website Foundation','CRM Foundation','Operations Foundation','Estimating Foundation','Financial Foundation','Payment Gateway Framework','CMMS Foundation','Communications Foundation','Service Catalog Foundation','Media Foundation'
];

export const permissions: Permission[] = [
  'dashboard.view','settings.view','settings.manage','users.view','users.manage','roles.manage','permissions.manage','clients.view','clients.manage','properties.view','properties.manage','requests.view','requests.manage','quotes.view','quotes.create','quotes.approve','quotes.manage','jobs.view','jobs.manage','work_orders.view','work_orders.manage','invoices.view','invoices.manage','payments.view','payments.manage','cmms.view','cmms.manage','messages.view','messages.manage','media.view','media.manage','homepage.manage','theme.manage','license.view','license.manage','expansion_packs.view','expansion_packs.manage'
].map((key) => ({ key, label: key.split('.').map((p) => p.replaceAll('_', ' ')).join(' · '), group: key.split('.')[0] }));

const all = permissions.map((p) => p.key);
export const defaultRoles: Role[] = [
  { name: 'Owner', permissions: all },
  { name: 'Admin', permissions: all.filter((p) => !['license.manage', 'permissions.manage'].includes(p)) },
  { name: 'Office', permissions: all.filter((p) => !p.startsWith('settings') && !p.startsWith('license') && !p.includes('manage') || ['clients.manage','requests.manage','quotes.manage','invoices.manage','messages.manage'].includes(p)) },
  { name: 'Dispatcher', permissions: ['dashboard.view','requests.view','jobs.view','jobs.manage','work_orders.view','work_orders.manage','messages.view','messages.manage'] },
  { name: 'Technician', permissions: ['jobs.view','work_orders.view','work_orders.manage','messages.view','media.manage','cmms.view'] },
  { name: 'Client', permissions: ['requests.view','quotes.view','quotes.approve','invoices.view','payments.manage','messages.view','messages.manage','media.manage'] },
  { name: 'Vendor', permissions: ['work_orders.view','messages.view'] }
];

export const serviceCategories = ['HVAC','Plumbing','Electrical','Handyman','Appliance','Maintenance','General Repair'];

export const defaultSections: PageSection[] = [
  { id: 'hero', type: 'hero', title: 'Run your contracting business from one clean platform', body: 'ContractorOS combines your public website, client portal, estimating, work orders, invoices, payments, messaging, media, and CMMS foundation.', cta: 'Request an estimate' },
  { id: 'services', type: 'services', title: 'Services built for real field work', body: 'Manage HVAC, plumbing, electrical, handyman, appliance, maintenance, and general repair categories without duplicate catalog clutter.', cta: 'View services' },
  { id: 'workflow', type: 'cta', title: 'Request → quote → job → invoice → payment', body: 'A complete owner, office, technician, and client workflow is included in the Foundation.', cta: 'Open dashboard' }
];

export const defaultWidgets: DashboardWidget[] = [
  { id: 'open-requests', title: 'Open requests', type: 'metric', x: 0, y: 0, w: 1, h: 1 },
  { id: 'pending-quotes', title: 'Pending quotes', type: 'metric', x: 1, y: 0, w: 1, h: 1 },
  { id: 'active-jobs', title: 'Active jobs', type: 'metric', x: 0, y: 1, w: 1, h: 1 },
  { id: 'unpaid-invoices', title: 'Unpaid invoices', type: 'metric', x: 1, y: 1, w: 1, h: 1 },
  { id: 'recent-activity', title: 'Recent activity', type: 'activity', x: 0, y: 2, w: 2, h: 1 }
];

export const sampleRequests: WorkRequest[] = [
  { id: 'REQ-1001', client: 'New website lead', service: 'General Repair', status: 'New', priority: 'Normal', createdAt: 'Today' }
];
export const sampleQuotes: Quote[] = [{ id: 'Q-2044', client: 'Portal client', requestId: 'REQ-1001', status: 'Draft', total: 850 }];
export const sampleJobs: Job[] = [{ id: 'JOB-3110', client: 'Portal client', quoteId: 'Q-2044', status: 'Ready to schedule', technician: 'Unassigned' }];
export const sampleInvoices: Invoice[] = [{ id: 'INV-4020', client: 'Portal client', jobId: 'JOB-3110', status: 'Open', balance: 850 }];
export const sampleThreads: MessageThread[] = [{ id: 'MSG-1', subject: 'Estimate follow-up', participants: ['Client','Office','Technician'], visibility: 'client', updatedAt: 'Today' }];
