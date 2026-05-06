import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth";
import { addAudit, getQuote, nowIso, updateJobStatus, updateQuoteResponse } from "../../../../lib/database";
import { sendEmail } from "../../../../lib/email";

export async function POST(request: Request, context: { params: Promise<{ quoteId: string }> }) {
  const form = await request.formData();
  const { quoteId } = await context.params;
  const session = await getSession();
  const quote = await getQuote(quoteId);
  if (!quote) return NextResponse.redirect(new URL("/portal/client?quote=missing", request.url), { status: 303 });
  const status: "Changes requested" | "Declined" = form.get("requestChanges") ? "Changes requested" : "Declined";
  const reason = form.get("reason")?.toString() || undefined;
  await updateQuoteResponse(quote.id, { status, declinedAt: nowIso(), declineReason: reason });
  if (quote.jobRequestId) await updateJobStatus(quote.jobRequestId, "Awaiting client response");
  await sendEmail({ to: process.env.ADMIN_NOTIFICATION_EMAIL, event: "quote_declined_notification", subject: `Quote ${quote.quoteNumber} update`, body: `${quote.clientName} responded: ${reason ?? status}.` });
  await addAudit({ actor: session?.id ?? quote.clientEmail ?? "client", action: status === "Changes requested" ? "request_changes" : "decline", entityType: "Quote", entityId: quote.id, details: reason ?? "No reason provided" });
  return NextResponse.redirect(new URL("/portal/client?quote-response=recorded", request.url), { status: 303 });
}
