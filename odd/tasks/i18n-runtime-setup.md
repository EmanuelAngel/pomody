# Feature: i18n Runtime Setup & Test Isolation Harness (Slice 2.0 - #95)

## Objective

Set up `@inlang/paraglide-js` and `@inlang/paraglide-vite` for runtime i18n, implement `src/lib/state/locale.svelte.ts` (Svelte 5 Runes + fine-grained reactive proxy `t`), and establish test isolation harness in Vitest, completing PR 2.0 (Issue #95) under Epic #92 and Milestone 3.

## Problem

Pomody currently hardcodes UI text in English and lacks an internationalization compiler, runtime state machine, and test cleanup guards for multi-locale support.

## Why

PR 2.0 provides pure infrastructure foundations without modifying existing UI components yet. It enables tree-shakeable zero-bloat translations in memory for Web and Tauri v2 without URL routing or runtime footprint overhead (<30 MB RAM target).

## Scope

- Dependencies: `@inlang/paraglide-js`, `@inlang/paraglide-vite`.
- Configuration: `project.inlang/settings.json`, `vite.config.ts`, `package.json` (`prepare` script).
- Messages catalog: `messages/en.json`, `messages/es.json`.
- State module: `src/lib/state/locale.svelte.ts` exporting `localeState`, `t`, `SUPPORTED_LOCALES`.
- Test harness & isolation: Vitest cleanup in `src/testing/` or test setup resetting locale to `'en'` and purging `localStorage`.
- Unit tests: `src/lib/state/locale.test.ts`.

## Constraints

- Zero dependencies on Svelte or DOM inside `src/lib/domain/`.
- Svelte 5 Runes (`$state`) for `LocaleState` in `src/lib/state/locale.svelte.ts`.
- Strict ban on barrel files (`index.ts`).
- Authored changes kept under 400 LOC for this PR slice.
- Mandatory subagent delegation for non-trivial tasks (ODD protocol).
- Conventional Commits only, no AI attribution trailers.

## Actionable Checklist

- [x] `TASK-1`: Install Paraglide dependencies and configure inlang project, Vite plugin, and messages catalog
  - Route: Delegated direct (Writer trigger: package.json, vite.config.ts, project.inlang/settings.json, messages/en.json, messages/es.json).
  - Scope:
    - Install `@inlang/paraglide-vite` and `@inlang/paraglide-js`.
    - Configure `project.inlang/settings.json` with language tags `['en', 'es']` and base `en`.
    - Register `paraglideVitePlugin` in `vite.config.ts` targeting `src/lib/paraglide`.
    - Add baseline messages files `messages/en.json` and `messages/es.json` with initial schema/keys.
    - Add `paraglide-js compile` or sync step to `package.json` prepare script if needed.
    - Verify generation of `src/lib/paraglide/runtime.js` and `messages.js`.
  - Checks: `pnpm check`, `pnpm build`.
  - Evidence: Commit `56f5ea9`. Packages installed (`@inlang/paraglide-js@2.25.4`, `@inlang/paraglide-vite@1.4.0`), `project.inlang/settings.json`, `messages/en.json`, `messages/es.json` created. `vite.config.ts` and `package.json` updated. Generated runtime and messages compiled cleanly in `src/lib/paraglide/`. `pnpm check` passed (0 errors, 0 warnings), `pnpm test:unit` passed (636/636 tests), `pnpm build` passed.

- [x] `TASK-2`: Implement reactive locale state and fine-grained proxy (`src/lib/state/locale.svelte.ts`)
  - Route: Delegated direct (Writer trigger: src/lib/state/locale.svelte.ts).
  - Scope:
    - Implement `LocaleState` class with `$state<AvailableLanguageTag>` initialized from `localStorage` (`'pomody_locale'`).
    - Implement `setLocale(tag)` with runtime synchronization and persistent storage.
    - Implement fine-grained reactive proxy `t` wrapping Paraglide `m` messages.
    - Export `localeState`, `t`, `SUPPORTED_LOCALES`.
  - Checks: `pnpm check`, `pnpm lint`.
  - Evidence: Commit `cff8694`. Created `src/lib/state/locale.svelte.ts` implementing `LocaleState` with Svelte 5 `$state`, Paraglide runtime sync (`setParaglideLocale` with `reload: false` and `overwriteGetLocale`), `localStorage` persistence under `'pomody_locale'`, and fine-grained reactive proxy `t` wrapping messages. `pnpm check` (0 errors, 0 warnings) and `pnpm lint` passed cleanly.

- [x] `TASK-3`: Implement unit test suite for locale state and proxy (`src/lib/state/locale.test.ts`)
  - Route: Delegated direct (Writer trigger / TDD).
  - Scope:
    - Test initial locale resolution (default `'en'`, restored from `localStorage`).
    - Test fallback behavior on corrupt storage or non-browser environment.
    - Test `setLocale` updates `localStorage`, runtime, and ignores identical tag.
    - Test reactive proxy `t` accesses generated messages.
  - Checks: `pnpm test:unit`, `pnpm check`.
  - Evidence: Commit `398f1ae`. Created `src/lib/state/locale.test.ts` covering 14 unit test assertions: default `'en'` resolution, restoring `'es'` from `'pomody_locale'`, fallback on invalid or throwing storage, custom initial locales, state transitions via `setLocale`, redundant call deduplication, storage failure resilience, and Paraglide message proxy `t` translation verification. `pnpm test:unit` passed (650/650 tests across 34 test files).

- [x] `TASK-4`: Configure Vitest isolation harness for locale in tests and run complete verification gate
  - Route: Delegated direct (Writer trigger: test setup / harness).
  - Scope:
    - Ensure global `afterEach` in test setup resets `localeState.setLocale('en')` and clears `pomody_locale`.
    - Run full verification suite (`pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:browser`).
  - Checks: Full test suites green, zero regressions.
  - Evidence: Commit `ad8a67a`. Created `src/testing/setup-locale.ts` registered in `vite.config.ts` under `test.setupFiles`. Includes an `afterEach` hook resetting `localeState.setLocale('en')` and purging `pomody_locale` from `localStorage` in both server and browser environments. Full verification gate passed cleanly: `pnpm check` (0 errors, 0 warnings), `pnpm lint` (0 errors), `pnpm test:unit` (650/650 passed in 7.83s), `pnpm test:browser` (147/147 passed in 30.37s). Total test suite: 797/797 tests passing with zero regressions.

## Delivery Strategy

- Strategy: `ask-on-risk` (single PR for PR 2.0 / Issue #95).
- Forecast: ~180 LOC net delta.
- Target PR: resolves #95 under Epic #92.

## Verification Evidence & Progress

- Baseline: 636/636 unit tests green on `feat/95-i18n-runtime-setup`.
- Current Status: All tasks (TASK-1, TASK-2, TASK-3, TASK-4) completed and verified.
- Verification Gate:
  - `pnpm check`: 0 errors, 0 warnings.
  - `pnpm lint`: clean.
  - `pnpm test:unit`: 650/650 passed (34 test files).
  - `pnpm test:browser`: 147/147 passed (17 test files).
  - Total tests: 797/797 passing with zero regressions.
