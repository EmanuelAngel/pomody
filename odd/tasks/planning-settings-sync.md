# Feature: Planning & Settings Synchronization

## Objective

Synchronize `TimerState` configuration updates (from SettingsDrawer or anywhere) with `PlanningState` (draft inputs, projected plan blocks, statistics, and forward-only active session blocks).

## Problem & Diagnosis

Currently, modifying timer settings (Focus, Short Break, Long Break, Rounds) in SettingsDrawer calls `timerState.updateConfig()`, but:

1. `TimerState` does not notify any subscribers when configuration changes.
2. `PlanningState` maintains isolated `$state` variables for draft minutes (`_focusMinutes`, etc.) hardcoded to defaults.
3. In active session mode, `PlanningState.updateUpcomingPlanForwardOnly()` is never called upon settings updates, leaving future timeline blocks and session stats outdated.
4. In draft mode, changing planning steppers does not update `TimerState`, creating a desynchronization between screens.

## Scope & Constraints

- Pure Hexagonal Architecture: Maintain clean boundaries between domain, state, and UI.
- No recursive loops between `TimerState` and `PlanningState` config updates.
- In active sessions, changes must only affect upcoming/future blocks (`forward-only`), never altering past completed or currently active blocks.
- Svelte 5 Runes compliance.

## Tasks

- [x] **TASK-1: Add `onConfigChange` to `TimerState`**
  - Route: delegated writer (touches `src/lib/state/timer.svelte.ts` and `src/lib/state/timer.test.ts`)
  - Add subscriber registry `_configSubscribers: Set<(config: TimerConfig) => void>`.
  - Expose `public onConfigChange(subscriber: (config: TimerConfig) => void): () => void`.
  - Notify subscribers on `updateConfig` and `resetSettings`.
  - Verify with unit tests.
  - Work-unit commit: `feat(state): add config change subscription to TimerState` (`290ba9e`)

- [x] **TASK-2: Connect `PlanningState` to `TimerState.onConfigChange` for Draft and Active Session**
  - Route: delegated writer (touches `src/lib/state/planning.svelte.ts` and `src/lib/state/planning.test.ts`)
  - In `connectTimer`, subscribe to `timer.onConfigChange`.
  - In draft mode: update `_focusMinutes`, `_shortBreakMinutes`, `_longBreakMinutes`, `_longBreakInterval` when config changes (recalculating `projectedPlan` and stats).
  - In active session: call `updateUpcomingPlanForwardOnly(newConfig)`.
  - Guard against infinite loops with equality checks.
  - Refine `updateUpcomingPlanForwardOnly` to recalculate break modes if `roundsBeforeLongBreak` changed.
  - Verify with unit tests.
  - Work-unit commit: `feat(planning): synchronize settings updates into planning timeline and stats` (`a33a136`)

- [x] **TASK-3: Bidirectional Draft Sync & Initial Load Alignment**
  - Route: delegated writer (touches `src/lib/state/planning.svelte.ts` and tests)
  - When user changes steppers in draft (`setFocusMinutes`, etc.), sync to `timerState.updateConfig` if connected.
  - On `planningState.load()` without an active session, align initial draft inputs with `timer.config`.
  - Verify with unit tests.
  - Work-unit commit: `feat(planning): add bidirectional draft config sync and initial load alignment` (`484a1be`)

- [x] **TASK-4: Full Verification Gate & Feedback Update**
  - Route: direct inline
  - Run `pnpm check`, `pnpm lint`, `pnpm test`.
  - Update `TEMP_PLANNING_FEEDBACK.md` marking point 4 as resolved.
  - Work-unit commit: `docs: mark point 4 as resolved in planning feedback`

## Verification Evidence

- [x] TASK-1 unit tests passing (`src/lib/state/timer.test.ts`: 45 passed)
- [x] TASK-2 unit tests passing (`src/lib/state/planning.test.ts`: 48 passed)
- [x] TASK-3 unit tests passing (`src/lib/state/planning.test.ts`: 54 passed)
- [x] Full test suite green (`pnpm check && pnpm lint && pnpm test`: 599 passed, 0 errors, 0 lint issues)
