# Implementation Tasks: Timer Finite State Machine (timer-fsm)

## Overview & Guidelines

- **Change**: `timer-fsm`
- **Issue Reference**: GitHub Issue #1 (`feat(domain): timer finite state machine and transitions`)
- **Domain Layer**: Pure TypeScript (`src/lib/domain/timer/`). Zero dependencies on Svelte, DOM globals, or Tauri.
- **Development Mode**: Strict TDD (Red -> Green -> Refactor).
- **Execution Target**: Node unit tests via `vitest run --project server` (<500ms).

---

## Traceability Matrix (Spec Scenarios -> Tasks)

| Spec Scenario   | Description                                                                                | Covering Tasks     |
| :-------------- | :----------------------------------------------------------------------------------------- | :----------------- |
| **Scenario 1**  | Initial State and Default Configuration                                                    | 1.1, 1.2           |
| **Scenario 2**  | Custom Configuration and Boundary Validation                                               | 1.1, 1.2, 1.3      |
| **Scenario 3**  | Starting the Timer (`idle` -> `running`, no-op when `running`)                             | 2.1, 2.2           |
| **Scenario 4**  | Deterministic Time Stepping with Uneven Deltas                                             | 3.1, 3.2           |
| **Scenario 5**  | Overshoot Tick Transitioning to Completed                                                  | 3.1, 3.2, 3.3      |
| **Scenario 6**  | Pausing and Resuming (`running` <-> `paused`, ticks frozen when paused)                    | 2.1, 2.2           |
| **Scenario 7**  | Resetting Current Mode (`running`/`paused`/`completed` -> `idle`)                          | 2.1, 2.2           |
| **Scenario 8**  | Skipping Current Mode (advance mode, reset to `idle`, no round count)                      | 2.1, 2.2, 4.1, 4.2 |
| **Scenario 9**  | Full Pomodoro Cycle Progression (Rounds 1 to 4, alternating short breaks, then long break) | 4.1, 4.2, 4.3      |
| **Scenario 10** | Long Break Completion and Cycle Reset (reset to Round 1 focus)                             | 4.1, 4.2, 4.3      |
| **Scenario 11** | Invalid Transitions & Edge Cases (no-ops on invalid actions, negative/zero ticks)          | 2.1, 2.2, 3.1, 3.2 |

---

## Phase 1: Types, Errors, and Config Validation

- [x] 1.1 [TDD-Red] Write unit tests for default config values, custom config initialization, and boundary validations (reject non-positive integers, decimals, zero) in `src/lib/domain/timer/timer-fsm.test.ts`
- [x] 1.2 [TDD-Green] Define domain types (`TimerState`, `TimerMode`, `TimerConfig`, `TimerSnapshot`, `TimerSubscriber`, `Unsubscribe`), `InvalidTimerConfigError`, `DEFAULT_TIMER_CONFIG`, and constructor validation logic in `src/lib/domain/timer/timer-fsm.ts`
- [x] 1.3 [TDD-Refactor] Refactor configuration validation into pure assertion helpers (`validateTimerConfig`) with clean error messages in `src/lib/domain/timer/timer-fsm.ts`

---

## Phase 2: State Transitions & Invariant Guards

- [x] 2.1 [TDD-Red] Write unit tests for control actions (`start`, `pause`, `resume`, `reset`, `skip`) and invalid transition guards (safe no-ops from invalid source states) in `src/lib/domain/timer/timer-fsm.test.ts`
- [x] 2.2 [TDD-Green] Implement transition methods `start()`, `pause()`, `resume()`, `reset()`, and `skip()` with explicit transition matrix guards in `src/lib/domain/timer/timer-fsm.ts`
- [x] 2.3 [TDD-Refactor] Clean up transition logic into private state mutators and verify transition invariants remain pure in `src/lib/domain/timer/timer-fsm.ts`

---

## Phase 3: Time Stepping & Clamping (`tick(deltaMs)`)

- [x] 3.1 [TDD-Red] Write unit tests for `tick(deltaMs)` covering regular stepping, uneven 60fps deltas, throttled background ticks (60s), non-positive delta no-ops (`<= 0`), and overshoot clamping to 0 with transition to `completed` in `src/lib/domain/timer/timer-fsm.test.ts`
- [x] 3.2 [TDD-Green] Implement `tick(deltaMs)` ensuring monotonic decrement, zero clamping, transition to `completed`, and progress calculation (`progress = 1.0`) in `src/lib/domain/timer/timer-fsm.ts`
- [x] 3.3 [TDD-Refactor] Simplify progress calculation `(durationMs - remainingMs) / durationMs` with boundary clamping `[0.0, 1.0]` in `src/lib/domain/timer/timer-fsm.ts`

---

## Phase 4: Pomodoro Cycle Progression & Round Management

- [x] 4.1 [TDD-Red] Write unit tests for full Pomodoro sequencing: 4 focus rounds, short breaks after rounds 1-3, long break after round 4, round counting, `totalRoundsCompleted` incrementation, and cycle reset after long break in `src/lib/domain/timer/timer-fsm.test.ts`
- [x] 4.2 [TDD-Green] Implement cycle progression logic: next mode calculation, round counter incrementing, long break reset to round 1, and skip handling without incrementing completed rounds in `src/lib/domain/timer/timer-fsm.ts`
- [x] 4.3 [TDD-Refactor] Extract cycle progression rules into a dedicated pure helper function (`calculateNextCycleStep`) in `src/lib/domain/timer/timer-fsm.ts`

---

## Phase 5: Observer Subscription Mechanism

- [x] 5.1 [TDD-Red] Write unit tests for `subscribe(subscriber: TimerSubscriber): Unsubscribe`, verifying synchronous notification on state mutations and tick updates, listener isolation, and unsubscription teardown in `src/lib/domain/timer/timer-fsm.test.ts`
- [x] 5.2 [TDD-Green] Implement subscriber storage (`Set<TimerSubscriber>`), notification dispatch on all state/tick changes, and return of unsubscribe callback in `src/lib/domain/timer/timer-fsm.ts`
- [x] 5.3 [TDD-Refactor] Ensure generated `TimerSnapshot` instances are defensively immutable (`Object.freeze`) to prevent external consumers from mutating internal state in `src/lib/domain/timer/timer-fsm.ts`

---

## Phase 6: Verification Harness & Strict Quality Checks

- [x] 6.1 Execute type check `pnpm check` and verify 0 errors and 0 warnings across the workspace
- [x] 6.2 Execute unit test harness `pnpm test:unit` (`vitest run --project server`) and verify 100% test pass rate in <500ms
- [x] 6.3 Execute linter `pnpm lint` and formatter checks to ensure zero style and formatting defects
