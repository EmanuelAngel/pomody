# Feature: Layout Shell Localization & Settings Drawer Cleanup (Slice 2.5)

- **Issue**: #111 (Parent: #92)
- **Specification**: `docs/features/i18n.md` (Slice 2.5 Polish)
- **Branch**: `feat/i18n-layout-slice`
- **Delivery Strategy**: `single-pr` (Forecasted changed lines: ~120 LOC, budget: 400 LOC)
- **TDD Mode**: Enabled (`pnpm vitest run <test-file> --project client`)
- **Route**: Direct inline

## Objective & Why

Localize the shell navigation header (`Header`) and daily focus statusline counter (`DailyCounter`) using Paraglide-JS and the reactive proxy `t`. In addition, remove the redundant description subtitle from `SettingsDrawer` to streamline drawer visual hierarchy and reduce cognitive load.

## Scope & Constraints

- Localize presentation components in `src/lib/components/layout/header.svelte` and `src/lib/components/layout/daily-counter.svelte`.
- Remove redundant visual description copy in `src/lib/components/settings/settings-drawer.svelte` without breaking sheet accessibility.
- Preserve Hexagonal Domain isolation (zero i18n dependencies in `src/lib/domain/`).
- Strictly ban barrel files (`index.ts` forbidden outside `src/lib/components/ui/`).
- Add reactive locale switching tests verifying DOM updates in English and Spanish.

## Tasks

- [ ] **TASK-1: Define message keys in catalogs**
  - Path: `messages/en.json`, `messages/es.json`
  - Action: Add keys for header navigation tabs, aria-labels, metrics badge, and daily counter summary formats.
  - Route: inline
  - Checks: `pnpm check`
  - Commit evidence: pending

- [ ] **TASK-2: Localize Header and DailyCounter components**
  - Path: `src/lib/components/layout/header.svelte`, `src/lib/components/layout/daily-counter.svelte`, test files
  - Action: Replace hardcoded strings with `t.*()`; add reactive locale switching tests.
  - Route: inline
  - Checks: `pnpm vitest run src/lib/components/layout/header.svelte.test.ts src/lib/components/layout/daily-counter.svelte.test.ts --project client`, `pnpm check`
  - Commit evidence: pending

- [ ] **TASK-3: Remove redundant subtitle from SettingsDrawer**
  - Path: `src/lib/components/settings/settings-drawer.svelte`, `src/lib/components/settings/settings.svelte.test.ts`
  - Action: Remove visual description copy from header; update tests.
  - Route: inline
  - Checks: `pnpm vitest run src/lib/components/settings/settings.svelte.test.ts --project client`, `pnpm check`
  - Commit evidence: pending

- [ ] **TASK-4: Verification Gate & Final Checks**
  - Action: Execute full test and lint suite (`pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:browser`).
  - Route: inline
  - Checks: 0 errors in `pnpm check`, 0 issues in `pnpm lint`, full pass in `pnpm test:unit` and `pnpm test:browser`.
  - Commit evidence: pending
