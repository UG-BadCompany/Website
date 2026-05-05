import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth";
import { addAudit, nowIso, updateDatabase } from "../../../../lib/database";
import { queueEmail } from "../../../../lib/email";

export async function POST(request: Request, context: { params: Promise<{ quoteId: string }> }) {
  const form = await request.formData();
  const { quoteId } = await context.params;
  const session = await getSession();
  updateDatabase((database) => {
    const quote = database.quotes.find((item) => item.id === quoteId);
    if (!quote) return;
    quote.status = form.get("requestChanges") ? "Changes requested" : "Declined";
    quote.declinedAt = nowIso();
    quote.declineReason = form.get("reason")?.toString() || undefined;
    quote.updatedAt = nowIso();
    const job = database.jobRequests.find((item) => item.id === quote.jobRequestId);
    if (job) job.status = "Awaiting client response";
    queueEmail(database, { event: "quote_declined_notification", subject: `Quote ${quote.quoteNumber} update`, body: `${quote.clientName} responded: ${quote.declineReason ?? quote.status}.` });
    addAudit(database, { actor: session?.id ?? quote.clientEmail ?? "client", action: quote.status === "Changes requested" ? "request_changes" : "decline", entityType: "Quote", entityId: quote.id, details: quote.declineReason ?? "No reason provided" });
  });
  return NextResponse.redirect(new URL("/portal/client?quote-response=recorded", request.url), { status: 303 });
}
