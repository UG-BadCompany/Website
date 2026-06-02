# Phase 16 — Responsive Design Parity

## Standard

Desktop and mobile are both first-class platforms for every module. A module is not complete until the desktop layout, mobile layout, desktop functionality, and mobile functionality are reviewed together.

## Required review widths

- Mobile: 320px, 375px, 390px, 414px
- Tablet: 768px
- Desktop: 1024px, 1280px, 1440px, 1920px

## What changed

- Added a global responsive parity CSS layer that is linked across every static page.
- Added desktop productivity guards for multi-column cards, two-panel shells, module lists, form grids, and table surfaces.
- Added tablet guards that retain two-column layouts where usable and collapse complex shells cleanly.
- Added mobile guards for single-column stacks, full-width touch actions, readable forms, safe card wrapping, and no page-level horizontal overflow.
- Added a source audit that validates the responsive parity layer is present, linked, and enforcing desktop/mobile standards.
- Added the responsive parity audit to the selected audit suite so future changes cannot ignore one platform.

## Owner questions for every future change

- How does this look on Desktop?
- How does this look on Mobile?

If either answer is poor, the module is not complete.
