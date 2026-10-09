# Feature: Mini-Player Window Shell Foundations (PR 3.1)

- **Issue**: #101 (part of Epic #100)
- **PR**: [#115](https://github.com/EmanuelAngel/pomody/pull/115) — OPEN, `Resolves #101`
- **Branch**: `feat/101-mini-player-window-shell`
- **Status**: Implementation Complete — PR open, awaiting CI
- **Delivery Strategy**: `ask-on-risk` (NOT met — see Deviation 1)
- **TDD Mode**: Standard (RED → GREEN → REFACTOR), runner `pnpm exec vitest run <file> --project server`
- **Spec**: [`docs/features/mini-player/spec.md`](../../docs/features/mini-player/spec.md) §2.1, §2.2, §4.1, §4.2, §5.1

## Objective

Define the `IWindowShell` hexagonal port, its `TauriWindowShell` (native Windows IPC), `WebWindowShell` (safe no-op fallback), and `FakeWindowShell` (test double) adapters, plus the reactive `windowState.svelte.ts` composition root and the Tauri v2 window capability permissions. This slice ships **no UI** — it is the infrastructure that PR 3.2 (#102) builds the compact `MiniPlayer.svelte` on top of.

## Problem & Motivation

The Mini-Player (Milestone 3, P1) needs to resize and pin the native OS window. Doing that directly from Svelte components would leak `@tauri-apps/api` into the presentation layer and break the Web build, which must degrade to a safe no-op. A hexagonal port keeps `src/lib/domain/` pure TypeScript and keeps the web bundle free of native imports.

## Architecture Boundaries

- **Domain (pure TS)**: `src/lib/domain/ports/window-shell.port.ts` — zero imports from Svelte, DOM, or `@tauri-apps/*`.
- **Adapters**: `src/lib/adapters/window/tauri-window-shell.ts` is the ONLY production file touching `@tauri-apps/api`, reached through an injectable `TauriWindowClientLike` seam resolved via dynamic import only after `__TAURI_INTERNALS__` is detected.
- **State**: `src/lib/state/windowState.svelte.ts` — Svelte 5 Runes composition root depending on the port.
- **Desktop**: `src-tauri/capabilities/default.json` carries the window permissions `TauriWindowShell` requires.
- **Test double**: `src/testing/fakes/platform/fake-window-shell.ts`.

## Implementation Tasks

### [x] TASK-1: Window shell port + Tauri capability permissions

- **Route**: Delegated direct
- **Files**: `src/lib/domain/ports/window-shell.port.ts` (67), `window-shell.port.test.ts` (70), `src-tauri/capabilities/default.json` (+8/-1)
- **Acceptance**: port matches spec §2.1; exported dimension constants; zero native imports; 5 `core:window:*` permissions added alongside `core:default`.
- **Commit**: `2c2dae3`
- **Evidence**: RED `Cannot find module './window-shell.port'` → GREEN 8 passed.

### [x] TASK-2: `TauriWindowShell` adapter + `@tauri-apps/api` dependency

- **Route**: Delegated direct
- **Files**: `src/lib/adapters/window/tauri-window-shell.ts` (130), `.test.ts` (168), `package.json` (+3), `pnpm-lock.yaml` (+9)
- **Acceptance**: `@tauri-apps/api` as runtime `dependency`, resolved `2.12.2`; lazy seam keeps the native module out of the static graph; `setMinSize` strictly before `setSize` on both transitions; safe no-op when unsupported.
- **Commit**: `ee25c87`
- **Evidence**: RED module-not-found → GREEN 11 passed.

### [x] TASK-3: `WebWindowShell` adapter

- **Route**: Delegated direct
- **Files**: `src/lib/adapters/window/web-window-shell.ts` (27), `.test.ts` (38)
- **Acceptance**: always unsupported; resolves without touching DOM globals — mechanically provable because the `server` Vitest project runs in a bare Node environment.
- **Commit**: `4f4773e`
- **Evidence**: RED → GREEN 5 passed.

### [x] TASK-4: Reactive `windowState.svelte.ts`

- **Route**: Delegated direct
- **Files**: `src/lib/state/windowState.svelte.ts` (62), `.test.ts` (126)
- **Acceptance**: `$state` flags; `toggleMiniPlayer()` / `restore()`; unsupported guard; state flips only after the awaited call; `createWindowState()` factory plus default singleton, mirroring `ThemeState`.
- **Commit**: `f584992`
- **Evidence**: RED → GREEN 10 passed.

### [x] TASK-5: `FakeWindowShell` test double

- **Route**: Delegated direct
- **Files**: `src/testing/fakes/platform/fake-window-shell.ts` (61), `.test.ts` (101)
- **Acceptance**: in-memory `IWindowShell` with call counters, recorded dimensions and `reset()`, matching existing fake conventions.
- **Commit**: `6ba3ba7`
- **Evidence**: RED → GREEN 9 passed.

### [x] TASK-6: Quality harness

- **Route**: Delegated direct (parent spot-checked)
- **Verification** (observed):
  - `pnpm test:unit` → 39 files passed, 693 tests passed, 10.70s
  - `pnpm check` → 0 errors, 0 warnings
  - `pnpm lint` → prettier clean, eslint 0 problems
  - Spec §7 criterion 1: zero `@tauri-apps/*` imports under `src/lib/domain/` — enforced by a test that asserts the absence of static native imports in the adapter source.
- **Not run locally**: `pnpm test:browser`, `pnpm build`, `pnpm tauri:build` — deferred to CI per the low-resource policy (see `ci.yml` and `desktop-ci.yml`, which already run all three).

## Deviations from the original plan

1. **Delivery budget blown.** Forecast was ~280 authored lines; actual is 862 non-vendor lines (850 across the 10 slice files, +12 in `package.json` and `capabilities/default.json`) against the 400-line CI gate. Of the 850 slice lines, 503 are tests and 347 are implementation. The CI gate skips for the repository owner's own PRs and for PRs labelled `epic` or `skip-size-check`, so it will not hard-block — but the oversize is real and the decision is the Tech Lead's.
2. **`LogicalSize` import added.** Tauri v2 rejects a structurally compatible `{width, height}`; `svelte-check` fails without an explicit `LogicalSize` from `@tauri-apps/api/dpi`. Imported lazily alongside `getCurrentWindow()`.
3. **Support guard added beyond spec §2.2.** The spec's `toggleMiniPlayer` has no `isSupported` guard; the task brief requires one so the web build cannot enter mini mode. The guard wins, and `toggleMiniPlayer` delegates to `restore()` when already mini so the paths cannot drift.
4. **`void dimensions;` instead of an underscore-prefixed unused param.** `eslint.config.js` sets no `argsIgnorePattern`, so `_dimensions` still trips `no-unused-vars`.
5. **`MAIN_WINDOW_MIN_DIMENSIONS` mirrors `tauri.conf.json`.** The port constant and the Tauri native config duplicate the same 480x500 constraint; a shared source of truth is impossible while both files sit outside one slice. Candidate follow-up.

## Desktop CI investigation (pre-existing, unrelated to the slice)

`desktop-ci.yml` had not been verified green on `main` since commit `3432951` (2026-09-27) — every later run was `skipped`, `action_required`, or `failure`. Three distinct failures surfaced while validating this slice:

1. **npm/crate version mismatch** — `@tauri-apps/api` had been added as `^2` and resolved to `2.12.2` while the Rust crate was `2.11.6`. Tauri aborts before compiling. Fixed by pinning npm to `~2.11.0` (npm's 2.11 line only reaches `2.11.1`, while Rust's reaches `2.11.6` — the two ecosystems version on different cadences, so the tauri check compares major/minor only).
2. **Type errors inside `tauri/src`** — no `Cargo.lock` was committed, so Cargo re-resolved all 434 packages per run and paired `tauri 2.11.6` with `tauri-runtime`/`tauri-runtime-wry` `2.12.1`, whose `Monitor` type no longer matches.
3. **`Error::UnexpectedMenuKind` missing** — `tauri-macros 2.7.1` generated a match arm for a variant that only exists in newer Tauri, because every sub-crate declares its siblings with caret ranges.

All three share one root cause: the Tauri crate family resolves each member independently to the newest in-range release, and upstream never sees it because Tauri ships its own lockfile.

**Fix**: commit `src-tauri/Cargo.lock` and align the whole family with the versions declared in `tauri 2.11.6`'s own `Cargo.toml`. Made `tauri-build = "~2.6.3"` in `Cargo.toml`, since the bare `"2.6.3"` read as a pin but was a caret range.

The lesson is now codified in `AGENTS.md` rules 8 and 9: never re-resolve the Rust tree, and verify desktop builds only on CI.

## Constraints

- No UI work in this slice — no `MiniPlayer.svelte`, no `Header` button, no `data-tauri-drag-region` (issue #102).
- No `index.ts` barrel files outside `src/lib/components/ui/`.
- Conventional Commits, no AI attribution trailers.
- Push and PR creation remain the Tech Lead's decision.

## Progress & Next Step

Implementation and verification are complete across 5 work-unit commits on `feat/101-mini-player-window-shell`. Pending: the Tech Lead's decision on PR granularity (single PR vs. split) given Deviation 1.
