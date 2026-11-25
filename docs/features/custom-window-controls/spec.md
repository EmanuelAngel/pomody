# Custom Window Controls — Title Bar Strip

> What the strip is and how it integrates. **Why** each decision was taken lives in
> [`decisions.md`](./decisions.md); the task breakdown lives in
> [`odd/tasks/custom-window-controls.md`](../../../odd/tasks/custom-window-controls.md).
>
> Task: **T2** (specs S1, S5, S6). Shell, port, adapters, state and native configuration are
> **T1** (commit `4197f2b`) and are not described again here.

---

## 1. Status

| Piece                                                          | Status                                                               |
| :------------------------------------------------------------- | :------------------------------------------------------------------- |
| `src/lib/components/layout/title-bar.svelte`                   | Done — this document                                                 |
| `src/lib/components/layout/title-bar.svelte.test.ts`           | Done — browser mode (`--project client`)                             |
| `src/routes/+layout.svelte` wiring above the header            | Done — this document                                                 |
| Reopened wave from T3 feedback (brand duplication, scrollbar)  | Done 2026-11-24 — §2, §3.2, §3.6                                     |
| Wave 2: Timer canvas centered under the strip (Option A)       | **Superseded** by wave 3 — §3.6                                      |
| Wave 3: Option B — window height 650 → 682, one universal push | Done 2026-11-24 — §3.6, `L9`                                         |
| Native behaviour (drag, resize, OS shortcuts, tray, ghosting)  | **Manual** — §6 checklist (T3); `desktop-ci.yml` is the compile gate |
| Windows 11 shadow / rounded corners                            | Tauri defaults, unchanged                                            |
| Double-click maximize glitch                                   | **Known issue, accepted, not fixed** — §8                            |

---

## 2. Settled design (grilling, 2026-02; revised 2026-11-24)

| Decision            | Value                                                                                                                                                         |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shape               | A **separate strip above the existing header**. The header is not merged into it.                                                                             |
| Contents            | `─ ▢ ✕` on the right, and nothing else. **No brand**: the wordmark and the logo live exclusively in `header.svelte` (revised, §2.1).                          |
| Drag surface        | The whole strip, **except** the button cluster. The left side is plain drag space.                                                                            |
| Style               | Visually unified with the app: same background token, no separate tone, no separator line, fine glyphs in Rosé Pine tokens, subtle hover on the buttons only. |
| Zen (running block) | **Always visible.** The header fades; the strip is the only remaining drag/close surface.                                                                     |
| Double click        | Maximizes / restores (implementation glitch accepted — §8).                                                                                                   |
| ☐ glyph             | Square when restored, two overlapping windows when maximized.                                                                                                 |
| Shadow / corners    | Whatever Tauri gives by default in this iteration (Win11: shadow + rounding; Win10: square).                                                                  |
| Snap Layouts flyout | **Lost, accepted** — it belongs to the native maximize button.                                                                                                |
| Mini-Player         | Untouched; the strip renders in the main window only.                                                                                                         |
| ✕                   | `close()` → hidden to tray, inherited from Rust (`prevent_close` + `hide`). No Rust changes.                                                                  |

### 2.1. Revision of 2026-11-24 (T3 feedback, `L8`)

The first iteration put the strip's own app mark plus a muted “Pomody” title on the left. The user
rejected it — «¿Por qué repetiste 'Pomody'? Literalmente está en el header y en los controles, no
tiene sentido» and «En los controles en lugar de usar nuestro logo, pusiste un ícono de temporizador,
¿wtf?» — and asked for the brand to exist in exactly one place. The strip therefore carries **no
brand at all**: the header keeps its wordmark (it always owned it), the Timer glyph is gone, and the
left side of the strip is drag space. See [`decisions.md` §3](./decisions.md) for the revised
decision row.

```text
┌───────────────────────────────────────────────────────────────┐
│                                                  ─   ▢   ✕    │  h-8 strip, bg-background
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

- `data-tauri-drag-region` sits on the strip element itself. With no brand on the left, the strip's
  own background **is** the drag surface, so no child needs the attribute: Tauri v2 does not inherit
  it, but nothing covers the root on the left side. (`mini-player.svelte` marks its columns one by
  one because there the columns do cover the root — different situation, same attribute.)
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
not maximize behind them. On the real desktop the maximize half of this gesture is glitchy — see §8,
where it is recorded as an accepted known issue rather than fixed.

### 3.6. Layout wiring (`src/routes/+layout.svelte`)

`header.svelte` is **not** modified and no view component is touched. The shell owns the geometry,
inside the main-window branch, and only while the strip exists (the web build keeps the layout it
always had, gated on `windowState.isSupported`):

```svelte
<div class={shellLayout}>
	<TitleBar />
	<Header … />
	{@render children()}
	<DailyCounter />
	…
</div>
```

Two shapes no longer: **one universal push**, because the window height pays for the strip (Option B,
`L9`).

| Scope                              | Wrapper classes                   |
| :--------------------------------- | :-------------------------------- |
| every desktop view (incl. `timer`) | `[&>header]:top-8 [&>main]:pt-24` |
| web build                          | none (`undefined`)                |

- `[&>header]:top-8` drops the fixed header below the strip band. The header's own `top-0` is a
  class, so the arbitrary variant's higher specificity wins.
- `[&>main]:pt-24` keeps the page's own top offset plus the strip, so content clears the header
  (which now ends at 88px) with the original 8px gap.
- Nothing bounds, centres or pads asymmetrically any more. The strip's 32px are paid for by the
  window height: `MAIN_WINDOW_DIMENSIONS` and `tauri.conf.json` are **682**, not 650 — the height the
  native bar used to consume outside the client area.

#### Geometry (Option B, 2026-11-24)

```text
window 800x682         y = 0
  strip (h-8)          y = 0 .. 32
  header (h-14)        y = 32 .. 88
  main: min-h-screen 682, padding 96 top / 32 bottom
                       content box y = 96 .. 650 = 554px
    canvas 548px       y = 99 .. 647     <- (554 - 548) / 2 = 3px above and 3px below
```

- Canvas height is rigid: 400 arc + 24 (waiting line) + 68 (controls) + 56 (task pill) = **548px**.
- Available = 96 + 548 + 32 = 676 ≤ 682 → **6px of slack**, which is exactly the budget the Timer
  had before the strip existed. `min-h-screen` (682) is the page's own floor, so main never grows
  and the document is exactly one viewport tall: **no vertical scrollbar**.
- `justify-center` centres the canvas inside the content box: 3px / 3px, task pill band ending at
  y=647, i.e. the pill sits **35px above the window bottom**. For reference, pre-strip the same
  content sat at 51..599 in a 650 window (51px above the bottom), so what Option B restores is the
  _budget_ and the absence of a scrollbar, not the old absolute y positions: the push spends 96px on
  top instead of the page's own 32px, and the +32 window height is what pays for the strip.
- The daily counter keeps `bottom-5` with no override, so at the default size its box (~638–662)
  touches the pill's own band (615..647) by about 9px — the pill's visible bottom edge (~643) and the
  counter's chip (~638) share ~5px. Pre-strip the counter sat 7px _below_ the pill. Accepted with
  Option B, eyeballed in checklist row 21.
- Short windows still scroll the document: at the 500px `minHeight` the canvas needs 676px of shell,
  main grows, and the page scrolls as it always did.

#### Wave history (why the numbers look like this)

**Wave 1 (`L8`, scrollbar).** The first iteration only shifted the header and added
`[&>main]:pt-24` while the window was still 650 tall. Padding (96 + 32) plus the 548px canvas summed
676 > 650, so /timer painted a vertical scrollbar that had not existed before. Wave 1 bounded the
shell to one viewport and let the canvas overflow into main's own padding — a mask, not a fix.

**Wave 2 (Option A, centring).** Wave 1 kept the asymmetric padding, so the 554 → 490px box split the
overflow 29/29 and put the canvas at 99..647: **11px above, 3px below**. The canvas was not centred,
all the imbalance landed under the task pill, and the daily counter had to be nudged to `bottom-9` to
dodge it.

**Wave 3 (Option B, this one, `L9`).** The user's decision: stop doing CSS gymnastics and give the
strip the 32px the native bar used to occupy outside the client area, via the default window height.
The height goes 650 → 682 in the port constant and in `tauri.conf.json`, the wave-2 timer shape is
reverted, and every desktop view shares the single `[&>header]:top-8 [&>main]:pt-24` push. The daily
counter keeps its original `bottom-5` with no view-specific override — wave 2's nudge is gone, and
`DailyCounter` renders with no `class` prop at all.

One honest note on the numbers: the pre-strip canvas sat at 51..599 in a 650 window because the page's
own padding was `sm:p-8` (32/32). With the push (96 top / 32 bottom) inside the 682 window the canvas
lands at 99..647, so the _budget_ is restored (6px slack, no scrollbar, counter back at `bottom-5`)
while the absolute y positions shift by the extra top offset. The user's `L9` intent — «alarguemos un
poco el tamaño default» — is exactly this: the window grows by the strip instead of the layout
compensating for it. Maximizing stays OS-fullscreen, and `restoreMainWindow()` reuses the same 682
constant, so the Mini-Player round trip returns to this geometry.

The list-like views keep their normal `min-h-screen` flow and scroll as they always have; the web
build keeps the layout it had before the feature.

### 3.7. Markup hooks used by the tests

| Hook                               | Element                                                         |
| :--------------------------------- | :-------------------------------------------------------------- |
| `[data-slot="title-bar"]`          | strip root (`role="group"`, `aria-label="Window title bar"`)    |
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
| Three controls and nothing else                                                            | only child is the control cluster; empty `textContent`               |
| Carries no brand of its own                                                                | no `Pomody` text, no `img`: the wordmark lives in the header only    |
| Every control has an accessible name                                                       | `aria-label` assertions                                              |
| `─` → `minimize()`, `▢` → `toggleMaximize()`, `✕` → `close()`                              | fake call counters                                                   |
| Glyph swaps with `isMaximized`                                                             | click the button; start maximized; OS-side `emitMaximizedChange()`   |
| Subscription is released on unmount                                                        | `emitMaximizedChange()` after `unmount()` leaves the state untouched |
| Double click on the background toggles maximize                                            | `userEvent.dblClick(strip)`                                          |
| Double click on a control does not                                                         | `dblClick` on `─`: two minimizes, zero maximize toggles              |
| Drag region is on the strip, never on the controls                                         | attribute presence and absence                                       |
| Style: `h-8`, `bg-background`, no separator, no hover on the strip, token hover on buttons | class assertions                                                     |

Run: `pnpm vitest run src/lib/components/layout/title-bar.svelte.test.ts --project client`.

**Not automated**: the `+layout.svelte` geometry. Every browser test sees
`windowState.isSupported === false`, so the Tauri offsets never apply there, and the shell's real
height budget can only be observed in the native window. Every geometry wave (the `L8` scrollbar,
Option A's centring and Option B's window height) is therefore backed by the arithmetic in §3.6 plus
the manual checklist (rows 19–24), executed in the desktop build.

---

## 6. Manual checklist — T3 (Windows, real desktop build)

> Playwright cannot drive the native shell and `desktop-ci.yml` only proves it compiles. Every row
> below is signed off by hand on `windows-latest`-equivalent hardware, against `pnpm tauri:dev`.

| #   | Step                                          | Expected                                                                          | Pass |
| :-- | :-------------------------------------------- | :-------------------------------------------------------------------------------- | :--- |
| 1   | Launch the app                                | Frameless window, strip on top, no native bar, no flash of one                    | ☐    |
| 2   | Drag the strip background (empty left area)   | Window follows the cursor smoothly                                                | ☐    |
| 3   | Drag from a button                            | Window does **not** move; the button responds                                     | ☐    |
| 4   | Resize from each edge and each corner         | All four edges and four corners resize                                            | ☐    |
| 5   | `Win+↑`, `Win+←`, `Win+↓`                     | Maximize, snap left, restore/minimize as usual                                    | ☐    |
| 6   | Drag the window to a screen edge              | OS snapping works (drag-to-snap is decoration-independent)                        | ☐    |
| 7   | Hover the `▢` glyph                           | No Snap Layouts flyout (accepted loss); no other oddity                           | ☐    |
| 8   | Double click the strip background             | Maximizes, and restores on the second double click — **known glitch, §8**         | ☐    |
| 9   | Double click a button                         | No maximize toggle; the two clicks reach the button                               | ☐    |
| 10  | Click `▢`, then click `❐`                     | Maximizes, then restores; glyph follows both ways                                 | ☐    |
| 11  | Maximize with `Win+↑`, then look at the glyph | The glyph already shows restore (state observer, not our own clicks)              | ☐    |
| 12  | Click `─`                                     | Window minimizes to the taskbar                                                   | ☐    |
| 13  | Click `✕`, then use the tray icon to reopen   | Window hides to the tray; app keeps running; tray “Open” shows it again           | ☐    |
| 14  | `Alt+F4` with the window focused              | Same tray behaviour as `✕` (no app exit)                                          | ☐    |
| 15  | Enter Mini-Player, then leave it              | No strip in compact mode; on exit the strip is back and **no** native bar appears | ☐    |
| 16  | Run a focus block (Zen)                       | Header fades, **strip stays** visible and draggable; `✕` still works              | ☐    |
| 17  | Web build (`pnpm dev` in a browser)           | No strip, no controls, header and content exactly as before                       | ☐    |
| 18  | Theme sweep (dark / dawn / oled)              | Strip matches the app background, glyphs legible, hover visible                   | ☐    |
| 19  | Open `/timer` at the default 800×682          | **No vertical scrollbar** (the `L8` regression); content not clipped              | ☐    |
| 20  | Measure `/timer` against the plan             | Canvas ≈3px inside its content box; task pill ≈35px above the window bottom       | ☐    |
| 21  | On `/timer` with a task pinned, idle          | Daily counter sits at its original `bottom-5`, with no view-specific override     | ☐    |
| 22  | Look at the top of the window                 | “Pomody” appears **once**, in the header; the strip has no icon and no title      | ☐    |
| 23  | Scroll Planning and Metrics                   | Both still scroll, nothing cut off above the top edge                             | ☐    |
| 24  | Maximize, then look at `/timer`               | Canvas still centred in the taller viewport (no top-heavy or bottom-heavy drift)  | ☐    |
| 25  | Restore from Mini-Player                      | Back to 800×682 (not 800×650), with the strip and no native bar                   | ☐    |

`pnpm check`, `pnpm lint`, `pnpm test:unit` and `pnpm test:browser` must be green before starting
the list; `desktop-ci.yml` must be green before signing it off.

---

## 7. Known debt registered by T2

| Debt                                                      | Why it is not closed here                                                                                                                                                                                       |
| :-------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Control names are literal English, not Paraglide messages | `messages/en.json` and `messages/es.json` are outside T2’s edit surface. Keys `title_bar_minimize`, `title_bar_maximize`, `title_bar_restore`, `title_bar_close` should be added when the surface is available. |
| No native press/hover animation on the caption buttons    | The strip is deliberately Pomody, not an imitation of the Windows caption buttons (accepted in `decisions.md` §5).                                                                                              |
| Shadow / rounded corners are platform defaults            | Windows 10 gets square corners, Windows 11 gets the platform treatment. Hand-tuning is a later decision.                                                                                                        |

---

## 8. Known issues — accepted, not fixed

### 8.1. Double-click maximize does nothing (or reverts instantly)

User report (`L8`, verbatim): «El doble click efectivamente hace algo raro, al minimizar OK, pero al
maximizar intenta maximizar y no lo hace, o vuelve instantáneamente. No me importa, no es grave.»

- **What works**: double-click never breaks anything, and the rest of the strip is unaffected.
- **What does not**: the maximize half of the gesture visibly tries and reverts.
- **Probable cause**: Tauri v2's own drag-region script also treats a double click on a drag region
  as maximize/restore. Both handlers then run and cancel each other out — our `toggleMaximize()` and
  the native toggle. It cannot be reproduced in Vitest, because the whole behaviour lives in the
  native window.
- **Status**: **accepted as a minor issue by the user**, deliberately not fixed in this iteration.
  The ▢ button and `Win+↑` both maximize correctly, which is why the loss is cosmetic. Checklist row
  8 keeps it visible instead of letting it disappear from the record.
- **If it is ever reopened**: the cheapest candidate is to drop our `dblclick` handler and let the
  native drag region own the gesture, which requires deleting §3.5 and its two tests.
