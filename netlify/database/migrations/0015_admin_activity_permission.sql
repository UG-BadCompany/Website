-- Admin audit activity permission for viewing recent activity events.

with permission_defaults(role_key, permission_key) as (
  values
    ('admin', 'admin.activity.view')
)
insert into role_permissions (role_id, permission_key, enabled)
select roles.id, permission_defaults.permission_key, true
from permission_defaults
join roles on roles.key = permission_defaults.role_key
on conflict (role_id, permission_key) do update set
  enabled = true,
  updated_at = now();
