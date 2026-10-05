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
  - Evidence: Packages installed (`@inlang/paraglide-js@2.25.4`, `@inlang/paraglide-vite@1.4.0`), `project.inlang/settings.json`, `messages/en.json`, `messages/es.json` created. `vite.config.ts` and `package.json` updated. Generated runtime and messages compiled cleanly in `src/lib/paraglide/`. `pnpm check` passed (0 errors, 0 warnings), `pnpm test:unit` passed (636/636 tests), `pnpm build` passed.

- [ ] `TASK-2`: Implement reactive locale state and fine-grained proxy (`src/lib/state/locale.svelte.ts`)
  - Route: Delegated direct (Writer trigger: src/lib/state/locale.svelte.ts).
  - Scope:
    - Implement `LocaleState` class with `$state<AvailableLanguageTag>` initialized from `localStorage` (`'pomody_locale'`).
    - Implement `setLocale(tag)` with runtime synchronization and persistent storage.
    - Implement fine-grained reactive proxy `t` wrapping Paraglide `m` messages.
    - Export `localeState`, `t`, `SUPPORTED_LOCALES`.
  - Checks: `pnpm check`, `pnpm lint`.
  - Evidence: Pending.

- [ ] `TASK-3`: Implement unit test suite for locale state and proxy (`src/lib/state/locale.test.ts`)
  - Route: Delegated direct (Writer trigger / TDD).
  - Scope:
    - Test initial locale resolution (default `'en'`, restored from `localStorage`).
    - Test fallback behavior on corrupt storage or non-browser environment.
    - Test `setLocale` updates `localStorage`, runtime, and ignores identical tag.
    - Test reactive proxy `t` accesses generated messages.
  - Checks: `pnpm test:unit`, `pnpm check`.
  - Evidence: Pending.

- [ ] `TASK-4`: Configure Vitest isolation harness for locale in tests and run complete verification gate
  - Route: Delegated direct (Writer trigger: test setup / harness).
  - Scope:
    - Ensure global `afterEach` in test setup resets `localeState.setLocale('en')` and clears `pomody_locale`.
    - Run full verification suite (`pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:browser`).
  - Checks: Full test suites green, zero regressions.
  - Evidence: Pending.

## Delivery Strategy

- Strategy: `ask-on-risk` (single PR for PR 2.0 / Issue #95).
- Forecast: ~180 LOC net delta.
- Target PR: resolves #95 under Epic #92.

## Verification Evidence & Progress

- Baseline: 636/636 unit tests green on `feat/95-i18n-runtime-setup`.
- Current Status: Task tracking created, starting TASK-1.
- Next Step: Delegate TASK-1.
