# Feature: Automatic Mindful Break Revitalization (Issue #25)

## Objective

Present actionable, restorative micro-habits (physical stretching, hydration, breathwork, eye relief) with inline step-by-step micro-guides when the timer enters a break mode (`shortBreak` or `longBreak`), replacing the task pill during breaks without layout shifts.

## Problem & Why

During intensive focus sessions, transitioning into breaks leaves users vulnerable to cognitive fatigue and digital distraction traps (social media, algorithmic feeds). Introducing concise, offline micro-guides right inside the timer canvas protects recovery while requiring zero mandatory interactions.

## Scope & Boundaries

- **In Scope**:
  - `guide?: string` multiline field in `BreakActivity` domain model and documentation sync.
  - Curated initial seed of 10 preset activities with 2-3 step micro-guides.
  - Pure domain selection logic (`pickNextBreakActivity`) preventing immediate repeats.
  - `IBreakActivityRepository` port and `LocalStorageBreakActivityRepository` adapter (`pomody:break-activities`, version 1).
  - `revitalizationEnabled: boolean` in `UserSettings` (`pomody:settings`) with switch in `settings-drawer.svelte`.
  - `BreaksState` in `src/lib/state/breaks.svelte.ts` with Svelte 5 Runes.
  - `break-revitalization.svelte` component with `@lucide/svelte` category icons, shuffle trigger, and floating `bits-ui` Popover micro-guide.
  - Contextual morphing slot in `timer.svelte` (150ms cross-fade).
- **Out of Scope / Anti-Goals**:
  - No embedded video players or web view iframes (offline-first, <30 MB RAM target).
  - No CRUD modals or backlog management in the timer view (deferred to Issue #28).

## Acceptance Criteria

- [x] Activates smoothly only during `shortBreak` and `longBreak` modes.
- [x] Displays category badge/icon, activity title, shuffle button, and guide trigger.
- [x] Shuffle action rotates to a different suggestion with tactile feedback.
- [x] Micro-guide opens in a floating `bits-ui` Popover without shifting timer layout.
- [x] Setting toggle in `settings-drawer.svelte` enables or disables the feature (rendering blank space when disabled).
- [x] Suggestion remains stable during the break block across tab switches and UI navigation.
- [x] 100% test coverage for domain entities, repository adapter, state store, and components.

## Delivery Strategy

- Strategy: `ask-on-risk`
- Review line budget: ~400 lines per work-unit commit

---

## Task Checklist

- [x] **TASK-1**: Domain entity, presets seed, selection logic & docs sync
  - Route: delegated direct (writer trigger: touches domain, tests, and documentation)
  - Applicable checks: `pnpm test:unit src/lib/domain/breaks/break-activity.entity.test.ts` (41/41 passed)
  - Evidence: Commit `f9d91a5` (feat(domain): add BreakActivity entity, presets seed, and selection logic)

- [x] **TASK-2**: Repository port and localStorage persistence adapter
  - Route: delegated direct (writer trigger: touches port, adapter, and test files)
  - Applicable checks: `pnpm test:unit src/lib/domain/ports/break-activity-repository.port.test.ts src/lib/adapters/storage/local-break-activity-repository.test.ts` (45/45 passed)
  - Evidence: Commit `70bf687` (feat(storage): implement IBreakActivityRepository and LocalStorageBreakActivityRepository)

- [x] **TASK-3**: User settings extension and settings drawer toggle
  - Route: delegated direct (writer trigger: touches settings port, adapter, drawer, and tests)
  - Applicable checks: `pnpm test:unit src/lib/adapters/storage/local-settings-storage.test.ts` (passed), `pnpm test:browser` (65/65 passed)
  - Evidence: Commit `d961249` (feat(settings): add revitalizationEnabled preference and drawer toggle)

- [x] **TASK-4**: Reactive `BreaksState` store
  - Route: delegated direct (writer trigger: state store with runes, lifecycle, and tests)
  - Applicable checks: `pnpm test:unit src/lib/state/breaks.test.ts` (12/12 passed)
  - Evidence: Commit `4ea9c6d` (feat(state): implement reactive BreaksState store with Svelte 5 Runes)

- [x] **TASK-5**: UI component `break-revitalization.svelte` and `timer.svelte` integration
  - Route: delegated direct (writer trigger: Svelte components, bits-ui popover, styling)
  - Applicable checks: `pnpm check`, `pnpm test:unit`, `pnpm test:browser` (76/76 passed)
  - Evidence: Commit `b22b6ef` (feat(ui): add BreakRevitalization component and timer cross-fade integration)

- [x] **TASK-6**: End-to-end verification, type check, lint & build
  - Route: direct inline (bounded verification check)
  - Applicable checks: `pnpm check` (0 errors), `pnpm lint` (0 errors), `pnpm test` (447/447 passed in 23 files), `pnpm build` (clean SPA build)
  - Evidence: Verified on branch `feat/25-break-revitalization`
