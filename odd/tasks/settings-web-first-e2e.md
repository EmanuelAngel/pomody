# Feature: Settings Web-First Assertions & Playwright E2E Smoke Test

- **Issue**: #11
- **Branch**: `feat/settings-drawer`
- **Status**: Completed

## Objective

Refactor client browser tests in `src/lib/components/settings/settings.svelte.test.ts` to eliminate synchronous DOM property inspections and enforce 100% web-first assertions (`await expect.element(...)`), and implement the initial Playwright E2E smoke test (`e2e/settings.e2e.ts`) validating real integration between the settings drawer and the main timer screen.

## Problem & Motivation

1. **Flaky & Synchronous Assertions in Browser Tests**: `settings.svelte.test.ts` relies on synchronous DOM snapshot reads like `expect(button.element().hasAttribute('disabled')).toBe(true)`, `expect(focusThumb.getAttribute('aria-valuenow')).toBe('25')`, and `className` string matching. These do not auto-retry and fail to leverage Vitest Browser Mode's asynchronous web-first matchers (`await expect.element(...)`).
2. **Missing E2E Smoke Test**: There is currently no end-to-end integration test validating the real production SPA lifecycle connecting the settings drawer to the main timer display and countdown loop.
3. **Broken Playwright WebServer Configuration**: `playwright.config.ts` invoked `npm run build && npm run preview`, which violated the strict `pnpm` policy and failed immediately because `"preview"` was missing from `package.json`.

## Scope & Boundaries

- **Config & Tooling**:
  - `package.json`: Add `"preview": "vite preview --outDir build"`.
  - `playwright.config.ts`: Use `pnpm build && pnpm preview` on port 4173 with proper reuse config.
- **Client Component Tests**:
  - `src/lib/components/settings/settings.svelte.test.ts`: Convert all synchronous DOM reads into `await expect.element(...)` matchers.
- **E2E Suite**:
  - `e2e/settings.e2e.ts`: Initial Playwright E2E test verifying settings trigger, duration reconfiguration via accessible slider, drawer close, timer start, and countdown decrement.
- **Out of Scope**:
  - Unit/domain logic changes (already 100% green and isolated).
  - Duplicating detailed slider/theme edge cases already covered by Vitest Browser Mode in E2E.

## Implementation Tasks

### [x] TASK-1: Configure Playwright webServer and preview script

- **Route**: Direct inline (Config update).
- **Target Files**:
  - `package.json`
  - `playwright.config.ts`
- **Acceptance Criteria**:
  - Add `"preview": "vite preview --outDir build"` to `package.json`.
  - Update `webServer` in `playwright.config.ts` to `command: 'pnpm build && pnpm preview'`.
  - Ensure port 4173 is configured and `reuseExistingServer: !process.env.CI`.
- **Evidence / Commit**: `c065343` (test(e2e): configure playwright webServer with pnpm preview)

### [x] TASK-2: Refactor settings.svelte.test.ts to 100% web-first assertions

- **Route**: Delegated direct (Writer trigger: refactoring large browser test suite).
- **Target Files**:
  - `src/lib/components/settings/settings.svelte.test.ts`
- **Acceptance Criteria**:
  - Replace all `.element().hasAttribute()`, `.element().getAttribute()`, `.element().className` synchronous checks with `await expect.element(...)` matchers (`toBeDisabled()`, `not.toBeDisabled()`, `toHaveAttribute()`, `toHaveClass()`).
  - Preserve all 16 test cases and their semantic assertions.
  - `pnpm test:browser` passes 100% green.
- **Evidence / Commit**: `06895ba` (test(settings): refactor browser tests to 100% web-first assertions)

### [x] TASK-3: Implement Playwright E2E smoke test for settings and timer integration

- **Route**: Delegated direct (New test suite in `e2e/`).
- **Target Files**:
  - `e2e/settings.e2e.ts`
  - `playwright.config.ts`
- **Acceptance Criteria**:
  - Open `/`, verify initial timer state (`25:00`).
  - Open settings drawer via trigger button.
  - Adjust focus duration via keyboard arrow on `getByLabel('Focus duration').getByRole('slider')` (e.g. 25 -> 24 min).
  - Close drawer.
  - Verify timer display shows `24:00`.
  - Click Start / Play button.
  - Verify countdown starts ticking and decrements (e.g. to `23:59`) with auto-retrying web-first assertion.
  - `pnpm test:e2e` passes 100% green.
- **Evidence / Commit**: `3d47f60` (test(e2e): implement settings drawer and timer integration smoke test)

### [x] TASK-4: Verification and quality gates

- **Route**: Direct inline.
- **Target Files**: All affected files.
- **Acceptance Criteria**:
  - `pnpm check` passes with 0 errors.
  - `pnpm lint` passes with 0 errors.
  - `pnpm test:unit` passes 100% green (6/6 suites, 105/105 tests).
  - `pnpm test:browser` passes 100% green (2/2 suites, 22/22 tests).
  - `pnpm test:e2e` passes 100% green (1/1 suite, 1/1 smoke test).
- **Evidence / Commit**: Verified clean across all 5 verification suites.
