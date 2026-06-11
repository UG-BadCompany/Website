import { useEffect, useState, type FormEvent } from 'react';
import { AppLayout, Protected } from '../components/Layout';
import { Link } from '../components/Router';
import { defaultWidgets, sampleInvoices, sampleJobs, sampleQuotes, sampleRequests, sampleThreads } from '../data/foundation';
import { applyTheme, themePresets, type ThemeSettings } from '../lib/theme';
import { notifyBrandingUpdated, useBranding } from '../lib/branding';
import { useAuth } from '../lib/auth';
import { ActionCard, Badge, Button, EmptyState, PageHeader, StatusBadge } from '../components/ui';
import type { DashboardWidget, PageSection } from '../types/domain';

type ApiState<T> = { loading: boolean; error: string; data: T | null };
type DashboardOverview = {
  requests: { new: number; open: number; highPriority: number };
  quotes: { pending: number; approved: number; totalPendingValue: number };
  jobs: { active: number; completed: number; scheduledToday: number };
  invoices: { open: number; outstandingBalance: number; overdue: number };
  messages: { unread: number; needsReply: number };
  snapshot: Record<string, Record<string, unknown> | null>;
  activity: Array<{ type: string; summary: string; createdAt: string }>;
};

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
  const overview = useApi<DashboardOverview>('/api/dashboard/overview');
  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets);
  const [stagedWidgets, setStagedWidgets] = useState<DashboardWidget[]>(defaultWidgets);
  const [isEditingDashboard, setIsEditingDashboard] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    apiJson<{ layout: DashboardWidget[] | null }>('/api/dashboard/layout')
      .then((data) => { const layout = data.layout?.length ? data.layout : defaultWidgets; setWidgets(layout); setStagedWidgets(layout); })
      .catch(() => undefined);
  }, []);

  const visibleWidgets = (isEditingDashboard ? stagedWidgets : widgets).filter((widget) => !widgetPermission(widget.type) || auth.can(widgetPermission(widget.type)));
  const data = overview.data;
  const metrics = [
    { label: 'New requests', value: data?.requests.new ?? 0, detail: 'Fresh intake awaiting triage', tone: 'accent' },
    { label: 'Pending quotes', value: data?.quotes.pending ?? 0, detail: `${money(data?.quotes.totalPendingValue ?? 0)} pending`, tone: 'warning' },
    { label: 'Approved quotes', value: data?.quotes.approved ?? 0, detail: 'Ready to convert into jobs', tone: 'success' },
    { label: 'Active jobs', value: data?.jobs.active ?? 0, detail: `${data?.jobs.scheduledToday ?? 0} scheduled today`, tone: 'accent' },
    { label: 'Completed jobs', value: data?.jobs.completed ?? 0, detail: 'Completed in the selected range', tone: 'success' },
    { label: 'Open invoices', value: data?.invoices.open ?? 0, detail: `${data?.invoices.overdue ?? 0} overdue`, tone: (data?.invoices.overdue ?? 0) > 0 ? 'danger' : 'accent' },
    { label: 'Outstanding balance', value: money(data?.invoices.outstandingBalance ?? 0), detail: 'Open customer balances', tone: 'warning' },
    { label: 'Messages needing reply', value: data?.messages.needsReply ?? 0, detail: `${data?.messages.unread ?? 0} unread`, tone: 'accent' },
  ];

  const saveLayout = async () => {
    setSaveStatus('Saving…');
    try { await apiJson('/api/dashboard/layout', { method: 'POST', body: JSON.stringify({ layout: stagedWidgets }) }); setWidgets(stagedWidgets); setIsEditingDashboard(false); setSaveStatus('Layout saved.'); }
    catch (caught) { setSaveStatus(caught instanceof Error ? caught.message : 'Unable to save layout.'); }
  };

  return <Protected permission="dashboard.view"><AppLayout title="Dashboard"><PageHeader eyebrow="Business Overview" title="Business Overview" description="A database-backed command center for intake, estimates, operations, financial health, and messages." action={<div className="button-row"><select aria-label="Date range" defaultValue="this_month"><option value="today">Today</option><option value="this_week">This Week</option><option value="this_month">This Month</option><option value="custom" disabled>Custom later</option></select><Button variant="secondary" onClick={() => overview.reload()}>Refresh</Button>{isEditingDashboard ? <><Button onClick={saveLayout}>Save layout</Button><Button variant="secondary" onClick={() => { setStagedWidgets(widgets); setIsEditingDashboard(false); }}>Cancel</Button><Button variant="secondary" onClick={() => setStagedWidgets([...stagedWidgets, { id: crypto.randomUUID(), title: 'New widget', type: 'metric', x: 0, y: stagedWidgets.length, w: 1, h: 1 }])}>Add widget</Button></> : <Button onClick={() => { setStagedWidgets(widgets); setIsEditingDashboard(true); }}>Edit dashboard</Button>}</div>}/>{overview.error && <div className="card error-text">{overview.error}</div>}{saveStatus && <p className="muted">{saveStatus}</p>}<section className="overview-panel card"><div className="metric-grid">{metrics.map((metric) => <div className={`metric-card metric-${metric.tone}`} key={metric.label}><span className="metric-trend">↗ steady</span><strong>{metric.value}</strong><span>{metric.label}</span><p className="muted">{metric.detail}</p></div>)}</div></section><section className="dashboard-columns"><article className="card"><h2>Operational snapshot</h2><SnapshotRows snapshot={data?.snapshot}/></article><article className="card"><h2>Quick actions</h2><div className="quick-actions">{auth.can('requests.manage') && <Link className="button secondary" href="/requests/new">New request</Link>}{auth.can('quotes.create') && <Link className="button secondary" href="/quotes/new">New quote</Link>}{auth.can('jobs.manage') && <Link className="button secondary" href="/jobs/new">New job</Link>}{auth.can('invoices.manage') && <Link className="button secondary" href="/invoices/new">New invoice</Link>}{auth.can('clients.manage') && <Link className="button secondary" href="/clients/new">Add client</Link>}{auth.can('messages.view') && <Link className="button secondary" href="/messages">Open messages</Link>}</div></article></section><article className="card activity-card"><h2>Activity feed</h2>{overview.loading ? <p className="muted">Loading real activity…</p> : data?.activity?.length ? data.activity.map((event) => <p key={`${event.type}-${event.createdAt}`}><Badge>{event.type}</Badge> {event.summary}</p>) : <EmptyState title="No real activity yet" description="Recent request, quote, invoice, job, payment, and message events will appear here once the database has activity."/>}</article><div className={`dashboard-grid ${isEditingDashboard ? 'editing' : ''}`}>{visibleWidgets.map((w, i) => <article className="card widget" key={w.id} style={{ gridColumn: `span ${w.w}` }}>{isEditingDashboard ? <input value={w.title} onChange={(e) => setStagedWidgets(stagedWidgets.map((x) => x.id === w.id ? { ...x, title: e.target.value } : x))}/> : <h3>{w.title}</h3>}<strong>{w.type === 'metric' ? i + 1 : '•'}</strong><p className="muted">{isEditingDashboard ? 'Editing staged layout. Save to persist this widget arrangement.' : 'Locked dashboard widget. Click Edit dashboard to customize.'}</p>{isEditingDashboard && <div className="widget-actions"><button onClick={() => setStagedWidgets(stagedWidgets.map((x) => x.id === w.id ? { ...x, w: x.w === 1 ? 2 : 1 } : x))}>Resize</button><button onClick={() => i > 0 && setStagedWidgets(stagedWidgets.map((x, idx, arr) => idx === i - 1 ? arr[i] : idx === i ? arr[i - 1] : x))}>Move up</button><button onClick={() => setStagedWidgets(stagedWidgets.filter((x) => x.id !== w.id))}>Remove</button></div>}</article>)}</div></AppLayout></Protected>;
}

function widgetPermission(type: string) {
  if (type.includes('invoice')) return 'invoices.view';
  if (type.includes('payment')) return 'payments.view';
  if (type.includes('job')) return 'jobs.view';
  if (type.includes('request')) return 'requests.view';
  if (type.includes('message')) return 'messages.view';
  return '';
}

function SnapshotRows({ snapshot }: { snapshot?: DashboardOverview['snapshot'] }) {
  const rows = [
    ['Next scheduled job', snapshot?.nextScheduledJob], ['Newest request', snapshot?.newestRequest], ['Highest priority item', snapshot?.highestPriorityItem], ['Latest approved quote', snapshot?.latestApprovedQuote], ['Overdue invoice', snapshot?.overdueInvoice],
  ];
  return <div className="snapshot-list">{rows.map(([label, value]) => <div className="snapshot-row" key={label as string}><strong>{label as string}</strong>{value ? <span>{String((value as Record<string, unknown>).id || (value as Record<string, unknown>).status || 'Available')}</span> : <span className="muted">No real data yet</span>}</div>)}</div>;
}

export function PortalPage() {
  const portal = useApi<{ scope: string; properties: Array<{ address: string }>; requests: Array<{ id: string; status: string }>; quotes: Array<{ id: string; status: string }>; invoices: Array<{ id: string; balance: number }> }>('/api/portal/overview');
  return <Protected permission="portal.view"><AppLayout title="Client portal"><PageHeader eyebrow="Customer experience" title="Client portal" description="Authenticated portal data is loaded from the database and scoped to the signed-in client unless support access is permitted."/><div className="grid cards"><WorkflowCard title="My properties" items={portal.data?.properties.map((p) => p.address) ?? []}/><WorkflowCard title="My requests" items={portal.data?.requests.map((r) => `${r.id} · ${r.status}`) ?? []}/><WorkflowCard title="My quotes" items={portal.data?.quotes.map((q) => `${q.id} · ${q.status}`) ?? []}/><WorkflowCard title="My invoices" items={portal.data?.invoices.map((i) => `${i.id} · ${money(i.balance)}`) ?? []}/><WorkflowCard title="My messages" items={[]}/></div>{portal.error && <p className="error-text">{portal.error}</p>}</AppLayout></Protected>;
}
function WorkflowCard({ title, items }: { title: string; items: string[] }) { return <ActionCard title={title} description={`${items.length} real item${items.length === 1 ? '' : 's'}`}>{items.length ? items.map((item) => <p key={item}>{item}</p>) : <p className="muted">No records yet.</p>}</ActionCard>; }

export function RequestsPage() { return <Protected permission="requests.view"><AppLayout title="Work requests"><PageHeader eyebrow="CRM intake" title="Work requests" description="Triage customer needs with status-aware cards and table rows." action={<Link href="/requests/new" className="button">New request</Link>}/><DataTable rows={sampleRequests.map((r) => [r.id,r.client,r.service,r.status,r.priority])}/></AppLayout></Protected>; }
export function QuotesPage() { return <Protected permission="quotes.view"><AppLayout title="Quotes"><PageHeader eyebrow="Estimating" title="Quotes" description="Track approvals, totals, and conversion to scheduled jobs."/><DataTable rows={sampleQuotes.map((q) => [q.id,q.client,q.status,`$${q.total}`])}/><ActionCard title="Approval workflow" description="Client approval converts approved quotes to jobs and saves communication history."/></AppLayout></Protected>; }
export function JobsPage() { return <Protected permission="jobs.view"><AppLayout title="Jobs and dispatch"><PageHeader eyebrow="Operations" title="Jobs and dispatch" description="Technician assignments, work orders, and job status in one polished surface."/><DataTable rows={sampleJobs.map((j) => [j.id,j.client,j.status,j.technician])}/></AppLayout></Protected>; }
export function InvoicesPage() { return <Protected permission="invoices.view"><AppLayout title="Invoices and payments"><PageHeader eyebrow="Financial" title="Invoices and payments" description="Balances and payment providers are styled consistently across desktop and mobile."/><DataTable rows={sampleInvoices.map((i) => [i.id,i.client,i.status,`$${i.balance}`])}/><ActionCard title="Payment framework" description="Square is default; Stripe, PayPal, Authorize.net, manual cash/check, and configure-later are structured as provider adapters."/></AppLayout></Protected>; }
export function MessagesPage() { return <Protected permission="messages.view"><AppLayout title="Advanced messaging"><PageHeader eyebrow="Communications" title="Advanced messaging" description="Customer-visible replies and internal notes live together without visual clutter."/><div className="grid cards">{sampleThreads.map((t) => <article className="card" key={t.id}><h3>{t.subject}</h3><p>{t.participants.join(' ↔ ')}</p><Badge tone="accent">{t.visibility}</Badge><textarea placeholder="Customer-visible reply or internal note"/></article>)}</div></AppLayout></Protected>; }
export function AssetsPage() { return <Protected permission="cmms.view"><AppLayout title="CMMS assets"><PageHeader eyebrow="Maintenance" title="CMMS assets" description="Asset history, PM shell, notes, documents, and property relationships are ready."/><EmptyState title="Asset foundation" description="Add equipment, service history, recurring maintenance, and property context when CMMS is enabled."/></AppLayout></Protected>; }

function DataTable({ rows }: { rows: string[][] }) { return <div className="table">{rows.map((row) => <div className="tr" key={row.join('-')}>{row.map((cell, index) => <span key={`${cell}-${index}`}>{index === 2 ? <StatusBadge status={cell}/> : cell}</span>)}</div>)}</div>; }

const settingsSections = ['company','branding','theme','users','roles','permissions','foundation','payment','email','license','media','homepage-builder','diagnostics'];

export function SettingsPage({ area = 'settings/company' }: { area?: string }) {
  const section = area.split('/')[1] || 'company';
  return <Protected permission="settings.view"><AppLayout title={`Settings / ${section}`}><div className="settings-grid"><nav className="card settings-nav">{settingsSections.map((s) => <Link href={`/settings/${s}`} key={s}>{s}</Link>)}</nav><SettingsPanel section={section}/></div></AppLayout></Protected>;
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
  if (section === 'roles') return <section className="card settings-panel"><h2>Roles</h2>{state.data.roles.map((r: any) => <p key={r.id}><strong>{r.name}</strong> {r.systemRole && <Badge>System</Badge>} — {r.permissionsCount} permissions</p>)}</section>;
  if (section === 'permissions') return <section className="card settings-panel"><h2>Permissions</h2><GroupedPermissions rows={state.data.permissions}/></section>;
  if (section === 'foundation') return <section className="card settings-panel"><h2>Foundation components</h2>{state.data.foundation.map((c: any) => <p key={c.name}><Badge tone="success">{c.status}</Badge> {c.name} <span className="muted">Locked foundation component</span></p>)}</section>;
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
  return <section className="card settings-panel"><h2>Users</h2><DataTable rows={data.users.map((u: any) => [u.name, u.email, u.status, u.role || 'No role', u.createdAt])}/>{canManage && <form className="form" onSubmit={submit}><h3>Invite/create magic-link user</h3><input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/><input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/><select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>{data.roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select><Button>Create user</Button></form>}{status && <p className="muted">{status}</p>}</section>;
}
function GroupedPermissions({ rows }: { rows: Array<{ key: string; group: string }> }) { const groups = rows.reduce<Record<string, string[]>>((acc, row) => ({ ...acc, [row.group]: [...(acc[row.group] || []), row.key] }), {}); return <div className="permission-list">{Object.entries(groups).map(([group, keys]) => <article className="card" key={group}><h3>{group}</h3>{keys.map((key) => <Badge key={key}>{key}</Badge>)}</article>)}</div>; }
function HomepageBuilder({ data, canManage, reload }: { data: { status: string; sections: PageSection[] }; canManage: boolean; reload: () => Promise<void> }) {
  const [sections, setSections] = useState<PageSection[]>(data.sections?.length ? data.sections : []);
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
