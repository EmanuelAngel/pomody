# Feature: Settings & Theme Persistence to LocalStorage

- **Issue**: #15
- **Branch**: `feat/settings-persistence`
- **Status**: Completed
- **Delivery Strategy**: `single-pr` (Forecast: ~450 lines across 4 atomic work-unit commits)
- **TDD Mode**: Standard Unit & Web-First Browser Mode (`vitest run --project server`, `vitest run --project client`)

## Objective

Persist user configuration (timer interval durations, rounds before long break, Rosé Pine theme selection, and sound alerts preference) across browser refreshes and application restarts using a clean Hexagonal Architecture storage port and `localStorage` adapter.

## Problem & Motivation

Currently, every time the user refreshes the page or restarts Pomody, customized durations (focus, short break, long break), rounds before long break, sound alerts preference, and active theme revert back to hardcoded defaults because no persistence layer is connected.

## Architecture Boundaries

- **Domain Layer (`src/lib/domain/`)**: Pure TypeScript, 0 external runtime or framework dependencies.
  - `src/lib/domain/ports/settings-storage.port.ts`: Defines `Theme`, `UserSettings`, `DEFAULT_USER_SETTINGS`, and abstract `ISettingsStorage` contract.
- **Adapters Layer (`src/lib/adapters/`)**:
  - `src/lib/adapters/storage/local-settings-storage.ts`: Implements `ISettingsStorage` with `localStorage`, versioned JSON payload (`version: 1`), field-by-field runtime validation, and defensive fallbacks. Safe in SSR/headless environments.
- **State Layer (`src/lib/state/`)**:
  - `src/lib/state/timer.svelte.ts`: Composition root accepting `ISettingsStorage`, hydrating timer configuration and `soundEnabled` on construction, and auto-persisting mutations.
  - `src/lib/state/theme.svelte.ts`: Composition root accepting `ISettingsStorage`, hydrating theme on construction, and auto-persisting theme switches.
- **UI Layer (`src/lib/components/`) & Docs**:
  - `src/lib/components/settings/settings-drawer.svelte`: Resets timer intervals and sound alerts while preserving active theme; resolves JD-17 with dynamic defaults interpolation.
  - `docs/review-findings.md`: Removes resolved JD-17 finding.

## Implementation Tasks

### [x] TASK-1: Define pure domain port ISettingsStorage & UserSettings model

- **Route**: Delegated direct (Writer trigger: 2 domain files)
- **Target Files**:
  - `src/lib/domain/ports/settings-storage.port.ts`
  - `src/lib/domain/ports/settings-storage.port.test.ts`
- **Acceptance Criteria**:
  - Defines `Theme` ('dark' | 'dawn' | 'oled').
  - Defines `UserSettings` interface (`timer: TimerConfig`, `soundEnabled: boolean`, `theme: Theme`).
  - Exports `DEFAULT_USER_SETTINGS` as frozen constant.
  - Defines `ISettingsStorage` with `loadSettings(): UserSettings`, `saveSettings(patch: Partial<UserSettings>): void`, and `resetSettings(): void`.
  - Zero DOM, Svelte, or storage imports in `domain/`.
  - Unit tests verifying contract exports and defaults integrity.
- **Commit**: `5d07302` (`feat(domain): define ISettingsStorage port and UserSettings model`)
- **Evidence / Status**: Completed. 4 tests passing in `settings-storage.port.test.ts`, 140 total unit tests passing, `pnpm check` clean.

### [x] TASK-2: Implement LocalSettingsStorage adapter with defensive validation

- **Route**: Delegated direct (Writer trigger: 2 adapter files)
- **Target Files**:
  - `src/lib/adapters/storage/local-settings-storage.ts`
  - `src/lib/adapters/storage/local-settings-storage.test.ts`
- **Acceptance Criteria**:
  - Implements `ISettingsStorage` backed by `localStorage` using key `'pomody:settings'`.
  - Stored structure uses versioned payload: `{ version: 1, timer: ..., soundEnabled: ..., theme: ... }`.
  - Field-by-field validation with graceful fallback: invalid or out-of-bounds fields revert to defaults individually while preserving valid fields.
  - Safe in SSR / headless / restricted environments (checks `typeof window` / `typeof localStorage`, catches `DOMException` / `SecurityError`).
  - `saveSettings(patch)` performs read-merge-validate-write.
  - Unit tests cover valid load/save, partial updates, malformed JSON recovery, negative/out-of-bounds numbers, missing fields, and disabled storage.
- **Commit**: `e191621` (`feat(storage): implement LocalSettingsStorage adapter with defensive validation`)
- **Evidence / Status**: Completed. 22 tests passing in `local-settings-storage.test.ts`, 162 total unit tests passing, `pnpm check` clean.

### [x] TASK-3: Wire ISettingsStorage into TimerState & ThemeState composition roots

- **Route**: Delegated direct (Writer trigger: 4 state files)
- **Target Files**:
  - `src/lib/state/timer.svelte.ts`
  - `src/lib/state/theme.svelte.ts`
  - `src/lib/state/timer.test.ts`
  - `src/lib/state/theme.test.ts`
- **Acceptance Criteria**:
  - `TimerState` constructor accepts optional `storage?: ISettingsStorage`.
  - `TimerState` initializes `config` and `_soundEnabled` from `storage.loadSettings()` when provided, and auto-persists updates on `updateConfig` and `setSoundEnabled`.
  - `ThemeState` constructor accepts optional `storage?: ISettingsStorage`.
  - `ThemeState` initializes `_theme` from `storage.loadSettings().theme` when provided, and auto-persists updates on `setTheme`.
  - Default singletons (`timerState`, `themeState`) share default `LocalSettingsStorage` instance.
  - Unit tests verify initialization and persistence behavior with mock storage.
- **Commit**: `3aea2af` (`feat(state): wire ISettingsStorage into TimerState and ThemeState`)
- **Evidence / Status**: Completed. 10 new tests added across `timer.test.ts` and `theme.test.ts`, 172 total unit tests passing, `pnpm check` clean.

### [x] TASK-4: SettingsDrawer reset refinement, JD-17 fix, and E2E persistence tests

- **Route**: Delegated direct (Writer trigger: 4 UI / test / doc files)
- **Target Files**:
  - `src/lib/components/settings/settings-drawer.svelte`
  - `src/lib/components/settings/settings.svelte.test.ts`
  - `e2e/settings.e2e.ts`
  - `docs/review-findings.md`
- **Acceptance Criteria**:
  - `handleResetDefaults` in `settings-drawer.svelte` resets timer intervals and sound alerts to defaults, preserving active theme.
  - Resolves JD-17: dynamically interpolates reset button text from `DEFAULT_TIMER_CONFIG` and removes JD-17 from `docs/review-findings.md`.
  - Web-first browser tests in `settings.svelte.test.ts` verify reset button label and reset behavior.
  - Playwright E2E test in `e2e/settings.e2e.ts` verifies that modified timer durations and selected theme persist across `page.reload()`.
  - All quality gates pass: `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
- **Commit**: `4e048c9` (`feat(ui): refine settings reset, resolve JD-17, and add e2e persistence tests`)
- **Evidence / Status**: Completed. 29 browser tests passing, 2/2 Playwright E2E tests passing, JD-17 removed from review findings, pnpm check clean, pnpm lint clean, pnpm build clean.
