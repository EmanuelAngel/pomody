# Feature: Daily Focus Counter (Zen Statusline)

- **Issue**: #29
- **Design Brief Reference**: `ISSUE_29_SPEC.md`
- **Branch**: `feat/daily-focus-counter`
- **Status**: Ready for Implementation
- **Delivery Strategy**: `single-pr`
- **TDD Mode**: Standard Unit & Web-First Browser Mode (`vitest run --project server`, `vitest run --project client`)

## Objective

Implement a non-invasive daily focus counter displaying completed focus blocks and accumulated focus minutes during the day, anchored as a Zen Statusline globally in `src/routes/+layout.svelte` that automatically fades out when the timer is running.

## Architecture Boundaries (Hexagonal Architecture)

- **Domain Layer (`src/lib/domain/`)**: Pure TypeScript, zero external framework/DOM dependencies.
  - `src/lib/domain/events/block-completed.event.ts`: Extend `BlockCompletedEvent` with `readonly durationMs: number;`.
  - `src/lib/domain/timer/timer-fsm.ts`: Emit `durationMs: this._durationMs` when transitioning to `completed`.
  - `src/lib/domain/ports/daily-stats-repository.port.ts`: Port interface `IDailyStatsRepository` with contract `loadStats(): DailyStats`, `saveStats(stats: DailyStats): void`, `resetStats(): void`.
- **Adapters Layer (`src/lib/adapters/`)**:
  - `src/lib/adapters/storage/local-daily-stats-repository.ts`: LocalStorage adapter implementing `IDailyStatsRepository` under storage key `'pomody:daily-stats'` with date checking against local date (`YYYY-MM-DD`).
- **State Layer (`src/lib/state/`)**:
  - `src/lib/state/daily-stats.svelte.ts`: Decoupled `DailyStatsState` class/singleton using Svelte 5 Runes (`$state`, `$derived`), subscribing to `timerState.onEvent()`, tracking completed focus blocks and accumulated minutes, and enforcing midnight rollover.
- **UI Layer (`src/lib/components/`)**:
  - `src/lib/components/layout/daily-counter.svelte`: Zen Statusline component positioned at `fixed bottom-5 inset-x-0 z-20 pointer-events-none`. Fades to `opacity-0` when `timerState.isRunning` is true and back to `opacity-100` when idle/paused.
  - `src/routes/+layout.svelte`: Mounts `DailyCounter` globally.

## Display & Formatting Rules

- **Base State (0 completed blocks)**: `0 blocks · 0m`
- **Under 1 Hour**: `2 blocks · 50m`
- **1 Hour or More (Strict `Xh Ym`)**:
  - `60m` → `1h 0m`
  - `100m` → `1h 40m`
  - `4 blocks · 1h 40m`
- **Typography**: `text-xs font-mono text-muted-foreground/60 select-none` centered horizontally.

## Implementation Tasks

### [ ] TASK-1: Domain event enrichment & port definition

- **Route**: direct inline
- **Target Files**:
  - `src/lib/domain/events/block-completed.event.ts`
  - `src/lib/domain/timer/timer-fsm.ts`
  - `src/lib/domain/timer/timer-fsm.test.ts`
  - `src/lib/domain/ports/daily-stats-repository.port.ts`
- **Acceptance Criteria**:
  - `BlockCompletedEvent` carries `readonly durationMs: number;`.
  - `TimerFSM.tick` emits `durationMs`.
  - `IDailyStatsRepository` port defines clean contracts without DOM/Svelte dependencies.
- **Commit Evidence**: pending

### [ ] TASK-2: LocalDailyStatsRepository adapter

- **Route**: direct inline
- **Target Files**:
  - `src/lib/adapters/storage/local-daily-stats-repository.ts`
  - `src/lib/adapters/storage/local-daily-stats-repository.test.ts`
- **Acceptance Criteria**:
  - Persists and loads daily stats under `'pomody:daily-stats'`.
  - Resets to 0 blocks / 0m if stored date does not match current local date (`YYYY-MM-DD`).
  - SSR and exception-safe (resilient against disabled or throwing localStorage).
- **Commit Evidence**: pending

### [ ] TASK-3: DailyStatsState reactive state & formatting logic

- **Route**: direct inline
- **Target Files**:
  - `src/lib/state/daily-stats.svelte.ts`
  - `src/lib/state/daily-stats.test.ts`
- **Acceptance Criteria**:
  - Connects to `timerState.onEvent()`.
  - Increments completed blocks and accumulated minutes when `mode === 'focus'`.
  - Ignores break completions and skipped blocks.
  - Formats duration strictly (`Xm` when <60, `Xh Ym` when >=60).
  - Handles day rollover seamlessly.
- **Commit Evidence**: pending

### [ ] TASK-4: DailyCounter UI component & Layout integration

- **Route**: direct inline
- **Target Files**:
  - `src/lib/components/layout/daily-counter.svelte`
  - `src/lib/components/layout/daily-counter.svelte.test.ts`
  - `src/routes/+layout.svelte`
- **Acceptance Criteria**:
  - Renders at `fixed bottom-5 inset-x-0` with monospace muted typography.
  - Fades to `opacity-0` with `transition-opacity duration-300` when `timerState.isRunning` is true.
  - Displays formatted blocks and accumulated focus time.
- **Commit Evidence**: pending

## Verification Gate

- [ ] `pnpm check` (0 type errors)
- [ ] `pnpm lint` (0 lint/formatting errors)
- [ ] `pnpm test` (all unit and browser tests passing)
