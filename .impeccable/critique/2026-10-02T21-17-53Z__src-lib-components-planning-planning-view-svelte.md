---
target: src/lib/components/planning/planning-view.svelte
total_score: 30
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\Usuario\\dev\\pomody\\src\\lib\\components\\planning\\planning-view.svelte"
target_fingerprint: 'sha256:5964df70100b322cc0d7d190c425475ece190e3e14c9cb18030cef8a97008913'
target_path: "C:\\Users\\Usuario\\dev\\pomody\\src\\lib\\components\\planning\\planning-view.svelte"
timestamp: 2026-10-02T21-17-53Z
slug: src-lib-components-planning-planning-view-svelte
---

Method: dual-agent (A: 27585fe9-ecc1-4325-b63b-232399538511 · B: 1804cb55-9e16-44ae-a6f4-4146dc9a5b01)

#### Design Health Score

|     #     | Heuristic                       |   Score   | Key Issue                                                                                                                        |
| :-------: | :------------------------------ | :-------: | :------------------------------------------------------------------------------------------------------------------------------- |
|     1     | Visibility of System Status     |    3/4    | Filter state and loading states are clear; saving/resetting lacks subtle toast feedback confirming persistence.                  |
|     2     | Match System / Real World       |    3/4    | Natural wellness vocabulary (Mindful, Hydration, Strolls); internal taxonomy leaked via `PRESET` badges.                         |
|     3     | User Control and Freedom        |    3/4    | Dialogs handle ESC/Cancel cleanly; destructive reset is guarded by modal dialog, but offers no undo.                             |
|     4     | Consistency and Standards       |    3/4    | Consistent Rosé Pine tokens and shadcn primitives; broken by grid layout squeezing cards in the lateral drawer.                  |
|     5     | Error Prevention                |    4/4    | Excellent live validation for title (1-120), guide (0-500), duration (>=1), and disabled submit gates.                           |
|     6     | Recognition Rather Than Recall  |    3/4    | Category chips display dynamic counts and micro-guides expand inline; timeline break blocks do not show the assigned habit.      |
|     7     | Flexibility and Efficiency      |    2/4    | No keyboard shortcuts to switch to Break Habits or trigger + New Habit; form lacks quick duration pills (`2m`, `5m`, `10m`).     |
|     8     | Aesthetic and Minimalist Design |    3/4    | Beautiful Rosé Pine palette, but cluttered by triple badge rows per card and prominent "Reset defaults" in the header.           |
|     9     | Error Recovery                  |    3/4    | Inline validation messages pinpoint errors directly under invalid inputs.                                                        |
|    10     | Help and Documentation          |    3/4    | Rich 2-3 step micro-guides pre-authored for every preset; lacks inline explanation of how breaks trigger during active sessions. |
| **Total** |                                 | **30/40** | **Good** (Solid foundation; targeted refinements required)                                                                       |

#### Design Specificity Verdict

**LLM assessment:**
Authored core with lingering SaaS/CRUD artifacts. The curated 10 preset activities (such as _20-20-20 Eye Rest_, _Box Breathing Focus_, and _Wrist & Forearm Stretch_) and the tri-color Rosé Pine mapping (`Gold` for Physical, `Iris` for Mindful, `Foam` for Hydration) resonate deeply with Pomody's Zen-minimalist deep work environment. However, the surface retains administrative crud patterns: labeling 10 out of 10 default cards with a redundant `PRESET` badge, placing a destructive `Reset defaults` action in the primary toolbar, and an unadapted responsive grid (`sm:grid-cols-2`) that squeezes cards inside a narrow 5-column lateral drawer.

**Deterministic scan:**
The automated detector (`impeccable detect`) returned 0 findings across all scanned files in `src/lib/components/breaks/` and `planning-view.svelte`. All colors strictly adhere to semantic Tailwind v4 CSS variables and Rosé Pine design tokens.

**Visual overlays:**
Automated browser tests in Chromium confirmed 61/61 passing tests with correct token application, but surfaced two DOM/lifecycle findings:

1. `break-confirm-dialog.svelte`: Svelte 5 `derived_inert` warning when unmounting while resetting state.
2. `break-card.svelte`: `aria-controls` references an unmounted element when the micro-guide is collapsed.

#### Overall Impression

The foundation is rock solid: domain logic, semantic palette mapping, and accessible shadcn-svelte dialog composition feel deliberate and calming. The single biggest opportunity is stripping away administrative clutter—removing entity provenance badges, placing destructive reset in a quiet location, and fixing the lateral drawer's layout so cards breathe properly.

#### What's Working

1. **Curated, Actionable Micro-Guides:** Rather than generic placeholder breaks, the presets provide concrete ergonomic and mindful instructions formatted with clean, pre-line typography.
2. **Rosé Pine Semantic Palette Mapping:** Tri-color category badges (`Gold` for Physical, `Iris` for Mindful, `Foam` for Hydration) provide instant visual orientation without visual fatigue.
3. **Rigorous Focus & Dialog Architecture:** `BreakFormDialog` and `BreakConfirmDialog` strictly implement accessibility fundamentals: trapped focus, ESC escape, form pre-population on edit, and disabled submit gates.

#### Priority Issues

- **[P1] Lateral Column Layout Collapse (`sm:grid-cols-2` inside 5-col Drawer)**
  - _Why it matters:_ Squeezes cards into ~180px width, causing badge clusters and action buttons to collide and wrap onto awkward lines.
  - _Fix:_ Remove `sm:grid-cols-2` in favor of a clean single-column stacked layout (`grid-cols-1`).
  - _Suggested command:_ `$impeccable layout`

- **[P1] Visual Noise & Taxonomy Leakage (Redundant "Preset" Badges)**
  - _Why it matters:_ 100% of initial cards display an outline badge reading `PRESET`. Users seeking restorative focus do not need database provenance reminders.
  - _Fix:_ Remove the `Preset` badge entirely; distinguish custom habits subtly or solely by the presence of Edit/Delete affordances.
  - _Suggested command:_ `$impeccable distill`

- **[P1] Misplaced Nuclear Action ("Reset Defaults" in Primary Header Bar)**
  - _Why it matters:_ Violates working memory limits (6 competing choices in the header) and introduces anxiety by elevating a catalog-wipe button next to `+ New Habit`.
  - _Fix:_ Move `Reset defaults` to a discreet footer link or quiet overflow menu.
  - _Suggested command:_ `$impeccable quieter`

- **[P2] Disconnected Session Integration (Catalog vs. Timeline Break Blocks)**
  - _Why it matters:_ Tasks in the right panel map directly to focus blocks, but break blocks in the timeline remain passive items with zero catalog connection.
  - _Fix:_ Display a subtle "Suggested: Box Breathing" tag on the timeline break card or allow assigning a preferred break activity.
  - _Suggested command:_ `$impeccable shape`

- **[P2] Keyboard Navigation Blind Spot for Power Users**
  - _Why it matters:_ Planning view shortcuts (`c`, `n`) force the tasks view. Power users have no single-key shortcut to toggle Break Habits or submit habits via `Ctrl+Enter`.
  - _Fix:_ Add keyboard shortcut `b` to switch to Break Habits, `Shift+N` to trigger New Habit, quick duration chips (`2m`, `5m`, `10m`), and `Ctrl+Enter` submit.
  - _Suggested command:_ `$impeccable adapt`

#### Persona Red Flags

- **Alex (Power User):** No keyboard shortcuts to switch segments or add habits (`c` and `n` exclusively target tasks). Habit form requires manual numeric typing without duration quick-pills (`2m`, `5m`, `10m`) and lacks `Ctrl+Enter` submit.
- **Jordan (First-Timer):** "Break Habits" segment label can be misinterpreted as "breaking bad habits" rather than restorative breaks. Jordan clicks a card expecting to view the guide, but only the tiny 24px chevron icon toggles expansion.
- **Sam (Accessibility-Dependent User):** Action buttons on `BreakCard` use `icon-xs` (~24×24px touch target) which falls below recommended 44×44px hit areas. The guide container's `aria-controls` references an unmounted element when collapsed.

#### Minor Observations

- Character counters (`0/120`, `0/500`) are prominently visible even on empty fields; hiding until 80% capacity is reached would reduce input anxiety.
- The entire card header should be clickable to toggle micro-guide expansion, not just the chevron.
- Lifecycle warning `derived_inert` in `break-confirm-dialog.svelte` should be cleaned up.

#### Questions to Consider

- _What if timeline break blocks dynamically previewed their assigned restorative habit, allowing users to swap them during planning?_
- _What if custom habit creation took 5 seconds using quick-select duration pills (`2m`, `5m`, `10m`) instead of a raw number input?_
- _Does the catalog need a 'Reset defaults' button visible in the daily header, or should that belong quietly in the catalog footer or Settings?_
