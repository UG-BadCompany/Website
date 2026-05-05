import type { Metadata } from "next";
import { jobStatuses, portalCards } from "../../components/data";
import { currency } from "../../lib/format";
import { readDatabase } from "../../lib/database";

export const metadata: Metadata = { title: "Admin Portal", description: "Admin dashboard for T&A Contracting." };

export default async function AdminPortalPage() {
  const database = await readDatabase();
  const requests = database.jobRequests;
  const quotes = database.quotes;
  const invoices = database.invoices;
  const workers = database.users.filter((user) => user.role === "worker");

  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Admin dashboard</p>
      <h1>Run jobs from lead to quote to invoice to paid.</h1>
      <div className="metrics-grid">
        <article className="metric metric-rust"><span>Requests</span><strong>{requests.length || portalCards[0].value}</strong><p>New and active job requests</p></article>
        <article className="metric metric-tan"><span>Quotes</span><strong>{quotes.length}</strong><p>Draft, sent, accepted, and declined</p></article>
        <article className="metric metric-black"><span>Invoices</span><strong>{currency(invoices.reduce((sum, invoice) => sum + invoice.amountDue - invoice.amountPaid, 0))}</strong><p>Open balance</p></article>
        <article className="metric metric-rust"><span>Workers</span><strong>{workers.length}</strong><p>Available worker accounts</p></article>
      </div>

      <div className="portal-section">
        <h2>Job request inbox</h2>
        {requests.map((request) => <article className="wide-card" key={request.id}><div><h3>{request.name}</h3><p>{request.serviceCategory} at {request.propertyAddress}</p></div><div><strong>{request.status}</strong><p>{request.description}</p></div></article>)}
        {requests.length === 0 && <p className="lead">No job requests yet. Submitted estimate forms will appear here.</p>}
      </div>

      <div className="portal-section split">
        <form className="form-card" action="/api/quotes" method="post">
          <h2>Quote builder</h2>
          <label>Job request ID<input name="jobRequestId" placeholder={requests[0]?.id ?? "manual"} /></label>
          <label>Client name<input name="clientName" required /></label>
          <label>Client email, if available<input name="clientEmail" type="email" /></label>
          <label>Property address<input name="propertyAddress" required /></label>
          <label>Scope of work<textarea name="scopeOfWork" rows={4} required /></label>
          <label>Included work<textarea name="includedWork" rows={3} /></label>
          <label>Excluded work<textarea name="excludedWork" rows={3} /></label>
          <label>Labor description<input name="laborDescription" defaultValue="Labor" /></label>
          <label>Labor quantity<input name="laborQuantity" type="number" step="0.25" defaultValue="1" /></label>
          <label>Labor rate<input name="laborRate" type="number" step="0.01" /></label>
          <label>Materials description<input name="materialsDescription" defaultValue="Materials" /></label>
          <label>Materials amount<input name="materialsAmount" type="number" step="0.01" /></label>
          <label>Tax<input name="tax" type="number" step="0.01" defaultValue="0" /></label>
          <label>Discount<input name="discount" type="number" step="0.01" defaultValue="0" /></label>
          <label>Deposit required<input name="depositRequired" type="number" step="0.01" defaultValue="0" /></label>
          <label>Expires at<input name="expiresAt" type="date" /></label>
          <button className="button" type="submit">Send Quote</button>
        </form>

        <form className="form-card" action="/api/schedule" method="post">
          <h2>Schedule job</h2>
          <label>Job request ID<input name="jobRequestId" placeholder={requests[0]?.id ?? "job request ID"} /></label>
          <label>Worker<select name="workerId"><option value="">Unassigned</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select></label>
          <label>Starts at<input name="startsAt" type="datetime-local" /></label>
          <label>Ends at<input name="endsAt" type="datetime-local" /></label>
          <label>Notes<textarea name="notes" rows={4} /></label>
          <button className="button" type="submit">Schedule</button>
        </form>
      </div>

      <div className="panel"><h2>Job status pipeline</h2><div className="pipeline">{jobStatuses.map((status) => <span key={status}>{status}</span>)}</div></div>
    </section>
  );
}
