# Refactor: Migrate UI Component Tests to Client-First Browser Tests

- **Issue**: #13
- **Branch**: `refactor/13-client-browser-tests`
- **Status**: In Progress

## Objective

Migrate and consolidate UI component test assertions to Vitest Browser Mode (`vitest-browser-svelte`), eliminating redundant SSR tests (`svelte/server`) in Node that duplicate coverage and introduce unnecessary compilation overhead in a static SPA / Tauri desktop application.

## Problem & Motivation

Component test files `settings.test.ts` and `timer-components.test.ts` were running under Node SSR in the `server` Vitest project. This required Svelte compilation in server mode, slowed down `pnpm test:unit` by ~14 seconds, and verified static HTML string output rather than real browser DOM behaviors. Consolidating all UI testing into `*.svelte.test.ts` with 100% web-first assertions (`await expect.element(...)`) in Vitest Browser Mode ensures tests run against real Chromium and keeps the `server` project reserved strictly for pure domain, adapters, and headless state logic.

## Scope & Boundaries

- **UI Tests**:
  - `src/lib/components/settings/settings.svelte.test.ts` (consolidate Rosé Pine indicator accent classes)
  - `src/lib/components/settings/settings.test.ts` (delete)
  - `src/lib/components/timer/timer.svelte.test.ts` (consolidate uppercase break labels, `role="timer"`, and paused control state)
  - `src/lib/components/timer/timer-components.test.ts` (delete)
- **Configuration**:
  - `vite.config.ts` (exclude `src/lib/components/**` from `server` project)
- **Out of Scope**:
  - Domain, ports, adapters, and state logic tests.
  - Component implementation logic or CSS refactoring.

## Implementation Tasks

### [x] TASK-1: Consolidate Settings assertions and eliminate settings.test.ts

- **Route**: Delegated direct
- **Target Files**:
  - `src/lib/components/settings/settings.svelte.test.ts`
  - `src/lib/components/settings/settings.test.ts`
- **Acceptance Criteria**:
  - `settings.svelte.test.ts` asserts Rosé Pine accent classes (`bg-accent-foam`, `bg-accent-pine`, `bg-accent-iris`, `bg-accent-rose`) on interval indicators.
  - `src/lib/components/settings/settings.test.ts` is deleted.
  - `pnpm test:browser` passes for settings (18/18 tests passed).

### [x] TASK-2: Consolidate Timer assertions and eliminate timer-components.test.ts

- **Route**: Delegated direct
- **Target Files**:
  - `src/lib/components/timer/timer.svelte.test.ts`
  - `src/lib/components/timer/timer-components.test.ts`
- **Acceptance Criteria**:
  - `timer.svelte.test.ts` asserts `role="timer"`, and uppercase break mode labels (`SHORT BREAK`, `LONG BREAK`) in `TimerDisplay`.
  - `timer.svelte.test.ts` asserts `Resume timer` button state in `TimerControls`.
  - `src/lib/components/timer/timer-components.test.ts` is deleted.
  - `pnpm test:browser` passes for timer (8/8 tests passed).

### [x] TASK-3: Guard server Vitest project in vite.config.ts

- **Route**: Delegated direct
- **Target Files**:
  - `vite.config.ts`
- **Acceptance Criteria**:
  - Exclude `src/lib/components/**` from `server` project configuration.
  - `pnpm test:unit` runs pure domain, adapters, and state in sub-second time (298ms tests runtime).

### [x] TASK-4: Verification and Quality Gates

- **Route**: Direct inline
- **Acceptance Criteria**:
  - `pnpm check` passes with 0 errors and 0 warnings.
  - `pnpm test:unit` passes (10 suites, 250 tests passed in 298ms).
  - `pnpm test:browser` passes 100% in Chromium (3 suites, 31 tests passed).
  - `pnpm lint` passes with 0 errors/warnings (Prettier and ESLint clean).
