# Feature: Web Audio Transition Alerts & Domain Event Wiring

- **Issue**: #7
- **Branch**: `feat/audio-alerts`
- **Status**: Completed
- **Delivery Strategy**: `single-pr` (Total authored changes: ~580 lines across 4 atomic work-unit commits)
- **TDD Mode**: Standard Unit & Web-First Browser Mode (`vitest run --project server`, `vitest run --project client`)

## Objective

Implement sound transition alerts using the Web Audio API in `src/lib/adapters/audio/` under the abstract port `IAudioNotifier`, reacting to block completion events emitted by `TimerFSM` and orchestrated by `TimerState`, with an accessible sound toggle in `SettingsDrawer`.

## Problem & Motivation

When deep in focus or resting during a break, users cannot rely solely on visual cues on screen. A minimalist, soothing audio cue signals mode transitions without jarring alarms, external heavy audio files (.mp3/.wav), or violating Hexagonal Architecture.

## Architecture Boundaries

- **Domain Layer (`src/lib/domain/`)**: Pure TypeScript.
  - `src/lib/domain/events/block-completed.event.ts`: Defines `BlockCompletedEvent` and `DomainEvent`.
  - `src/lib/domain/timer/timer-fsm.ts`: Emits domain events via `onEvent((event: DomainEvent) => void)` when state reaches `completed`.
  - `src/lib/domain/ports/IAudioNotifier.ts`: Abstract port interface.
- **Adapters Layer (`src/lib/adapters/`)**:
  - `src/lib/adapters/audio/web-audio-notifier.ts`: Synthesizes gentle harmonic chimes with native oscillators (`AudioContext`), handles autoplay unlock, Node-safe.
- **State Layer (`src/lib/state/`)**:
  - `src/lib/state/timer.svelte.ts`: Composition root injecting `IAudioNotifier`, managing `soundEnabled`, subscribing to domain events, and unlocking audio on start.
- **UI Layer (`src/lib/components/`)**:
  - `src/lib/components/settings/settings-drawer.svelte`: "Sound" section with toggle/switch.

## Implementation Tasks

### [x] TASK-1: Domain events & TimerFSM event subscription

- **Route**: Delegated direct (Writer trigger: 3 non-trivial files)
- **Target Files**:
  - `src/lib/domain/events/block-completed.event.ts`
  - `src/lib/domain/timer/timer-fsm.ts`
  - `src/lib/domain/timer/timer-fsm.test.ts`
- **Acceptance Criteria**:
  - `BlockCompletedEvent` carries `type: 'block-completed'`, `mode: TimerMode`, `round: number`, `totalRoundsCompleted: number`, and `completedAt: Date`.
  - `TimerFSM.prototype.onEvent(handler: (event: DomainEvent) => void): Unsubscribe` registers domain event listeners.
  - Completing a block in `TimerFSM.prototype.tick` emits `BlockCompletedEvent`.
  - All existing and new domain unit tests pass.
- **Commit**: `9c9397c` (`feat(domain): add block completed domain event and fsm subscription`)
- **Evidence / Status**: Completed. 61 tests passing in `timer-fsm.test.ts`, `pnpm check` found 0 errors, domain isolation preserved.

### [x] TASK-2: IAudioNotifier port & WebAudioNotifier adapter

- **Route**: Delegated direct (Writer trigger: 3 non-trivial files)
- **Target Files**:
  - `src/lib/domain/ports/IAudioNotifier.ts`
  - `src/lib/adapters/audio/web-audio-notifier.ts`
  - `src/lib/adapters/audio/web-audio-notifier.test.ts`
- **Acceptance Criteria**:
  - `IAudioNotifier` defines `notifyBlockCompleted(mode: TimerMode): Promise<void> | void` and `unlock(): Promise<void> | void`.
  - `WebAudioNotifier` synthesizes harmonic chimes via native `AudioContext`:
    - Uplifting chord/chime for focus completion.
    - Soothing bell/chime for break completion.
  - Safe in SSR/Node test environment (no crashes when `window` or `AudioContext` is undefined).
  - Handles autoplay unlock gracefully.
  - Unit tests verify oscillator setup and fallback behavior.
- **Commit**: `f467775` (`feat(audio): implement WebAudioNotifier adapter and IAudioNotifier port`)
- **Evidence / Status**: Completed. 16 tests passing in `web-audio-notifier.test.ts`, all unit and browser suites green, `pnpm check` found 0 errors.

### [x] TASK-3: Wire IAudioNotifier and soundEnabled in TimerState

- **Route**: Delegated direct (Writer trigger: 2 non-trivial files)
- **Target Files**:
  - `src/lib/state/timer.svelte.ts`
  - `src/lib/state/timer.test.ts`
- **Acceptance Criteria**:
  - `TimerState` accepts optional `audioNotifier?: IAudioNotifier` (default `new WebAudioNotifier()`).
  - Exposes `soundEnabled` getter and `setSoundEnabled(enabled: boolean)` / `toggleSound()`.
  - Subscribes to `fsm.onEvent`: triggers `audioNotifier.notifyBlockCompleted(event.mode)` only when `soundEnabled === true`.
  - Calls `audioNotifier.unlock()` on `start()` / `resume()`.
  - Cleaned up in `destroy()`.
  - Unit tests verify audio notification triggered on completion when enabled, suppressed when muted.
- **Commit**: `4da4705` (`feat(state): wire IAudioNotifier and soundEnabled into TimerState composition root`)
- **Evidence / Status**: Completed. 136 tests passing in `pnpm test:unit` (163 in full suite), `pnpm check` found 0 errors.

### [x] TASK-4: Add Sound section in SettingsDrawer and client browser tests

- **Route**: Delegated direct (Writer trigger: 2 non-trivial files)
- **Target Files**:
  - `src/lib/components/settings/settings-drawer.svelte`
  - `src/lib/components/settings/settings.svelte.test.ts`
- **Acceptance Criteria**:
  - Accessible "Sound" section in `SettingsDrawer` with switch/toggle for activating/muting sound alerts.
  - Coordinates with `timerState.soundEnabled`.
  - Web-first browser tests verify rendering, initial checked state, toggle interaction, and state synchronization.
  - `pnpm check`, `pnpm test:unit`, `pnpm test:browser`, and `pnpm build` pass cleanly.
- **Commit**: `b230784` (`feat(ui): add sound alerts toggle to settings drawer with web-first tests`)
- **Evidence / Status**: Completed. 29 browser tests passing in `settings.svelte.test.ts`, 165 total tests passing across all suites, `pnpm check` clean, `pnpm build` clean.
