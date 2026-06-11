export type PaymentProviderName = 'square' | 'stripe' | 'paypal' | 'authorize_net' | 'manual' | 'configure_later';
export interface PaymentAdapter { name: PaymentProviderName; requiredEnv: string[]; createPayment(amountCents: number, invoiceId: string): Promise<{ status: string; providerRef?: string }> }
const envKeys: Record<PaymentProviderName, string[]> = {
  square: ['SQUARE_ACCESS_TOKEN','SQUARE_APPLICATION_ID','SQUARE_LOCATION_ID','SQUARE_ENVIRONMENT','SQUARE_WEBHOOK_SIGNATURE_KEY'],
  stripe: ['STRIPE_SECRET_KEY','STRIPE_PUBLISHABLE_KEY','STRIPE_WEBHOOK_SECRET'],
  paypal: ['PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_ENVIRONMENT'],
  authorize_net: ['AUTHORIZE_API_LOGIN_ID','AUTHORIZE_TRANSACTION_KEY','AUTHORIZE_ENVIRONMENT'],
  manual: [], configure_later: []
};
export function paymentAdapter(name: PaymentProviderName = 'square'): PaymentAdapter {
  return { name, requiredEnv: envKeys[name], createPayment: async (_amountCents, invoiceId) => ({ status: name === 'configure_later' ? 'not_configured' : 'pending', providerRef: `${name}:${invoiceId}` }) };
}
