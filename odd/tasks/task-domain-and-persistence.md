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
  - _Commit_: `d4a7df9` `feat(domain): add FocusTask entity and domain invariant operations`

- [x] **TASK-02**: Define `ITaskRepository` port with async contract, deterministic sorting rules, and isolated purge method.
  - _Files_: `src/lib/domain/ports/task-repository.port.ts`, `src/lib/domain/ports/task-repository.port.test.ts`
  - _Route_: Delegated writer
  - _Verification_: `pnpm test:unit`
  - _Commit_: `d372301` `feat(domain): define ITaskRepository port contract and sorting invariants`

- [x] **TASK-03**: Implement `LocalStorageTaskRepository` with defensive envelope (`pomody:tasks`), corrupt item sanitization, error resilience, and `clearAll()` purge.
  - _Files_: `src/lib/adapters/storage/local-task-repository.ts`, `src/lib/adapters/storage/local-task-repository.test.ts`
  - _Route_: Delegated writer
  - _Verification_: `pnpm test:unit`
  - _Commit_: `72c0b76` `feat(adapters): implement LocalStorageTaskRepository with defensive envelope and purge`

- [x] **TASK-04**: Run global verification suite (`pnpm check`, `pnpm lint`, `pnpm test:unit`), verify zero regressions and complete issue #22 DoD.
  - _Route_: Direct inline
  - _Verification_: `pnpm check && pnpm lint && pnpm test:unit`
  - _Commit_: `811f4df` `docs(odd): complete all tasks and verification for issue #22`

- [x] **TASK-05**: Strengthen `FocusTask` domain entity with parameter validation and secure crypto fallback ([Finding 3](../findings/task-persistence-findings.md#finding-3-incomplete-parameter-validation-in-createfocustask) & [Finding 4](../findings/task-persistence-findings.md#finding-4-missing-secure-context-fallback-for-cryptorandomuuid)).
  - _Files_: `src/lib/domain/tasks/task.entity.ts`, `src/lib/domain/tasks/task.entity.test.ts`
  - _Route_: Delegated writer (`task-domain-writer`)
  - _Verification_: `pnpm test:unit`
  - _Commit_: `1894d0e` `feat(domain): validate FocusTask parameters and provide secure crypto fallback`

- [x] **TASK-06**: Ensure deterministic sorting tie-breaker in `compareFocusTasks` port ([Finding 2](../findings/task-persistence-findings.md#finding-2-non-deterministic-sorting-tie-breaker-in-comparefocustasks)).
  - _Files_: `src/lib/domain/ports/task-repository.port.ts`, `src/lib/domain/ports/task-repository.port.test.ts`
  - _Route_: Delegated writer (`task-port-writer`)
  - _Verification_: `pnpm test:unit`
  - _Commit_: `85b4e34` `feat(domain): add deterministic id tie-breaker to compareFocusTasks port`

- [x] **TASK-07**: Harden `LocalStorageTaskRepository` with safe `getStorage()`, future version preservation, and write failure logging ([Finding 1](../findings/task-persistence-findings.md#finding-1-unhandled-securityerror-in-getstorage-property-getter), [Finding 5](../findings/task-persistence-findings.md#finding-5-unobserved-storage-write-exceptions-in-writetasks), [Finding 6](../findings/task-persistence-findings.md#finding-6-destructive-overwrite-of-newerunrecognized-storage-envelope-versions)).
  - _Files_: `src/lib/adapters/storage/local-task-repository.ts`, `src/lib/adapters/storage/local-task-repository.test.ts`
  - _Route_: Delegated writer (`task-adapter-writer`)
  - _Verification_: `pnpm test:unit`
  - _Commit_: `6202011` `feat(adapters): harden LocalStorageTaskRepository with safe storage access and version protection`

- [x] **TASK-08**: Run global verification suite and sync all documentation and Engram recovery state.
  - _Route_: Direct inline
  - _Verification_: `pnpm check && pnpm lint && pnpm test:unit`
  - _Commit_: `docs(odd): record Judgment Day findings remediation and verification evidence`

## Progress & Verification Evidence

- Branch: `feat/22-task-entities-and-storage`
- Base: `main`
- Initial test suite: 172 passed across 9 test files.
- TASK-01 verified and committed (`d4a7df9`): 23 new unit tests in `src/lib/domain/tasks/task.entity.test.ts` (195 passed across 10 test files).
- TASK-02 verified and committed (`d372301`): 10 new unit tests in `src/lib/domain/ports/task-repository.port.test.ts` (205 passed across 11 test files).
- TASK-03 verified and committed (`72c0b76`): 34 new unit tests in `src/lib/adapters/storage/local-task-repository.test.ts` (239 passed across 12 test files).
- TASK-04 verified (`811f4df`): Full suite passed with 0 TypeScript/SvelteKit check errors (`pnpm check`), clean code style and linting (`pnpm lint`), and 239/239 unit tests passing across 12 test files (`pnpm test:unit`).
- Judgment Day Remediation:
  - TASK-05 verified and committed (`1894d0e`): 15 new unit tests covering parameter validation and RFC 4122 v4 crypto fallback (254 passed across 12 test files).
  - TASK-06 verified and committed (`85b4e34`): 2 new unit tests for deterministic `id` tie-breaker in sorting (256 passed across 12 test files).
  - TASK-07 verified and committed (`6202011`): 3 new unit tests covering safe `getStorage()`, future envelope preservation, and write failure logging (259 passed across 12 test files).
  - TASK-08 verified: Full suite passed with 0 TypeScript errors (`pnpm check`), clean linting (`pnpm lint`), and 259/259 tests passing across 12 test files (`pnpm test:unit`). Detailed findings documented in `odd/findings/task-persistence-findings.md`.
