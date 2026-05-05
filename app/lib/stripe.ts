import type { Invoice } from "./types";

export function createCheckoutSession(invoice: Invoice) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  if (process.env.STRIPE_SECRET_KEY) {
    return {
      provider: "Stripe" as const,
      sessionId: `stripe_ready_${invoice.id}`,
      url: `${baseUrl}/portal/client?invoice=${invoice.id}&checkout=stripe-configured`,
    };
  }

  return {
    provider: "Manual" as const,
    sessionId: `manual_${invoice.id}`,
    url: `${baseUrl}/portal/client?invoice=${invoice.id}&checkout=manual-placeholder`,
  };
}
