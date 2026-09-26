# Feature: Interactive Task Pill and Planning View Tab

- **Issue**: #23
- **Branch**: `feat/task-pill-and-planning`
- **Base**: `main`
- **Objective**: Habilitar la pestaña de navegación _Planning_ para listar y organizar tareas, e integrar el _Task Pill_ minimalista en la pantalla del temporizador para fijar o conmutar la tarea activa sin romper el foco.
- **Problem & Motivation**: Pomody requiere una vinculación fluida entre la planificación de tareas y el temporizador en ejecución sin fricción ni formularios pesados, preservando el estado de flujo (Modo Zen) y asegurando persistencia offline local mediante `ITaskRepository`.
- **Scope & Boundaries**:
  - `src/lib/state/tasks.svelte.ts` (Svelte 5 Runes state wrapping `ITaskRepository`)
  - `src/lib/state/navigation.svelte.ts` (Svelte 5 Runes state managing in-page tab views)
  - `src/lib/components/timer/task-pill.svelte` (Task pill UI & popover beneath timer controls)
  - `src/lib/components/planning/planning-view.svelte` (Planning view tab content: backlog, add, toggle, set active)
  - `src/lib/components/layout/header.svelte` & `src/routes/+page.svelte` (In-page tab navigation)
  - Client-first browser tests (`pnpm test:browser`) & unit tests (`pnpm test:unit`)
- **TDD Mode**: Standard Unit & Quality Harness (`pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:browser`)
- **Delivery Strategy**: `single-pr` (Forecast: ~380 LOC across atomic work-unit commits).

## Tasks

- [x] **TASK-01**: Implement reactive task management state store (`tasks.svelte.ts`) with Svelte 5 Runes (`$state`, `$derived`), integrating `LocalStorageTaskRepository` (`ITaskRepository`), managing active task, backlog list, creation, toggle, update title, and reorder.
  - _Files_: `src/lib/state/tasks.svelte.ts`, `src/lib/state/tasks.test.ts`
  - _Route_: Delegated writer (`task-state-writer`)
  - _Verification_: `pnpm test:unit`
  - _Commit_: `30edecb` `feat(state): implement reactive TasksState store with Svelte 5 Runes`

- [x] **TASK-02**: Implement `TaskPill` component under `src/lib/components/timer/task-pill.svelte` and integrate into `timer.svelte`. Support quick-select popover, instant creation with Enter, Escape/click-away for free focus, inline completion checkbox, and Zen Mode opacity reduction when `isRunning`.
  - _Files_: `src/lib/components/timer/task-pill.svelte`, `src/lib/components/timer/timer.svelte`, `src/lib/components/timer/task-pill.svelte.test.ts`
  - _Route_: Delegated writer (`task-pill-writer`)
  - _Verification_: `pnpm test:browser`
  - _Commit_: `1547f4c` `feat(timer): add interactive TaskPill with quick-select popover and Zen mode`
  - _Followup_: `43117db` `refactor(timer): translate TaskPill copy and accessibility labels to English`

- [x] **TASK-03**: Implement `PlanningView` component (`src/lib/components/planning/planning-view.svelte`) and unlock Planning tab in `header.svelte` and `+page.svelte` with accessible WAI-ARIA `tablist` / `tabpanel` semantics and smooth in-page view switching.
  - _Files_: `src/lib/components/planning/planning-view.svelte`, `src/lib/components/layout/header.svelte`, `src/routes/+page.svelte`, `src/lib/components/planning/planning-view.svelte.test.ts`
  - _Route_: Delegated writer (`planning-view-writer`)
  - _Verification_: `pnpm test:browser`
  - _Commit_: `3223f60` `feat(planning): implement PlanningView and in-page tab navigation`

- [x] **TASK-04**: Run global verification suite (`pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:browser`, Impeccable detect), verify zero regressions and complete issue #23 DoD.
  - _Route_: Direct inline
  - _Verification_: `pnpm check && pnpm lint && pnpm test`
  - _Commit_: `docs(odd): complete task tracking and verification for issue #23`

## Progress & Verification Evidence

- Branch: `feat/task-pill-and-planning`
- Base: `main`
- Initial test suite: 13 suites, 281 tests passing across project.
- Verification Results:
  - `pnpm test:unit`: 12 suites, 266 tests passing in sub-second (Node runner).
  - `pnpm test:browser`: 5 suites, 53 tests passing (100% web-first Vitest Browser Mode with Chromium).
  - `pnpm test`: Full suite (17 test files, 319 tests) passing in green.
  - `pnpm check`: 0 errors, 0 warnings (`svelte-check`).
  - `pnpm lint`: Prettier code style and ESLint passing with 0 errors.
  - `pnpm build`: Static SPA build (`build/index.html`) completed cleanly.
  - `impeccable detect`: 0 design defects or accessibility violations across all modified and new UI components.
  - UI Copy: 100% English across all components, labels, and aria attributes.
- Locator: odd/tasks/task-pill-and-planning-view.md
