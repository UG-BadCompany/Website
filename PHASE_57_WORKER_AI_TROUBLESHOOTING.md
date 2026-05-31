# Phase 57 — Worker AI Troubleshooting Module

## What changed

- Added a new **AI Troubleshooting** sidebar workspace under the Field group for worker/admin users.
- Added a worker/admin mobile quick action labeled **Troubleshoot** that opens the same workspace.
- Added the dashboard module `#worker-ai-troubleshooting` with a safety-first troubleshooting form for system/trade, equipment/component, make/model/serial, symptoms, error codes, readings, prior checks, safety conditions, urgency, and optional work order ID.
- Added the worker endpoint `/api/worker/ai-troubleshooting` backed by `netlify/functions/worker-ai-troubleshooting.mjs`.
- The endpoint returns a structured troubleshooting plan and falls back to a practical local plan when OpenAI is not configured or unavailable.
- The UI can generate plans, render result cards, copy generated plans, clear the form, and save generated notes to an attached work order when a work order ID is supplied.

## Safety behavior

- Troubleshooting output always includes lockout/tagout guidance and verify-power-off language for equipment access.
- Electrical, HVAC, gas, and refrigerant issues include supervisor/licensed-pro escalation language.
- The prompt and fallback plan prohibit permanent safety bypassing, unsafe live electrical work, venting refrigerant, ignoring code, and gas-leak work outside scope.

## Sidebar and routing

- Added workspace key `ai-troubleshooting` with target `#worker-ai-troubleshooting`.
- Phase 34 workspace routing maps AI Troubleshooting only to `#worker-ai-troubleshooting` and `[data-worker-ai-troubleshooting]`.
- Inventory remains a real `/inventory/` page navigation.
- Finance Center remains mapped to the Financial Command Center.

## Mobile UX

- Added mobile treatment for `.worker-ai-troubleshooting-suite` so form fields collapse to one column, buttons remain 44px+ tap targets, and actions stay reachable on phones.

## Verification added

- Sidebar workspace audit now validates AI Troubleshooting routing and mobile quick action wiring.
- Module completion audit validates the form, endpoint, and save/copy wiring.
- Mobile UX audit validates the mobile CSS hook and worker quick action.
- Sidebar, module completion, and mobile UX tests cover the new workspace.
