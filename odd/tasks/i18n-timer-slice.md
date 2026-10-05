# Feature: Timer View & Controls Localization (Slice 2.1)

- **Issue**: #96 (Parent: #92)
- **Specification**: `docs/features/i18n.md` (Slice 2.1)
- **Branch**: `feat/i18n-timer-slice`
- **Delivery Strategy**: `single-pr` (Forecasted changed lines: ~250 LOC, budget: 400 LOC)
- **TDD Mode**: Enabled (`pnpm vitest run <test-file> --project client`)
- **Route**: Delegated direct (subagent mapping completed, writer delegation for multi-file edits)

## Objective & Why

Localize the main timer view components (`TimerDisplay`, `TimerControls`, `TimerArc`, `TaskPill`, `BreakRevitalization`) using the reactive proxy `t` from `$lib/state/locale.svelte`. This enables seamless bilingual support (English/Spanish) in the core focus screen with zero page reloads and no performance penalty, maintaining Hexagonal Domain isolation.

## Scope & Constraints

- Only localize presentation layer in `src/lib/components/timer/`.
- Domain layer (`src/lib/domain/`) remains 100% pure TypeScript with no i18n imports.
- Use direct imports only (strictly no barrel files).
- Retain exact English translations so that existing tests pass without regressions.
- Add reactive locale switching tests verifying DOM reactivity when switching `en` -> `es`.

## Tasks

- [x] **TASK-1: Define message keys in catalogs**
  - Path: `messages/en.json`, `messages/es.json`
  - Action: Add translation keys for timer mode, timer arc progress, timer controls aria labels, task pill copy, and break revitalization labels.
  - Route: inline
  - Checks: `pnpm check` (passed)
  - Commit evidence: `4767ca7`

- [x] **TASK-2: Localize TimerArc, TimerDisplay, and TimerControls**
  - Path: `src/lib/components/timer/timer-arc.svelte`, `src/lib/components/timer/timer-display.svelte`, `src/lib/components/timer/timer-controls.svelte`, `src/lib/components/timer/timer.svelte.test.ts`
  - Action: Replace hardcoded strings with `t.*()` calls. Add test cases verifying English rendering and reactive Spanish updates on `localeState.setLocale('es')`.
  - Route: delegated direct
  - Checks: `pnpm vitest run src/lib/components/timer/timer.svelte.test.ts --project client` (passed), `pnpm check` (passed)
  - Commit evidence: `9837ee0`

- [x] **TASK-3: Localize TaskPill**
  - Path: `src/lib/components/timer/task-pill.svelte`, `src/lib/components/timer/task-pill.svelte.test.ts`
  - Action: Replace hardcoded task pill copy with `t.*()` calls. Add reactive i18n tests for pending/completed task actions, new task placeholder, and empty state.
  - Route: delegated direct
  - Checks: `pnpm vitest run src/lib/components/timer/task-pill.svelte.test.ts --project client` (passed), `pnpm check` (passed)
  - Commit evidence: `876412b`

- [x] **TASK-4: Localize BreakRevitalization**
  - Path: `src/lib/components/timer/break-revitalization.svelte`, `src/lib/components/timer/break-revitalization.svelte.test.ts`
  - Action: Replace category labels (wrapped in `$derived`), empty guide fallback, shuffle button aria, and inactive placeholder. Add reactive i18n tests.
  - Route: delegated direct
  - Checks: `pnpm vitest run src/lib/components/timer/break-revitalization.svelte.test.ts --project client` (passed), `pnpm check` (passed)
  - Commit evidence: `a3fa43b`

- [x] **TASK-5: Verification Gate & Final Checks**
  - Action: Execute full test and lint suite (`pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:browser`).
  - Route: inline
  - Checks: 0 errors in `pnpm check`, 0 issues in `pnpm lint`, 650/650 passed in `pnpm test:unit`, 157/157 passed in `pnpm test:browser`.
  - Commit evidence: `a3fa43b`, `fbeba46` (refined copy & purged test hooks)
