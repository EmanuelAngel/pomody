# Feature: Task Domain Model, Repository Port and LocalStorage Persistence

- **Objective**: Implement the pure domain model for tasks (`FocusTask`), its abstract repository port (`ITaskRepository`), and the browser LocalStorage persistence adapter (`LocalStorageTaskRepository`) with defensive envelope serialization and isolated purge capability.
- **Problem & Motivation**: Support lightweight focus task tracking and planning (v0.2 milestone) with zero DOM/Svelte dependencies in the domain, resilient offline persistence, and forward compatibility for future SQLite/Tauri migration.
- **Scope & Boundaries**:
  - `src/lib/domain/tasks/` (pure TS domain entities, factory, invariants)
  - `src/lib/domain/ports/` (abstract repository interface and contracts)
  - `src/lib/adapters/storage/` (local storage adapter implementation)
  - Pure unit tests under Node (`pnpm test:unit`)
  - Strictly no UI modifications in this scope.
- **Delivery Strategy**: `single-pr` (forecast ~350 LOC, within the 400-line budget).

## Tasks

- [x] **TASK-01**: Define `FocusTask` entity and pure domain invariant functions (create, toggle, update title, reorder) with 100% unit test coverage.
  - _Files_: `src/lib/domain/tasks/task.entity.ts`, `src/lib/domain/tasks/task.entity.test.ts`
  - _Route_: Delegated writer
  - _Verification_: `pnpm test:unit`
  - _Commit_: `feat(domain): add FocusTask entity and domain invariant operations`

- [ ] **TASK-02**: Define `ITaskRepository` port with async contract, deterministic sorting rules, and isolated purge method.
  - _Files_: `src/lib/domain/ports/task-repository.port.ts`, `src/lib/domain/ports/task-repository.port.test.ts`
  - _Route_: Delegated writer
  - _Verification_: `pnpm test:unit`
  - _Commit_: `feat(domain): define ITaskRepository port contract and sorting invariants`

- [ ] **TASK-03**: Implement `LocalStorageTaskRepository` with defensive envelope (`pomody:tasks`), corrupt item sanitization, error resilience, and `clearAll()` purge.
  - _Files_: `src/lib/adapters/storage/local-task-repository.ts`, `src/lib/adapters/storage/local-task-repository.test.ts`
  - _Route_: Delegated writer
  - _Verification_: `pnpm test:unit`
  - _Commit_: `feat(adapters): implement LocalStorageTaskRepository with defensive envelope and purge`

- [ ] **TASK-04**: Run global verification suite (`pnpm check`, `pnpm lint`, `pnpm test:unit`), verify zero regressions and complete issue #22 DoD.
  - _Route_: Direct inline
  - _Verification_: `pnpm check && pnpm lint && pnpm test:unit`

## Progress & Verification Evidence

- Branch: `feat/22-task-entities-and-storage`
- Base: `main`
- Initial test suite: 172 passed across 9 test files.
- TASK-01 verified: 23 new unit tests in `src/lib/domain/tasks/task.entity.test.ts` (195 passed across 10 test files).
