import type { Metadata } from "next";
import Link from "next/link";
import { currency, shortDate } from "../../../lib/format";
import { quotePdfText } from "../../../lib/pdf";
import { readDatabase } from "../../../lib/database";

export const metadata: Metadata = { title: "Quote Review", description: "Review, accept, decline, or request changes for a T&A Contracting quote." };

export default async function QuoteReviewPage(context: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await context.params;
  const database = readDatabase();
  const quote = database.quotes.find((item) => item.id === quoteId);
  if (!quote) {
    return <section className="section-wrap page-top"><h1>Quote not found.</h1><Link className="button" href="/portal/client">Back to portal</Link></section>;
  }

  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Quote review</p>
      <h1>{quote.quoteNumber}</h1>
      <div className="dashboard-layout">
        <article className="panel"><h2>{currency(quote.total)}</h2><p>Status: {quote.status}</p><p>Expires: {shortDate(quote.expiresAt)}</p><Link className="button" href={`/api/quotes/${quote.id}/pdf`}>Download Quote PDF</Link></article>
        <article className="panel"><h2>Property</h2><p>{quote.propertyAddress}</p><h3>Client</h3><p>{quote.clientName}</p></article>
      </div>

      <div className="portal-section wide-card"><div><h2>Scope of work</h2><p>{quote.scopeOfWork}</p><h3>Included</h3><p>{quote.includedWork}</p><h3>Excluded</h3><p>{quote.excludedWork}</p></div><div><h2>Line items</h2>{quote.lineItems.map((item) => <div className="status-row" key={item.id}><span>{item.type}: {item.description}</span><strong>{currency(item.quantity * item.unitPrice)}</strong></div>)}<div className="status-row"><span>Subtotal</span><strong>{currency(quote.subtotal)}</strong></div><div className="status-row"><span>Tax</span><strong>{currency(quote.tax)}</strong></div><div className="status-row"><span>Discount</span><strong>{currency(quote.discount)}</strong></div><div className="status-row"><span>Total</span><strong>{currency(quote.total)}</strong></div><div className="status-row"><span>Deposit</span><strong>{currency(quote.depositRequired)}</strong></div></div></div>

      <article className="panel"><h2>Terms acknowledgment</h2><p>{quote.terms}</p></article>
      <div className="auth-grid">
        <form className="form-card" action={`/api/quotes/${quote.id}/accept`} method="post"><h2>Accept quote</h2><label className="task"><input name="terms" type="checkbox" required />I acknowledge the quote terms and authorize T&A Contracting to proceed.</label><button className="button" type="submit">Accept Quote</button></form>
        <form className="form-card" action={`/api/quotes/${quote.id}/decline`} method="post"><h2>Decline or request changes</h2><label>Reason or requested changes<textarea name="reason" rows={4} /></label><label className="task"><input name="requestChanges" type="checkbox" />Request changes instead of declining</label><button className="button button-secondary" type="submit">Send Response</button></form>
      </div>
      <details className="panel"><summary>PDF text preview</summary><pre>{quotePdfText(quote)}</pre></details>
    </section>
  );
}
