# Technical Design: Timer Finite State Machine (timer-fsm)

## 1. Context & Architecture

The `timer-fsm` module implements the core Pomodoro state machine in pure TypeScript (`src/lib/domain/timer/`). Under Pragmatic Hexagonal Architecture, the domain layer has zero dependencies on Svelte, DOM APIs, or Tauri. It executes deterministically via explicit delta injection, allowing unit tests to run under Node in <50ms.

## 2. Architectural Decisions

| Decision Area              | Options Considered                                                                                    | Tradeoffs                                                                                                                                                                                          | Decision & Rationale                                                                                                                                                                            |
| :------------------------- | :---------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FSM Pattern**            | **A:** Functional Reducer (`reducer(state, action)`).<br>**B:** OOP State Machine (`class TimerFSM`). | **A:** Pure functions; requires external state container and boilerplate dispatcher glue.<br>**B:** Encapsulates transitions and invariants; exposes clean imperative API and immutable snapshots. | **Option B: OOP State Machine Class with Snapshots.** Simplifies consumption in Svelte 5 runes composition root (`timer.svelte.ts`) and worker adapters while guaranteeing state encapsulation. |
| **Time Stepping**          | **A:** Internal `setInterval`/`setTimeout`.<br>**B:** Injected millisecond deltas (`tick(deltaMs)`).  | **A:** Suffers from OS/browser timer throttling; non-deterministic in tests.<br>**B:** Requires external ticker; 100% drift-free and instantaneously testable.                                     | **Option B: Injected Delta Stepping.** Prevents clock drift during background suspension or window minimization.                                                                                |
| **Reactivity Integration** | **A:** Polling snapshot properties.<br>**B:** Observer subscription (`subscribe(fn)`).                | **A:** Consumer must coordinate read loops; prone to stale UI frames.<br>**B:** Immediate push notification on state transition or tick.                                                           | **Option B: Observer Subscription.** Directly feeds Svelte 5 `$state.raw` or `$state` in `src/lib/state/timer.svelte.ts` without coupling domain to Svelte runes.                               |

## 3. Data Structures & Public API

```typescript
export type TimerState = 'idle' | 'running' | 'paused' | 'completed';
export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export interface TimerConfig {
	readonly focusDurationSeconds: number; // default: 1500 (25m)
	readonly shortBreakDurationSeconds: number; // default: 300 (5m)
	readonly longBreakDurationSeconds: number; // default: 900 (15m)
	readonly roundsBeforeLongBreak: number; // default: 4
}

export interface TimerSnapshot {
	readonly state: TimerState;
	readonly mode: TimerMode;
	readonly remainingMs: number;
	readonly durationMs: number;
	readonly currentRound: number;
	readonly totalRoundsCompleted: number;
	readonly progress: number; // (durationMs - remainingMs) / durationMs, clamped [0.0, 1.0]
}

export type TimerSubscriber = (snapshot: TimerSnapshot) => void;
export type Unsubscribe = () => void;

export class InvalidTimerConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidTimerConfigError';
	}
}

export const DEFAULT_TIMER_CONFIG: TimerConfig = {
	focusDurationSeconds: 1500,
	shortBreakDurationSeconds: 300,
	longBreakDurationSeconds: 900,
	roundsBeforeLongBreak: 4
};

export class TimerFSM {
	constructor(config?: Partial<TimerConfig>);

	// Inspection
	public get snapshot(): TimerSnapshot;
	public get state(): TimerState;
	public get mode(): TimerMode;
	public get remainingMs(): number;
	public get durationMs(): number;
	public get currentRound(): number;
	public get totalRoundsCompleted(): number;
	public get progress(): number;

	// Subscription & Commands
	public subscribe(subscriber: TimerSubscriber): Unsubscribe;
	public start(): void;
	public pause(): void;
	public resume(): void;
	public reset(): void;
	public skip(): void;
	public tick(deltaMs: number): void;
}
```

## 4. State Transitions & Cycle Progression

```
[idle] -------- start() -------> [running]
  ^                                 |
  |--- reset() / skip() ------------|
  |                                 | pause()
  |                                 v
  |--- reset() / skip() -------- [paused]
  |                                 | resume()
  |                                 v
  |                              [running]
  |                                 | tick() reaches 0
  |                                 v
  |--- reset() / skip() -------- [completed]
  <-------- start() (next mode) ----|
```

### Transition Guards

- Actions called from invalid states (e.g., `pause()` while `idle`, `start()` while `running`, `resume()` while `running` or `idle`) are safe no-ops.
- `tick(deltaMs)` executes only in `running` state. Non-positive deltas (`<= 0`) are ignored.
- Overshoot (`deltaMs >= remainingMs`) clamps `remainingMs` to `0` and transitions to `completed`.

### Pomodoro Cycle Progression

- Initial: `focus`, `currentRound = 1`, `totalRoundsCompleted = 0`.
- When `focus` completes:
  - `totalRoundsCompleted += 1`.
  - Next mode: `shortBreak` if `currentRound < roundsBeforeLongBreak`, else `longBreak`.
- When `shortBreak` completes or skips:
  - Next mode: `focus`, `currentRound += 1`.
- When `longBreak` completes or skips:
  - Next mode: `focus`, `currentRound = 1`.
- `skip()` in `focus`: Advances to appropriate break without incrementing `totalRoundsCompleted`.

## 5. Composition Root Integration (Svelte 5 Runes)

The domain remains 100% agnostic of Svelte. In the Svelte 5 reactive composition root (`src/lib/state/timer.svelte.ts`), integration is lightweight:

```typescript
const fsm = new TimerFSM();
let snapshot = $state.raw(fsm.snapshot);

const unsubscribe = fsm.subscribe((nextSnapshot) => {
	snapshot = nextSnapshot;
});
```

Web Worker ticks invoke `fsm.tick(deltaMs)`, immediately notifying subscribers and updating Svelte UI runes synchronously.

## 6. File Changes

| File                                     | Action    | Responsibilities                                                                                                                                           |
| :--------------------------------------- | :-------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/domain/timer/timer-fsm.ts`      | Overwrite | Types, `DEFAULT_TIMER_CONFIG`, `InvalidTimerConfigError`, and `TimerFSM` implementation. Consumers import directly from this file (no barrel indirection). |
| `src/lib/domain/timer/timer-fsm.test.ts` | Overwrite | Vitest test suite verifying all 11 scenarios in `timer-fsm.spec.md` under Node (<500ms).                                                                   |
