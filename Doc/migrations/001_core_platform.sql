-- Core production schema for the White-Label Contractor CMMS + AI Quoting Platform.
-- Netlify Functions apply this schema idempotently through shared/db.mjs during install and API access; pending migrations are recorded in schema_migrations and run automatically before installer/API database work.
create extension if not exists pgcrypto;
-- Tables created: platform_installation, company_settings, homepage_settings, app_users, roles, permissions,
-- role_permissions, user_roles, workspace_access, module_registry, module_settings, service_categories, theme_settings,
-- customers, customer_properties, estimate_requests, quotes, work_orders, inventory_items,
-- inventory_transactions, invoices, payments, files, workflow_events, audit_logs, magic_link_tokens,
-- platform_secret_settings.
