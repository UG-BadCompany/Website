import { NextResponse } from "next/server";
import { getSession, makeId } from "../../../../lib/auth";
import { addAudit, createInvoice, getQuote, nowIso, updateJobStatus, updateQuoteResponse } from "../../../../lib/database";
import { sendEmail } from "../../../../lib/email";
import type { Invoice } from "../../../../lib/types";

export async function POST(request: Request, context: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await context.params;
  const session = await getSession();
  const quote = await getQuote(quoteId);
  if (!quote) return NextResponse.redirect(new URL("/portal/client?quote=missing", request.url), { status: 303 });
  const now = nowIso();
  await updateQuoteResponse(quote.id, { status: "Accepted", acceptedAt: now });
  if (quote.jobRequestId) await updateJobStatus(quote.jobRequestId, quote.depositRequired > 0 ? "Quote accepted" : "Scheduled");
  const invoiceAmount = quote.depositRequired > 0 ? quote.depositRequired : quote.total;
  const invoice: Invoice = { id: makeId(), invoiceNumber: `INV-${Date.now().toString().slice(-6)}`, quoteId: quote.id, clientName: quote.clientName, clientEmail: quote.clientEmail, amountDue: invoiceAmount, amountPaid: 0, dueAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), status: "Sent", createdAt: now };
  await createInvoice(invoice);
  await sendEmail({ to: quote.clientEmail, event: "quote_accepted_confirmation", subject: `Quote ${quote.quoteNumber} accepted`, body: `Quote ${quote.quoteNumber} was accepted. Invoice ${invoice.invoiceNumber} is ready.` });
  await sendEmail({ to: process.env.ADMIN_NOTIFICATION_EMAIL, event: "admin_quote_accepted", subject: `Quote ${quote.quoteNumber} accepted`, body: `${quote.clientName} accepted ${quote.quoteNumber}.` });
  await addAudit({ actor: session?.id ?? quote.clientEmail ?? "client", action: "accept", entityType: "Quote", entityId: quote.id, details: `Accepted version ${quote.version}` });
  return NextResponse.redirect(new URL(`/portal/client?accepted=${quote.id}`, request.url), { status: 303 });
}
