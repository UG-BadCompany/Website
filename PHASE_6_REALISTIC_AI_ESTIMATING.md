# PHASE 6 REALISTIC AI ESTIMATING UPGRADE

Built on Phase 5.

## Goal

Make the AI-generated estimate drafts less vague and more realistic for handyman work.

## What changed

### Request Estimate estimator
The backend estimator now creates a much richer draft from the public Request Estimate form.

It now includes:

- Trade/scope detection
- Labor phases with hour ranges
- Material allowances with realistic low/high ranges
- Trip charge
- Labor rate
- Material markup
- Contingency/risk buffer
- Low/high total estimate range
- Confidence score
- Missing information questions
- Risk/licensed-trade flags
- Exclusions
- Change-order triggers
- Admin next steps

Updated file:

```text
netlify/functions/create-job-request.mjs
```

### Admin Estimate Review
The Estimate Review queue now shows the richer draft details:

- Estimate range
- Confidence score
- Labor phases
- Material allowances
- Missing questions
- Risk flags

Updated files:

```text
netlify/functions/admin-estimate-review.mjs
public/assets/dashboard-phase2-upgrade.js
public/assets/dashboard-phase6-ai-estimates.css
```

## Better mini split estimating

Mini split install drafts now include things like:

- Indoor/outdoor layout
- Wall penetration
- Line set
- Line hide and fittings
- Communication wire
- Disconnect
- Whip
- Breaker
- Conduit
- Electrical run allowance
- Condensate drain
- Condenser pad/bracket
- Sealants/anchors/consumables
- Startup/testing
- Licensed HVAC/electrical/permit flags

## Important

The AI estimate is still admin-review only. It does not auto-send to customers.

## Included previous phases

This ZIP includes Phases 1–5 plus the Phase 6 AI estimating upgrade.
