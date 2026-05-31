# Safe Cleanup Report

Date: 2026-05-29

## Scope and Safety Rules

This pass intentionally favored safety over deletion. I searched references before identifying candidates and did **not** remove code unless it met the requested threshold of at least 95% confidence with no references. No candidate reached that threshold without risk, so this pass documents cleanup debt and adds legacy-review comments only.

Commands used for inspection included:

- `rg -n "dashboard-phase3[01456]|dashboard/modules/dashboard/bootstrap|mobile-field-ux|module-completion" public/dashboard/index.html public/**/*.html package.json netlify.toml`
- `rg -n "taSetDashboardView|taSetSidebarWorkspace|data-sidebar-workspace-section|data-view-button|MutationObserver|addEventListener\('click'" public/assets/dashboard-phase3*.js public/dashboard/modules/dashboard/bootstrap.js`
- `rg -n "audit-phase33|phase33-workspace" package.json scripts tests public`
- `rg -n "dashboard-phase33-workspace-routes.js|dashboard-phase33-workspace-routes.css" public package.json scripts tests netlify.toml`

## Dashboard Architecture Ownership

### `public/dashboard/modules/dashboard/bootstrap.js`

- **Owns:** real dashboard role switching via `window.taSetDashboardView`, data loading, modal/action wiring, and core admin/client/worker behavior.
- **Overlap risk:** many feature event listeners live here because it is the primary dashboard bootstrap. Do not split without a dedicated architecture phase.
- **Cleanup action:** none.

### `public/assets/dashboard-phase30-sidebar.js`

- **Owns:** sidebar shell rendering, sidebar buttons, mobile quick-action rendering, role-aware sidebar/mobile visibility, and Inventory as a real `/inventory/` href.
- **Overlap risk:** validates destinations defensively because it may load before all dynamic modules are mounted; Phase 34 also validates destinations after workspace routing is available.
- **Cleanup action:** documented as intentional overlap; no deletion.

### `public/assets/dashboard-phase31-strict-role-views.js`

- **Owns:** advisory role-view hints by tagging sections with `data-strict-view`.
- **Does not own:** role switching; it must not replace `window.taSetDashboardView`.
- **Overlap risk:** some visibility concepts overlap with bootstrap and Phase 30, but current implementation is non-authoritative and safe.
- **Cleanup action:** no deletion.

### `public/assets/dashboard-phase34-sidebar-only-workspaces.js`

- **Owns:** workspace route map, workspace section tagging, active sidebar/mobile workspace state, and module scrolling.
- **Overlap risk:** shares target validation concerns with Phase 30 so visible controls do not become dead buttons if scripts mount out of order.
- **Cleanup action:** no deletion.

### `public/assets/dashboard-phase35-remove-top-tabs.js`

- **Owns:** removal of old Phase 33 top workspace tab UI from cached/legacy markup.
- **Overlap risk:** overlaps with Phase 36 legacy workspace cleanup.
- **Cleanup action:** added cleanup-candidate comments only.

### `public/assets/dashboard-phase36-remove-old-workspace.js`

- **Owns:** removal of old `?workspace=` query behavior and old workspace tab UI from cached/legacy markup.
- **Overlap risk:** overlaps with Phase 35 top-tab cleanup.
- **Cleanup action:** added cleanup-candidate comments only.

## Cleanup Candidates

---

### Candidate 1

**File:** `public/assets/dashboard-phase33-workspace-routes.js`

**Reason:** Legacy top workspace route script. Phase 34 replaced the active sidebar-only workspace router, and dashboard HTML no longer includes this asset.

**References found:**

- `scripts/audit-phase33-workspace-routes.mjs`
- `scripts/audit-phase34-sidebar-only-workspaces.mjs`
- `scripts/audit-phase35-remove-top-tabs.mjs`
- `scripts/audit-phase36-remove-old-workspace.mjs`
- `package.json` still exposes `audit:phase33`

**Confidence:** 85%

**Safe to remove:** No

**Notes:** The app does not appear to load it, but audit scripts still reference it directly. Removing it could break legacy phase audits.

---

### Candidate 2

**File:** `public/assets/dashboard-phase33-workspace-routes.css`

**Reason:** Legacy top workspace route styling paired with the old Phase 33 router. Dashboard HTML no longer includes it.

**References found:**

- `scripts/audit-phase33-workspace-routes.mjs`
- `scripts/audit-phase34-sidebar-only-workspaces.mjs`
- `scripts/audit-phase35-remove-top-tabs.mjs`
- `scripts/audit-phase36-remove-old-workspace.mjs`
- `package.json` still exposes `audit:phase33`

**Confidence:** 85%

**Safe to remove:** No

**Notes:** Same risk as Candidate 1; keep until obsolete phase audits are retired.

---

### Candidate 3

**File:** `scripts/audit-phase33-workspace-routes.mjs`

**Reason:** This audit expects Phase 33 top workspace assets to be included, while later Phase 34/35/36 audits expect those assets to be removed or suppressed. This is now contradictory legacy audit coverage.

**References found:**

- `package.json` script `audit:phase33`

**Confidence:** 80%

**Safe to remove:** No

**Notes:** Keep until the project intentionally removes the Phase 33 npm script or converts it into a historical/legacy audit.

---

### Candidate 4

**Files:**

- `public/assets/dashboard-phase35-remove-top-tabs.js`
- `public/assets/dashboard-phase36-remove-old-workspace.js`

**Reason:** Both remove legacy workspace route tabs and route-note UI. Phase 36 additionally removes old `?workspace=` query behavior.

**References found:**

- Both are included by `public/dashboard/index.html`.
- Both have related audit scripts.

**Confidence:** 70%

**Safe to remove:** No

**Notes:** This is deliberate legacy hardening for cached or stale dashboard markup. Added `// CLEANUP CANDIDATE` comments for future review.

---

### Candidate 5

**Files:**

- `public/assets/dashboard-phase35-remove-top-tabs.css`
- `public/assets/dashboard-phase36-remove-old-workspace.css`

**Reason:** Both hide old workspace tab/note selectors. Phase 35 is more comprehensive; Phase 36 provides a smaller duplicate safety layer.

**References found:**

- Both are included by `public/dashboard/index.html`.
- Both have related audit scripts.

**Confidence:** 70%

**Safe to remove:** No

**Notes:** Keep until cached Phase 33 tab markup is no longer a concern. Added CSS cleanup-candidate comments.

---

### Candidate 6

**Files:**

- `public/assets/dashboard-phase30-sidebar.js`
- `public/assets/dashboard-phase34-sidebar-only-workspaces.js`

**Reason:** Both validate whether visible sidebar/mobile controls have destinations. This looks duplicative, but Phase 30 renders controls and Phase 34 owns workspace routing after dynamic modules mount.

**References found:**

- Both are included by `public/dashboard/index.html`.
- `tests/sidebar-workspaces.spec.mjs` and `scripts/audit-sidebar-workspaces.mjs` verify both behaviors.

**Confidence:** 45%

**Safe to remove:** No

**Notes:** This is likely intentional defensive overlap because dashboard modules mount asynchronously. Do not merge without browser-backed regression tests.

---

### Candidate 7

**File:** `public/assets/dashboard-phase31-strict-role-views.css`

**Reason:** The current Phase 31 JavaScript is advisory and no longer owns role switching. The CSS may now be mostly safety styling for role filtering.

**References found:**

- Included by `public/dashboard/index.html`.
- Referenced by `scripts/audit-phase31-strict-role-views.mjs`.

**Confidence:** 40%

**Safe to remove:** No

**Notes:** Keep because it is still loaded and audited. Removing could regress role isolation styling.

---

### Candidate 8

**Location:** `out/`

**Reason:** Generated static output changes after `npm run build`. Many generated files appear as modified/untracked during local builds.

**References found:**

- Netlify publish directory verified by build scripts.
- Generated from `public/` by `scripts/build-static-site.mjs`.

**Confidence:** 95% that local generated diffs should not be committed unless intentionally publishing static output changes.

**Safe to remove:** No source deletion. Local generated diffs are safe to reset after validation.

**Notes:** Build-generated `out/` changes were cleaned from the working tree after tests to keep the source patch focused.

## Items Removed

None. No source code met the threshold of **confidence >= 95%** plus **no references found anywhere**.

## Comments Added

Cleanup-candidate comments were added to Phase 35/36 JS and CSS files to document the overlap without changing behavior.

## Risk Assessment

- **Runtime risk:** Low. The pass only adds documentation/comments and a report.
- **Deletion risk:** None. No functional source code was removed.
- **Known technical debt:** Phase 33 historical audit/assets and Phase 35/36 legacy cleanup overlap should be reviewed in a dedicated cleanup phase after deciding whether old phase audits must remain runnable.
- **Recommended next step:** Create a dedicated `legacy-audits` section or retire contradictory Phase 33 audit expectations once CI no longer depends on them.
