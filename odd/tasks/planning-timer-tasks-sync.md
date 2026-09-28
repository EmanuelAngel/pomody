# Bugfix/Feature: Planning, Timer & Tasks Synchronization

## Objective

Synchronize the active session plan timeline (`PlanningState`) with real-time timer transitions (`TimerFSM` / `TimerState`) and active task selections (`TasksState`), closing the 3 gaps reported during dogfooding/feedback (`TEMP_PLANNING_FEEDBACK.md` and `PLANNING_SYNC_DESIGN.md`).

## Problem & Why

1. **Active block stalled on timeline**: When the timer naturally finished a block or was skipped, the timeline stayed permanently on Block 0 (`activeBlockIndex` never progressed).
2. **Timer TaskPill changes decoupled from timeline**: Slotting or changing a task via `TaskPill` in the timer view updated `TasksState.activeTask`, but did not update the corresponding focus block on the timeline.
3. **Backlog Pin decoupled from timeline**: Pinning/unpinning a backlog task updated `TasksState.activeTask` but had no effect on the timeline plan.

## Scope & Boundaries

- **In Scope**:
  - `BlockSkippedEvent` domain event contract in `src/lib/domain/events/block-completed.event.ts`.
  - Emission of `BlockSkippedEvent` in `TimerFSM.skip()` without disrupting subscribers.
  - Event subscription bridge on `TimerState.onEvent` and `TasksState.onActiveTaskChange`.
  - Reactive handling in `PlanningState`:
    - Advance block on `block-completed` (`status = 'completed'`).
    - Advance block on `block-skipped` (`status = 'skipped'`).
    - Pause timer (`timer.pause()`) when the last block finishes or is skipped (`isPlanCompleted`).
    - Forward-assign active task to next upcoming focus block when currently in break.
    - Slot task into active focus block or draft block 0.
    - Revert block to Free Focus when unpinned/cleared (`null`).
    - Infinite loop prevention guards.
  - Timeline UI visual treatment for `'skipped'` status.
- **Out of Scope**:
  - Assigning tasks to break blocks (forbidden by domain entity contract; break blocks only support revitalization activities).
  - Retroactive modification of completed/skipped blocks.

## Acceptance Criteria

- [x] `TimerFSM.skip()` emits `BlockSkippedEvent` with mode, round, total rounds completed, and timestamp.
- [x] Timeline advances to next block on timer `block-completed` and `block-skipped`.
- [x] Completing or skipping the last block marks plan completed and automatically pauses timer.
- [x] Selecting/pinning a task during an active focus block updates that block's `assignedTaskId`.
- [x] Selecting/pinning a task during an active break block projects forward to the first upcoming focus block.
- [x] Selecting/pinning a task in draft mode slots it into block 0.
- [x] Unpinning/clearing active task (`null`) unassigns the task from the respective block.
- [x] Unit test suite passes with 0 regressions.

## Delivery Strategy

- Route: Delegated direct (writer trigger: multi-file cross-layer implementation across domain, state, and UI)
- Review line budget: ~400 lines per work-unit commit

---

## Task Checklist

- [x] **TASK-1**: Domain event definition & FSM emission
  - Route: delegated direct
  - Target files: `src/lib/domain/events/block-completed.event.ts`, `src/lib/domain/timer/timer-fsm.ts`, `src/lib/domain/timer/timer-fsm.test.ts`
  - Applicable checks: `pnpm test:unit src/lib/domain/timer/timer-fsm.test.ts` (63/63 passed)

- [x] **TASK-2**: State event wiring & bidirectional task-timeline sync
  - Route: delegated direct
  - Target files: `src/lib/state/timer.svelte.ts`, `src/lib/state/tasks.svelte.ts`, `src/lib/state/planning.svelte.ts`, `src/lib/state/planning.test.ts`
  - Applicable checks: `pnpm test:unit src/lib/state/planning.test.ts` (42/42 passed)

- [x] **TASK-3**: UI skipped block presentation & comprehensive verification
  - Route: delegated direct
  - Target files: `src/lib/components/planning/planning-timeline.svelte`
  - Applicable checks: `pnpm check` (0 errors), `pnpm test:unit` (499/499 passed)
