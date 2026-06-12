import { useState } from 'react';
import { Badge, Button } from '../../components/ui';
import { apiJson, asArray, dateTime, DetailDrawer, DetailFacts, dollarsToCents, ModulePageFrame, ModuleStatus, money, RecordsTable, submitForm, text, Toolbar, useCanManage, useModuleRecords, type Row } from './moduleData';

type PaymentRow = Row & { status?: string; client?: string; invoice?: string; invoiceId?: string; method?: string; amount?: number; provider?: string; reference?: string; note?: string; receivedAt?: string };
const statuses = ['completed','pending','failed','refunded'];

export function PaymentsPage() {
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [notice, setNotice] = useState('');
  const canManage = useCanManage('payments.manage');
  const collection = useModuleRecords<PaymentRow>('/api/payments', query);
  const selected = collection.records.find((record) => record.id === selectedId);
  return <ModulePageFrame permission="payments.view" title="Payments" eyebrow="Standalone payment ledger" description="Record manual payments, inspect provider data, apply receipts to invoices, and keep invoice balances current through real APIs." action={<Badge>{money(asArray(collection.records).reduce((sum, row) => sum + Number(row.amount || 0), 0))} recorded</Badge>}>
    <Toolbar query={query} onQuery={setQuery} canManage={canManage} createLabel="Record Payment" onCreate={() => setShowCreate(!showCreate)} secondary={<select aria-label="Payment status filter" onChange={(event) => setQuery(event.target.value)}><option value="">All payments</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>}/>
    {notice && <p className="muted">{notice}</p>}
    {showCreate && <PaymentCreateForm onSaved={async () => { setShowCreate(false); setNotice('Payment recorded and invoice balance recalculated.'); await collection.reload(); }}/>}
    <ModuleStatus loading={collection.loading} error={collection.error}/>
    {!collection.loading && !collection.error && <section className="card"><div className="section-heading"><div><p className="eyebrow">Ledger</p><h2>Payment records</h2></div><Button variant="secondary" onClick={collection.reload}>Refresh</Button></div><RecordsTable records={collection.records} emptyTitle="No payments recorded" onSelect={(row) => setSelectedId(row.id)} columns={[{ key: 'client', label: 'Client' }, { key: 'invoice', label: 'Invoice' }, { key: 'method', label: 'Method' }, { key: 'status', label: 'Status', kind: 'status' }, { key: 'amount', label: 'Amount', kind: 'money' }, { key: 'receivedAt', label: 'Received', kind: 'date' }]}/></section>}
    {selected && <DetailDrawer eyebrow="Payment detail" title={`${selected.method || 'Payment'} · ${money(selected.amount)}`} onClose={() => setSelectedId(undefined)}><section className="card"><h3>Application</h3><DetailFacts rows={[["Status", selected.status], ["Client", selected.client], ["Invoice", selected.invoice || selected.invoiceId], ["Amount", money(selected.amount)], ["Method", selected.method], ["Reference", selected.reference], ["Received", dateTime(selected.receivedAt)]]}/></section><section className="card"><h3>Provider and audit</h3><DetailFacts rows={[["Provider", selected.provider || 'manual'], ["Note", selected.note]]}/><p className="muted">Payments are written through the payments API so linked invoice balances stay synchronized.</p></section></DetailDrawer>}
  </ModulePageFrame>;
}

function PaymentCreateForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState('');
  const save = submitForm(async (form) => { setStatus('Recording payment…'); await apiJson('/api/payments/manual', { method: 'POST', body: JSON.stringify({ invoiceId: text(form, 'invoiceId'), clientId: text(form, 'clientId'), amount: dollarsToCents(form.get('amount')), method: text(form, 'method') || 'cash', reference: text(form, 'reference'), note: text(form, 'note'), status: 'completed' }) }); setStatus('Payment recorded.'); await onSaved(); });
  return <form className="card module-form" onSubmit={save}><div className="section-heading"><div><p className="eyebrow">Manual payment</p><h2>Record payment</h2></div>{status && <Badge>{status}</Badge>}</div><input name="invoiceId" placeholder="Invoice ID"/><input name="clientId" placeholder="Client ID"/><select name="method"><option>cash</option><option>check</option><option>card external</option><option>ACH</option><option>other</option></select><input name="amount" type="number" step="0.01" required placeholder="Amount (dollars)"/><input name="reference" placeholder="Reference / check number"/><textarea name="note" placeholder="Internal note"/><Button>Record real payment</Button></form>;
}
