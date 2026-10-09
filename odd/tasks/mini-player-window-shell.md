# Feature: Mini-Player Window Shell Foundations (PR 3.1)

- **Issue**: #101 (part of Epic #100)
- **Branch**: `feat/101-mini-player-window-shell`
- **Status**: In Progress
- **Delivery Strategy**: `ask-on-risk` (Forecast: ~280 authored lines — under the 400 delivery budget)
- **TDD Mode**: Standard (RED → GREEN → REFACTOR) with `pnpm vitest run <file> --project server` as the inner loop runner
- **Spec**: [`docs/features/mini-player/spec.md`](../../docs/features/mini-player/spec.md) §2.1, §2.2, §4.1, §4.2, §5.1

## Objective

Define the `IWindowShell` hexagonal port, its `TauriWindowShell` (native Windows IPC), `WebWindowShell` (safe no-op fallback), and `FakeWindowShell` (test double) adapters, plus the reactive `windowState.svelte.ts` composition root and the Tauri v2 window capability permissions. This slice ships **no UI** — it is the infrastructure that PR 3.2 (#102) builds the compact `MiniPlayer.svelte` on top of.

## Problem & Motivation

The Mini-Player (Milestone 3, P1) needs to resize and pin the native OS window. Doing that directly from Svelte components would leak `@tauri-apps/api` into the presentation layer and break the Web build, which must degrade to a safe no-op. A hexagonal port keeps `src/lib/domain/` pure TypeScript and keeps the web bundle free of native imports.

## Architecture Boundaries

- **Domain (pure TS)**: `src/lib/domain/ports/window-shell.port.ts` — zero imports from Svelte, DOM, or `@tauri-apps/*`.
- **Adapters**: `src/lib/adapters/window/tauri-window-shell.ts` is the ONLY production file allowed to import `@tauri-apps/api`, and it must do so lazily (dynamic import behind a injectable seam) so the web bundle and the Node test runner never evaluate it.
- **State**: `src/lib/state/windowState.svelte.ts` — Svelte 5 Runes composition root wiring a shell into reactive flags. Depends on the port, never on the adapter implementation directly for its own logic.
- **Desktop**: `src-tauri/capabilities/default.json` gains the window permissions required by `TauriWindowShell`.
- **Test double**: `src/testing/fakes/platform/fake-window-shell.ts` — implements the port without any native dependency.

## Implementation Tasks

### [ ] TASK-1: Window shell port + Tauri capability permissions

- **Route**: Direct inline (single pure-TS file + one JSON config)
- **Target Files**:
  - `src/lib/domain/ports/window-shell.port.ts`
  - `src-tauri/capabilities/default.json`
- **Acceptance Criteria**:
  - `WindowDimensions` (`readonly width`, `readonly height`) and `IWindowShell` (`isSupported`, `enterMiniPlayer`, `restoreMainWindow`, `isAlwaysOnTop`) defined exactly per spec §2.1.
  - Zero `@tauri-apps/*`, DOM, or Svelte imports.
  - Capability file keeps `core:default` and adds the window permissions listed in spec §4.2.
  - Documented invariants: mini enter lowers `minSize` before `setSize`; restore resets `minSize` to 480x500 before `setSize` to 800x650 (spec §4.1). Encode these as exported constants so both adapters and tests share one source of truth.
- **Tests**: `src/lib/domain/ports/window-shell.port.test.ts` asserting the exported dimension constants.
- **Verification**: `pnpm vitest run src/lib/domain/ports/window-shell.port.test.ts --project server`
- **Commit**: pending
- **Evidence / Status**: pending

### [ ] TASK-2: `TauriWindowShell` adapter + `@tauri-apps/api` dependency

- **Route**: Delegated direct (adapter + its test suite + dependency install)
- **Target Files**:
  - `src/lib/adapters/window/tauri-window-shell.ts`
  - `src/lib/adapters/window/tauri-window-shell.test.ts`
  - `package.json`, `pnpm-lock.yaml`
- **Acceptance Criteria**:
  - `@tauri-apps/api` added as a runtime `dependency` (it is currently absent; only `@tauri-apps/cli` exists as a devDependency) and lockfile updated.
  - The Tauri client is reached through an injectable seam (a minimal structural interface mirroring `getCurrentWindow()`), resolved lazily so importing this module in Node/Vitest does not evaluate `@tauri-apps/api`.
  - `isSupported` is `false` when no Tauri client is present, so the Web bundle never calls native APIs.
  - `enterMiniPlayer` lowers `minSize` to the mini minimum before `setSize` to the requested dimensions, then enables always-on-top.
  - `restoreMainWindow` disables always-on-top, resets `minSize` to the main minimum, then `setSize` to the main dimensions.
  - Every method degrades safely (no throw) when unsupported.
- **Tests**: full suite over the seam with a spy client covering enter, restore, unsupported fallback, and the minSize-before-setSize ordering.
- **Verification**: `pnpm vitest run src/lib/adapters/window/tauri-window-shell.test.ts --project server`
- **Commit**: pending
- **Evidence / Status**: pending

### [ ] TASK-3: `WebWindowShell` adapter

- **Route**: Delegated direct
- **Target Files**:
  - `src/lib/adapters/window/web-window-shell.ts`
  - `src/lib/adapters/window/web-window-shell.test.ts`
- **Acceptance Criteria**:
  - `isSupported` is always `false`; `isAlwaysOnTop()` resolves `false`.
  - `enterMiniPlayer` / `restoreMainWindow` resolve without touching `window`, `document`, or any native API — provable by running the test suite under the Node environment.
  - Zero imports beyond the port.
- **Tests**: suite asserting the no-op contract and that no DOM global access occurs.
- **Verification**: `pnpm vitest run src/lib/adapters/window/web-window-shell.test.ts --project server`
- **Commit**: pending
- **Evidence / Status**: pending

### [ ] TASK-4: Reactive `windowState.svelte.ts`

- **Route**: Delegated direct
- **Target Files**:
  - `src/lib/state/windowState.svelte.ts`
  - `src/lib/state/windowState.test.ts`
- **Acceptance Criteria**:
  - `WindowState` class with `$state` `isMiniPlayer` / `isAlwaysOnTop` flags, `toggleMiniPlayer()`, and `restore()` per spec §2.2.
  - `toggleMiniPlayer` is a no-op when the injected shell reports `isSupported === false`, so the web build cannot enter mini mode.
  - A default shell factory picks `TauriWindowShell` when a Tauri client is available and `WebWindowShell` otherwise, plus a `createWindowState(shell)` factory for isolated test instances (mirrors the `ThemeState` / `createThemeState` pattern).
  - State only flips after the awaited shell call resolves.
- **Tests**: suite over `FakeWindowShell` covering toggle both ways, restore idempotency, and the unsupported no-op path.
- **Verification**: `pnpm vitest run src/lib/state/windowState.test.ts --project server`
- **Commit**: pending
- **Evidence / Status**: pending

### [ ] TASK-5: `FakeWindowShell` test double

- **Route**: Delegated direct
- **Target Files**:
  - `src/testing/fakes/platform/fake-window-shell.ts`
  - `src/testing/fakes/platform/fake-window-shell.test.ts`
- **Acceptance Criteria**:
  - Implements `IWindowShell` in memory with `isMini`, `alwaysOnTop`, call counters, and recorded dimensions per spec §5.1.
  - Follows the observability conventions of the existing fakes (`FakeTicker`, `FakeSettingsStorage`): call counts, `reset()`.
- **Tests**: suite covering enter/restore transitions and counter/reset behavior.
- **Verification**: `pnpm vitest run src/testing/fakes/platform/fake-window-shell.test.ts --project server`
- **Commit**: pending
- **Evidence / Status**: pending

### [ ] TASK-6: Full quality harness

- **Route**: Delegated direct (full suites delegated; parent keeps output bounded)
- **Target Files**: none (verification only)
- **Acceptance Criteria**:
  - `pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:browser`, and `pnpm build` all pass with zero errors.
  - Acceptance criterion 1 of spec §7 verified: zero `@tauri-apps/*` imports under `src/lib/domain/`.
- **Commit**: pending
- **Evidence / Status**: pending

## Constraints

- Fewer than 400 authored changed lines total, per the repository's PR size rule.
- No UI work in this slice — no `MiniPlayer.svelte`, no `Header` button, no `data-tauri-drag-region` (that is issue #102).
- No `index.ts` barrel files outside `src/lib/components/ui/`.
- Conventional Commits, no AI attribution trailers.
- Push and PR creation remain the user's decision.

## Progress & Next Step

Next: execute TASK-1, then TASK-2 through TASK-5 in parallel-safe order (TASK-5's fake should land before TASK-4's state tests depend on it).
