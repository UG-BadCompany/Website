import { NextResponse } from "next/server";
import { addAudit, getInvoice, updateInvoicePaid, updatePaymentStatus } from "../../../lib/database";
import { sendEmail } from "../../../lib/email";
import { stripeClient } from "../../../lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new NextResponse("Missing Stripe webhook configuration", { status: 400 });

  const rawBody = await request.text();
  let event;
  try {
    event = stripeClient().webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    return new NextResponse(`Webhook signature verification failed: ${error instanceof Error ? error.message : "unknown"}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const invoiceId = session.metadata?.invoiceId || session.client_reference_id || undefined;
    if (invoiceId) {
      const invoice = await getInvoice(invoiceId);
      if (invoice) {
        await updateInvoicePaid(invoice.id, invoice.amountDue, session.id);
        await updatePaymentStatus(session.id, "Paid", typeof session.payment_intent === "string" ? session.payment_intent : undefined);
        await sendEmail({ to: invoice.clientEmail, event: "payment_receipt", subject: `Payment received for ${invoice.invoiceNumber}`, body: `Payment for invoice ${invoice.invoiceNumber} was received. Thank you.` });
        await addAudit({ actor: "stripe", action: "checkout.session.completed", entityType: "Invoice", entityId: invoice.id, details: session.id });
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    await updatePaymentStatus(session.id, "Failed");
    await addAudit({ actor: "stripe", action: "checkout.session.expired", entityType: "Payment", entityId: session.id, details: "Checkout session expired" });
  }

  return NextResponse.json({ received: true });
}
