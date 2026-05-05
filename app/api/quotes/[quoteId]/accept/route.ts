import { NextResponse } from "next/server";
import { getSession, makeId } from "../../../../lib/auth";
import { addAudit, nowIso, updateDatabase, upsertInvoice } from "../../../../lib/database";
import { queueEmail } from "../../../../lib/email";
import type { Invoice } from "../../../../lib/types";

export async function POST(request: Request, context: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await context.params;
  const session = await getSession();
  let redirectTo = "/portal/client";

  updateDatabase((database) => {
    const quote = database.quotes.find((item) => item.id === quoteId);
    if (!quote) return;
    const now = nowIso();
    quote.status = "Accepted";
    quote.acceptedAt = now;
    quote.updatedAt = now;
    const job = database.jobRequests.find((item) => item.id === quote.jobRequestId);
    if (job) {
      job.status = quote.depositRequired > 0 ? "Quote accepted" : "Scheduled";
      job.updatedAt = now;
    }
    const invoiceAmount = quote.depositRequired > 0 ? quote.depositRequired : quote.total;
    const invoice: Invoice = { id: makeId("invoice"), invoiceNumber: `INV-${Date.now().toString().slice(-6)}`, quoteId: quote.id, clientName: quote.clientName, clientEmail: quote.clientEmail, amountDue: invoiceAmount, amountPaid: 0, dueAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), status: "Sent", createdAt: now };
    upsertInvoice(database, invoice);
    queueEmail(database, { to: quote.clientEmail, event: "quote_accepted_confirmation", subject: `Quote ${quote.quoteNumber} accepted`, body: `Quote ${quote.quoteNumber} was accepted. Invoice ${invoice.invoiceNumber} is ready.` });
    queueEmail(database, { event: "admin_quote_accepted", subject: `Quote ${quote.quoteNumber} accepted`, body: `${quote.clientName} accepted ${quote.quoteNumber}.` });
    addAudit(database, { actor: session?.id ?? quote.clientEmail ?? "client", action: "accept", entityType: "Quote", entityId: quote.id, details: `Accepted version ${quote.version}` });
    redirectTo = `/portal/client?accepted=${quote.id}`;
  });

  return NextResponse.redirect(new URL(redirectTo, request.url), { status: 303 });
}
