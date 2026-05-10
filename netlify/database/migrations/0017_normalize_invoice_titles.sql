-- Backfill invoices that accidentally stored dashboard section copy as the invoice title.

update invoices
set title = concat(
    coalesce(nullif(trim(job_requests.service_type), ''), 'Completed work'),
    case
      when nullif(trim(coalesce(clients.full_name, clients.email, '')), '') is null then ''
      else concat(' — ', trim(coalesce(clients.full_name, clients.email)))
    end,
    ' invoice'
  ),
  updated_at = now()
from job_requests
left join app_users clients on clients.id = invoices.client_id
where invoices.job_request_id = job_requests.id
  and lower(trim(invoices.title)) = 'invoice & payment desk';
