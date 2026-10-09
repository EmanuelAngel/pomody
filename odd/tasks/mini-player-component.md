# Feature: Mini-Player Compact Component (PR 3.2)

- **Issue**: [#102](https://github.com/EmanuelAngel/pomody/issues/102) (part of Epic #100)
- **Branch**: `feat/mini-player-component`
- **Status**: In progress
- **Delivery Strategy**: `single-pr` — forecast ~340 authored lines, under the 400-line budget, so no chain is required
- **TDD Mode**: Standard (RED → GREEN → REFACTOR)
- **Decisions**: [`docs/features/mini-player/decisions.md`](../../docs/features/mini-player/decisions.md) — 19 settled decisions, read this first
- **Spec**: [`docs/features/mini-player/design.md`](../../docs/features/mini-player/design.md), [`spec.md`](../../docs/features/mini-player/spec.md) §3
- **Prerequisite**: [#101](https://github.com/EmanuelAngel/pomody/issues/101) shipped (`IWindowShell`, adapters, `windowState`, `FakeWindowShell`)

## Objective

Build `src/lib/components/timer/mini-player.svelte` — the 280x64 compact widget with the 3-column topology — plus its browser test suite and its i18n keys. This slice ships **the component only**: nothing renders it yet.

## Problem & Motivation

The Mini-Player (Milestone 3, P1) keeps peripheral visibility of the running timer while the user works in another application. #101 built the window shell, but no component consumes it: `windowState` currently has zero UI consumers. Without this slice the compact mode does not exist visually.

## Scope Boundaries

**In scope**

- `mini-player.svelte` and `mini-player.svelte.test.ts`
- `mini_player_*` keys in `messages/en.json` and `messages/es.json`
- `MINI_WINDOW_DIMENSIONS` 260x60 → 280x64 in the domain port

**Explicitly out of scope (issue #103)**

- `setDecorations(false)` / `setResizable(false)` — `IWindowShell` exposes neither, and `capabilities/default.json` lacks `allow-set-decorations` and `allow-set-resizable`
- The `Header` trigger and the `Escape` shortcut
- Mounting the component anywhere

## Architecture Boundaries

- **Domain**: the component reads `MINI_WINDOW_DIMENSIONS` indirectly. It never imports `@tauri-apps/*`.
- **State**: injected as props with a singleton default, mirroring `task-pill.svelte` (`tasksState?: TasksState`).
- **Testability**: the props seam is what allows `FakeWindowShell` in Vitest Browser without a native runtime.
- **Vendor**: shadcn `Button` from `src/lib/components/ui/button/` only. No barrel files outside `ui/`.

## Implementation Tasks

### [x] TASK-1: Widen `MINI_WINDOW_DIMENSIONS` to 280x64

- **Route**: Direct inline (single mechanical file already understood, plus its test)
- **Files**: `src/lib/domain/ports/window-shell.port.ts`, `window-shell.port.test.ts`
- **Acceptance**: constant is 280x64; the invariant tests still hold; `MINI_WINDOW_MIN_DIMENSIONS` (200x50) stays below it
- **Commit**: `7fd0acb`
- **Evidence**: RED `expected {height: 64, width: 280}, received {height: 60, width: 260}` → GREEN 43 passed (port + windowState + adapters + fake); `pnpm test:unit` 693 passed; `pnpm check` 0 errors; `pnpm lint` clean.
- **Note**: this was the only domain change in the slice. `windowState`, `FakeWindowShell` and their tests already reference the constant by name, so no cascade.

### [x] TASK-2: i18n keys

- **Route**: Direct inline
- **Files**: `messages/en.json`, `messages/es.json`
- **Acceptance**: `mini_player_*` keys present in both; Paraglide compiles; Spanish follows the existing neutral register (`Foco libre`, `reiniciar`, `pausar`, `saltar`)
- **Commit**: pending (recorded below)
- **Evidence**: `paraglide-js compile` succeeded; `mini_player_restore` resolves to "Restore window" (en) and "Restaurar ventana" (es) in the generated catalogue.
- **Deviation — reuse instead of duplicate.** Only two keys were added: `mini_player_restore` ("Restore window" / "Restaurar ventana") and `mini_player_compact_aria` ("Mini timer" / "Temporizador compacto", the `role="region"` name for the drag container).
  The component **reuses** `timer_controls_reset`, `timer_controls_skip`, `timer_controls_start`, `timer_controls_pause`, `timer_controls_resume`, `task_pill_free_focus` and `timer_mode_*`. The `timer_controls_*` prefix names a domain area, not a rendering component, so a mini-player-specific copy would create two sources of truth for one string and drift silently across locales.
  Kept `mini_player_compact_aria` because the widget root is a landmark that needs an accessible name, matching the existing `timer_arc_progress` / `timer_cycle_status` convention.

### [x] TASK-3: `mini-player.svelte` component + browser tests

- **Route**: Delegated direct (`svelte-file-editor`), parent spot-checked
- **Files**: `src/lib/components/timer/mini-player.svelte` (276), `mini-player.svelte.test.ts` (319)
- **Commit**: `pending`
- **Evidence**: RED `3 failed | 13 passed (16)` with the component present → GREEN `16 passed (16)`. Parent re-ran `--project client` independently: 16/16. `pnpm check` 0 errors; `pnpm lint` clean.
- **Parent verification**: accent tokens only (`bg/text-accent-foam|pine|iris`, no unprefixed `bg-foam`); all 8 expected icons imported; i18n reuses `timer_controls_*` + `task_pill_free_focus` with only `mini_player_restore` and `mini_player_compact_aria` as new keys; `data-tauri-drag-region` present on 6 elements (left column + icon + title + title track, center column + time) and absent from the button row.

**Two findings from the writer worth keeping**

1. **The test must import `app.css`.** `app.css` is imported only by `+layout.svelte`, so an isolated browser test had no Tailwind at all — `invisible` computed to `visible` and a visibility assertion passed against correct markup. A visibility test that passes without CSS is a lie. The test now imports the stylesheet, and the writer confirmed it is falsifiable by mutating the classes.
2. **`toBeVisible()` ignores `opacity`.** The matcher reads computed `visibility`/`display` but not `opacity`, which makes an opacity-only reveal untestable by design. This is why the secondary buttons use `invisible`/`visible` rather than `opacity-0` alone — and `visibility` also keeps them in the flex flow, which is precisely what stops Play/Pause from shifting 1px. `display: none` would reflow the row.

**Component contract**

| Aspect      | Requirement                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------- |
| Columns     | 3-column flex; timer `absolute left-1/2 -translate-x-1/2`; Play anchored right, never moves |
| State       | `timerState` / `tasksState` / `windowState` as optional props with singleton defaults       |
| Hover       | one `$state` boolean governs both button-row reveal and title marquee                       |
| Buttons     | bespoke shadcn `Button size="icon-xs"`; `[Reset]` `[Skip]` `[Restaurar]` hidden until hover |
| Play/Pause  | 3 lines composed inline — `timerState` has no toggle and no `isPaused`                      |
| Progress    | `timerState.progress` (already `0..1`), 2px bar, no numeric label                           |
| Icons       | `circle-dot` focus · `leaf` shortBreak · `sprout` longBreak · `maximize-2` restore          |
| Colors      | `bg-accent-foam` / `-pine` / `-iris` — the unprefixed tokens do not exist                   |
| Drag region | attribute per element, never on the button row                                              |
| Marquee     | measure overflow; animate only when the title does not fit                                  |

### [ ] TASK-4: Quality harness

- **Route**: Delegated direct (parent spot-checked)
- **Verification**: `pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:browser`
- **Not run locally**: `pnpm tauri:build` — CI only per AGENTS.md rule 9

## Forecast

**Actual: ~608 authored lines**, against a ~340 forecast. Breakdown: 9 domain, 4 i18n, 276 component, 319 tests.

Over the 400-line delivery budget by ~50%. See `Deviations` below.

## Deviations

1. **Delivery budget blown — decision pending.** Forecast was ~340 and the declared strategy was `single-pr` on that basis. The actual is ~608. Two PR-unit candidates exist, but splitting a component from its test suite would violate "tests travel with the behaviour they cover", so the only honest split is `TASK-1 + TASK-2` (13 lines, pointless on its own) versus `TASK-3`. Roughly 45 of the 276 component lines are explanatory comments encoding the 19 decisions; cutting them would recover the budget at the cost of the institutional memory that the next agent needs.
2. **`visibility` instead of `opacity` for the hover reveal.** Forced by Vitest: `toBeVisible()` ignores `opacity`, so an opacity-only reveal is untestable. The chosen mechanism is also the correct layout behaviour (no reflow of the button row).
3. **The test imports `app.css` explicitly.** Required because `app.css` is only imported by `+layout.svelte`; without it the browser test runs with no Tailwind and visibility assertions are vacuous.
4. **`{@attach}` for the marquee measurement** instead of `bind:this`; the autofixer flags `bind:this`.

## Constraints

- Conventional Commits, no AI attribution trailers.
- `data-tauri-drag-region` must never appear on the button row.
- No barrel files outside `src/lib/components/ui/`.
- Push and PR creation remain the Tech Lead's decision.

## Progress & Next Step

Task file created. TASK-1 is next.
