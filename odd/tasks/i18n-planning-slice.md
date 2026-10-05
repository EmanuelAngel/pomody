# Feature: Planning View & Session Budget Localization (Slice 2.3)

- **Issue**: #98 (Parent: #92)
- **Specification**: `docs/features/i18n.md` (Slice 2.3)
- **Branch**: `feat/i18n-planning-slice`
- **Delivery Strategy**: `single-pr` (Forecasted changed lines: ~380 LOC, budget: 400 LOC)
- **TDD Mode**: Enabled (`pnpm vitest run <test-file> --project client`)
- **Route**: Delegated direct (mapping completed via subagent, bounded writers for edits)

## Objective & Why

Localize the Planning tab components (`planning-view.svelte`, `planning-cadence-config.svelte`, `end-session-dialog.svelte`, `underflow-alert.svelte`, `planning-timeline.svelte`, and timeline cards) using Paraglide-JS and the reactive proxy `t` from `$lib/state/locale.svelte`. This guarantees instant, reactive language switching without page reloads while preserving Hexagonal Domain isolation and 100% backward compatibility with existing tests.

## Scope & Constraints

- Localize presentation layer in `src/lib/components/planning/` (strictly direct imports, no barrel files).
- Keep domain entities in `src/lib/domain/` 100% pure TypeScript (zero i18n imports).
- Preserve exported `CADENCE_PRESETS` in `planning-cadence-config.svelte` for test compatibility; dynamically localize display labels in UI.
- Maintain exact English strings to prevent regressions in existing Vitest tests.
- Add reactive locale switching test suites verifying DOM updates when switching `en` <-> `es`.
- Respect strict 400 LOC PR budget.

## Tasks

- [x] **TASK-1: Define message keys in catalogs**
  - Path: `messages/en.json`, `messages/es.json`
  - Action: Add translation keys for planning view headers, segment switchers, cadence config, dialogs, underflow alert, session timeline budget metrics, and timeline cards.
  - Route: inline
  - Checks: `pnpm check` (passed)
  - Commit evidence: `b3e056c`

- [x] **TASK-2: Localize planning-view, end-session-dialog, and underflow-alert**
  - Path: `src/lib/components/planning/planning-view.svelte`, `src/lib/components/planning/end-session-dialog.svelte`, `src/lib/components/planning/underflow-alert.svelte`
  - Action: Replace hardcoded strings with `t.*()` calls. Add reactive i18n tests verifying English and Spanish text in dialog and underflow alert.
  - Route: delegated direct
  - Checks: `pnpm vitest run src/lib/components/planning/end-session-dialog.svelte.test.ts src/lib/components/planning/underflow-alert.svelte.test.ts src/lib/components/planning/planning-view.svelte.test.ts --project client` (passed), `pnpm check` (passed)
  - Commit evidence: `4a4fc9f`

- [x] **TASK-3: Localize planning-cadence-config**
  - Path: `src/lib/components/planning/planning-cadence-config.svelte`
  - Action: Replace hardcoded labels, steppers aria-labels, presets display, and inputs with `t.*()`. Add reactive i18n tests.
  - Route: delegated direct
  - Checks: `pnpm vitest run src/lib/components/planning/planning-cadence-config.svelte.test.ts --project client` (passed - 7/7), `pnpm check` (passed)
  - Commit evidence: `b041d6c`

- [x] **TASK-4: Localize planning-timeline and timeline cards**
  - Path: `src/lib/components/planning/planning-timeline.svelte`, `src/lib/components/planning/timeline-focus-card.svelte`, `src/lib/components/planning/timeline-break-card.svelte`, `src/lib/components/planning/timeline-buffer-card.svelte`
  - Action: Localize budget strip metrics ("Total Focus", "Total Breaks", "Estimated Finish", buffer), timeline mode buttons, task assignment popover, dropzone cue, and cards. Add reactive i18n tests.
  - Route: delegated direct
  - Checks: `pnpm vitest run src/lib/components/planning/planning-view.svelte.test.ts --project client` (passed - 30/30), `pnpm check` (passed)
  - Commit evidence: `aaf9f76`

- [x] **TASK-5: Verification Gate & Final Checks**
  - Action: Execute full test and lint suite (`pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:browser`). Removed redundant local `afterEach` locale teardown in test files since `src/testing/setup-locale.ts` is configured globally in `vite.config.ts`.
  - Route: inline
  - Checks: 0 errors in `pnpm check`, 0 issues in `pnpm lint`, 650/650 passed in `pnpm test:unit`, 169/169 passed in `pnpm test:browser`.
  - Commit evidence: `b3e056c`, `4a4fc9f`, `b041d6c`, `aaf9f76`, `f792c30`, `29335e5`
