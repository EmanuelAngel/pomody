# Feature: Break Activities & Task Dialogs Localization (Slice 2.4)

- **Issue**: #99 (Parent: #92)
- **Specification**: `docs/features/i18n.md` (Slice 2.4)
- **Branch**: `feat/i18n-breaks-tasks-slice`
- **Delivery Strategy**: `single-pr` (Forecasted changed lines: ~380 LOC, budget: 400 LOC)
- **TDD Mode**: Enabled (`pnpm vitest run <test-file> --project client`)
- **Route**: Delegated direct (mapping completed via subagent, bounded writers for edits)

## Objective & Why

Localize the break activities catalog, preset break micro-guides with semantic resolution, CRUD form dialogs, destructive confirmation modals, and task backlog / item management components using Paraglide-JS and the reactive proxy `t` from `$lib/state/locale.svelte`. This completes Milestone 3 (i18n) by providing full Spanish & English support across all secondary dialogs and catalogs without runtime bloat or breaking domain isolation.

## Scope & Constraints

- Localize presentation layer in `src/lib/components/breaks/` and `src/lib/components/planning/` (strictly direct imports, no barrel files).
- Keep domain entities in `src/lib/domain/` 100% pure TypeScript (zero i18n / Paraglide imports). Semantic resolution of preset IDs happens in the presentation layer.
- Preserve fallback to custom titles and guides if an activity ID is not a recognized preset, guaranteeing 100% backward compatibility with existing tests and custom user habits.
- Maintain exact English strings to prevent regressions in existing Vitest tests.
- Add reactive locale switching test suites verifying DOM updates when switching `en` <-> `es`.
- Respect strict 400 LOC PR budget.

## Tasks

- [x] **TASK-1: Define message keys in catalogs**
  - Path: `messages/en.json`, `messages/es.json`
  - Action: Add translation keys for 10 preset break activities (titles + guides), break catalog controls and empty states, break form dialog, break confirm dialog, and task backlog / task items.
  - Route: inline
  - Checks: `pnpm check` (passed)
  - Commit evidence: `8405b26`

- [x] **TASK-2: Localize preset break activities resolver and break components**
  - Path: `src/lib/components/breaks/break-preset-i18n.ts`, `src/lib/components/breaks/break-card.svelte`, `src/lib/components/breaks/break-catalog.svelte`, `src/lib/components/breaks/break-form-dialog.svelte`, `src/lib/components/breaks/break-confirm-dialog.svelte`, `src/lib/components/timer/break-revitalization.svelte`
  - Action: Implement semantic preset localization helper with fallback; replace hardcoded strings with `t.*()`; add reactive i18n tests.
  - Route: delegated direct
  - Checks: `pnpm vitest run src/lib/components/breaks/ --project client` (passed - 42/42), `pnpm vitest run src/lib/components/timer/break-revitalization.svelte.test.ts --project client` (passed - 13/13), `pnpm check` (passed)
  - Commit evidence: `a679d15`

- [x] **TASK-3: Localize task backlog and task item components**
  - Path: `src/lib/components/planning/task-backlog.svelte`, `src/lib/components/planning/task-item.svelte`, `src/lib/components/planning/task-backlog.svelte.test.ts`
  - Action: Localize task backlog controls, empty states, and task item actions/tooltips; add dedicated reactive tests.
  - Route: delegated direct
  - Checks: `pnpm vitest run src/lib/components/planning/task-item.svelte.test.ts src/lib/components/planning/task-backlog.svelte.test.ts src/lib/components/planning/planning-view.svelte.test.ts --project client` (passed - 48/48), `pnpm check` (passed)
  - Commit evidence: `8beb30c`

- [x] **TASK-4: Verification Gate & Final Checks**
  - Action: Execute full test and lint suite (`pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:browser`).
  - Route: inline
  - Checks: 0 errors in `pnpm check`, 0 issues in `pnpm lint`, 650/650 passed in `pnpm test:unit`, 188/188 passed in `pnpm test:browser`.
  - Commit evidence: `8405b26`, `a679d15`, `8beb30c`
