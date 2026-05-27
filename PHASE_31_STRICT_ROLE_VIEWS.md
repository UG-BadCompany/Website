# PHASE 31 STRICT ROLE VIEWS

Built on Phase 30.

## Changed

The dashboard view switcher is now strict:

- Admin view shows admin/admin-owned operations only.
- Client view shows client tools only.
- Worker view shows worker tools only.

Admin users may still access all views by clicking the view switcher, but the views no longer mix client and worker tools into the admin screen.

## Validation

```text
node scripts/audit-phase31-strict-role-views.mjs
npm run build
```
