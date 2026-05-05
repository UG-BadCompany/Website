import { NextResponse } from "next/server";
import { makeId } from "../../../lib/auth";
import { addAudit, nowIso, updateDatabase, upsertPayment } from "../../../lib/database";
import { queueEmail } from "../../../lib/email";
import { createCheckoutSession } from "../../../lib/stripe";
import type { Payment } from "../../../lib/types";

export async function POST(request: Request) {
  const form = await request.formData();
  const invoiceId = form.get("invoiceId")?.toString();
  let checkoutUrl = "/portal/client?payment=missing-invoice";
  updateDatabase((database) => {
    const invoice = database.invoices.find((item) => item.id === invoiceId);
    if (!invoice) return;
    const checkout = createCheckoutSession(invoice);
    checkoutUrl = checkout.url;
    const payment: Payment = { id: makeId("pay"), invoiceId: invoice.id, provider: checkout.provider, providerSessionId: checkout.sessionId, amount: invoice.amountDue - invoice.amountPaid, status: checkout.provider === "Manual" ? "Pending" : "Pending", createdAt: nowIso() };
    upsertPayment(database, payment);
    queueEmail(database, { to: invoice.clientEmail, event: "deposit_payment_request", subject: `Payment link for ${invoice.invoiceNumber}`, body: `Payment session ${checkout.sessionId} is ready.` });
    addAudit(database, { actor: "client", action: "create_checkout", entityType: "Payment", entityId: payment.id, details: `${checkout.provider} checkout created` });
  });
  return NextResponse.redirect(checkoutUrl, { status: 303 });
}
