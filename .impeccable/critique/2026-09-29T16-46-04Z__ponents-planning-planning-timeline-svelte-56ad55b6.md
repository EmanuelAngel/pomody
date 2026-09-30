---
target_identity: "file:C:\\Users\\Usuario\\dev\\pomody\\src\\lib\\components\\planning\\planning-timeline.svelte"
target_fingerprint: 'sha256:126ab99b4c7ca9309c8bf100705d8034c8cae76de7da7686123783995c1bd3a2'
target_path: "C:\\Users\\Usuario\\dev\\pomody\\src\\lib\\components\\planning\\planning-timeline.svelte"
timestamp: 2026-09-29T16-46-04Z
slug: ponents-planning-planning-timeline-svelte-56ad55b6
---

# Critique: planning-timeline.svelte

## Design Health Score

| #         | Heuristic                                               |   Score   | Key Issue                                                                                             |
| --------- | ------------------------------------------------------- | :-------: | ----------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status                             |     2     | Shows status tags, but lacks live countdown or progress ring inside the timeline track.               |
| 2         | Match Between System and Real World                     |     2     | Heavy technical jargon: "Forward-only sync", "Free Margin", "Smart Revitalization".                   |
| 3         | User Control and Freedom                                |     1     | Cannot reorder or adjust individual blocks; "End Session Plan" has no undo or confirmation.           |
| 4         | Consistency and Standards                               |     2     | Bypasses Rosé Pine tokens using hardcoded `emerald-500` / `amber-500`; non-standard 28px steppers.    |
| 5         | Error Prevention                                        |     1     | Critical flaw: Clicking "End Session Plan" wipes active session instantly without confirmation.       |
| 6         | Recognition Rather Than Recall                          |     3     | Backlog tasks shown in popover, but assignment context and mid-block completion handling are unclear. |
| 7         | Flexibility and Efficiency of Use                       |     1     | No keyboard shortcuts, no drag-and-drop, tedious 5-click stepper adjustments.                         |
| 8         | Aesthetic and Minimalist Design                         |     1     | High clutter: 5 steppers, 10 micro-buttons, repetitive boilerplate break copy, redundant badges.      |
| 9         | Help Users Recognize, Diagnose, and Recover from Errors |     2     | Underflow warning states problem without actionable one-click resolution.                             |
| 10        | Help and Documentation                                  |     2     | Architectural sync explanations clutter primary UI instead of subtle contextual tooltips.             |
| **Total** |                                                         | **17/40** | **Poor (Major UX Overhaul Required)**                                                                 |

## Design Specificity Verdict

**Verdict: Category-Interchangeable Cockpit with Rosé Pine Brand Dilution.**

- **LLM Assessment**: Pomody promises Zen focus and cognitive calm. The timeline component currently behaves like an enterprise Gantt scheduler or flight control board: 5 simultaneous steppers with 10 buttons, manual arithmetic required before working, repetitive "Smart Revitalization" corporate wellness copy, and hardcoded `emerald`/`amber` utility colors violating the Rosé Pine palette on Dawn and OLED themes.
- **Deterministic Scan**: CLI detector returned 0 primary violations (exit code 0), verifying clean Tailwind class formatting and absence of raw hex codes. However, static linting alone cannot detect the conceptual clutter and theme token bypasses (`emerald`/`amber` vs `--accent-pine`/`--accent-gold`).
- **Visual Overlays**: Skipped (no browser automation harness available in this session).

## Overall Impression

The temporal projection engine and forward-only state model are mathematically sound, but the UI is a cockpit of micro-controls that induces decision paralysis instead of protecting focus.

## What's Working

1. **Dual Planning Modes**: Supporting both discrete block planning and backwards projection from a target end-time with buffer calculation is a high-value capability.
2. **Deterministic Forward-Only State Engine**: The domain logic cleanly protects historical and active intervals while allowing future scheduling adjustments.
3. **Macro Summary Cards**: The top-level focus vs. break time overview provides immediate temporal clarity.

## Priority Issues

- **[P0] Destructive "End Session Plan" lacks confirmation guard**: Accidental clicks immediately destroy the active session and reset the running timer.
  - _Fix_: Require a two-step confirmation (popover or hold-to-confirm).
  - _Suggested command_: `$impeccable harden`
- **[P1] Five-stepper configuration cockpit overwhelms planning**: 10 micro-buttons force manual arithmetic before starting focus.
  - _Fix_: Replace raw steppers with quick cadence presets (`25/5`, `50/10`, `90/20`), keeping only Block Count or End Time exposed; move interval details to an advanced disclosure.
  - _Suggested command_: `$impeccable distill`
- **[P2] Hardcoded Emerald/Amber violates Rosé Pine token architecture**: Breaks palette consistency across Dark, Dawn, and OLED themes.
  - _Fix_: Map to semantic tokens (`accent-pine`/`accent-foam` for complete, `accent-gold` for warnings/margins).
  - _Suggested command_: `$impeccable colorize`
- **[P2] Inaccessible micro-touch targets and non-semantic markup**: 28px stepper buttons fail WCAG touch targets (44px), and nested `div`s lack `<ol>` sequential screen reader hierarchy.
  - _Fix_: Expand touch targets and convert the track into an ordered list with `aria-current="step"`.
  - _Suggested command_: `$impeccable audit`
- **[P3] Corporate wellness jargon on break cards**: Repetitive "Smart Revitalization" boilerplate adds visual noise to every break card.
  - _Fix_: Strip boilerplate text in favor of clean, quiet interval labels ("Short Break · 5m").
  - _Suggested command_: `$impeccable quieter`

## Persona Red Flags

- **Alex (Power User)**: Tedious increment clicks, no keyboard shortcuts, no drag-and-drop task assignment. High abandonment risk.
- **Jordan (First-Timer)**: Intimidated by 5 steppers, "Free Margin", and "Forward-only sync" architectural disclaimers.
- **Sam (Accessibility-Dependent)**: Micro-targets (28px) and non-semantic div track deprive screen-reader users of session structure.

## Minor Observations

1. `Sparkles` icon on static breaks implies algorithmic/AI generation where none exists.
2. End-time mode silently wraps past midnight without a "+1 Day" visual badge.
3. Task assignment popover empty state provides no inline task creation path.
4. Timeline connector line can detach or misalign when task names wrap.

## Questions to Consider

1. Why configure timer interval mechanics in the planning view instead of inheriting global preferences and focusing purely on tasks?
2. Why does a 5-minute break card carry two lines of corporate wellness marketing text?
3. Could planning be task-first (pick 3 tasks, timeline auto-calculates) rather than math-first?
