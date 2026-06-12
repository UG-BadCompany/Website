import { useState } from 'react';
import { Badge, Button } from '../../components/ui';
import { apiJson, asArray, dateTime, DetailDrawer, DetailFacts, ModulePageFrame, ModuleStatus, RecordsTable, submitForm, text, Toolbar, useCanManage, useModuleRecords, useRecordDetail, WorkflowBoard, WorkflowButtons, type Row } from './moduleData';

type JobRow = Row & { title?: string; status?: string; technician?: string; client?: string; property?: string; scope?: string; scheduledAt?: string; completedAt?: string; requestId?: string; quoteId?: string; invoiceId?: string; attachments?: Row[] };
const statuses = ['scheduled','in_progress','blocked','completed','canceled'];

export function JobsPage() {
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [notice, setNotice] = useState('');
  const canManage = useCanManage(['jobs.manage','work_orders.manage']);
  const collection = useModuleRecords<JobRow>('/api/jobs', query);
  const detail = useRecordDetail<JobRow>('/api/jobs', selectedId);
  const selected = detail.record || collection.records.find((record) => record.id === selectedId);
  const workflow = async (path: string, message: string, payload: Record<string, unknown> = {}) => { await apiJson(path, { method: 'POST', body: JSON.stringify(payload) }); setNotice(message); await collection.reload(); if (selectedId) await detail.reload(selectedId); };
  return <ModulePageFrame permission={['jobs.view','work_orders.view']} title="Jobs / Work Orders" eyebrow="Standalone dispatch" description="Schedule and complete real work orders with assignment, field scope, closeout, invoice creation, and dispatch-specific detail views." action={<Badge>{collection.records.filter((row) => row.status !== 'completed').length} active jobs</Badge>}>
    <Toolbar query={query} onQuery={setQuery} canManage={canManage} createLabel="Create Work Order" onCreate={() => setShowCreate(!showCreate)} secondary={<select aria-label="Job status filter" onChange={(event) => setQuery(event.target.value)}><option value="">All jobs</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>}/>
    {notice && <p className="muted">{notice}</p>}
    {showCreate && <JobCreateForm onSaved={async () => { setShowCreate(false); await collection.reload(); }}/>}
    <ModuleStatus loading={collection.loading} error={collection.error}/>
    {!collection.loading && !collection.error && <><WorkflowBoard records={collection.records} statuses={statuses} onSelect={(row) => setSelectedId(row.id)} titleFor={(row) => row.title || row.client || row.id}/><section className="card"><div className="section-heading"><div><p className="eyebrow">Dispatch list</p><h2>Work orders</h2></div><Button variant="secondary" onClick={collection.reload}>Refresh</Button></div><RecordsTable records={collection.records} emptyTitle="No jobs scheduled" onSelect={(row) => setSelectedId(row.id)} columns={[{ key: 'title', label: 'Job' }, { key: 'status', label: 'Status', kind: 'status' }, { key: 'technician', label: 'Technician' }, { key: 'client', label: 'Client' }, { key: 'property', label: 'Property' }, { key: 'scheduledAt', label: 'Scheduled', kind: 'date' }]}/></section></>}
    {selected && <DetailDrawer eyebrow="Work order detail" title={selected.title || selected.client || selected.id} onClose={() => setSelectedId(undefined)} loading={detail.loading} error={detail.error}><section className="card"><h3>Dispatch</h3><DetailFacts rows={[["Status", selected.status], ["Technician", selected.technician], ["Client", selected.client], ["Property", selected.property], ["Scheduled", dateTime(selected.scheduledAt)], ["Completed", dateTime(selected.completedAt)]]}/><p>{selected.scope || 'No scope/checklist returned yet.'}</p></section><section className="card"><h3>Field workflow</h3><WorkflowButtons disabled={!canManage} actions={[{ label: 'Start job', onClick: () => workflow(`/api/jobs/${selected.id}/start`, 'Job started.') }, { label: 'Create invoice', onClick: () => workflow(`/api/jobs/${selected.id}/create-invoice`, 'Invoice created from job.') }, { label: 'Close out complete', onClick: () => workflow(`/api/jobs/${selected.id}/closeout`, 'Job closed out.', { outcome: 'completed', completionNotes: 'Closed from work order page' }) }]}/></section><section className="card"><h3>Linked workflow</h3><DetailFacts rows={[["Request", selected.requestId], ["Quote", selected.quoteId], ["Invoice", selected.invoiceId]]}/>{asArray(selected.attachments).map((file) => <p key={file.id}>{file.name}</p>)}</section></DetailDrawer>}
  </ModulePageFrame>;
}

function JobCreateForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState('');
  const save = submitForm(async (form) => { setStatus('Creating work order…'); await apiJson('/api/jobs', { method: 'POST', body: JSON.stringify({ title: text(form, 'title'), clientId: text(form, 'clientId'), propertyId: text(form, 'propertyId'), quoteId: text(form, 'quoteId'), requestId: text(form, 'requestId'), assignedUserId: text(form, 'assignedUserId'), scheduledAt: text(form, 'scheduledAt'), status: 'scheduled', scope: text(form, 'scope') }) }); setStatus('Work order created.'); await onSaved(); });
  return <form className="card module-form" onSubmit={save}><div className="section-heading"><div><p className="eyebrow">Dispatch form</p><h2>New work order</h2></div>{status && <Badge>{status}</Badge>}</div><input name="title" required placeholder="Job title"/><input name="clientId" placeholder="Client ID"/><input name="propertyId" placeholder="Property ID"/><input name="quoteId" placeholder="Quote ID"/><input name="requestId" placeholder="Request ID"/><input name="assignedUserId" placeholder="Technician/user ID"/><input name="scheduledAt" type="datetime-local"/><textarea name="scope" placeholder="Scope, checklist, labor/material notes"/><Button>Create dispatch-ready job</Button></form>;
}
