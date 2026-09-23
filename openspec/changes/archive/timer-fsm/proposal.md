# Proposal: Timer Finite State Machine (timer-fsm)

## 1. Intent

Implement the core finite state machine (FSM) for the Pomodoro timer in pure TypeScript within the domain layer (`src/lib/domain/timer/`). This provides the foundational, deterministic timekeeper and state transitions required for Pomody, fully decoupled from user interfaces, reactive stores, and operating system runtimes.

This proposal addresses **GitHub Issue #1** (`feat(domain): timer finite state machine and transitions`) and fulfills the core domain requirements of Milestone **v0.1 Core & MVP Base**.

## 2. Scope

### In Scope

- **States**: `idle`, `running`, `paused`, `completed`.
- **Modes**: `focus` (default: 25 min / 1500s), `shortBreak` (default: 5 min / 300s), `longBreak` (default: 15 min / 900s).
- **Configuration**: `TimerConfig` interface supporting customizable durations per mode with boundary validation (must be positive integers).
- **Control Actions / Events**: `start`, `pause`, `resume`, `reset`, `skip`, and `tick(deltaMs)`.
- **Deterministic Time Calculation**: Delta-based elapsed/remaining time calculation preventing drift across arbitrary tick intervals.
- **Cycle Progression**: Pomodoro block sequencing (standard 4 focus rounds before a long break, alternating with short breaks).
- **State Transition Safeguards**: Strict validation and handling of invalid state transitions (no-op or explicit domain error).
- **Domain Purity**: 100% pure TypeScript with zero imports from Svelte, DOM (`window`, `AudioContext`, `Worker`), or Tauri.
- **Testing**: Exhaustive TDD unit tests running under Node via `pnpm test:unit` in <500ms.

### Out of Scope

- Svelte 5 reactive bindings and runes (`src/lib/state/timer.svelte.ts`) — deferred to reactive adapter task.
- Presentation components and UI controls (`src/lib/components/timer/*`) — deferred to UI tasks.
- Web Audio sound playback and notifications (`src/lib/adapters/audio/*`) — deferred to audio adapter task.
- Web Worker background ticker execution (`src/lib/adapters/worker/*`) — deferred to worker adapter task.
- Persistent session storage in IndexedDB (`src/lib/adapters/storage/*`) — planned for v0.2.
- Third-party state machine libraries (e.g. XState) — the implementation will remain dependency-free.

## 3. Capabilities

### New Capabilities

- `timer-fsm`: Pure state machine managing operational states (`idle`, `running`, `paused`, `completed`), modes (`focus`, `shortBreak`, `longBreak`), and transition rules.
- `deterministic-time-stepping`: Delta-driven time updates (`tick(deltaMs)`) that prevent accumulated timing drift regardless of tick irregularity or background throttling.
- `configurable-timer-durations`: Runtime customisation of focus and break intervals with validated boundaries.
- `cycle-management`: Pomodoro cycle tracking (round counter, automatic or suggested progression between focus blocks and break blocks).

### Modified Capabilities

- None (greenfield implementation extending the existing domain scaffold).

## 4. Approach

### Architectural Layer Boundaries

The timer FSM resides strictly in `src/lib/domain/timer/` in accordance with the Pragmatic Hexagonal Architecture defined in `docs/architecture.md`:

```text
src/lib/domain/timer/
├── timer-fsm.ts         # Types, interfaces, FSM transitions, and core logic
├── timer-fsm.test.ts    # Exhaustive unit test suite (pure Node)
└── index.ts             # Public domain barrel export
```

- **Inversion of Dependencies**: The domain has no outward dependencies. Outside consumers (the Svelte 5 reactive composition root in `src/lib/state/timer.svelte.ts` and background worker adapters) import from `src/lib/domain/timer/`, never the reverse.
- **Zero Framework Footprint**: No `$state`, `$derived`, DOM globals (`window`, `performance.now`), or Tauri APIs.

### Design Decisions

1. **Delta-Based Determinism (`tick(deltaMs)`)**:
   Instead of decrementing 1 second per interval tick (which drifts when timers are throttled or delayed), the domain engine accepts elapsed milliseconds (`deltaMs`). Remaining duration is calculated deterministically:
   $$\text{remainingMs} = \max(0, \text{remainingMs} - \text{deltaMs})$$
   When `remainingMs === 0`, the FSM transitions from `running` to `completed`.
2. **Explicit State & Transition Matrix**:
   - `start`: `idle` -> `running`
   - `pause`: `running` -> `paused`
   - `resume`: `paused` -> `running`
   - `reset`: `[running, paused, completed]` -> `idle` (resets time to mode configured duration)
   - `skip`: `[running, paused, completed]` -> advances to next mode, resets to `idle`
   - `tick(deltaMs)`: `running` -> `running` (if remaining > 0) or `completed` (if remaining == 0)
   - Disallowed transitions: Calling actions outside valid source states results in a controlled no-op or typed error, keeping state consistent.
3. **Pomodoro Cycle Progression**:
   - Cycle state tracks: `currentRound` (1 to `roundsBeforeLongBreak`, default 4), `totalCompletedRounds`.
   - Sequential progression: `focus` -> `shortBreak` (rounds 1-3) or `longBreak` (round 4), then reset round counter.
4. **Strict TDD Implementation**:
   - Test suite written first, validating every transition, edge case (tick overshoot, rapid actions, zero/negative delta handling, custom config), and cycle rotation.
   - Executed via `pnpm test:unit` (`vitest run --project server`), guaranteeing execution time well under 500ms.

## 5. Affected Areas

| Area / File                              | Impact   | Description                                                                   |
| :--------------------------------------- | :------- | :---------------------------------------------------------------------------- |
| `src/lib/domain/timer/timer-fsm.ts`      | Modified | Core domain types, FSM state engine, transition logic, and cycle progression  |
| `src/lib/domain/timer/timer-fsm.test.ts` | Modified | Comprehensive unit test suite for transitions, time stepping, and cycle rules |
| `src/lib/domain/timer/index.ts`          | Created  | Clean barrel export for domain consumers                                      |
| `openspec/changes/timer-fsm/`            | Created  | OpenSpec artifacts tracking proposal, specs, design, and task checklist       |

## 6. Risks & Mitigation

| Risk                                       | Severity | Mitigation Strategy                                                                                                                                         |
| :----------------------------------------- | :------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Clock Drift / Accumulation Errors**      | High     | Use millisecond-level delta updates with clamping at zero. Unit tests simulate uneven ticks (16ms, 33ms, 1200ms, 60000ms) to ensure exact precision.        |
| **Accidental Platform/Framework Coupling** | High     | Vitest's `server` project runs in a pure Node environment without DOM globals. Strict linter rules (`pnpm check` and `pnpm lint`) enforce clean boundaries. |
| **Invalid State Transition Leaks**         | Medium   | Exhaustive transition matrix with explicit guards. Invalid actions do not mutate state; transitions are covered 100% in unit tests.                         |
| **Test Suite Slowness**                    | Low      | Pure memory execution without virtual DOM or mock timers; tests execute in <50ms, comfortably below the 500ms threshold.                                    |

## 7. Rollback Plan

If design flaws or regressions occur during development:

1. Revert domain files to their baseline using Git:
   ```bash
   git checkout main -- src/lib/domain/timer/
   ```
2. Remove the change directory `openspec/changes/timer-fsm/` if abandoned.
3. Since no adapters or UI components currently depend on the timer FSM, rollback has zero impact on other application modules.

## 8. Dependencies

- **Preceding Dependencies**: None.
- **External Dependencies**: None (native TypeScript only).
- **Downstream Consumers** (Subsequent issues):
  - Svelte 5 Reactive Composition Root (`src/lib/state/timer.svelte.ts`)
  - Web Audio Notifier Adapter (`src/lib/adapters/audio/`)
  - Web Worker Background Timer Adapter (`src/lib/adapters/worker/`)
  - Main Zen Timer Component (`src/lib/components/timer/`)

## 9. Success Criteria (Issue #1 DoD)

- [ ] Pure FSM without dependencies on Svelte, DOM, or Tauri in `src/lib/domain/timer/`.
- [ ] Complete support for states: `idle`, `running`, `paused`, `completed`.
- [ ] Complete support for modes: `focus` (25m), `shortBreak` (5m), `longBreak` (15m) with configurable durations.
- [ ] Deterministic temporal advancement by ticks/deltas without timing drift.
- [ ] Control actions: `start`, `pause`, `resume`, `reset`, `skip`.
- [ ] Comprehensive unit test coverage developed with strict TDD executing in Node (<500ms).
- [ ] `pnpm check` passes with 0 errors and 0 warnings.
- [ ] `pnpm test:unit` passes all unit tests.
