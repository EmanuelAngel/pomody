# Feature: Active Session Forward-Only Duration Steppers in Planning View

## Objective

Allow users to adjust Focus, Short Break, Long Break, and Long Break Interval durations directly from the Planning view steppers while a session is active, applying changes forward-only to upcoming blocks and synchronizing with TimerState.

## Problem & Diagnosis

In `src/lib/components/planning/planning-timeline.svelte`, stepper buttons were hardcoded with `disabled={planningState.isSessionActive || ...}`, preventing user adjustments during an active session even though the UI states "Session active: duration edits apply forward-only". Furthermore, in `src/lib/state/planning.svelte.ts`, the setter methods (`setFocusMinutes`, etc.) only synchronized with `timerState` when `!this.isSessionActive`, ignoring forward-only updates during active sessions.

## Scope & Constraints

- Enable duration steppers (Focus, Short Break, Long Break, Interval) during active sessions.
- Keep `blockCount` and `targetMode` disabled during active sessions (structural invariants).
- When a duration setter is invoked during an active session, delegate to `updateUpcomingPlanForwardOnly`.
- Clean Hexagonal Architecture and Svelte 5 Runes compliance.

## Tasks

- [x] **TASK-1: Update `PlanningState` duration setters for active sessions**
  - Route: delegated writer (touches `src/lib/state/planning.svelte.ts` and `src/lib/state/planning.test.ts`)
  - Update `setFocusMinutes`, `setShortBreakMinutes`, `setLongBreakMinutes`, and `setLongBreakInterval` to call `updateUpcomingPlanForwardOnly` when `isSessionActive`.
  - Add unit tests verifying setter calls during active sessions update upcoming blocks forward-only and synchronize with timer.
  - Work-unit commit: `feat(planning): support forward-only updates from planning state setters during active session` (`e7a4c2f`)

- [x] **TASK-2: Enable duration steppers in `planning-timeline.svelte` and verify UI**
  - Route: delegated writer (touches `src/lib/components/planning/planning-timeline.svelte` and tests)
  - Remove `planningState.isSessionActive ||` from Focus, Short Break, Long Break, and Interval stepper buttons.
  - Retain `disabled` on `blockCount`, `targetMode`, and time inputs during active session.
  - Verify with browser/client tests.
  - Work-unit commit: `feat(planning): enable duration steppers during active session in planning timeline` (`3ba9df2`)

- [x] **TASK-3: Full Verification Gate**
  - Route: direct inline
  - Run `pnpm check`, `pnpm lint`, `pnpm test`.
  - Record verification evidence.
  - Work-unit commit: `docs: complete ODD tasks for active session duration steppers`

## Verification Evidence

- [x] TASK-1 unit tests passing (`src/lib/state/planning.test.ts`: 59 passed)
- [x] TASK-2 UI tests passing (`src/lib/components/planning/planning-view.svelte.test.ts`: 19 passed)
- [x] Full test suite green (`pnpm check && pnpm lint && pnpm test`: 605 passed, 0 errors, 0 lint issues)
