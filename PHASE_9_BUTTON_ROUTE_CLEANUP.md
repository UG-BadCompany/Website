# PHASE 9 BUTTON / PAGE / ROUTE CLEANUP

Built on Phase 8.

## What was fixed

The dashboard shortcut card block shown in the screenshot was removed:

- Work orders card
- Invoices card
- Inventory card
- Roles & users card
- Audit activity card
- Alerts card

Those cards were confusing because some were shortcut buttons that did not clearly route anywhere.

## What replaced it

A smaller set of real linked buttons now points to existing sections:

```text
Estimate Review
Finance Center
Requests
Quotes
Worker Jobs
```

The debug fallback shortcut cards were also cleaned up and changed into real section links.

## Button/route hardening

Added:

```text
npm run audit:phase9
```

This verifies:

- required pages exist
- required API functions exist
- required dashboard anchors exist or are dynamically mounted
- required Netlify redirects exist
- dead shortcut card copy is not present

## Smooth link behavior

Dashboard anchor links now wait briefly for dynamically mounted sections before showing a warning. This helps with sections like:

```text
#estimate-review
#finance-command-center
#executive-overview
```

## Passed

```text
npm run audit:phase9
npm run build
```

## Included previous phases

This ZIP includes Phases 1–8 plus this Phase 9 cleanup.
