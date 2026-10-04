# Feature: Critical User Journeys in Vitest Browser Mode (PR 1.3b - #85)

## Objective

Implement the Critical User Journeys (CUJ) suite in Vitest Browser Mode (`.svelte.test.ts`) using an isolated test harness and centralized in-memory fakes, completing Milestone 2.5 of `docs/testing-strategy.md` under Epic #82.

## Problem

Previous component tests only validated isolated visual states. The application lacked integration-level browser tests proving that state machines, navigation, timer countdown, daily statistics, and task handover work seamlessly from the end-user perspective.

## Why

Second part of issue #85 (PR 1.3b), closing Epic #82 before starting the i18n Phase 2 migration. Guarantees zero regressions in core user flows under real browser rendering.

## Scope

- `src/testing/cuj/cuj-test-shell.svelte`:
  - Isolated test harness component composing `Header`, `Timer`, `PlanningView`, and `DailyCounter`.
  - Injects isolated state stores (`createTimerState`, `createTasksState`, `createDailyStatsState`, `createNavigationState`, `createBreaksState`) backed by centralized `$tests/fakes/` (`FakeTicker`, `FakeTaskRepository`, `FakeAudioNotifier`, `FakeBreakActivityRepository`, etc.).
- `src/testing/cuj/core-focus-journey.svelte.test.ts`:
  - CUJ 1: Core Focus Loop (idle state -> start timer -> Zen mode active -> intermediate tick at 12:30/50% -> completion tick -> audio notifier notified -> DailyCounter updated to "1 block · 25m" -> transition to SHORT BREAK).
- `src/testing/cuj/planning-handover-journey.svelte.test.ts`:
  - CUJ 2: Planning-to-Timer Handover (Timer view "Free focus" -> navigate to Planning tab via Header -> type and create task -> pin task as active -> navigate back to Timer -> verify TaskPill renders task title and accessible attributes).

## Constraints

- Strict 1:1 collocation & concrete imports (zero barrel files `index.ts`).
- File extension must be `*.svelte.test.ts` to execute under Vitest `client` project (Playwright/Chromium).
- Tests run deterministically using `FakeTicker.advanceByMs()`.
- Authored changes kept under 400 LOC for this PR slice.
- Strict ODD workflow: mandatory delegation to subagents for all non-trivial implementations.
- Conventional Commits only, no AI attribution trailers.

## Actionable Checklist

- [x] `TASK-1`: Create isolated CUJ test harness component (`src/testing/cuj/cuj-test-shell.svelte`)
  - Route: Delegated direct (Writer trigger: new component file in test infrastructure).
  - Scope:
    - Create `src/testing/cuj/cuj-test-shell.svelte` rendering `Header`, `Timer`, `PlanningView`, `DailyCounter` with prop-injected state.
    - Validate with `pnpm check` and `pnpm lint`.
  - Checks: `pnpm check` (0 errors), `pnpm lint` green, `pnpm test:unit` (636/636 passed).
  - Evidence: Commit `2a06982`.

- [x] `TASK-2`: Implement CUJ 1 — Core Focus Loop (`src/testing/cuj/core-focus-journey.svelte.test.ts`)
  - Route: Delegated direct (Writer trigger / TDD).
  - Scope:
    - Write browser test validating the full focus block lifecycle: idle -> running -> Zen mode -> 50% progression -> completion -> audio notifier -> daily stats increment -> break mode transition.
  - Checks: `pnpm vitest run src/testing/cuj/core-focus-journey.svelte.test.ts --project client` (passed 1/1 in 524ms), `pnpm check` (0 errors), `pnpm lint` green, `pnpm test:unit` (636/636 passed).
  - Evidence: Commit `4021d03`.

- [x] `TASK-3`: Implement CUJ 2 — Planning-to-Timer Handover (`src/testing/cuj/planning-handover-journey.svelte.test.ts`)
  - Route: Delegated direct (Writer trigger / TDD).
  - Scope:
    - Write browser test validating task creation in PlanningView, pinning active task, switching views via Header, and verifying reactive update in TaskPill.
  - Checks: `pnpm vitest run src/testing/cuj/planning-handover-journey.svelte.test.ts --project client` (passed 1/1 in 757ms), `pnpm vitest run src/testing/cuj/ --project client` (2/2 passed), `pnpm test:unit` (636/636 passed), `pnpm check` (0 errors), `pnpm lint` green.
  - Evidence: Commit `9005fd4`.

## Delivery Strategy

- Strategy: `ask-on-risk` (single PR for PR 1.3b).
- Forecast: ~280 LOC net delta.
- Actual: 292 LOC net delta (3 files, 292 insertions, 0 deletions; well within <400 LOC budget).
- Target PR: resolves second part of #85 under Epic #82.

## Verification Evidence & Progress

- Baseline: 636/636 unit tests green on `test/cuj-browser-suite`.
- TASK-1: Completed in commit `2a06982`. Svelte autofixer clean, `pnpm check` 0 errors, `pnpm lint` green.
- TASK-2: Completed in commit `4021d03`. 1/1 browser test green (524ms), `pnpm check` 0 errors, `pnpm lint` green.
- TASK-3: Completed in commit `9005fd4`. 1/1 browser test green (757ms), full CUJ suite 2/2 green, `pnpm check` 0 errors, `pnpm lint` green.
- Current Status: All tasks complete. Total net delta: +292 LOC. All verification checks passing.
- Next Step: Ready for PR creation and review.
