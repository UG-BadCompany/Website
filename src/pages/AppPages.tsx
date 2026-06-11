import { Component, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { AppLayout, Protected } from '../components/Layout';
import { Link } from '../components/Router';
import { defaultWidgets } from '../data/foundation';
import { applyTheme, themePresets, type ThemeSettings } from '../lib/theme';
import { notifyBrandingUpdated, useBranding } from '../lib/branding';
import { useAuth } from '../lib/auth';
import { ActionCard, Badge, Button, EmptyState, LoadingState, PageHeader, StatusBadge } from '../components/ui';
import type { DashboardWidget, PageSection } from '../types/domain';

type ApiState<T> = { loading: boolean; error: string; data: T | null };
type DashboardMetricMap = {
  newRequests: number; pendingQuotes: number; approvedQuotes: number; activeJobs: number; completedJobs: number; openInvoices: number;
  outstandingBalance: number; messagesNeedingReply: number; todayScheduledJobs: number; overdueInvoices: number; unassignedRequests: number; waitingOnCustomer: number;
};
type DashboardOverview = {
  ok: boolean;
  range: string;
  metrics: DashboardMetricMap;
  snapshot: Record<string, Record<string, unknown> | null>;
  activity: Array<{ type: string; summary: string; createdAt: string }>;
  kpis?: Record<string, number>;
  operationsBoard?: Array<{ key: string; label: string; count: number; href: string }>;
  financialSnapshot?: { openInvoices: number; overdueInvoices: number; collectedThisMonth: number; outstandingBalance: number; depositsCollected: number; paymentProviderHealth: string };
  fieldSnapshot?: { jobsScheduledToday: number; assignedTechnicians: number; unassignedJobs: number; blockedJobs: number; urgentRequests: number };
  alerts?: Array<{ tone: string; message: string }>;
};

const asArray = <T,>(value: T[] | null | undefined): T[] => Array.isArray(value) ? value : [];
const money = (cents = 0) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store', headers: { accept: 'application/json', ...(init?.body ? { 'content-type': 'application/json' } : {}), ...(init?.headers || {}) }, ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload as T;
}

function useApi<T>(url: string) {
  const [state, setState] = useState<ApiState<T>>({ loading: true, error: '', data: null });
  const load = async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try { setState({ loading: false, error: '', data: await apiJson<T>(url) }); }
    catch (caught) { setState({ loading: false, error: caught instanceof Error ? caught.message : 'Unable to load data.', data: null }); }
  };
  useEffect(() => { load(); }, [url]);
  return { ...state, reload: load };
}

export function DashboardPage() {
  const auth = useAuth();
  const [range, setRange] = useState('today');
  const overview = useApi<DashboardOverview>(`/api/dashboard/overview?range=${range}`);
  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets);
  const [stagedWidgets, setStagedWidgets] = useState<DashboardWidget[]>(defaultWidgets);
  const [isEditingDashboard, setIsEditingDashboard] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    apiJson<{ layout: DashboardWidget[] | null }>('/api/dashboard/layout')
      .then((data) => { const layout = data.layout?.length ? data.layout : defaultWidgets; setWidgets(layout); setStagedWidgets(layout); })
      .catch(() => undefined);
  }, []);

  const visibleWidgets = asArray(isEditingDashboard ? stagedWidgets : widgets).filter((widget) => !widgetPermission(widget.type) || auth.can(widgetPermission(widget.type)));
  const data = overview.data;
  const metrics = data?.metrics;
  const kpis = data?.kpis || {};
  const businessKpis = [
    { label: 'New requests', value: metrics?.newRequests ?? 0, detail: 'New intake in selected range', tone: 'accent' },
    { label: 'Requests needing review', value: kpis.requestsNeedingReview ?? 0, detail: `${metrics?.unassignedRequests ?? 0} unassigned`, tone: (metrics?.unassignedRequests ?? 0) > 0 ? 'warning' : 'accent' },
    { label: 'Pending quote value', value: money(kpis.pendingQuoteValue ?? 0), detail: `${metrics?.pendingQuotes ?? 0} quotes pending`, tone: 'warning' },
    { label: 'Approved quote value', value: money(kpis.approvedQuoteValue ?? 0), detail: `${metrics?.approvedQuotes ?? 0} approved`, tone: 'success' },
    { label: 'Quote close rate', value: `${kpis.quoteCloseRate ?? 0}%`, detail: 'Approved vs sent/viewed/declined', tone: 'accent' },
    { label: 'Active jobs', value: metrics?.activeJobs ?? 0, detail: `${metrics?.todayScheduledJobs ?? 0} scheduled today`, tone: 'accent' },
    { label: 'Jobs waiting on parts', value: kpis.jobsWaitingOnParts ?? 0, detail: 'Blocked material flow', tone: (kpis.jobsWaitingOnParts ?? 0) > 0 ? 'danger' : 'success' },
    { label: 'Open invoice balance', value: money(metrics?.outstandingBalance ?? 0), detail: `${metrics?.overdueInvoices ?? 0} overdue`, tone: (metrics?.overdueInvoices ?? 0) > 0 ? 'danger' : 'warning' },
    { label: 'Payments collected', value: money(kpis.paymentsCollected ?? 0), detail: 'Collected in selected range', tone: 'success' },
    { label: 'Unread messages', value: kpis.unreadMessages ?? 0, detail: `${metrics?.messagesNeedingReply ?? 0} customer replies needed`, tone: 'accent' },
  ];

  const saveLayout = async () => {
    setSaveStatus('Saving…');
    try { await apiJson('/api/dashboard/layout', { method: 'POST', body: JSON.stringify({ layout: stagedWidgets }) }); setWidgets(stagedWidgets); setIsEditingDashboard(false); setSaveStatus('Layout saved.'); }
    catch (caught) { setSaveStatus(caught instanceof Error ? caught.message : 'Unable to save layout.'); }
  };

  return <Protected permission="dashboard.view"><AppLayout title="Dashboard"><PageHeader eyebrow="Business Overview" title="Contractor command center" description="A role-aware, database-backed operating dashboard for intake, estimating, dispatch, receivables, payments, messages, assets, and service history." action={<div className="button-row"><select aria-label="Date range" value={range} onChange={(event) => setRange(event.target.value)}><option value="today">Today</option><option value="this_week">This Week</option><option value="this_month">This Month</option><option value="quarter">Quarter</option><option value="year">Year</option></select><Button variant="secondary" onClick={() => overview.reload()}>Refresh</Button>{isEditingDashboard ? <><Button onClick={saveLayout}>Save layout</Button><Button variant="secondary" onClick={() => { setStagedWidgets(asArray(widgets)); setIsEditingDashboard(false); }}>Cancel changes</Button><Button variant="secondary" onClick={() => setStagedWidgets([...stagedWidgets, { id: crypto.randomUUID(), title: 'New widget', type: 'metric', x: 0, y: stagedWidgets.length, w: 1, h: 1 }])}>Add widget</Button></> : <Button onClick={() => { setStagedWidgets(asArray(widgets)); setIsEditingDashboard(true); }}>Edit dashboard</Button>}</div>}/>{overview.error && <div className="card error-text">{overview.error}</div>}{saveStatus && <p className="muted">{saveStatus}</p>}{Boolean(data?.alerts?.length) && <section className="alert-stack">{asArray(data?.alerts).map((alert) => <div className={`card alert-${alert.tone}`} key={alert.message}>{alert.message}</div>)}</section>}<section className="overview-panel card"><div className="metric-grid">{businessKpis.map((metric) => <div className={`metric-card metric-${metric.tone}`} key={metric.label}><span className="metric-trend">↗ live DB</span><strong>{metric.value}</strong><span>{metric.label}</span><p className="muted">{metric.detail}</p></div>)}</div></section><section className="card"><div className="section-heading"><div><p className="eyebrow">Operations board</p><h2>Request → quote → job workflow</h2></div><Badge>{data?.range || range}</Badge></div><div className="kanban-summary">{asArray(data?.operationsBoard).map((column) => <Link className="kanban-column" href={column.href} key={column.key}><strong>{column.count}</strong><span>{column.label}</span></Link>)}</div></section><section className="dashboard-columns"><article className="card"><h2>Financial snapshot</h2><SnapshotFacts rows={[["Open invoices", data?.financialSnapshot?.openInvoices ?? 0], ["Overdue invoices", data?.financialSnapshot?.overdueInvoices ?? 0], ["Collected this month", money(data?.financialSnapshot?.collectedThisMonth ?? 0)], ["Outstanding balance", money(data?.financialSnapshot?.outstandingBalance ?? 0)], ["Deposits collected", money(data?.financialSnapshot?.depositsCollected ?? 0)], ["Payment provider", data?.financialSnapshot?.paymentProviderHealth || 'not_configured']]}/></article><article className="card"><h2>Field snapshot</h2><SnapshotFacts rows={[["Jobs scheduled today", data?.fieldSnapshot?.jobsScheduledToday ?? 0], ["Assigned technicians", data?.fieldSnapshot?.assignedTechnicians ?? 0], ["Unassigned jobs", data?.fieldSnapshot?.unassignedJobs ?? 0], ["Blocked jobs", data?.fieldSnapshot?.blockedJobs ?? 0], ["Urgent requests", data?.fieldSnapshot?.urgentRequests ?? 0]]}/></article></section><section className="dashboard-columns"><article className="card"><h2>Operational snapshot</h2><SnapshotRows snapshot={data?.snapshot}/></article><article className="card"><h2>Smart quick actions</h2><div className="quick-actions">{auth.can('clients.manage') && <Link className="button secondary" href="/clients/new">New client</Link>}{auth.can('requests.manage') && <Link className="button secondary" href="/requests/new">New request</Link>}{auth.can('quotes.manage') && <Link className="button secondary" href="/quotes/new">New quote</Link>}{auth.can('jobs.manage') && <Link className="button secondary" href="/jobs/new">New job</Link>}{auth.can('invoices.manage') && <Link className="button secondary" href="/invoices/new">New invoice</Link>}{auth.can('payments.manage') && <Link className="button secondary" href="/payments/new">Record payment</Link>}{auth.can('cmms.manage') && <Link className="button secondary" href="/assets/new">Add asset</Link>}{auth.can('messages.manage') && <Link className="button secondary" href="/messages/new">Send message</Link>}</div></article></section><article className="card activity-card"><h2>Activity feed</h2>{overview.loading ? <p className="muted">Loading real activity…</p> : data?.activity?.length ? asArray(data.activity).map((event) => <p key={`${event.type}-${event.createdAt}`}><Badge>{event.type}</Badge> {event.summary}</p>) : <EmptyState title="No real activity yet" description="Recent request, quote, invoice, job, payment, message, and asset service events will appear here once the database has activity."/>}</article><div className={`dashboard-grid ${isEditingDashboard ? 'editing' : ''}`}>{visibleWidgets.map((w) => <article className="card widget" key={w.id} style={{ gridColumn: `span ${w.w}` }}>{isEditingDashboard ? <input value={w.title} onChange={(e) => setStagedWidgets(asArray(stagedWidgets).map((x) => x.id === w.id ? { ...x, title: e.target.value } : x))}/> : <h3>{w.title}</h3>}<strong>{widgetValue(w.type, data)}</strong><p className="muted">{isEditingDashboard ? 'Editing staged layout. Save to persist this widget arrangement to your user profile in the database.' : 'Read-only widget. Enable Edit dashboard to move, resize, rename, or remove.'}</p>{isEditingDashboard && <div className="button-row"><button onClick={() => setStagedWidgets(asArray(stagedWidgets).map((x) => x.id === w.id ? { ...x, w: Math.min(3, x.w + 1) } : x))}>Resize</button><button onClick={() => setStagedWidgets(stagedWidgets.filter((x) => x.id !== w.id))}>Remove</button></div>}</article>)}</div></AppLayout></Protected>;
}

function widgetValue(type: string, data: DashboardOverview | null) {
  if (type === 'activity') return data?.activity?.length ?? 0;
  return data?.metrics?.activeJobs ?? data?.metrics?.newRequests ?? 0;
}
function SnapshotFacts({ rows }: { rows: Array<[string, string | number]> }) { return <div className="snapshot-facts">{rows.map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}</div>; }

function widgetPermission(type: string) {
  if (type === 'activity') return 'audit_logs.view';
  return 'dashboard.view';
}
function SnapshotRows({ snapshot }: { snapshot?: Record<string, Record<string, unknown> | null> }) {
  const entries = Object.entries(snapshot || {});
  if (!entries.length || entries.every(([, value]) => !value)) return <EmptyState title="No snapshot records yet" description="Next scheduled job, newest request, priority item, approved quote, and oldest open invoice appear here once created."/>;
  return <div className="snapshot-list">{entries.map(([key, value]) => <p key={key}><strong>{key.replace(/([A-Z])/g, ' $1')}:</strong> {value ? String(value.title || value.id || value.status || 'record') : 'None'}</p>)}</div>;
}

export function PortalPage() {
  const portal = useApi<{ scope: string; properties: Array<{ address: string }>; requests: Array<{ id: string; status: string }>; quotes: Array<{ id: string; status: string }>; invoices: Array<{ id: string; balance: number }> }>('/api/portal/overview');
  return <Protected permission="portal.view"><AppLayout title="Client portal"><PageHeader eyebrow="Customer experience" title="Client portal" description="Authenticated portal data is loaded from the database and scoped to the signed-in client unless support access is permitted."/><div className="grid cards"><WorkflowCard title="My properties" items={portal.data?.properties.map((p) => p.address) ?? []}/><WorkflowCard title="My requests" items={portal.data?.requests.map((r) => `${r.id} · ${r.status}`) ?? []}/><WorkflowCard title="My quotes" items={portal.data?.quotes.map((q) => `${q.id} · ${q.status}`) ?? []}/><WorkflowCard title="My invoices" items={portal.data?.invoices.map((i) => `${i.id} · ${money(i.balance)}`) ?? []}/><WorkflowCard title="My messages" items={[]}/></div>{portal.error && <p className="error-text">{portal.error}</p>}</AppLayout></Protected>;
}
function WorkflowCard({ title, items }: { title: string; items: string[] }) { return <ActionCard title={title} description={`${items.length} real item${items.length === 1 ? '' : 's'}`}>{items.length ? items.map((item) => <p key={item}>{item}</p>) : <p className="muted">No records yet.</p>}</ActionCard>; }

type ModuleColumn = { key: string; label: string; kind?: 'status' | 'money' | 'badge' };
type ModuleConfig = { title: string; eyebrow: string; description: string; endpoint: string; permission: string; managePermission: string; emptyTitle: string; emptyDescription: string; columns: ModuleColumn[]; pipeline?: string[]; createFields?: string[]; detailPanels?: string[]; actionLabel?: string };
const moduleConfigs: Record<string, ModuleConfig> = {
  clients: { title: 'Clients', eyebrow: 'CRM', description: 'Search clients, contacts, properties, requests, quotes, invoices, and messages from real database records.', endpoint: '/api/clients', permission: 'clients.view', managePermission: 'clients.manage', emptyTitle: 'No clients yet', emptyDescription: 'Create your first client or wait for public estimate requests to populate CRM records.', columns: [{key:'name',label:'Client'}, {key:'status',label:'Status',kind:'status'}, {key:'email',label:'Email'}, {key:'properties',label:'Properties',kind:'badge'}, {key:'requests',label:'Requests',kind:'badge'}], createFields: ['name','email','phone','status'] },
  properties: { title: 'Properties', eyebrow: 'CRM', description: 'Manage service locations, access notes, linked requests, jobs, and assets.', endpoint: '/api/properties', permission: 'properties.view', managePermission: 'properties.manage', emptyTitle: 'No properties yet', emptyDescription: 'Add a property and assign it to a client to start linking requests, jobs, and assets.', columns: [{key:'address',label:'Address'}, {key:'client',label:'Client'}, {key:'type',label:'Type'}, {key:'status',label:'Status',kind:'status'}, {key:'assets',label:'Assets',kind:'badge'}], createFields: ['address','clientId','type','accessNotes'] },
  requests: { title: 'Work Requests', eyebrow: 'CRM intake', description: 'Triage customer needs through the new → reviewing → quoted → approved → scheduled → completed → closed pipeline.', endpoint: '/api/requests', permission: 'requests.view', managePermission: 'requests.manage', emptyTitle: 'No work requests yet', emptyDescription: 'Public Request Estimate submissions and internal requests appear here without sample data.', columns: [{key:'title',label:'Request'}, {key:'client',label:'Client'}, {key:'service',label:'Service'}, {key:'status',label:'Status',kind:'status'}, {key:'priority',label:'Priority',kind:'badge'}], pipeline: ['new','reviewing','quoted','approved','scheduled','completed','closed'], createFields: ['title','clientId','propertyId','priority','description'] },
  quotes: { title: 'Quotes', eyebrow: 'Estimating', description: 'Create labor and material line items, send quotes, approve them, and convert approved quotes to jobs.', endpoint: '/api/quotes', permission: 'quotes.view', managePermission: 'quotes.manage', emptyTitle: 'No quotes yet', emptyDescription: 'Convert a request to a quote or create a quote with real client and line item data.', columns: [{key:'id',label:'Quote'}, {key:'client',label:'Client'}, {key:'status',label:'Status',kind:'status'}, {key:'subtotal',label:'Subtotal',kind:'money'}, {key:'tax',label:'Tax',kind:'money'}, {key:'total',label:'Total',kind:'money'}], pipeline: ['draft','sent','approved','declined','expired'], createFields: ['clientId','requestId','propertyId','status','total'] },
  jobs: { title: 'Jobs / Work Orders', eyebrow: 'Operations', description: 'Dispatch work, assign technicians, track work orders, notes, job photos, linked records, and completion.', endpoint: '/api/jobs', permission: 'jobs.view', managePermission: 'jobs.manage', emptyTitle: 'No jobs yet', emptyDescription: 'Approved quotes can be converted to jobs or work orders can be created manually.', columns: [{key:'title',label:'Job'}, {key:'client',label:'Client'}, {key:'property',label:'Property'}, {key:'status',label:'Status',kind:'status'}, {key:'technician',label:'Technician'}], pipeline: ['scheduled','in_progress','blocked','completed','canceled'], createFields: ['title','clientId','propertyId','quoteId','assignedUserId','scope'] },
  invoices: { title: 'Invoices', eyebrow: 'Financial', description: 'Manage invoice line items, deposits, partial payments, balances, sending, and manual paid status.', endpoint: '/api/invoices', permission: 'invoices.view', managePermission: 'invoices.manage', emptyTitle: 'No invoices yet', emptyDescription: 'Create invoices from jobs or quotes, then record payments against open balances.', columns: [{key:'id',label:'Invoice'}, {key:'client',label:'Client'}, {key:'status',label:'Status',kind:'status'}, {key:'total',label:'Total',kind:'money'}, {key:'paid',label:'Paid',kind:'money'}, {key:'balance',label:'Balance',kind:'money'}], pipeline: ['draft','sent','partially_paid','paid','overdue','void'], createFields: ['clientId','jobId','quoteId','status','total','deposit'] },
  payments: { title: 'Payments', eyebrow: 'Financial', description: 'Record manual cash/check/card payments, review Square provider readiness, payment history, and refund placeholders.', endpoint: '/api/payments', permission: 'payments.view', managePermission: 'payments.manage', emptyTitle: 'No payments yet', emptyDescription: 'Manual and provider payments appear here after invoices receive payment records.', columns: [{key:'client',label:'Client'}, {key:'invoice',label:'Invoice'}, {key:'method',label:'Method'}, {key:'status',label:'Status',kind:'status'}, {key:'amount',label:'Amount',kind:'money'}, {key:'receivedAt',label:'Received'}], createFields: ['invoiceId','clientId','amount','method','note'], actionLabel: 'Record manual payment' },
  messages: { title: 'Messages', eyebrow: 'Communications', description: 'Role-scoped client, office, and technician conversations with customer-visible replies and internal notes.', endpoint: '/api/messages/threads', permission: 'messages.view', managePermission: 'messages.manage', emptyTitle: 'No message threads yet', emptyDescription: 'Start a thread linked to a request, quote, job, invoice, or asset.', columns: [{key:'subject',label:'Thread'}, {key:'client',label:'Client'}, {key:'status',label:'Status',kind:'status'}, {key:'needsReply',label:'Needs reply',kind:'badge'}, {key:'linkedType',label:'Linked'}], createFields: ['subject','clientId','entityType','entityId','body'] },
  assets: { title: 'CMMS / Assets', eyebrow: 'Maintenance', description: 'Track equipment info, property links, serial/model fields, service history, PM shell, documents, photos, and notes.', endpoint: '/api/assets', permission: 'cmms.view', managePermission: 'cmms.manage', emptyTitle: 'No assets yet', emptyDescription: 'Add equipment to a property to start building service history and PM schedules.', columns: [{key:'name',label:'Asset'}, {key:'property',label:'Property'}, {key:'type',label:'Type'}, {key:'status',label:'Status',kind:'status'}, {key:'serial',label:'Serial'}, {key:'model',label:'Model'}], createFields: ['name','propertyId','type','serial','model','manufacturer','notes'] },
  catalog: { title: 'Service Catalog', eyebrow: 'Foundation', description: 'Editable database-backed default service categories power public Request Estimate and quote workflows.', endpoint: '/api/service-catalog', permission: 'service_catalog.view', managePermission: 'service_catalog.manage', emptyTitle: 'No service categories enabled', emptyDescription: 'Run migrations or add HVAC, Plumbing, Electrical, Handyman, Appliance, Maintenance, and General Repair.', columns: [{key:'name',label:'Category'}, {key:'enabled',label:'Enabled',kind:'badge'}, {key:'description',label:'Description'}, {key:'defaultLaborRate',label:'Labor rate',kind:'money'}], createFields: ['name','description','defaultLaborRate','enabled'] },
  media: { title: 'Media / Files', eyebrow: 'Files', description: 'Manage uploaded files, public/private visibility, linked records, logo/favicon media, and archive actions.', endpoint: '/api/media', permission: 'media.view', managePermission: 'media.manage', emptyTitle: 'No media files yet', emptyDescription: 'Upload branding media in settings or attach files to requests, quotes, jobs, invoices, and assets.', columns: [{key:'name',label:'File'}, {key:'visibility',label:'Visibility',kind:'status'}, {key:'ownerType',label:'Owner'}, {key:'linkType',label:'Linked'}, {key:'mimeType',label:'Type'}], createFields: [] }
};

function createPayload(fields: string[], values: Record<string,string>) {
  return fields.reduce<Record<string, unknown>>((acc, key) => ({ ...acc, [key]: key === 'enabled' ? values[key] !== 'false' : ['total','deposit','amount','defaultLaborRate'].includes(key) ? Math.round(Number(values[key] || 0) * 100) : values[key] }), {});
}
function displayValue(row: any, col: ModuleColumn) { const value = row[col.key]; if (col.kind === 'money') return money(Number(value || 0)); if (typeof value === 'boolean') return value ? 'Yes' : 'No'; return value === null || value === undefined || value === '' ? '—' : String(value); }
function StatusPipeline({ statuses }: { statuses?: string[] }) { const safeStatuses = asArray(statuses); if (!safeStatuses.length) return null; return <div className="status-pipeline">{safeStatuses.map((status) => <span key={status}>{status}</span>)}</div>; }
function ModuleToolbar({ query, setQuery, canManage, actionLabel, onCreate }: { query: string; setQuery: (value: string) => void; canManage: boolean; actionLabel?: string; onCreate: () => void }) { return <div className="module-toolbar"><input placeholder="Search/filter real records" value={query} onChange={(e) => setQuery(e.target.value)} /><Button variant="secondary" onClick={() => setQuery(query)}>Refresh</Button>{canManage && <Button onClick={onCreate}>{actionLabel || 'Create record'}</Button>}</div>; }
function ModuleList({ rows, columns, onSelect }: { rows: any[]; columns: ModuleColumn[]; onSelect: (row: any) => void }) { return <div className="module-list">{asArray(rows).map((row) => <button className="module-row" key={row.id || JSON.stringify(row)} onClick={() => onSelect(row)}>{asArray(columns).map((col) => <span key={col.key} data-label={col.label}>{col.kind === 'status' ? <StatusBadge status={displayValue(row,col)} /> : col.kind === 'badge' ? <Badge>{displayValue(row,col)}</Badge> : displayValue(row,col)}</span>)}</button>)}</div>; }
function RecordTimeline({ row }: { row: any }) { return <section className="card"><h3>Record timeline</h3><p className="muted">Created: {row.createdAt || row.receivedAt || row.updatedAt || 'Not timestamped'}</p><p>Success state: this record loaded from the database and passed API permission checks.</p></section>; }
function LinkedRecordsPanel({ row }: { row: any }) { const keys = ['client','property','request','quoteId','job','invoice','linkedType']; return <section className="card"><h3>Linked records</h3>{keys.some((key) => row[key]) ? keys.filter((key) => row[key]).map((key) => <p key={key}><strong>{key}:</strong> {String(row[key])}</p>) : <p className="muted">No linked records yet.</p>}</section>; }
function NotesPanel() { return <section className="card"><h3>Notes</h3><textarea placeholder="Internal notes are stored through record detail endpoints." /></section>; }
function AttachmentPanel() { return <section className="card"><h3>Attachments</h3><p className="muted">Use Media / Files to upload and link public/private files to this record.</p></section>; }
function LineItemsEditor() { return <section className="card"><h3>Line items</h3><div className="line-item-shell"><input placeholder="Description"/><input placeholder="Qty"/><input placeholder="Unit price"/></div></section>; }
function MoneySummary({ row }: { row: any }) { if (!['total','subtotal','tax','balance','paid','deposit','amount'].some((key) => row[key] !== undefined)) return null; return <section className="card"><h3>Money summary</h3>{['subtotal','tax','total','deposit','paid','balance','amount'].filter((key) => row[key] !== undefined).map((key) => <p key={key}><strong>{key}:</strong> {money(Number(row[key] || 0))}</p>)}</section>; }
function DetailDrawer({ row, config, onClose }: { row: any; config: ModuleConfig; onClose: () => void }) { return <aside className="detail-drawer"><div className="drawer-header"><div><p className="eyebrow">Detail</p><h2>{row.name || row.title || row.subject || row.id}</h2></div><Button variant="secondary" onClick={onClose}>Close</Button></div><div className="drawer-grid"><RecordTimeline row={row}/><LinkedRecordsPanel row={row}/><MoneySummary row={row}/>{['quotes','invoices'].includes(config.endpoint.split('/').pop() || '') && <LineItemsEditor/>}<NotesPanel/><AttachmentPanel/></div></aside>; }
function ModuleCreateForm({ config, onDone }: { config: ModuleConfig; onDone: () => void }) {
  const [values, setValues] = useState<Record<string,string>>({}); const [status, setStatus] = useState('');
  if (!config.createFields?.length) return <div className="card"><h3>Upload</h3><p className="muted">Use the existing multipart media upload from branding or attachment flows; uploaded media appears in this list.</p></div>;
  const submit = async (event: FormEvent) => { event.preventDefault(); setStatus('Saving…'); try { const endpoint = config.endpoint === '/api/payments' ? '/api/payments/manual' : config.endpoint; await apiJson(endpoint, { method: 'POST', body: JSON.stringify(createPayload(config.createFields || [], values)) }); setValues({}); setStatus('Created.'); onDone(); } catch (caught) { setStatus(caught instanceof Error ? caught.message : 'Save failed.'); } };
  return <form className="card form module-create" onSubmit={submit}><h3>{config.actionLabel || 'Create record'}</h3>{asArray(config.createFields).map((field) => <label key={field}><span className="field-label">{field}</span><input value={values[field] || ''} onChange={(e) => setValues({ ...values, [field]: e.target.value })}/></label>)}<Button>Save</Button>{status && <p className="muted">{status}</p>}</form>;
}
class ModuleErrorBoundary extends Component<{ title: string; children: ReactNode }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(error: unknown) { return { error: error instanceof Error ? error.message : 'Module crashed before it could render.' }; }
  render() {
    if (this.state.error) return <div className="card error-panel"><h2>{this.props.title} hit a safe boundary</h2><p>{this.state.error}</p><Button variant="secondary" onClick={() => location.reload()}>Reload module</Button></div>;
    return this.props.children;
  }
}

function ModulePage({ config }: { config: ModuleConfig }) {
  const auth = useAuth(); const [query, setQuery] = useState(''); const [selected, setSelected] = useState<any | null>(null); const [showCreate, setShowCreate] = useState(false);
  const state = useApi<{ records: any[]; statuses?: string[]; pipeline?: string[] }>(`${config.endpoint}${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  const rows = asArray(state.data?.records);
  return <Protected permission={config.permission}><AppLayout title={config.title}><ModuleErrorBoundary title={config.title}><div className="module-shell"><PageHeader eyebrow={config.eyebrow} title={config.title} description={config.description}/><ModuleToolbar query={query} setQuery={setQuery} canManage={auth.can(config.managePermission)} actionLabel={config.actionLabel} onCreate={() => setShowCreate(!showCreate)}/><StatusPipeline statuses={config.pipeline || asArray(state.data?.statuses)}/>{state.loading && <LoadingState title={`Loading ${config.title}`} lines={3}/>} {state.error && <div className="card error-panel"><h2>Could not load {config.title}</h2><p>{state.error}</p><Button variant="secondary" onClick={state.reload}>Try again</Button></div>} {!state.loading && !state.error && rows.length === 0 && <EmptyState title={config.emptyTitle} description={config.emptyDescription} action={auth.can(config.managePermission) ? <Button onClick={() => setShowCreate(true)}>Create first record</Button> : undefined}/>} {showCreate && auth.can(config.managePermission) && <ModuleCreateForm config={config} onDone={() => { state.reload(); setShowCreate(false); }}/>} {rows.length > 0 && <ModuleList rows={rows} columns={config.columns} onSelect={setSelected}/>} {selected && <DetailDrawer row={selected} config={config} onClose={() => setSelected(null)}/>}</div></ModuleErrorBoundary></AppLayout></Protected>;
}
export function ClientsPage() { return <ModulePage config={moduleConfigs.clients}/>; }
export function PropertiesPage() { return <ModulePage config={moduleConfigs.properties}/>; }
export function RequestsPage() { return <ModulePage config={moduleConfigs.requests}/>; }
export function QuotesPage() { return <ModulePage config={moduleConfigs.quotes}/>; }
export function JobsPage() { return <ModulePage config={moduleConfigs.jobs}/>; }
export function InvoicesPage() { return <ModulePage config={moduleConfigs.invoices}/>; }
export function PaymentsPage() { return <ModulePage config={moduleConfigs.payments}/>; }
export function MessagesPage() { return <ModulePage config={moduleConfigs.messages}/>; }
export function AssetsPage() { return <ModulePage config={moduleConfigs.assets}/>; }
export function ServiceCatalogPage() { return <ModulePage config={moduleConfigs.catalog}/>; }
export function MediaPage() { return <ModulePage config={moduleConfigs.media}/>; }

function DataTable({ rows }: { rows?: string[][] }) { const safeRows = asArray(rows); return <div className="table">{safeRows.map((row) => <div className="tr" key={row.join('-')}>{row.map((cell, index) => <span key={`${cell}-${index}`}>{index === 2 ? <StatusBadge status={cell}/> : cell}</span>)}</div>)}</div>; }

const settingsSections = ['company','branding','theme','users','roles','permissions','foundation','payment','email','license','media','homepage-builder','diagnostics'];

export function SettingsPage({ area = 'settings/company' }: { area?: string }) {
  const section = area.split('/')[1] || 'company';
  return <Protected permission="settings.view"><AppLayout title={`Settings / ${section}`}><div className="settings-grid"><nav className="card settings-nav">{asArray(settingsSections).map((s) => <Link href={`/settings/${s}`} key={s}>{s}</Link>)}</nav><SettingsPanel section={section}/></div></AppLayout></Protected>;
}

function SettingsPanel({ section }: { section: string }) {
  const auth = useAuth();
  const endpoint = section === 'diagnostics' ? '/api/system/diagnostics' : `/api/settings/${section}`;
  const state = useApi<any>(endpoint);
  const managePermission = `${section === 'homepage-builder' ? 'homepage' : section}.manage`;
  const canManage = auth.can(managePermission) || (section === 'diagnostics' && auth.can('diagnostics.view'));
  if (state.loading) return <section className="card settings-panel"><h2>{section}</h2><p className="muted">Loading database settings…</p></section>;
  if (state.error) return <section className="card settings-panel"><h2>{section}</h2><p className="error-text">{state.error}</p></section>;
  if (section === 'company') return <CompanySettings data={state.data.company} canManage={canManage} reload={state.reload}/>;
  if (section === 'branding') return <BrandingSettings data={state.data.branding} canManage={canManage} reload={state.reload}/>;
  if (section === 'theme') return <ThemeSettingsPanel data={state.data.theme} canManage={canManage} reload={state.reload}/>;
  if (section === 'users') return <UsersSettings data={state.data} canManage={canManage} reload={state.reload}/>;
  if (section === 'roles') return <section className="card settings-panel"><h2>Roles</h2>{asArray(state.data?.roles).map((r: any) => <p key={r.id}><strong>{r.name}</strong> {r.systemRole && <Badge>System</Badge>} — {r.permissionsCount} permissions</p>)}</section>;
  if (section === 'permissions') return <section className="card settings-panel"><h2>Permissions</h2><GroupedPermissions rows={state.data.permissions}/></section>;
  if (section === 'foundation') return <section className="card settings-panel"><h2>Foundation components</h2>{asArray(state.data?.foundation).map((c: any) => <p key={c.name}><Badge tone="success">{c.status}</Badge> {c.name} <span className="muted">Locked foundation component</span></p>)}</section>;
  if (section === 'homepage-builder') return <HomepageBuilder data={state.data.homepageBuilder} canManage={canManage} reload={state.reload}/>;
  return <section className="card settings-panel"><h2>{section}</h2><pre>{JSON.stringify(state.data, null, 2)}</pre>{!canManage && <p className="muted">Read-only. Saving requires {managePermission}.</p>}</section>;
}

function CompanySettings({ data, canManage, reload }: { data: any; canManage: boolean; reload: () => Promise<void> }) {
  const [form, setForm] = useState(data || {}); const [status, setStatus] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setStatus('Saving…'); try { await apiJson('/api/settings/company', { method: 'POST', body: JSON.stringify(form) }); setStatus('Saved.'); reload(); } catch (caught) { setStatus(caught instanceof Error ? caught.message : 'Save failed.'); } };
  return <section className="card settings-panel"><h2>Company settings</h2><form className="form" onSubmit={submit}>{['companyName','displayName','phone','email','address','website','serviceArea','businessHours'].map((key) => <label key={key}><span className="field-label">{key}</span><input disabled={!canManage} value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })}/></label>)}<Button disabled={!canManage}>Save company</Button>{status && <p className="muted">{status}</p>}</form></section>;
}
function BrandingSettings({ data, canManage, reload }: { data: any; canManage: boolean; reload: () => Promise<void> }) {
  const branding = useBranding(); const [form, setForm] = useState(data || {}); const [status, setStatus] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setStatus('Saving…'); try { const saved = await apiJson<any>('/api/settings/branding', { method: 'POST', body: JSON.stringify(form) }); notifyBrandingUpdated(saved.branding); branding.updateBranding(saved.branding); setStatus('Saved and applied.'); reload(); } catch (caught) { setStatus(caught instanceof Error ? caught.message : 'Save failed.'); } };
  return <section className="card settings-panel"><h2>Branding</h2><form className="form" onSubmit={submit}>{['tagline','logoMediaId','logoUrl','faviconMediaId','faviconUrl'].map((key) => <label key={key}><span className="field-label">{key}</span><input disabled={!canManage} value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })}/></label>)}<p className="muted">Upload images with /api/media/upload, then save the returned media id or URL here.</p><Button disabled={!canManage}>Save branding</Button>{status && <p className="muted">{status}</p>}</form></section>;
}
function ThemeSettingsPanel({ data, canManage, reload }: { data: ThemeSettings; canManage: boolean; reload: () => Promise<void> }) {
  const [theme, setTheme] = useState<ThemeSettings>({ mode: data?.mode || 'system', presetId: data?.presetId || 'contractoros_default', custom: { ...themePresets.contractoros_default.palette, ...(data?.custom || {}) } }); const [status, setStatus] = useState('');
  const submit = async () => { setStatus('Saving…'); try { await apiJson('/api/settings/theme', { method: 'POST', body: JSON.stringify({ theme }) }); applyTheme(theme); setStatus('Saved and applied.'); reload(); } catch (caught) { setStatus(caught instanceof Error ? caught.message : 'Save failed.'); } };
  return <section className="card settings-panel"><h2>Theme</h2><select disabled={!canManage} value={theme.mode} onChange={(e) => { const next = { ...theme, mode: e.target.value as ThemeSettings['mode'] }; setTheme(next); applyTheme(next); }}><option>system</option><option>light</option><option>dark</option><option>preset</option><option>custom</option></select><select disabled={!canManage} value={theme.presetId} onChange={(e) => { const next = { ...theme, presetId: e.target.value as ThemeSettings['presetId'] }; setTheme(next); applyTheme(next); }}>{Object.keys(themePresets).map((key) => <option key={key}>{key}</option>)}</select><Button disabled={!canManage} onClick={submit}>Save theme</Button>{status && <p className="muted">{status}</p>}</section>;
}
function UsersSettings({ data, canManage, reload }: { data: any; canManage: boolean; reload: () => Promise<void> }) {
  const [form, setForm] = useState({ name: '', email: '', roleId: data.roles?.[0]?.id || '' }); const [status, setStatus] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setStatus('Saving…'); try { await apiJson('/api/settings/users', { method: 'POST', body: JSON.stringify(form) }); setStatus('User invited/created.'); reload(); } catch (caught) { setStatus(caught instanceof Error ? caught.message : 'Save failed.'); } };
  return <section className="card settings-panel"><h2>Users</h2><DataTable rows={asArray(data?.users).map((u: any) => [u.name, u.email, u.status, u.role || 'No role', u.createdAt])}/>{canManage && <form className="form" onSubmit={submit}><h3>Invite/create magic-link user</h3><input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/><input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/><select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>{asArray(data?.roles).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select><Button>Create user</Button></form>}{status && <p className="muted">{status}</p>}</section>;
}
function GroupedPermissions({ rows }: { rows?: Array<{ key: string; group: string }> }) { const groups = asArray(rows).reduce<Record<string, string[]>>((acc, row) => ({ ...acc, [row.group]: [...(acc[row.group] || []), row.key] }), {}); return <div className="permission-list">{Object.entries(groups).map(([group, keys]) => <article className="card" key={group}><h3>{group}</h3>{keys.map((key) => <Badge key={key}>{key}</Badge>)}</article>)}</div>; }
function HomepageBuilder({ data, canManage, reload }: { data: { status: string; sections: PageSection[] }; canManage: boolean; reload: () => Promise<void> }) {
  const [sections, setSections] = useState<PageSection[]>(asArray(data?.sections).length ? asArray(data?.sections) : []);
  const [status, setStatus] = useState('');
  const save = async (publish = false) => {
    setStatus('Saving…');
    try {
      await apiJson('/api/settings/homepage-builder', { method: 'POST', body: JSON.stringify({ status: publish ? 'published' : 'draft', sections }) });
      setStatus(publish ? 'Published.' : 'Draft saved.');
      reload();
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : 'Save failed.');
    }
  };
  const addSection = () => setSections([...sections, { id: crypto.randomUUID(), type: 'content', title: 'New section', body: '', cta: '' }]);
  return <section className="card settings-panel"><h2>Homepage builder</h2>{sections.length > 0 ? <>{sections.map((section) => <div className="builder-row" key={section.id}><input disabled={!canManage} value={section.title} onChange={(e) => setSections(sections.map((s) => s.id === section.id ? { ...s, title: e.target.value } : s))}/><input disabled={!canManage} value={section.body} onChange={(e) => setSections(sections.map((s) => s.id === section.id ? { ...s, body: e.target.value } : s))}/><button disabled={!canManage} onClick={() => setSections(sections.filter((s) => s.id !== section.id))}>Remove</button></div>)}</> : <EmptyState title="No homepage sections yet" description="Add a database-backed section to start a draft."/>}<div className="button-row"><Button disabled={!canManage} onClick={addSection}>Add section</Button><Button disabled={!canManage} variant="secondary" onClick={() => save(false)}>Save draft</Button><Button disabled={!canManage} onClick={() => save(true)}>Publish</Button></div><p className="muted">Current status: {data.status || 'draft'}</p>{status && <p className="muted">{status}</p>}</section>;
}
