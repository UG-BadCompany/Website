import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { AppLayout, Protected } from '../../components/Layout';
import { Badge, Button, EmptyState, LoadingState, PageHeader, StatusBadge } from '../../components/ui';
import { useAuth } from '../../lib/auth';

export type ApiList<T> = { ok?: boolean; records?: T[]; pipeline?: string[]; statuses?: string[] };
export type ApiRecord<T> = { ok?: boolean; record?: T };
export type Row = Record<string, any> & { id: string };

export const asArray = <T,>(value: T[] | null | undefined): T[] => Array.isArray(value) ? value : [];
export const money = (cents = 0) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(cents || 0) / 100);
export const dateTime = (value?: string) => value ? new Date(value).toLocaleString() : '—';
export const dollarsToCents = (value: FormDataEntryValue | null) => Math.round(Number(value || 0) * 100);
export const text = (form: FormData, key: string) => String(form.get(key) || '').trim();

export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store', headers: { accept: 'application/json', ...(init?.body ? { 'content-type': 'application/json' } : {}), ...(init?.headers || {}) }, ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload as T;
}

export function useModuleRecords<T extends Row>(endpoint: string, query = '') {
  const [records, setRecords] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<Record<string, unknown>>({});
  const url = useMemo(() => `${endpoint}?limit=100${query ? `&q=${encodeURIComponent(query)}` : ''}`, [endpoint, query]);
  const reload = async () => {
    setLoading(true); setError('');
    try { const data = await apiJson<ApiList<T>>(url); setRecords(asArray(data.records)); setMeta(data as Record<string, unknown>); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load records.'); setRecords([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [url]);
  return { records, loading, error, meta, reload };
}

export function useRecordDetail<T extends Row>(endpoint: string, selectedId?: string) {
  const [record, setRecord] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = async (id = selectedId) => {
    if (!id) return;
    setLoading(true); setError('');
    try { const data = await apiJson<ApiRecord<T>>(`${endpoint}/${id}`); setRecord(data.record || null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load detail.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { setRecord(null); if (selectedId) void load(selectedId); }, [endpoint, selectedId]);
  return { record, loading, error, reload: load };
}

export function ModulePageFrame({ permission, title, eyebrow, description, action, children }: { permission: string | string[]; title: string; eyebrow: string; description: string; action?: ReactNode; children: ReactNode }) {
  return <Protected permission={permission}><AppLayout title={title}><PageHeader eyebrow={eyebrow} title={title} description={description} action={action}/>{children}</AppLayout></Protected>;
}

export function Toolbar({ query, onQuery, canManage, createLabel, onCreate, secondary }: { query: string; onQuery: (value: string) => void; canManage: boolean; createLabel: string; onCreate: () => void; secondary?: ReactNode }) {
  return <div className="module-toolbar"><input placeholder="Search real records…" value={query} onChange={(event) => onQuery(event.target.value)}/>{secondary}{canManage && <Button onClick={onCreate}>{createLabel}</Button>}</div>;
}

export function WorkflowBoard<T extends Row>({ records, statuses, onSelect, titleFor }: { records: T[]; statuses: string[]; onSelect: (row: T) => void; titleFor: (row: T) => string }) {
  return <section className="card"><div className="section-heading"><div><p className="eyebrow">Workflow</p><h2>Status board</h2></div><Badge>{records.length} records</Badge></div><div className="kanban-summary module-board">{asArray(statuses).map((status) => {
    const group = asArray(records).filter((row) => String(row.status || 'new') === status);
    return <div className="kanban-column" key={status}><strong>{group.length}</strong><span>{status.replaceAll('_', ' ')}</span>{group.slice(0, 4).map((row) => <button type="button" className="link-button" key={row.id} onClick={() => onSelect(row)}>{titleFor(row)}</button>)}</div>;
  })}</div></section>;
}

export function RecordsTable<T extends Row>({ records, columns, onSelect, emptyTitle }: { records: T[]; columns: Array<{ key: string; label: string; kind?: 'money' | 'status' | 'date' | 'badge' }>; onSelect: (row: T) => void; emptyTitle: string }) {
  if (!records.length) return <EmptyState title={emptyTitle} description="Create a real production record or adjust filters to see live database rows."/>;
  return <div className="module-list">{asArray(records).map((row) => <button className="module-row" key={row.id} onClick={() => onSelect(row)}>{columns.map((column) => {
    const raw = row[column.key];
    const value = column.kind === 'money' ? money(Number(raw || 0)) : column.kind === 'date' ? dateTime(raw) : raw ?? '—';
    return <span key={column.key} data-label={column.label}>{column.kind === 'status' ? <StatusBadge status={String(value)}/> : column.kind === 'badge' ? <Badge>{String(value)}</Badge> : String(value)}</span>;
  })}</button>)}</div>;
}

export function DetailDrawer({ title, eyebrow, onClose, loading, error, children }: { title: string; eyebrow: string; onClose: () => void; loading?: boolean; error?: string; children: ReactNode }) {
  return <aside className="detail-drawer"><div className="drawer-header"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><Button variant="secondary" onClick={onClose}>Close</Button></div>{loading && <LoadingState title="Loading detail"/>}{error && <p className="error-text">{error}</p>}{children}</aside>;
}

export function DetailFacts({ rows }: { rows: Array<[string, ReactNode]> }) {
  return <div className="snapshot-list">{rows.map(([label, value]) => <p key={label}><strong>{label}</strong><span>{value || '—'}</span></p>)}</div>;
}

export function WorkflowButtons({ disabled, actions }: { disabled?: boolean; actions: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }> }) {
  return <div className="quick-actions">{actions.map((action) => <Button key={action.label} disabled={disabled} variant={action.variant === 'danger' ? 'secondary' : (action.variant || 'secondary')} onClick={action.onClick}>{action.label}</Button>)}</div>;
}

export function submitForm(handler: (form: FormData) => Promise<void>) {
  return async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); await handler(new FormData(event.currentTarget)); event.currentTarget.reset(); };
}

export function ModuleStatus({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <LoadingState title="Loading real module data" lines={3}/>;
  if (error) return <div className="card error-text">{error}</div>;
  return null;
}

export function useCanManage(permission: string | string[]) {
  const auth = useAuth();
  return Array.isArray(permission) ? permission.some((key) => auth.can(key)) : auth.can(permission);
}
