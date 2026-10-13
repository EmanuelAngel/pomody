# Feature: System Tray (hide-on-close) & Single Instance

- **Issue**: [#119](https://github.com/EmanuelAngel/pomody/issues/119)
- **Branch**: `feat/system-tray`
- **PR**: [#120](https://github.com/EmanuelAngel/pomody/pull/120)
- **Status**: Completed
- **Delivery Strategy**: `single-pr` (~90 authored lines of Rust + a decisions doc; well under the 400-line slice budget, so no chain split)
- **TDD Mode**: **Not applicable — exception stated.** No runnable deterministic test exists for any of this: Vitest cannot open a `TrayIcon`, and `cargo check` cannot run locally (no MSVC Build Tools). Verification was reading the pinned crate sources plus `desktop-ci.yml` for compilation, then a 9-step manual checklist on the produced `.exe`. See TASK-5.
- **Decisions**: [`docs/features/tray/decisions.md`](../../docs/features/tray/decisions.md)

## Objective

Make the window close button hide Pomody to the system tray instead of terminating it, so a misplaced click cannot kill a running focus block, and so nothing is left loose on the desktop or taskbar. Add a context menu to restore or quit.

## Problem & Motivation

Pomody is a focus timer people leave open all day and dismiss with the X. Today that X exits the process. A stray click — or a habit of closing windows without reading them — kills the timer mid-block with no warning and no record. The Mini-Player (#100 → #101/#102/#103) solved peripheral _visibility_; this solves accidental _termination_.

## Scope Boundaries

**In scope**

- `tray-icon` integration, entirely in `src-tauri/src/lib.rs`
- `CloseRequested` → `prevent_close()` + `hide()`
- Tray context menu: `Open` / `Exit`
- Single-instance enforcement

**Out of scope, deliberately**

- **Play/pause in the tray menu.** The timer state lives in a Web Worker behind Svelte state; the menu lives in Rust. They share no memory. A menu showing real state needs two-way sync — Rust emits, frontend acts, frontend reports back, Rust re-renders — to control a button the Mini-Player already covers. Recorded in `decisions.md` §4.
- **A settings switch for close behaviour.** Raised during grilling, declined: it is a state machine with a real race (the user is hidden in the tray when they flip the setting, which would otherwise leave a live process with neither a window nor an icon). The underlying need — "I want X to actually quit" — is already served by the `Exit` menu item.
- **A first-time notice that the app did not close.** Proposed as an in-window toast, which is technically impossible: the window hides in the same instant the toast would render. The real alternatives are a native balloon (needs `tauri-plugin-notification`, touches `Cargo.lock`) or a modal (needs Rust→frontend→Rust plumbing). Recorded as debt in `decisions.md` §6.
- **A bilingual tray menu.** Rust cannot read the `localStorage` locale. Recorded as debt.
- **Any change to `src/lib/`.** Zero frontend lines were touched.

## Implementation Tasks

### [x] TASK-1: Tray construction

- **Route**: Direct inline (contract already read from the pinned crate sources; ~60 lines, one file)
- **Files**: `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`
- **Acceptance**: closing the window hides it; left click restores; right click opens `Open`/`Exit`; `Exit` terminates
- **Evidence**: `tray-icon 0.24.2` compiled on the first CI run. The two failures below were in our own lines.

Two API facts were verified against source **before** coding, and both changed the design:

1. `muda 0.19.3` is **menu-only**. It has no tray event enum and no `WindowsEvent` type — grepping it for tray events is a dead end. Tauri delegates tray events to `tray-icon 0.24.2`.
2. `TrayIconBuilder::show_menu_on_left_click` **defaults to `true`**, and on Windows that makes the left button open the context menu instead of restoring. Without the explicit `show_menu_on_left_click(false)`, the chosen behaviour breaks silently — no error, no warning.

Also settled: a single left click **is** reliable on Windows. `tray-icon` forwards raw `WM_LBUTTONUP` without dedup (`tray-icon-0.24.2/src/platform_impl/windows/mod.rs:408-468`); a real double click emits `Click{Up}` → `Click{Up}` → `DoubleClick`. The initial hypothesis that double click was the reliable one was wrong — click single is a clean exact match, while double click would need a ~400ms debounce on every restore.

### [x] TASK-2: Build fixes after the first CI run

- **Route**: Direct inline
- **Files**: `src-tauri/src/lib.rs`, `docs/features/tray/decisions.md`
- **Acceptance**: `desktop-ci.yml` green

Two errors, both from reading a signature without reading the `cfg` gating it:

| Error                                             | Cause                                                                                                                               | Fix                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `E0599: no associated function from_bytes`        | `Image::from_bytes` is behind `#[cfg(any(feature = "image-ico", feature = "image-png"))]`; neither is in `tauri`'s default features | `default_window_icon()`, which `tauri-codegen` already decodes into raw RGBA at build time |
| `E0277: Menu<R> does not implement IsMenuItem<R>` | `MenuBuilder::text(...).build()` returns a whole `Menu`, not a `MenuItem`                                                           | `MenuItem::with_id(app, id, "text", true, None::<&str>)`                                   |

The first one nearly violated rule 8: enabling `image-png` would have pulled the `image` crate — **not present in `Cargo.lock`** — into the lock. `default_window_icon()` avoided it entirely, at the cost of reversing the "explicit `include_bytes!`" choice made during grilling. `decisions.md` §3 records the reversal and why.

### [x] TASK-3: Single instance

- **Route**: Direct inline (5 lines)
- **Files**: `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/src/lib.rs`
- **Acceptance**: opening Pomody while it sits in the tray raises the existing window instead of starting a second process
- **Discovered during dogfooding, not planned.** The user reported it after manual testing of TASK-1/2. It was never a task before that moment; it is recorded here so the sequence is not misrepresented.

Tauri does not enforce single instance by default. Without this, a second process carried its own window, its own tray icon and its own running timer — a state the user has no way to recover from. The plugin callback runs in Rust and takes `&AppHandle`, so it reuses `restore_main_window` directly: identical behaviour to `Open` and to the left click, and **zero frontend involvement**.

**The `Cargo.lock` question was measured, not assumed.** See "Lock impact" below.

### [x] TASK-4: Documentation

- **Route**: Direct inline
- **Files**: `docs/features/tray/decisions.md` (new), `docs/roadmap.md`
- **Added**: decisions doc with the rejected alternatives, the two API traps, and the debt register. Roadmap: closed all three Milestone 3 items — i18n and Mini-Player had shipped in earlier slices but their checkboxes were never ticked — and corrected two facts it stated wrong (Mini-Player is 320x48, not ~220x80; the tray menu does not include pause/resume, by decision).

## Lock impact (AGENTS.md rule 8)

Adding the plugin **writes to `Cargo.lock`**. Two experiments, on a throwaway copy so the repo was never mutated:

| Method                                                 | Result                                                                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cargo generate-lockfile` (re-resolve — **forbidden**) | Moves `tauri-runtime` 2.11.3→2.12.1, `tauri-runtime-wry` 2.11.4→2.12.1, `tauri-codegen`/`tauri-macros` 2.6.3→2.7.2, `tauri-utils` 2.9.3→2.10.1. +63 packages. |
| `cargo add` (minimal update — **chosen**)              | Tauri family **unchanged**. 0 packages removed, 48 added.                                                                                                     |

`cargo add` is a minimal update, not a re-resolve: it adds the new package and honours everything already pinned. The plugin declares `tauri = "^2.10"`, which our pinned `2.11.6` already satisfies. Verified after running the command, not reasoned about.

Three deliberate choices:

- **`=2.4.1`**, edited by hand from the `^2.4.1` that `cargo add` writes. Diverges from the repo's `~` convention on purpose: this package writes to the lock, so the version is a person's decision, not Cargo's.
- **`default-features = false`** — the plugin's defaults drag in `tauri-plugin-deep-link`, unused, adding ~15 packages.
- **Accepted noise**: `zbus` and its tree enter the lock but never compile on Windows, and a fourth `windows-sys` appears (the plugin wants `^0.60`; the lock has 0.45 / 0.59 / 0.61). Noise, not risk.

The zero-lock-cost alternative — a hand-rolled Win32 named mutex using `windows-sys 0.61.2`, already in the lock — was rejected: ~25 lines of Win32 that nobody on the team can read or review.

## Constraints

- Conventional Commits, no AI attribution trailers.
- No `cargo` re-resolve (AGENTS.md rule 8).
- `pnpm tauri:build` and local `cargo` are CI-only (AGENTS.md rule 9).
- Push and merge remain the Tech Lead's decision.

## Verification

**Automated** — `desktop-ci.yml` proves it compiles and the artifact builds. It does **not** prove tray behaviour. `pnpm lint` green.

**Not verified locally** — `cargo check` fails on `link.exe` (no MSVC Build Tools). Documented limitation, not a code defect. It is why TASK-2's API errors could only be caught by CI, and why every signature was read from the pinned crate source first.

**Manual** — 9-step checklist on the `.exe` produced by this PR ([run #38339231420](https://github.com/EmanuelAngel/pomody/actions/runs/38339231420)), recorded in `decisions.md` §9. The user executed all 9 and reported all passing, including the two that no automated check can reach:

- Step 5: closing removes the window from the **taskbar**, not just the screen — the core of the feature
- Step 9: reopening Pomody from the Start menu with the app in the tray raises the existing window instead of spawning a second process

One CI run failed on a transient network error in the runner's checkout step (`Could not connect to github.com:443`), not on the code. Re-run was green.

## Deviations

1. **`include_bytes!` → `default_window_icon()`**, reversing the choice made during grilling. Forcing `include_bytes!` to work would have pulled the `image` crate into `Cargo.lock`. Recorded in TASK-2 and `decisions.md` §3.
2. **`Open` / `Exit` in fixed English**, not Spanish. Rust cannot read the `localStorage` locale; making it bilingual needs a frontend→Rust command, which is the plumbing this feature exists to avoid. Debt registered in `decisions.md` §6.
3. **Single click, not double click** — the reverse of the initial assumption, after reading the Windows event mapping. See TASK-1.

## Process deviations

Recorded because a feature doc that only lists successes is not a useful record.

1. **This file did not exist while the work was being done.** ODD requires the feature doc to be created before the first source write. It was written retroactively. The design decisions themselves _were_ captured before implementation — in the grilling session and in `docs/features/tray/decisions.md` — but the tracking artifact did not exist during the work.
2. **Routes were never declared in a file.** TASK-1 through TASK-4 declare `Direct inline`, but that determination was made in conversation and never written down while it mattered, so an omitted delegation is not distinguishable from a deliberate one in the history.
3. **Receipt-driven development was never checked, then mis-stated.** RDD was asserted to be on; `gentle-ai review mode status` reports `off (decided by global)`. The assertion was made from the documented default without running the read. No native review was requested and none is pending — the switch is off by the user's own global decision, and remains untouched.
4. **One commit was not a planned task.** The single-instance fix (TASK-3) entered as a commit after being found during manual testing, without passing through task planning.

## Progress & Next Step

All four tasks complete on `feat/system-tray` across 4 work-unit commits (`2bc514f`, `1059a91`, `7e39199`, `715fcb6`). CI green on `desktop-ci.yml` and `ci.yml`. Manual verification: 9/9 steps passing on the produced `.exe`. Zero frontend lines changed.

**Merge remains the Tech Lead's decision.**
