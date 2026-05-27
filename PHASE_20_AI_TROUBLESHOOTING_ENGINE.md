# PHASE 20 AI TROUBLESHOOTING ENGINE

Built on Phase 19.

## Added

- Diagnostic plan generation
- Likely causes with probability labels
- Recommended field tests
- Likely parts
- Repair range guidance
- Repair-vs-replace triggers
- Safety/licensed-trade stop flags
- Admin troubleshooting display inside Estimate Review

## Supported starting categories

- HVAC / mini split no-cool/no-heat
- Plumbing leaks/clogs/fixture issues
- Electrical outlet/switch/breaker/GFCI issues
- Appliance install/service issues
- General unknown diagnostic fallback

## Validation

```text
node scripts/audit-phase20-troubleshooting.mjs
npm run build
```
