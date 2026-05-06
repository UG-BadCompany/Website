import Stripe from "stripe";
import { siteUrl } from "./env";
import type { Invoice } from "./types";

export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function createCheckoutSession(invoice: Invoice) {
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: invoice.clientEmail,
    client_reference_id: invoice.id,
    success_url: `${siteUrl()}/portal/client?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/portal/client?payment=cancelled&invoice=${invoice.id}`,
    metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round((invoice.amountDue - invoice.amountPaid) * 100),
          product_data: { name: `T&A Contracting invoice ${invoice.invoiceNumber}` },
        },
      },
    ],
  });

  if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
  return { provider: "Stripe" as const, sessionId: session.id, url: session.url };
}
