# Feature: Rounds Before Long Break Configuration

- **Issue**: #12
- **Branch**: `feat/settings-drawer`
- **Status**: In Progress

## Objective

Add configurable `roundsBeforeLongBreak` (range: 1-12 rounds, default: 4) to the timer configuration and settings drawer, allowing users to customize their complete Pomodoro cycle.

## Problem & Motivation

The Pomodoro cycle hardcoded 4 focus rounds before triggering a long break. Users need flexibility to configure shorter cycles (e.g. 2 rounds) or longer cycles (up to 12 rounds) directly from the settings drawer, with real-time feedback and synchronized cycle indicators.

## Scope & Boundaries

- **Domain Layer**: `src/lib/domain/timer/timer-fsm.ts` - enforce integer range [1, 12] in `validateTimerConfig`.
- **UI Layer**: `src/lib/components/settings/settings-drawer.svelte` - add accessible Slider with numeric readout and update reset button.
- **Testing**:
  - `src/lib/domain/timer/timer-fsm.test.ts` (unit tests for 1-12 bounds)
  - `src/lib/components/settings/settings.svelte.test.ts` (Vitest Browser Mode tests using strictly web-first assertions `await expect.element(...)`)
- **Out of Scope**: LocalStorage persistence (deferred to v0.2 unified persistence).

## Implementation Tasks

### [x] TASK-1: Domain validation & unit tests for roundsBeforeLongBreak

- **Route**: Delegated direct (Writer trigger: modifies domain logic and test suite).
- **Target Files**:
  - `src/lib/domain/timer/timer-fsm.ts`
  - `src/lib/domain/timer/timer-fsm.test.ts`
- **Acceptance Criteria**:
  - Reject non-integer, <= 0, and > 12 values with `InvalidTimerConfigError`.
  - Accept valid values 1 through 12.
  - All domain tests pass.
- **Evidence / Commit**: `b78956a` (feat(domain): validate roundsBeforeLongBreak bounds between 1 and 12)

### [x] TASK-2: SettingsDrawer slider and Reset defaults update with web-first tests

- **Route**: Delegated direct (Writer trigger: UI component and browser test suite).
- **Target Files**:
  - `src/lib/components/settings/settings-drawer.svelte`
  - `src/lib/components/settings/settings.svelte.test.ts`
- **Acceptance Criteria**:
  - Accessible Slider (1-12, step 1) with real-time readout `{n} rounds` / `1 round`.
  - Accent color using Rosé Pine `accent-rose` token.
  - Reset to defaults restores `roundsBeforeLongBreak` to 4 and updates button text to `"Reset to defaults (25 / 5 / 15 min · 4 rounds)"`.
  - Interactive browser tests written strictly using web-first assertions (`await expect.element(...)`), without synchronous DOM queries.
- **Evidence / Commit**: `0b0acc4` (feat(settings): add rounds before long break slider and update reset defaults)

### [x] TASK-3: Verification and quality gates

- **Route**: Direct inline.
- **Acceptance Criteria**:
  - `pnpm check` passes with 0 errors.
  - `pnpm test` passes with 0 errors (127/127 passed: 6 server suites, 2 browser suites).
  - `pnpm lint` passes with 0 errors (Prettier + ESLint clean).
- **Evidence / Commit**: Verified clean in working tree.
