import { NextResponse } from "next/server";
import { defaultQuoteTerms } from "../../lib/config";
import { getSession, makeId } from "../../lib/auth";
import { addAudit, calculateQuote, moneyFromForm, nowIso, updateDatabase, upsertQuote } from "../../lib/database";
import { queueEmail } from "../../lib/email";
import type { Quote, QuoteLineItem } from "../../lib/types";

export async function POST(request: Request) {
  const form = await request.formData();
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.redirect(new URL("/login?role=admin", request.url), { status: 303 });
  const jobRequestId = form.get("jobRequestId")?.toString() || "manual";
  const labor: QuoteLineItem = { id: makeId("line"), type: "Labor", description: form.get("laborDescription")?.toString() || "Labor", quantity: moneyFromForm(form.get("laborQuantity")) || 1, unitPrice: moneyFromForm(form.get("laborRate")) };
  const materials: QuoteLineItem = { id: makeId("line"), type: "Materials", description: form.get("materialsDescription")?.toString() || "Materials", quantity: 1, unitPrice: moneyFromForm(form.get("materialsAmount")) };
  const lineItems = [labor, materials].filter((item) => item.unitPrice > 0);
  const tax = moneyFromForm(form.get("tax"));
  const discount = moneyFromForm(form.get("discount"));
  const totals = calculateQuote(lineItems, tax, discount);
  const createdAt = nowIso();
  const quote: Quote = {
    id: makeId("quote"),
    quoteNumber: `TA-${Date.now().toString().slice(-6)}`,
    jobRequestId,
    clientName: form.get("clientName")?.toString() || "Client",
    clientEmail: form.get("clientEmail")?.toString().trim().toLowerCase() || undefined,
    propertyAddress: form.get("propertyAddress")?.toString() || "Property pending",
    scopeOfWork: form.get("scopeOfWork")?.toString() || "Scope pending",
    includedWork: form.get("includedWork")?.toString() || "Work listed in this quote.",
    excludedWork: form.get("excludedWork")?.toString() || "Work not listed is excluded unless added by written change approval.",
    terms: form.get("terms")?.toString() || defaultQuoteTerms,
    lineItems,
    subtotal: totals.subtotal,
    tax,
    discount,
    total: totals.total,
    depositRequired: moneyFromForm(form.get("depositRequired")),
    expiresAt: form.get("expiresAt")?.toString() || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    status: "Sent",
    version: 1,
    createdAt,
    updatedAt: createdAt,
  };

  updateDatabase((database) => {
    upsertQuote(database, quote);
    const job = database.jobRequests.find((item) => item.id === jobRequestId);
    if (job) {
      job.status = "Quote sent";
      job.updatedAt = createdAt;
    }
    queueEmail(database, { to: quote.clientEmail, event: "quote_sent", subject: `T&A Contracting quote ${quote.quoteNumber}`, body: `Your quote total is ${quote.total}. Review it at /portal/quotes/${quote.id}.` });
    addAudit(database, { actor: session?.id ?? "admin", action: "send_quote", entityType: "Quote", entityId: quote.id, details: `Quote ${quote.quoteNumber} sent` });
  });

  return NextResponse.redirect(new URL(`/portal/quotes/${quote.id}`, request.url), { status: 303 });
}
