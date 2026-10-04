# Feature: Migrate Domain and State Test Suites to Shared Fakes (#84)

## Objective

Migrate all duplicate in-memory repository mocks and engine stubs across domain ports and state test suites to the centralized Test Kit (`$tests/fakes/`), eliminating duplicate definitions and standardizing test doubles.

## Problem

Currently, 10+ test files independently declare ad-hoc classes (`MockBreakActivityRepository`, `MockTaskRepository`, `MockSessionPlanRepository`, `InMemory...`, etc.), duplicating over 350 lines of boilerplate and risking behavioral drift across test suites.

## Why

Part of Epic #82 and Milestone 2.5 (Phase 1.2 in `docs/testing-strategy.md`), completing the transition to the centralized `$tests/` test kit and paving the way for vertical i18n migration in Phase 2.

## Scope

- Test Kit extensions:
  - `FakeBreakActivityRepository` (support custom `defaultActivities` in constructor & `resetToDefaults()`)
  - `FakeTicker` (add `simulateTick(deltaMs)` alias for ergonomics)
- Domain Ports Tests:
  - `src/lib/domain/ports/break-activity-repository.port.test.ts`
  - `src/lib/domain/ports/daily-stats-repository.port.test.ts`
  - `src/lib/domain/ports/session-plan-repository.port.test.ts`
  - `src/lib/domain/ports/settings-storage.port.test.ts`
  - `src/lib/domain/ports/task-repository.port.test.ts`
- State Test Suites:
  - `src/lib/state/tasks.test.ts`
  - `src/lib/state/daily-stats.test.ts`
  - `src/lib/state/breaks.test.ts`
  - `src/lib/state/timer.test.ts`
  - `src/lib/state/planning.test.ts`
  - `src/lib/state/theme.test.ts`
- Out of scope:
  - `src/lib/adapters/` (adapters verify real serialization / Web APIs against browser storage; do not use domain repository fakes).
  - Production code in `src/lib/domain/` or `src/lib/state/`.

## Constraints

- Strict 1:1 collocation & concrete imports (zero barrel files / no `index.ts`).
- Use canonical `$tests/` path alias.
- All tests must pass before and after each work unit (`pnpm test:unit`).
- Keep authored changes under 400 LOC per work-unit commit.
- Strictly follow Conventional Commits without AI attribution trailers.

## Actionable Checklist

- [x] `TASK-1`: Extend Test Kit with missing behaviors and migrate Domain Ports contract tests
  - Route: Delegated direct (Writer trigger: 7 files touched).
  - Scope:
    - Update `FakeBreakActivityRepository` to accept optional `defaultActivities` and reset to them.
    - Add `simulateTick` alias to `FakeTicker`.
    - Update unit tests in `src/testing/fakes/`.
    - Migrate domain port tests (`break-activity-repository.port.test.ts`, `daily-stats-repository.port.test.ts`, `session-plan-repository.port.test.ts`, `settings-storage.port.test.ts`, `task-repository.port.test.ts`) to use `$tests/fakes/`.
  - Checks: `pnpm test:unit` passed (636/636 tests), `pnpm check` (0 errors), `pnpm lint` green.
  - Evidence: Commit `1d0a34f15d2360c236a791c2771eca5083be3d8e`.

- [x] `TASK-2`: Migrate State Repository test suites (`tasks`, `daily-stats`, `breaks`)
  - Route: Delegated direct (Writer trigger: 3 files touched).
  - Scope:
    - `src/lib/state/tasks.test.ts`: replace `MockTaskRepository` with `FakeTaskRepository`.
    - `src/lib/state/daily-stats.test.ts`: replace `MockDailyStatsRepository` with `FakeDailyStatsRepository`.
    - `src/lib/state/breaks.test.ts`: replace `MockBreakActivityRepository` with `FakeBreakActivityRepository`.
  - Checks: `pnpm test:unit` passed (636/636 tests), `pnpm check` (0 errors), `pnpm lint` green.
  - Evidence: Commit `acaf25e080c3bba288a19dfa074858ad0b6fa5c9`.

- [x] `TASK-3`: Migrate State Engine & Planning test suites (`timer`, `planning`, `theme`)
  - Route: Delegated direct (Writer trigger: 3 files touched).
  - Scope:
    - `src/lib/state/timer.test.ts`: replace `MockTicker`, `mockAudioNotifier`, `mockStorage` with shared fakes.
    - `src/lib/state/planning.test.ts`: replace `MockSessionPlanRepository`, `MockTicker`, `MockAudioNotifier`, `MockTaskRepository` with shared fakes.
    - `src/lib/state/theme.test.ts`: replace `mockStorage` with `FakeSettingsStorage`.
  - Checks: `pnpm check` (0 errors, 0 warnings), `pnpm lint` green, `pnpm test:unit` passed (636/636 tests).
  - Evidence: Commit `3e9b30cc854887d027244fd206fa326fe34bc8ce`.

## Delivery Strategy

- Strategy: `ask-on-risk` (single PR planned: issue #84).
- Forecast: ~370 LOC net delta (<400 LOC budget).
- Target PR: resolves #84 under Epic #82.

## Verification Evidence & Progress

- Baseline: 634/634 unit tests green on `main`.
- TASK-1: Complete (Commit `1d0a34f15d2360c236a791c2771eca5083be3d8e`). 636/636 tests green.
- TASK-2: Complete (Commit `acaf25e080c3bba288a19dfa074858ad0b6fa5c9`). 636/636 tests green.
- TASK-3: Complete (Commit `3e9b30cc854887d027244fd206fa326fe34bc8ce`). 636/636 tests green.
- Current Status: Complete / Ready for Review.
- Next Step: Ready for Review.
