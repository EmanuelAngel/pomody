# Feature: Test Kit Core & Testing Infrastructure

- **Branch**: `feat/test-kit-core`
- **Status**: Completed
- **Delivery Strategy**: `single-pr`
- **TDD Mode**: Standard Unit & Contract Tests (`pnpm test:unit`)
- **Forecast Changed Lines**: ~350 LOC

## Objective

Create a centralized, robust in-memory Test Kit (`src/testing/`) accessible via the path alias `$tests/`. This provides production-grade Fakes for all domain ports and reusable fixtures, eliminating the duplicated, brittle mock classes scattered across the codebase without touching UI strings or production runtime bundles.

## Architecture Boundaries (Hexagonal Architecture)

- **Testing Layer (`src/testing/`)**:
  - `src/testing/fakes/`: Stateful in-memory fakes strictly fulfilling domain port contracts:
    - `fake-task-repository.ts` -> implements `ITaskRepository`
    - `fake-break-activity-repository.ts` -> implements `IBreakActivityRepository`
    - `fake-session-plan-repository.ts` -> implements `ISessionPlanRepository`
    - `fake-daily-stats-repository.ts` -> implements `IDailyStatsRepository`
    - `fake-settings-storage.ts` -> implements `ISettingsStorage`
    - `fake-ticker.ts` -> implements `ITimerTicker`
    - `fake-audio-notifier.ts` -> implements `IAudioNotifier`
  - `src/testing/fixtures/`: Reusable entity and value object builders (`task.fixture.ts`, `break-activity.fixture.ts`).
  - Strict Ban on Barrel Files (`index.ts`): All test imports must point directly to concrete files (e.g. `import { FakeTaskRepository } from '$tests/fakes/fake-task-repository'`).
- **Configuration Layer**:
  - `tsconfig.json`: Add `$tests/*` path alias mapping to `src/testing/*`.
  - `vite.config.ts`: Add `$tests` resolve alias for Vite and Vitest runners.

## Implementation Tasks

### [x] TASK-1: Configure path alias `$tests/`

- **Route**: direct inline
- **Target Files**:
  - `svelte.config.js`
  - `vite.config.ts`
- **Acceptance Criteria**:
  - TypeScript recognizes imports from `$tests/...`.
  - Vite and Vitest resolve `$tests/...` correctly in both server and client test environments.
- **Evidence**: Verified with `pnpm check` (0 errors) and `pnpm vitest run src/testing/smoke.test.ts` (1 passed).

### [x] TASK-2: Implement In-Memory Repository Fakes & Contract Tests

- **Route**: delegated direct
- **Target Files**:
  - `src/testing/fakes/fake-task-repository.ts`
  - `src/testing/fakes/fake-break-activity-repository.ts`
  - `src/testing/fakes/fake-session-plan-repository.ts`
  - `src/testing/fakes/fake-daily-stats-repository.ts`
  - `src/testing/fakes/fake-settings-storage.ts`
  - `src/testing/fakes/repository-fakes.test.ts`
- **Acceptance Criteria**:
  - Each fake implements its corresponding domain port interface completely.
  - Stateful operations (CRUD, filtering, sorting, defaults reset) behave deterministically.
  - Contract tests verify expected behavioral parity with production storage adapters.
- **Evidence**: 29/29 tests passing in `src/testing/fakes/repository-fakes.test.ts`. Full suite 598 unit tests passing. `pnpm check` and `pnpm lint` green.

### [x] TASK-3: Implement Engine & Device Fakes & Tests

- **Route**: delegated direct
- **Target Files**:
  - `src/testing/fakes/fake-ticker.ts`
  - `src/testing/fakes/fake-audio-notifier.ts`
  - `src/testing/fakes/engine-fakes.test.ts`
- **Acceptance Criteria**:
  - `FakeTicker` allows deterministic manual time advancement (`advanceByMs`, `step`) and tracks tick listeners.
  - `FakeAudioNotifier` records played tones/alerts without interacting with Web Audio API.
- **Evidence**: 22/22 unit tests passing in `src/testing/fakes/engine-fakes.test.ts`. Full suite 620 unit tests passing. `pnpm check` and `pnpm lint` green.

### [x] TASK-4: Create Shared Entity Fixtures & Suite Verification

- **Route**: delegated direct
- **Target Files**:
  - `src/testing/fixtures/task.fixture.ts`
  - `src/testing/fixtures/break-activity.fixture.ts`
  - `src/testing/fixtures/session-plan.fixture.ts`
  - `src/testing/fixtures/fixtures.test.ts`
- **Acceptance Criteria**:
  - Factory functions produce valid domain entities with sensible defaults and optional overrides.
  - Full suite check: `pnpm check`, `pnpm lint`, `pnpm test:unit` pass cleanly.
- **Evidence**: 14/14 tests passing in `src/testing/fixtures/fixtures.test.ts`. Full suite 634 unit tests passing. `pnpm check` (0 errors, 0 warnings) and `pnpm lint` green.
