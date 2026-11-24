# Custom Window Controls — Title Bar Strip

> What the strip is and how it integrates. **Why** each decision was taken lives in
> [`decisions.md`](./decisions.md); the task breakdown lives in
> [`odd/tasks/custom-window-controls.md`](../../../odd/tasks/custom-window-controls.md).
>
> Task: **T2** (specs S1, S5, S6). Shell, port, adapters, state and native configuration are
> **T1** (commit `4197f2b`) and are not described again here.

---

## 1. Status

| Piece                                                         | Status                                                               |
| :------------------------------------------------------------ | :------------------------------------------------------------------- |
| `src/lib/components/layout/title-bar.svelte`                  | Done — this document                                                 |
| `src/lib/components/layout/title-bar.svelte.test.ts`          | Done — browser mode (`--project client`)                             |
| `src/routes/+layout.svelte` wiring above the header           | Done — this document                                                 |
| Native behaviour (drag, resize, OS shortcuts, tray, ghosting) | **Manual** — §6 checklist (T3); `desktop-ci.yml` is the compile gate |
| Windows 11 shadow / rounded corners                           | Tauri defaults, unchanged                                            |

---

## 2. Settled design (grilling, 2026-02)

| Decision            | Value                                                                                                                                                         |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shape               | A **separate strip above the existing header**. The header is not merged into it.                                                                             |
| Contents            | Small app mark + muted “Pomody” title on the left, `─ ▢ ✕` on the right.                                                                                      |
| Drag surface        | The whole strip, **except** the button cluster.                                                                                                               |
| Style               | Visually unified with the app: same background token, no separate tone, no separator line, fine glyphs in Rosé Pine tokens, subtle hover on the buttons only. |
| Zen (running block) | **Always visible.** The header fades; the strip is the only remaining drag/close surface.                                                                     |
| Double click        | Maximizes / restores.                                                                                                                                         |
| ☐ glyph             | Square when restored, two overlapping windows when maximized.                                                                                                 |
| Shadow / corners    | Whatever Tauri gives by default in this iteration (Win11: shadow + rounding; Win10: square).                                                                  |
| Snap Layouts flyout | **Lost, accepted** — it belongs to the native maximize button.                                                                                                |
| Mini-Player         | Untouched; the strip renders in the main window only.                                                                                                         |
| ✕                   | `close()` → hidden to tray, inherited from Rust (`prevent_close` + `hide`). No Rust changes.                                                                  |

```text
┌───────────────────────────────────────────────────────────────┐
│ (mark) Pomody                                    ─   ▢   ✕    │  h-8 strip, bg-background
├───────────────────────────────────────────────────────────────┤
│ Pomody            Timer · Planning · Metrics        (gear)    │  existing header, h-14, fades in Zen
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                        routed view                            │
```

---

## 3. Behaviour contract

### 3.1. Visibility gates

The strip renders **only** when all of the following hold:

1. The platform can manipulate the native window — `windowState.isSupported`, which is `false` on
   the web build (`WebWindowShell` is a documented no-op). Web users see nothing at all.
2. The window is **not** in Mini-Player mode — `windowState.isMiniPlayer`. The 320×48 window has
   its own layout and no room for caption chrome.
3. It is rendered from the main-window branch of `src/routes/+layout.svelte`, outside the Zen fade
   (the fade is applied per slot _inside_ `header.svelte`, so a sibling strip cannot inherit it).

### 3.2. Drag region

- `data-tauri-drag-region` sits on the strip element itself **and** on its left-hand children
  (mark, title). Tauri v2 does not inherit the attribute, so every element that must drag carries
  it — same precedent as [`mini-player.svelte`](../../../src/lib/components/timer/mini-player.svelte).
- The button cluster **never** carries it. A drag surface under a button swallows its clicks.

### 3.3. Controls

| Control | Accessible name                      | Wiring                         | Notes                                                                                                    |
| :------ | :----------------------------------- | :----------------------------- | :------------------------------------------------------------------------------------------------------- |
| `─`     | `Minimize window`                    | `windowState.minimize()`       | Taskbar, not tray — the convention the tray feature left alone.                                          |
| `▢`/`❐` | `Maximize window` / `Restore window` | `windowState.toggleMaximize()` | Glyph and name follow `windowState.isMaximized`.                                                         |
| `✕`     | `Close window`                       | `windowState.close()`          | Native close request → Rust hides to tray. Only stronger hover, token-based (`hover:bg-accent-love/20`). |

All three are real `<button>` elements (shadcn-svelte `Button`, `variant="ghost"`,
`size="icon-sm"`, `rounded-none`, full strip height) with `aria-label`, so the glyphs are never the
only accessible text. They sit inside `role="group"` + `aria-label="Window controls"`.

### 3.4. Maximized-state observation

- On mount the strip calls `windowState.watchMaximizedState()`, which reads the current value once
  and then mirrors the shell’s changes. The OS can maximize without us (`Win+↑`, drag-to-snap), so
  the glyph cannot be derived from our own clicks.
- The returned unsubscribe is called on unmount (and immediately if the component was destroyed
  before the asynchronous subscription resolved), so a dead strip cannot write into the state.
- The call is skipped entirely on unsupported platforms.

### 3.5. Double click

`dblclick` on the strip toggles maximize. A double click that lands on a `<button>` is ignored
entirely: the buttons keep their own clicks (the two `click` events still fire) and the window does
not maximize behind them.

### 3.6. Layout wiring (`src/routes/+layout.svelte`)

`header.svelte` is **not** modified. The shell makes room for the strip instead, inside the
main-window branch:

```svelte
<div class={windowState.isSupported ? '[&>header]:top-8 [&>main]:pt-24' : undefined}>
	<TitleBar />
	<Header … />
	{@render children()}
	…
</div>
```

- `[&>header]:top-8` pushes the fixed header down by the strip height (32px). Its own `top-0`
  utility is a class, so the arbitrary variant’s higher specificity wins.
- `[&>main]:pt-24` returns the same 32px to the routed view: the page’s `pt-16` (64px) plus the
  strip keeps the original 8px gap between the header band (now ending at 88px) and the content.
  Padding lives inside the page’s `min-h-screen` box (`box-sizing: border-box`), so no scrollbar is
  introduced.
- Both offsets are applied **only** when the strip exists, so the web build layout is byte-for-byte
  the same as before.

### 3.7. Markup hooks used by the tests

| Hook                               | Element                                                         |
| :--------------------------------- | :-------------------------------------------------------------- |
| `[data-slot="title-bar"]`          | strip root (`role="group"`, `aria-label="Window title bar"`)    |
| `[data-slot="title-bar-mark"]`     | left brand mark (decorative, `aria-hidden`)                     |
| `[data-slot="title-bar-controls"]` | button cluster (`role="group"`, `aria-label="Window controls"`) |
| `data-glyph="maximize\|restore"`   | maximize button, mirrors `isMaximized`                          |

---

## 4. Component contract

```typescript
interface Props {
	/** Injected so the strip stays presentational about where the state comes from. */
	windowState?: WindowState; // defaults to the global singleton
}
```

The component owns no native logic: every mutation is delegated to `WindowState`, which delegates to
`IWindowShell`. No `@tauri-apps/api` import, no barrel file, no legacy store.

---

## 5. Tests (Vitest Browser Mode, `--project client`)

`src/lib/components/layout/title-bar.svelte.test.ts`, using `FakeWindowShell` via
`createWindowState()` (`src/testing/fakes/platform/fake-window-shell.ts`) and `WebWindowShell` for
the web case.

| Covered behaviour                                                                          | How                                                                  |
| :----------------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| Renders nothing on the web build                                                           | `WebWindowShell` → no strip, no buttons                              |
| Renders nothing in Mini-Player mode                                                        | `windowState.isMiniPlayer = true` → no strip, no buttons             |
| Mark + title + three controls, each with an accessible name                                | role queries and `aria-label` assertions                             |
| `─` → `minimize()`, `▢` → `toggleMaximize()`, `✕` → `close()`                              | fake call counters                                                   |
| Glyph swaps with `isMaximized`                                                             | click the button; start maximized; OS-side `emitMaximizedChange()`   |
| Subscription is released on unmount                                                        | `emitMaximizedChange()` after `unmount()` leaves the state untouched |
| Double click on the background toggles maximize                                            | `userEvent.dblClick(strip)`                                          |
| Double click on a control does not                                                         | `dblClick` on `─`: two minimizes, zero maximize toggles              |
| Drag region is on the strip, never on the controls                                         | attribute presence and absence                                       |
| Style: `h-8`, `bg-background`, no separator, no hover on the strip, token hover on buttons | class assertions                                                     |

Run: `pnpm vitest run src/lib/components/layout/title-bar.svelte.test.ts --project client`.

There is no test for the `+layout.svelte` offset: it is a static arbitrary-variant mapping with no
behaviour of its own. It is covered by the manual checklist (§6) and by the existing layout-level
suite.

---

## 6. Manual checklist — T3 (Windows, real desktop build)

> Playwright cannot drive the native shell and `desktop-ci.yml` only proves it compiles. Every row
> below is signed off by hand on `windows-latest`-equivalent hardware, against `pnpm tauri:dev`.

| #   | Step                                                | Expected                                                                          | Pass |
| :-- | :-------------------------------------------------- | :-------------------------------------------------------------------------------- | :--- |
| 1   | Launch the app                                      | Frameless window, strip on top, no native bar, no flash of one                    | ☐    |
| 2   | Drag the strip background (empty area, title, mark) | Window follows the cursor smoothly                                                | ☐    |
| 3   | Drag from a button                                  | Window does **not** move; the button responds                                     | ☐    |
| 4   | Resize from each edge and each corner               | All four edges and four corners resize                                            | ☐    |
| 5   | `Win+↑`, `Win+←`, `Win+↓`                           | Maximize, snap left, restore/minimize as usual                                    | ☐    |
| 6   | Drag the window to a screen edge                    | OS snapping works (drag-to-snap is decoration-independent)                        | ☐    |
| 7   | Hover the `▢` glyph                                 | No Snap Layouts flyout (accepted loss); no other oddity                           | ☐    |
| 8   | Double click the strip background                   | Maximizes, and restores on the second double click (no net-zero flip)             | ☐    |
| 9   | Double click a button                               | No maximize toggle; the two clicks reach the button                               | ☐    |
| 10  | Click `▢`, then click `❐`                           | Maximizes, then restores; glyph follows both ways                                 | ☐    |
| 11  | Maximize with `Win+↑`, then look at the glyph       | The glyph already shows restore (state observer, not our own clicks)              | ☐    |
| 12  | Click `─`                                           | Window minimizes to the taskbar                                                   | ☐    |
| 13  | Click `✕`, then use the tray icon to reopen         | Window hides to the tray; app keeps running; tray “Open” shows it again           | ☐    |
| 14  | `Alt+F4` with the window focused                    | Same tray behaviour as `✕` (no app exit)                                          | ☐    |
| 15  | Enter Mini-Player, then leave it                    | No strip in compact mode; on exit the strip is back and **no** native bar appears | ☐    |
| 16  | Run a focus block (Zen)                             | Header fades, **strip stays** visible and draggable; `✕` still works              | ☐    |
| 17  | Web build (`pnpm dev` in a browser)                 | No strip, no controls, header and content exactly as before                       | ☐    |
| 18  | Theme sweep (dark / dawn / oled)                    | Strip matches the app background, glyphs legible, hover visible                   | ☐    |

`pnpm check`, `pnpm lint`, `pnpm test:unit` and `pnpm test:browser` must be green before starting
the list; `desktop-ci.yml` must be green before signing it off.

---

## 7. Known debt registered by T2

| Debt                                                      | Why it is not closed here                                                                                                                                                                                       |
| :-------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Control names are literal English, not Paraglide messages | `messages/en.json` and `messages/es.json` are outside T2’s edit surface. Keys `title_bar_minimize`, `title_bar_maximize`, `title_bar_restore`, `title_bar_close` should be added when the surface is available. |
| The brand mark is a Lucide `Timer` glyph                  | `src/lib/assets/favicon.svg` is still the Svelte template logo; shipping it as the window mark would be worse than a neutral glyph. A real app icon is a separate task.                                         |
| Native double-click on a Tauri drag region                | Tauri’s own drag-region script may also toggle maximize on double click. If it does, our handler and the native one could cancel out; checklist row 8 exists to catch exactly that.                             |
| No native press/hover animation on the caption buttons    | The strip is deliberately Pomody, not an imitation of the Windows caption buttons (accepted in `decisions.md` §5).                                                                                              |
| Shadow / rounded corners are platform defaults            | Windows 10 gets square corners, Windows 11 gets the platform treatment. Hand-tuning is a later decision.                                                                                                        |
