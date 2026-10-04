# Feature: Component Tests Sanitization & DOM Decoupling (PR 1.3a - #85)

## Objective

Elevate semantic accessibility in `TimerArc` (`role="progressbar"`), decouple fragile DOM assertions in `timer.svelte.test.ts`, and migrate all duplicate mocks in component tests to the centralized Test Kit (`$tests/fakes/`).

## Problem

Component tests directly inspect private SVG structures (`circle[stroke-width="2.5"]`, inline stroke colors) and declare ad-hoc mock repositories (`MockTaskRepository`, `MockBreakActivityRepository`, `MockSessionPlanRepository`), making tests brittle and duplicating setup logic.

## Why

First slice of Phase 1.3 under Epic #82 (Milestone 2.5), fulfilling DoD for component accessibility and mock sanitation before adding the Critical User Journey suite.

## Scope

- `src/lib/components/timer/timer-arc.svelte`:
  - Add W3C accessible attributes: `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Timer progress"`, `data-mode={mode}`.
- `src/lib/components/timer/timer.svelte.test.ts`:
  - Replace SVG queries with accessible queries (`getByRole('progressbar')`, `aria-valuenow`, `data-mode`).
  - Replace `MockBreakActivityRepository` with `FakeBreakActivityRepository`.
- `src/lib/components/timer/task-pill.svelte.test.ts`:
  - Replace `MockTaskRepository` with `FakeTaskRepository`.
- `src/lib/components/timer/break-revitalization.svelte.test.ts`:
  - Replace `MockBreakActivityRepository` with `FakeBreakActivityRepository`.
- `src/lib/components/planning/underflow-alert.svelte.test.ts`:
  - Replace `MockSessionPlanRepository` with `FakeSessionPlanRepository`.
- `src/lib/components/planning/planning-view.svelte.test.ts`:
  - Replace local mock repositories with `$tests/fakes/` implementations and fixtures.

## Constraints

- Strict 1:1 collocation & concrete imports (zero barrel files).
- Use canonical `$tests/` path alias.
- Vitest Browser Mode tests must pass in Chromium (`--project client`).
- All unit tests must pass (`pnpm test:unit`).
- Authored changes kept under 400 LOC for this PR slice.
- Conventional Commits only, no AI attribution trailers.

## Actionable Checklist

- [x] `TASK-1`: Elevate semantic accessibility in `TimerArc` and decouple DOM assertions in `timer.svelte.test.ts`
  - Route: Delegated direct (Writer trigger: 2 non-trivial files touched).
  - Scope:
    - Update `timer-arc.svelte` with `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Timer progress"`, `data-mode={mode}`.
    - Sanitize `timer.svelte.test.ts` to test progressbar role, aria values, and data-mode; replace `MockBreakActivityRepository` with `FakeBreakActivityRepository`.
  - Checks: `pnpm vitest run src/lib/components/timer/timer.svelte.test.ts --project client` passed (11/11 tests), `pnpm test:unit` passed (636/636 tests), `pnpm check` (0 errors), `pnpm lint` green.
  - Evidence: Commit `ec544000cf5e59a1b7b7059bf3933f17fd66ad6f`.

- [x] `TASK-2`: Migrate mocks in peripheral component tests (`task-pill`, `break-revitalization`, `underflow-alert`)
  - Route: Delegated direct (Writer trigger: 3 files touched).
  - Scope:
    - `src/lib/components/timer/task-pill.svelte.test.ts`: use `FakeTaskRepository`.
    - `src/lib/components/timer/break-revitalization.svelte.test.ts`: use `FakeBreakActivityRepository`.
    - `src/lib/components/planning/underflow-alert.svelte.test.ts`: use `FakeSessionPlanRepository`.
  - Checks: `pnpm vitest run src/lib/components/timer/task-pill.svelte.test.ts src/lib/components/timer/break-revitalization.svelte.test.ts src/lib/components/planning/underflow-alert.svelte.test.ts --project client` passed (23/23 tests), `pnpm test:unit` passed (636/636 tests), `pnpm check` (0 errors), `pnpm lint` green.
  - Evidence: Commit `565aab6e072eae621218a958850f03cd1f44e547`.

- [x] `TASK-3`: Migrate mocks in `planning-view.svelte.test.ts` to centralized fakes
  - Route: Delegated direct (Writer trigger: 1 large file, >30 mock instantiations).
  - Scope:
    - Replace `MockTaskRepository`, `MockSessionPlanRepository`, and `MockBreakActivityRepository` with `$tests/fakes/` in `planning-view.svelte.test.ts`.
  - Checks: `pnpm vitest run src/lib/components/planning/planning-view.svelte.test.ts --project client` passed (29/29 tests), `pnpm test:unit` passed (636/636 tests), `pnpm check` (0 errors), `pnpm lint` green.
  - Evidence: Commit `e2d48aad6d5b4f5ac624611ae9e8ea2f779150c0`.

## Delivery Strategy

- Strategy: `ask-on-risk` (PR 1.3a for component tests sanitization, PR 1.3b for CUJ suite).
- Forecast: ~270 LOC net delta (<400 LOC budget).
- Target PR: resolves first part of #85 under Epic #82.

## Verification Evidence & Progress

- Baseline: 636/636 unit tests green on `main`.
- TASK-1: Complete (Commit `ec544000cf5e59a1b7b7059bf3933f17fd66ad6f`). 11/11 browser tests, 636/636 unit tests green.
- TASK-2: Complete (Commit `565aab6e072eae621218a958850f03cd1f44e547`). 23/23 browser tests, 636/636 unit tests green.
- TASK-3: Complete (Commit `e2d48aad6d5b4f5ac624611ae9e8ea2f779150c0`). 29/29 browser tests, 636/636 unit tests green.
- Current Status: All tasks complete. Ready for review and PR preparation.
- Next Step: Review gate and PR creation.
