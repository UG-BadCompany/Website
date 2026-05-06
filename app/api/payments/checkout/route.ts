import { NextResponse } from "next/server";
import { makeId } from "../../../lib/auth";
import { addAudit, createPayment, getInvoice } from "../../../lib/database";
import { sendEmail } from "../../../lib/email";
import { createCheckoutSession } from "../../../lib/stripe";
import type { Payment } from "../../../lib/types";

export async function POST(request: Request) {
  const form = await request.formData();
  const invoiceId = form.get("invoiceId")?.toString();
  if (!invoiceId) return NextResponse.redirect(new URL("/portal/client?payment=missing-invoice", request.url), { status: 303 });
  const invoice = await getInvoice(invoiceId);
  if (!invoice) return NextResponse.redirect(new URL("/portal/client?payment=missing-invoice", request.url), { status: 303 });
  const checkout = await createCheckoutSession(invoice);
  const payment: Payment = { id: makeId(), invoiceId: invoice.id, provider: checkout.provider, providerSessionId: checkout.sessionId, amount: invoice.amountDue - invoice.amountPaid, status: "Pending", createdAt: new Date().toISOString() };
  await createPayment(payment);
  await sendEmail({ to: invoice.clientEmail, event: "deposit_payment_request", subject: `Payment link for ${invoice.invoiceNumber}`, body: `Payment link: ${checkout.url}` });
  await addAudit({ actor: "client", action: "create_checkout", entityType: "Payment", entityId: payment.id, details: `Stripe checkout ${checkout.sessionId} created` });
  return NextResponse.redirect(checkout.url, { status: 303 });
}
