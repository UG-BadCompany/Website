-- Backfill invoices that accidentally stored dashboard section copy as the invoice title.

with normalized_invoice_titles as (
  select
    invoices.id,
    concat(
      coalesce(nullif(trim(job_requests.service_type), ''), 'Completed work'),
      case
        when nullif(trim(coalesce(clients.full_name, clients.email, '')), '') is null then ''
        else concat(' — ', trim(coalesce(clients.full_name, clients.email)))
      end,
      ' invoice'
    ) as title
  from invoices
  join job_requests on job_requests.id = invoices.job_request_id
  left join app_users clients on clients.id = invoices.client_id
  where lower(trim(invoices.title)) = 'invoice & payment desk'
)
update invoices
set title = normalized_invoice_titles.title,
  updated_at = now()
from normalized_invoice_titles
where invoices.id = normalized_invoice_titles.id;
