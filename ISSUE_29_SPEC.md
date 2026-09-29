# Issue #29: Daily Focus Counter Specification

> **Task**: Implement a simple, non-invasive daily focus counter displaying completed focus blocks and accumulated focus minutes during the day.
> **Design Pattern**: Hexagonal Architecture + Zen Statusline.

---

## 1. Overview & UX Intent

In alignment with Pomody's **Zen minimalism** and zero-bloat philosophy:

- The daily counter acts as **passive traction feedback** (quiet affirmation of daily progress) rather than an anxiety-inducing gamified metric.
- It sits in its own visual plane as a **Zen Statusline** anchored to the bottom of the viewport (`fixed bottom-5 inset-x-0`).
- It does **not** compete with the center stage (`TimerArc`, `TimerControls`, or `TaskPill`), and does **not** crowd the top navigation header.
- **Zen Mode Behavior**: Automatically fades out (`opacity-0 pointer-events-none` with smooth CSS transition) when `timerState.isRunning` is `true`, matching the existing header fade-out behavior.

---

## 2. Display Format & Micro-copy

- **Base State (0 completed blocks)**:
  `0 blocks · 0m`
- **Under 1 Hour**:
  `2 blocks · 50m`
- **1 Hour or More**:
  `4 blocks · 1h 40m`
- **Typography & Styling**:
  - Text: `text-xs font-mono text-muted-foreground/60 select-none`
  - Alignment: Centered horizontally (`flex items-center justify-center gap-1.5`)
  - Accent/Theme: Fully inherits theme colors without loud highlights.

---

## 3. Architecture & Data Flow

### Domain / State Layer

- Daily scope: Scoped to the current calendar date (`YYYY-MM-DD`). Automatically resets when the local day rolls over.
- Only completed `focus` blocks count toward this total. Skipped blocks or breaks are ignored.
- The `TimerFSM` already increments `totalRoundsCompleted` when a `focus` block reaches `completed`, and emits `block-completed` domain events.
- Implementation can maintain this daily aggregate via:
  1. In-memory / reactive store in `src/lib/state/` (e.g. tracking `completedBlocks` and `accumulatedMinutes` for the active day).
  2. Optional persistence through the settings/session storage adapter (e.g. key `pomody_daily_stats_{YYYY-MM-DD}`).

### UI Component Layer

- Location: `src/lib/components/layout/daily-counter.svelte` (or `src/lib/components/timer/daily-counter.svelte`).
- Mounted in `src/routes/+page.svelte` (active during timer tab) or globally in `src/routes/+layout.svelte`.
- Reactivity:
  - Consumes `timerState.isRunning` to toggle visibility (`opacity-100` when idle/paused, `opacity-0` when running).
  - Listens to domain completion events or derives from state to update numbers seamlessly.

---

## 4. Acceptance Criteria & Verification

1. [ ] **Visual Hierarchy**: The counter is rendered at `fixed bottom-5 inset-x-0` with centered, muted monospace typography.
2. [ ] **Zen Mode Fade**: When the timer starts running (`isRunning === true`), the statusline fades out smoothly to `opacity-0` and disables pointer events. When paused or idle, it smoothly fades back in.
3. [ ] **Accurate Counting**: Only completed `focus` sessions increment the count and minutes.
4. [ ] **Formatting**: Durations format as `Xm` when < 60m and `Xh Ym` when >= 60m (e.g. `100 min` -> `1h 40m`).
5. [ ] **Tests**:
   - Unit tests covering daily date checking, block counting, and time formatting logic.
   - Component test verifying rendering and fade-out transition based on `isRunning`.
6. [ ] **Verification Gate**:
   - `pnpm check` passes with 0 type errors.
   - `pnpm lint` passes with 0 warnings.
   - `pnpm test` passes.
