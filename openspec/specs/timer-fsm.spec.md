# Specification: Timer Finite State Machine (timer-fsm)

## 1. Overview & RFC 2119 Terminology

This document defines the formal behavioral and architectural specification for the pure TypeScript Timer Finite State Machine (`TimerFSM`) located in `src/lib/domain/timer/` for the Pomody project.

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

### Core Architectural Constraints

1. The domain layer **MUST** be implemented in 100% pure TypeScript.
2. The domain layer **MUST NOT** import or depend on Svelte, DOM globals (`window`, `document`, `AudioContext`, `Worker`), or Tauri APIs.
3. Time advancement **MUST** be deterministic and driven exclusively by passing explicit millisecond deltas (`tick(deltaMs)`).
4. Unit tests **MUST** execute in Node environment under Vitest (`vitest run --project server`) in `< 500ms`.

---

## 2. Domain Entities & State Types

### 2.1. States (`TimerState`)

The FSM **SHALL** support exactly four states:

- `idle`: Initialized or reset state. Time remaining is at mode maximum. Clock is not ticking.
- `running`: Active countdown state. Clock is advancing with each tick.
- `paused`: Suspended countdown state. Remaining duration is preserved.
- `completed`: Countdown reached zero (`remainingMs === 0`). Awaiting user progression or reset.

### 2.2. Modes (`TimerMode`)

The FSM **SHALL** support three modes:

- `focus`: Work / concentration session (default: 25 minutes).
- `shortBreak`: Brief recovery interval between focus rounds (default: 5 minutes).
- `longBreak`: Extended recovery interval after a full cycle of focus rounds (default: 15 minutes).

### 2.3. Configuration (`TimerConfig`)

```typescript
export interface TimerConfig {
	focusDurationSeconds: number; // default: 1500 (25 min)
	shortBreakDurationSeconds: number; // default: 300 (5 min)
	longBreakDurationSeconds: number; // default: 900 (15 min)
	roundsBeforeLongBreak: number; // default: 4
}
```

### 2.4. Snapshot (`TimerSnapshot`)

The FSM **MUST** provide an immutable snapshot representing its current status:

```typescript
export interface TimerSnapshot {
	readonly state: TimerState;
	readonly mode: TimerMode;
	readonly remainingMs: number;
	readonly durationMs: number;
	readonly currentRound: number;
	readonly totalRoundsCompleted: number;
	readonly progress: number; // 0.0 to 1.0 (elapsedMs / durationMs)
}
```

---

## 3. Transition Rules & Control Actions

### 3.1. Transition Matrix

| Current State | Action          | Next State              | Effects / Notes                                                                  |
| :------------ | :-------------- | :---------------------- | :------------------------------------------------------------------------------- |
| `idle`        | `start()`       | `running`               | Timer starts counting down.                                                      |
| `idle`        | `pause()`       | `idle`                  | Invalid. **MUST** be a no-op or throw invalid transition error; state unchanged. |
| `idle`        | `resume()`      | `idle`                  | Invalid. **MUST** be a no-op; state unchanged.                                   |
| `idle`        | `reset()`       | `idle`                  | Preserves `idle` state; ensures `remainingMs = durationMs`.                      |
| `idle`        | `skip()`        | `idle`                  | Advances to next mode in cycle; resets `remainingMs` to new mode duration.       |
| `idle`        | `tick(deltaMs)` | `idle`                  | No-op. Clock **MUST NOT** advance when not running.                              |
| `running`     | `start()`       | `running`               | No-op. Timer is already running.                                                 |
| `running`     | `pause()`       | `paused`                | Freezes remaining time.                                                          |
| `running`     | `resume()`      | `running`               | No-op. Timer is already running.                                                 |
| `running`     | `reset()`       | `idle`                  | Cancels current run; resets `remainingMs` to current mode duration.              |
| `running`     | `skip()`        | `idle`                  | Aborts current run; advances to next mode in cycle.                              |
| `running`     | `tick(deltaMs)` | `running` / `completed` | Decrements `remainingMs`. If `remainingMs == 0`, transitions to `completed`.     |
| `paused`      | `start()`       | `paused`                | Invalid. **MUST** use `resume()`; state unchanged.                               |
| `paused`      | `pause()`       | `paused`                | No-op. Timer is already paused.                                                  |
| `paused`      | `resume()`      | `running`               | Resumes countdown from preserved `remainingMs`.                                  |
| `paused`      | `reset()`       | `idle`                  | Discards paused run; resets `remainingMs` to current mode duration.              |
| `paused`      | `skip()`        | `idle`                  | Discards paused run; advances to next mode in cycle.                             |
| `paused`      | `tick(deltaMs)` | `paused`                | No-op. Time **MUST NOT** decrement while paused.                                 |
| `completed`   | `start()`       | `running`               | Advances to next mode in cycle and immediately starts running.                   |
| `completed`   | `pause()`       | `completed`             | Invalid. State unchanged.                                                        |
| `completed`   | `resume()`      | `completed`             | Invalid. State unchanged.                                                        |
| `completed`   | `reset()`       | `idle`                  | Resets current mode's duration to full; state becomes `idle`.                    |
| `completed`   | `skip()`        | `idle`                  | Advances to next mode in cycle; state becomes `idle`.                            |
| `completed`   | `tick(deltaMs)` | `completed`             | No-op. Timer is already at 0 ms.                                                 |

---

## 4. Cycle Progression & Sequencing

1. A cycle consists of a configurable number of focus rounds (`roundsBeforeLongBreak`, default: 4).
2. The initial mode **MUST** be `focus` with `currentRound = 1` and `totalRoundsCompleted = 0`.
3. When a `focus` session reaches completion:
   - `totalRoundsCompleted` **MUST** increment by 1.
   - If `currentRound < roundsBeforeLongBreak`:
     - The next mode **SHALL** be `shortBreak`.
     - `currentRound` remains at current round index until the break concludes.
   - If `currentRound === roundsBeforeLongBreak`:
     - The next mode **SHALL** be `longBreak`.
     - `currentRound` remains at `roundsBeforeLongBreak` until the long break concludes.
4. When a `shortBreak` completes or is skipped:
   - The next mode **SHALL** be `focus`.
   - `currentRound` **SHALL** increment by 1.
5. When a `longBreak` completes or is skipped:
   - The next mode **SHALL** be `focus`.
   - `currentRound` **SHALL** reset to 1.
6. Skipping during `focus` mode:
   - Does NOT increment `totalRoundsCompleted`.
   - Follows the standard break progression (`shortBreak` if `currentRound < roundsBeforeLongBreak`, else `longBreak`).

---

## 5. Time Calculation & Delta Stepping

1. The FSM **MUST NOT** depend on internal timers (`setInterval`, `setTimeout`, or `requestAnimationFrame`).
2. All temporal progression **SHALL** occur through explicit invocation of `tick(deltaMs)`.
3. `deltaMs` **MUST** be an integer or floating-point number representing milliseconds elapsed since the last tick:
   $$\text{remainingMs} = \max(0, \text{remainingMs} - \text{deltaMs})$$
4. If `deltaMs <= 0`, the FSM **MUST NOT** mutate `remainingMs`.
5. Clock drift prevention: Because `deltaMs` reflects actual elapsed time calculated from external monotonic or system timestamps, irregular tick delivery (e.g. background suspension, OS throttling) **SHALL NOT** accumulate timing error.
6. Overshoot handling: When `deltaMs >= remainingMs`:
   - `remainingMs` **MUST** be clamped to 0.
   - State **MUST** transition from `running` to `completed`.
   - Remaining time **MUST NOT** become negative.

---

## 6. Detailed Scenarios (Given / When / Then)

### Scenario 1: Initial State and Default Configuration

- **GIVEN** a newly created `TimerFSM` with default configuration
- **THEN** the state **MUST** be `idle`
- **AND** the mode **MUST** be `focus`
- **AND** `remainingMs` **MUST** be 1,500,000 (25 minutes)
- **AND** `durationMs` **MUST** be 1,500,000
- **AND** `currentRound` **MUST** be 1
- **AND** `totalRoundsCompleted` **MUST** be 0
- **AND** `progress` **MUST** be 0.0

### Scenario 2: Custom Configuration and Boundary Validation

- **GIVEN** custom configuration `{ focusDurationSeconds: 1200, shortBreakDurationSeconds: 180, longBreakDurationSeconds: 600, roundsBeforeLongBreak: 3 }`
- **WHEN** initializing `TimerFSM` with this configuration
- **THEN** mode **MUST** be `focus`
- **AND** `remainingMs` **MUST** be 1,200,000 (20 minutes)
- **AND** `roundsBeforeLongBreak` **MUST** be 3
- **WHEN** initializing with negative duration, zero duration, or non-integer duration
- **THEN** the FSM **MUST** throw an `InvalidTimerConfigError`

### Scenario 3: Starting the Timer

- **GIVEN** a `TimerFSM` in `idle` state
- **WHEN** calling `start()`
- **THEN** the state **MUST** transition to `running`
- **AND** `remainingMs` **MUST** remain unchanged
- **WHEN** calling `start()` again while in `running` state
- **THEN** the state **MUST** remain `running` (no-op)

### Scenario 4: Deterministic Time Stepping with Uneven Deltas

- **GIVEN** a `TimerFSM` in `running` state with `remainingMs = 1,500,000`
- **WHEN** calling `tick(1000)`
- **THEN** `remainingMs` **MUST** equal 1,499,000
- **AND** state **MUST** remain `running`
- **WHEN** calling `tick(16.67)` (approx 1 frame at 60fps)
- **THEN** `remainingMs` **MUST** equal 1,498,983.33 (or floored/rounded according to precision rule, maintaining strict monotonic decrement)
- **WHEN** calling `tick(60,000)` (simulating 1 minute background throttling)
- **THEN** `remainingMs` **MUST** decrease by exactly 60,000

### Scenario 5: Overshoot Tick Transitioning to Completed

- **GIVEN** a `TimerFSM` in `running` state with `remainingMs = 500`
- **WHEN** calling `tick(600)`
- **THEN** `remainingMs` **MUST** be clamped to 0
- **AND** the state **MUST** transition to `completed`
- **AND** `progress` **MUST** be 1.0

### Scenario 6: Pausing and Resuming

- **GIVEN** a `TimerFSM` in `running` state with `remainingMs = 1,000,000`
- **WHEN** calling `pause()`
- **THEN** the state **MUST** transition to `paused`
- **AND** `remainingMs` **MUST** remain 1,000,000
- **WHEN** calling `tick(5000)` while `paused`
- **THEN** `remainingMs` **MUST** remain 1,000,000
- **AND** state **MUST** remain `paused`
- **WHEN** calling `resume()`
- **THEN** the state **MUST** transition to `running`
- **WHEN** calling `tick(5000)`
- **THEN** `remainingMs` **MUST** decrease to 995,000

### Scenario 7: Resetting Current Mode

- **GIVEN** a `TimerFSM` in `running` or `paused` state with `remainingMs = 700,000` in `focus` mode
- **WHEN** calling `reset()`
- **THEN** state **MUST** transition to `idle`
- **AND** `remainingMs` **MUST** be restored to the full mode duration (1,500,000 ms)
- **AND** `mode` **MUST** remain `focus`
- **AND** `currentRound` **MUST NOT** be reset

### Scenario 8: Skipping Current Mode

- **GIVEN** a `TimerFSM` in `running` state at `currentRound = 1` in `focus` mode
- **WHEN** calling `skip()`
- **THEN** state **MUST** transition to `idle`
- **AND** `mode` **MUST** transition to `shortBreak`
- **AND** `remainingMs` **MUST** equal 300,000 (5 minutes)
- **AND** `totalRoundsCompleted` **MUST** remain 0 (skipped sessions do not count as completed)

### Scenario 9: Full Pomodoro Cycle Progression (Rounds 1 to 4)

- **GIVEN** a `TimerFSM` with 4 rounds before long break
- **WHEN** Focus Round 1 completes (`tick(1,500,000)`)
- **THEN** state becomes `completed`, `totalRoundsCompleted = 1`, `currentRound = 1`
- **WHEN** `start()` is invoked
- **THEN** state becomes `running`, mode becomes `shortBreak`, `remainingMs = 300,000`
- **WHEN** Short Break 1 completes (`tick(300,000)`)
- **THEN** state becomes `completed`
- **WHEN** `start()` is invoked
- **THEN** state becomes `running`, mode becomes `focus`, `currentRound = 2`, `remainingMs = 1,500,000`
- **WHEN** Focus Round 2, Short Break 2, Focus Round 3, Short Break 3, and Focus Round 4 complete in sequence
- **THEN** after Focus Round 4 completes, next mode **MUST** be `longBreak` with `currentRound = 4` and `totalRoundsCompleted = 4`

### Scenario 10: Long Break Completion and Cycle Reset

- **GIVEN** a `TimerFSM` completing `longBreak`
- **WHEN** `start()` or `skip()` is invoked on the completed long break
- **THEN** mode **MUST** transition to `focus`
- **AND** `currentRound` **MUST** reset to 1
- **AND** `remainingMs` **MUST** be initialized to focus duration (1,500,000 ms)

### Scenario 11: Invalid Transitions & Edge Cases

- **GIVEN** a `TimerFSM` in `idle` state
- **WHEN** calling `pause()`
- **THEN** state **MUST** remain `idle` (no state corruption)
- **WHEN** calling `resume()`
- **THEN** state **MUST** remain `idle`
- **WHEN** calling `tick(-500)` or `tick(0)`
- **THEN** `remainingMs` **MUST NOT** change

---

## 7. Public API Contract

```typescript
export class TimerFSM {
	constructor(config?: Partial<TimerConfig>);

	// State inspection
	public get snapshot(): TimerSnapshot;
	public get state(): TimerState;
	public get mode(): TimerMode;
	public get remainingMs(): number;
	public get durationMs(): number;
	public get currentRound(): number;
	public get totalRoundsCompleted(): number;
	public get progress(): number;

	// Actions
	public start(): void;
	public pause(): void;
	public resume(): void;
	public reset(): void;
	public skip(): void;
	public tick(deltaMs: number): void;
}
```
