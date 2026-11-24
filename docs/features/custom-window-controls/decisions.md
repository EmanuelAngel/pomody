# Custom Window Controls — Implementation Decisions

> Record of the decisions taken **before** the first line of the custom-title-bar work.
> This document explains **why** each thing is the way it is.
>
> Spec: [`odd/tasks/custom-window-controls.md`](../../../odd/tasks/custom-window-controls.md).
> Documentary precedent: [`tray/decisions.md`](../tray/decisions.md).

---

## 1. Purpose

One thing: **give Pomody its own title bar** (drag region, app title, ─ ▢ ✕ controls) instead of
the native Windows one, so the timer looks like one piece instead of an app wearing a borrowed
frame.

It is not a redesign of the app shell. The header keeps its content, the Mini-Player keeps its
topology, and nothing about the timer, the tray, or the domain changes.

---

## 2. Scope

**Frontend and native configuration only.** `src-tauri/src/lib.rs` is not touched: everything the
new controls need already exists on the Rust side or is part of the Tauri window API.

| Layer                | Work                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Port                 | `IWindowShell` gains `minimize`, `toggleMaximize`, `close`, `isMaximized`, `onMaximizedChange` |
| Adapters             | `TauriWindowShell` (native, lazy `@tauri-apps/api`), `WebWindowShell` (explicit no-ops)        |
| Test double          | `FakeWindowShell` simulates the maximized state and notifies its subscribers                   |
| State                | `WindowState` gains `isMaximized`, the three control methods and `watchMaximizedState()`       |
| Native configuration | `tauri.conf.json` `decorations: false`; new capability permissions                             |
| Component            | The title bar strip itself is **T2**, not this task                                            |

---

## 3. Decisions

### Behaviour

| Decision                    | Value                                                  | Why                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Snap Layouts flyout         | **Lost, accepted**                                     | The flyout belongs to the native maximize button. With `decorations: false` there is no native button, so hovering the ▢ glyph cannot open it. `Win+↑` and drag-to-edge snapping keep working — they are OS-level and decoration-independent. The alternative (a custom Win32 hit-test region) is a C++-shaped problem in a Tauri app.                  |
| Windows shortcuts           | **Untouched**                                          | `Win+↑/←/↓`, `Win+D`, `Alt+F4` and drag-to-snap are handled by the window manager, not by the decorations. Verified manually (T3).                                                                                                                                                                                                                      |
| Mini-Player                 | **No changes**                                         | It is the same main window at 320×48 and it was already entered with `setDecorations(false)`. With the main window frameless from birth, entering the Mini-Player stays a size+pinning transition; the strip is simply not part of the compact layout.                                                                                                  |
| Strip shape                 | **Separate strip above the header**                    | Keeping the header untouched means Zen mode can keep fading it while the strip stays. Merging the controls into the header would have made the drag surface disappear with the header during a block.                                                                                                                                                   |
| Strip contents              | **Icon + small "Pomody" title left, ─ ▢ ✕ right**      | Same information the native bar used to show, nothing more. No file menus, no tabs, no breadcrumbs: the strip is chrome, not navigation.                                                                                                                                                                                                                |
| Strip style                 | **Visually unified, not a native imitation**           | Same background as the app, no separate tone, no separator line, fine glyphs in Rosé Pine tokens, subtle hover. Copying the native look would be neither native nor Pomody.                                                                                                                                                                             |
| Strip in Zen                | **Always visible**                                     | It is the only remaining drag/close surface once the header fades. Hiding it would leave a frameless window with no way to move or close it.                                                                                                                                                                                                            |
| Double-click on the strip   | **Maximizes / restores**                               | Windows convention, and it costs one handler because `toggleMaximize` already exists.                                                                                                                                                                                                                                                                   |
| Maximize API                | **`toggleMaximize()`, not a maximize/unmaximize pair** | Both the ▢ button and the double-click only ever ask "flip whatever the window is now". A pair would force the caller to hold the state it is trying to learn, which is exactly the bug the `onMaximizedChange` observer exists to prevent.                                                                                                             |
| Maximized-state observation | **`isMaximized()` query + resize-driven subscription** | Tauri v2 has no maximize event; a maximize _is_ a resize. The adapter listens to the native resize event, re-reads `isMaximized()` and reports only a state that differs from the last one, seeded at subscribe time. Otherwise every resize of a restored window would look like a change.                                                             |
| Unsubscribe shape           | **`Promise<() => void>`**                              | The native listener is created asynchronously (`onResized` resolves with the unlisten function), so the port returns a promise of the unsubscribe instead of pretending to be synchronous. A refused listener (missing permission) degrades to a no-op unsubscribe rather than rejecting into the caller's effect.                                      |
| ✕ button                    | **`close()` → hidden to tray, zero Rust changes**      | Already the existing behaviour: `src-tauri/src/lib.rs` intercepts the close request with `prevent_close()` + `hide()`. The custom ✕ therefore asks for a native close and inherits it. Reimplementing "hide" in the frontend would need a new command and would drift from the tray.                                                                    |
| ─ button                    | **Minimize to the taskbar**                            | Convention Windows users expect, and it is what the tray feature deliberately left alone: tray is for closing, taskbar is for minimizing.                                                                                                                                                                                                               |
| Exit from Mini-Player       | **Decorations stay off forever**                       | The restore path used to call `setDecorations(true)`. With the main window frameless for good, that call would stack a native title bar on top of the custom strip after every Mini-Player round trip. `enterMiniPlayer` keeps its `setDecorations(false)` (harmless, and it documents the intent) and `restoreMainWindow` never brings the frame back. |
| Shadow / rounded corners    | **Tauri defaults, first iteration**                    | Frameless windows on Windows 11 get the platform's shadow and rounding for free; Windows 10 gives square corners. Styling them by hand is a second iteration at most, and a first iteration that tries to fake them per-OS usually ends up worse than the default.                                                                                      |

### Native configuration

| Decision                            | Value                                                                                                      | Why                                                                                                                                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `decorations`                       | **`false` in `tauri.conf.json`**, not at runtime                                                           | The window must be born frameless. Calling `setDecorations(false)` on mount would flash the native bar on every launch.                                                                       |
| `core:window:allow-set-decorations` | **Kept**                                                                                                   | Still called by `enterMiniPlayer`. It is removed only when nothing in the codebase calls `setDecorations` anymore.                                                                            |
| New permissions                     | `allow-minimize`, `allow-toggle-maximize`, `allow-close`, `allow-is-maximized` + `core:event:allow-listen` | One command per control operation. `onResized` is `listen` on the window events; `core:window:default` does not grant it, and the failure mode without it is a silently inert state observer. |
| Rust                                | **No changes**                                                                                             | Every operation is part of the Tauri window API. `prevent_close` + `hide` already exist and are inherited by `close()`.                                                                       |

### Web build

`WebWindowShell` degrades **explicitly**: `minimize`, `toggleMaximize` and `close` are documented
no-ops, `isMaximized()` is always `false`, and `onMaximizedChange` returns an unsubscribe that
never fires. `close()` in particular must never degrade to `window.close()`: no browser honours it
for a tab the script did not open, and the attempt is worse than nothing.

---

## 4. Why the state observer lives in `WindowState`

The strip renders ▢ as maximize or restore depending on the current state, and the OS can flip
that state without the app asking (`Win+↑`, drag-to-snap — the maximize, not the flyout). Keeping
the flag in the component would give every future consumer its own subscription and its own copy
of the truth.

`WindowState.watchMaximizedState()` reads the current value once and then mirrors it through the
shell, returning the unsubscribe. The public surface of `WindowState` only grows: `isMiniPlayer`,
`isAlwaysOnTop`, `isSupported`, `toggleMiniPlayer()` and `restore()` are untouched.

`toggleMaximize()` reads the state back from the shell after toggling instead of flipping it
locally. The OS owns the answer (a maximize can be refused), and the read also covers a dropped
native event. The subscription is what keeps the value honest for everyone else.

---

## 5. Known debt

Registered on purpose, not forgotten.

| Debt                                                | Why it was not done now                                                                                                                                    |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Snap Layouts flyout**                             | Requires a native maximize-button hit-test region. Accepted as a formal loss (grilling Q1).                                                                |
| **Hover/press states are not OS-native**            | The strip is deliberately Pomody, not an imitation of the Windows caption buttons. Users who rely on the native button animation will notice.              |
| **No `setDecorations` removal**                     | Kept as long as `enterMiniPlayer` calls it. Removing the call and the permission together is a follow-up, not a half step.                                 |
| **Shadow/corners differ between Windows 10 and 11** | Defaults of the platform, first iteration. A hand-tuned look is a separate decision.                                                                       |
| **Native resize borders on a frameless window**     | Tauri/Windows keeps a resize border while `resizable: true`. Manual verification (T3) confirms it is usable at all four edges; styling it is out of scope. |
| **`Alt+Space` system menu**                         | Lost with the decorations. Not worth a Win32 menu reimplementation.                                                                                        |

---

## 6. Verification

| Level                             | What it covers                                                                                                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (Vitest, `--project server`) | Port contract, `TauriWindowShell` call order and degrade paths, `WebWindowShell` no-ops, `FakeWindowShell` simulation, `WindowState` wiring                             |
| Unit (Vitest, `--project client`) | T2's strip component, once it exists                                                                                                                                    |
| Manual on Windows (T3)            | Drag, resize from every edge, `Win+↑/←/↓`, `Win+D`, `Alt+F4`, double-click, tray-after-✕, exit-Mini-Player has no native bar. Playwright cannot drive the native shell. |
| `desktop-ci.yml`                  | Compile gate: the config and the capability permissions are validated by the Tauri build. It does **not** validate behaviour.                                           |

The Snap Layouts loss and the native-animation difference are accepted at the manual step, not
discovered there.
