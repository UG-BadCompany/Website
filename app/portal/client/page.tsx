import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "../../lib/auth";
import { currency, shortDate } from "../../lib/format";
import { findCurrentUser, readDatabase } from "../../lib/database";

export const metadata: Metadata = { title: "Client Portal", description: "Client dashboard for T&A Contracting." };

export default async function ClientPortalPage() {
  const database = readDatabase();
  const session = await getSession();
  const user = findCurrentUser(database, session);
  const clientRequests = user ? database.jobRequests.filter((item) => item.clientId === user.id || item.email === user.email) : database.jobRequests.slice(0, 5);
  const quotes = user ? database.quotes.filter((quote) => quote.clientEmail === user.email) : database.quotes.slice(0, 5);
  const invoices = user ? database.invoices.filter((invoice) => invoice.clientEmail === user.email) : database.invoices.slice(0, 5);
  const messages = database.messages.filter((message) => !message.internalOnly).slice(0, 5);

  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Client dashboard</p>
      <h1>Request, review, approve, pay, and track jobs.</h1>
      <div className="dashboard-layout">
        <aside className="panel">
          <h2>Quick action</h2>
          <Link className="button" href="/request-estimate">Request New Job</Link>
          <p>{user ? `Signed in as ${user.name}.` : "Showing recent portal activity until a client signs in."}</p>
        </aside>
        <div className="panel">
          <h2>Overview</h2>
          <div className="status-row"><span>Open job requests</span><strong>{clientRequests.filter((item) => item.status !== "Closed" && item.status !== "Canceled").length}</strong></div>
          <div className="status-row"><span>Quotes waiting for review</span><strong>{quotes.filter((quote) => quote.status === "Sent").length}</strong></div>
          <div className="status-row"><span>Unpaid invoices</span><strong>{invoices.filter((invoice) => invoice.status !== "Paid").length}</strong></div>
          <div className="status-row"><span>Recent messages</span><strong>{messages.length}</strong></div>
        </div>
      </div>

      <div className="portal-section">
        <h2>Job requests</h2>
        {clientRequests.map((request) => <article className="wide-card" key={request.id}><div><h3>{request.serviceCategory}</h3><p>{request.propertyAddress}</p></div><div><strong>{request.status}</strong><p>{request.description}</p></div></article>)}
      </div>

      <div className="portal-section">
        <h2>Quotes</h2>
        {quotes.map((quote) => <article className="wide-card" key={quote.id}><div><h3>{quote.quoteNumber}</h3><p>{quote.propertyAddress}</p></div><div><strong>{currency(quote.total)}</strong><p>Status: {quote.status}. Expires {shortDate(quote.expiresAt)}.</p><Link href={`/portal/quotes/${quote.id}`}>Review quote →</Link></div></article>)}
      </div>

      <div className="portal-section">
        <h2>Invoices and payments</h2>
        {invoices.map((invoice) => <article className="wide-card" key={invoice.id}><div><h3>{invoice.invoiceNumber}</h3><p>Due {shortDate(invoice.dueAt)}</p></div><div><strong>{currency(invoice.amountDue - invoice.amountPaid)}</strong><form action="/api/payments/checkout" method="post"><input type="hidden" name="invoiceId" value={invoice.id} /><button className="button" type="submit">Pay Online</button></form></div></article>)}
      </div>
    </section>
  );
}
