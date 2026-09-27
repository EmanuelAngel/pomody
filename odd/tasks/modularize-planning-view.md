# Feature: Modularize Planning View Component

- **Branch**: `feat/task-pill-and-planning`
- **Base**: `main`
- **Objective**: Refactorizar y modularizar `planning-view.svelte` (~565 líneas) separando responsabilidades en componentes cohesivos y testeables (`task-item.svelte`, `planning-timeline.svelte`, `task-backlog.svelte`, y el coordinador `planning-view.svelte`).
- **Problem & Motivation**: `planning-view.svelte` acumuló múltiples responsabilidades: layout macro, skeleton interactivo del timeline, gestión de captura rápida, estado efímero de edición inline y renderizado de tareas pendientes y completadas. Modularizarlo reduce la complejidad ciclomática, mejora el aislamiento y facilita la evolución del dominio en v0.2.
- **Scope & Boundaries**:
  - `src/lib/components/planning/task-item.svelte` (Presentacional puro con inline edit y callbacks)
  - `src/lib/components/planning/planning-timeline.svelte` (Macro timeline y skeleton interactivo)
  - `src/lib/components/planning/task-backlog.svelte` (Contenedor micro backlog y captura rápida)
  - `src/lib/components/planning/planning-view.svelte` (Coordinador y shell responsive)
  - `src/lib/components/planning/task-item.svelte.test.ts` (Tests de interacción y edición inline)
  - `src/lib/components/planning/planning-view.svelte.test.ts` (Suite de integración existente, 100% verde)
- **TDD Mode**: Standard Unit & Quality Harness (`pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:browser`)
- **Delivery Strategy**: `single-pr` (Forecast: ~320 LOC across atomic work-unit commits).

## Tasks

- [x] **TASK-01**: Implement `task-item.svelte` presentational component and its focused browser tests `task-item.svelte.test.ts`. Handles inline title editing lifecycle (Enter, Escape, blur), emits typed callbacks (`ontoggle`, `ontogglepin`, `ontitlechange`, `ondelete`), and adapts appearance for completed tasks.
  - _Files_: `src/lib/components/planning/task-item.svelte`, `src/lib/components/planning/task-item.svelte.test.ts`
  - _Route_: Delegated writer (`task-item-writer`)
  - _Verification_: `pnpm test:browser`
  - _Commit_: `e951f93` `feat(planning): implement task-item presentational component with inline editing`

- [x] **TASK-02**: Extract `planning-timeline.svelte` macro timeline column. Encapsulates session planning skeleton state and metrics, receiving `activeTaskTitle?: string` without direct coupling to task store.
  - _Files_: `src/lib/components/planning/planning-timeline.svelte`
  - _Route_: Delegated writer (`planning-timeline-writer`)
  - _Verification_: `pnpm check && pnpm lint`
  - _Commit_: `48fbdad` `refactor(planning): extract planning-timeline component for macro session structure`

- [x] **TASK-03**: Extract `task-backlog.svelte` micro backlog container. Manages quick capture input, renders pending tasks and collapsible completed tasks accordion using `task-item.svelte`.
  - _Files_: `src/lib/components/planning/task-backlog.svelte`
  - _Route_: Delegated writer (`task-backlog-writer`)
  - _Verification_: `pnpm check && pnpm lint`
  - _Commit_: `bf4283a` `refactor(planning): extract task-backlog container component`

- [x] **TASK-04**: Refactor `planning-view.svelte` as a lean coordinator shell (~60 LOC). Wire `planning-timeline` and `task-backlog` in the 2-column responsive layout, and run complete test suite ensuring 100% green without regressions.
  - _Files_: `src/lib/components/planning/planning-view.svelte`, `src/lib/components/planning/planning-view.svelte.test.ts`
  - _Route_: Delegated writer (`planning-view-writer`)
  - _Verification_: `pnpm check && pnpm lint && pnpm test`
  - _Commit_: `a645f2a` `refactor(planning): compose planning-view from modular components and verify zero regressions`

## Progress & Verification Evidence

- Branch: `feat/task-pill-and-planning`
- Base: `main`
- Initial test suite: 17 suites, 319 tests passing.
- Final test suite: 18 suites, 327 tests passing (100% green).
- Verification Results:
  - `pnpm test:browser`: 6 suites, 61 tests passing (including 8 new unit tests in `task-item.svelte.test.ts` and 11 integration tests in `planning-view.svelte.test.ts`).
  - `pnpm test:unit`: 12 suites, 266 tests passing in sub-second.
  - `pnpm test`: Full suite (18 test files, 327 tests) passing in green.
  - `pnpm check`: 0 errors, 0 warnings (`svelte-check`).
  - `pnpm lint`: Prettier and ESLint passing cleanly.
  - Code reduction: `planning-view.svelte` reduced from 565 LOC to 63 LOC (-88.8%).
- Locator: odd/tasks/modularize-planning-view.md
