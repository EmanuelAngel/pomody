# Feature: Break Activities Catalog & Custom Habits UI (Issue #36)

## Objective

Implement an accessible, minimal UI to explore the restorative break activities catalog (`BreakActivity`), view their micro-guides, and enable local CRUD management of custom habits without distracting from focus or shifting layouts.

## Problem & Why

During session planning and break transitions, users need ready-to-use, restorative pause suggestions (physical stretching, hydration, breathwork) to eliminate decision fatigue. Users also need the ability to add and manage their own personalized habits while preserving core system presets and keeping the timer surface clutter-free.

## Scope & Boundaries

- **In Scope**:
  - Reactive methods in `BreaksState` (`saveActivity`, `deleteActivity`, `resetToDefaults`) preserving preset immutability.
  - Read-only `break-card.svelte` with Rosé Pine category accents, duration pills, system/custom badges, and expandable micro-guides.
  - `break-catalog.svelte` with category filter chips (`All`, `Physical`, `Mindful`, `Hydration`) with counts, search/counter, and responsive grid.
  - `break-form-dialog.svelte` for creating and editing custom habits with strict domain validations (title 1-120 chars, valid category, duration >= 1, guide <= 500 chars).
  - `break-confirm-dialog.svelte` for accessible destructive action confirmation (delete custom habit, reset to defaults).
  - Segment switch (`Tasks` | `Break Habits`) in the right column of `planning-view.svelte`.
  - Comprehensive unit and Vitest Browser Mode tests.
- **Out of Scope / Anti-Goals**:
  - No rich-text or WYSIWYG editors (strictly lightweight multiline text).
  - No drag-and-drop manual reordering.
  - No remote cloud sync or authentication (strictly offline-first via LocalStorage).
  - No layout shifts in the timer canvas or interruptions to the active focus session.

## Acceptance Criteria

- [x] `BreaksState` supports reactive CRUD mutations (`saveActivity`, `deleteActivity`, `resetToDefaults`) with 100% unit test coverage.
- [x] Presets are protected against modification or deletion in state and UI.
- [x] Catalog provides fluid filtering by category with dynamic counts and clean empty states.
- [x] Custom habit creation and edition forms enforce domain validation rules.
- [x] Destructive actions (deletion and reset to defaults) require explicit confirmation via accessible dialog.
- [x] Planning view smoothly toggles between tasks and break habits in the right lateral column.
- [x] Full quality gates pass: `pnpm check` (0 errors), `pnpm lint` (0 errors), `pnpm test` (unit + browser 100% passing).

## Configuration & Environment

- **TDD Mode**: Enabled (source: project architecture conventions; runner: `pnpm vitest run <file> --project server`)
- **Delivery Strategy**: `ask-on-risk`
- **Delivery Budget**: ~400 authored changed lines per work-unit commit

---

## Task Checklist

- [x] **TASK-1**: Reactive state mutations and repository wiring in `BreaksState` (Issue #51)
  - Route: delegated direct (writer trigger: touches `src/lib/state/breaks.svelte.ts` and `src/lib/state/breaks.test.ts`)
  - Applicable checks: `pnpm test:unit src/lib/state/breaks.test.ts` (23/23 tests passed)
  - Evidence: Commit `e28cae6` (`feat(state): add reactive CRUD mutations to BreaksState (#51)`)

- [x] **TASK-2**: Read-only catalog components and expandable break cards (Issue #52)
  - Route: delegated direct (writer trigger: `break-card.svelte`, `break-catalog.svelte`, and browser tests)
  - Applicable checks: `pnpm test:browser src/lib/components/breaks/` (13/13 tests passed)
  - Evidence: Commit `612190d` (`feat(ui): implement read-only break card and catalog components (#52)`)

- [x] **TASK-3**: Custom habits CRUD dialogs and domain validation (Issue #53)
  - Route: delegated direct (writer trigger: `break-form-dialog.svelte`, `break-confirm-dialog.svelte`, contextual actions, browser tests)
  - Applicable checks: `pnpm test:browser src/lib/components/breaks/` (33/33 tests passed)
  - Evidence: Commit `19cf063` (`feat(ui): add break habit CRUD dialogs and domain validation (#53)`) and Commit `ef78e60` (`refactor(breaks): compose with shadcn-svelte dialog, badge, and form primitives`)

- [x] **TASK-4**: Integrate catalog segment switch in Planning view (Issue #54)
  - Route: delegated direct (writer trigger: `planning-view.svelte`, state wiring, and tests)
  - Applicable checks: `pnpm test:browser src/lib/components/planning/` (28/28 tests passed)
  - Evidence: Commit `df18395` (`feat(planning): integrate break habits catalog segment switch (#54)`)

- [x] **TASK-5**: End-to-end verification, type check, lint & build
  - Route: direct inline (bounded verification check)
  - Applicable checks: `pnpm check` (0 errors), `pnpm lint` (0 errors), `pnpm test` (674/674 passed in 34 files), `pnpm build` (clean SPA build in 13.5s)
  - Evidence: Verified clean on branch `feat/break-activities`
