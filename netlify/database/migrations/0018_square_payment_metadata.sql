-- Payment provider metadata for Square-hosted checkout and future embedded payments.

alter table invoices
  add column if not exists payment_provider text not null default 'manual',
  add column if not exists provider_invoice_id text,
  add column if not exists provider_checkout_id text,
  add column if not exists provider_checkout_url text,
  add column if not exists provider_status text,
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb;

alter table payments
  add column if not exists payment_provider text not null default 'manual',
  add column if not exists provider_payment_id text,
  add column if not exists provider_status text,
  add column if not exists provider_receipt_url text,
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_invoices_provider_checkout_id on invoices (provider_checkout_id);
create index if not exists idx_payments_provider_payment_id on payments (provider_payment_id);
