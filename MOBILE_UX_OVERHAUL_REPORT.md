# Mobile UX Navigation + App Shell Report

## Reason for Follow-Up

The previous mobile SaaS-only shell went too far and risked hiding dashboard modules. This pass keeps the proven dashboard, role system, sidebar drawer, mobile quick actions, and workspace router intact while adding a professional mobile app layer that is additive only.

## Issues Found

- Home, Dashboard, and Request Estimate needed explicit, stable routes on mobile and desktop.
- The role switcher existed, but mobile users needed a clearer app-style selector for Owner/Admin/Client/Worker without replacing bootstrap role switching.
- The dashboard needed mobile KPI cards and priorities, but those cards could not hide or replace existing modules.
- The mobile experience needed bottom navigation and a floating create action without dead buttons.
- The giant visible `Open workspace menu` label was not acceptable on mobile, but the drawer itself is still required for full module access.
- Large blank-space risk came from mobile-only layout layers that added global padding/min-height without preserving module access.

## Fixes Made

- Kept working header links:
  - Home: `/`
  - Dashboard: `/dashboard/`
  - Request Estimate: `/#estimate`
- Added a mobile account summary with dynamic greeting, current role, notifications, and avatar/profile access.
- Added a mobile role selector for Owner, Admin, Client, and Worker that calls the existing `window.taSetDashboardView` function instead of creating a second role system.
- Added modern mobile dashboard cards for Revenue, Open Jobs, Pending Quotes, and New Requests, hydrated from existing dashboard metrics when available.
- Added Today's Priorities for estimate review, overdue/active jobs, inventory alerts, and past due invoices.
- Added Quick Actions and Operations cards for Requests, Quotes, Jobs, Invoices, Inventory, and AI Troubleshooter while keeping existing module anchors/routes.
- Added bottom navigation for Home, Requests, Quotes, Jobs, and More; More opens the existing sidebar drawer so every module remains reachable.
- Added a floating plus menu for New Estimate, New Invoice, New Job, New Customer, and New Request. New Customer is intentionally disabled with a clear explanation because customer creation currently flows through request intake.
- Kept the large `Open workspace menu` label removed by using a compact 44px icon control with screen-reader text.

## Functionality Preserved

- Admin, client, worker, and owner/admin role access uses the existing bootstrap role-switching API.
- Sidebar drawer remains available on mobile for all modules.
- Mobile quick actions remain role-aware.
- Inventory remains a real `/inventory/` link.
- AI Troubleshooting remains available to admin and worker views.
- Existing modules are not hidden for mobile-only cosmetic reasons.

## Risk Assessment

Low to medium. The changes are additive HTML/CSS/JS on top of the existing dashboard architecture. The new mobile controls route through existing anchors, `window.taSetDashboardView`, and `window.taSetSidebarWorkspace` instead of replacing authentication, permissions, or dashboard module logic.
