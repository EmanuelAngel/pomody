# Feature: Session Planning & Timeline Projection (Issue #28)

## Objective

Empower users to configure and preview a structured focus session (by block count or by target end time), fine-tune session-specific durations without altering global settings, explicitly slot tasks from the backlog into focus blocks, and launch the timer with zero friction.

## Problem & Why

Currently, Pomody only supports open-ended focus cycles. Deep work requires deliberate upfront framing and time budgeting. Providing an intuitive timeline projection with forward-only reactivity gives knowledge workers clear visibility into their commitments and estimated completion time without cognitive overload.

## Scope & Boundaries

- **In Scope**:
  - Pure domain contracts and mathematical projection engine in `src/lib/domain/planning/` (`calculateSessionBudgetByBlocks`, `calculateSessionBudgetByEndTime`).
  - Terminal clean-up rule (timeline terminates at final focus block).
  - Residual buffer calculation (`freeMarginSeconds`) in `By End Time` mode with scheduled start time support.
  - 1-to-N task-to-block assignment cardinality.
  - `ISessionPlanRepository` port and `LocalStoragePlanRepository` adapter (`pomody:session-plan`, version 1).
  - Reactive `PlanningState` store (`src/lib/state/planning.svelte.ts`) with Svelte 5 Runes, managing draft vs active plans and lifecycle synchronization with `TimerState`.
  - Rich UI in `src/lib/components/planning/`:
    - Mode toggle (`By Blocks` vs `By End Time`).
    - Inline durations strip with session-specific overrides.
    - 3-Metric summary strip (`Total Focus`, `Total Breaks`, `Estimated Finish`, and `Free Margin` badge).
    - Interactive chronological timeline track with task slotting, popover picker, and unassign action.
    - Quick slotting action from `task-backlog.svelte`.
    - Non-interactive `Smart Revitalization` badge on break blocks (catalog CRUD deferred to Issue #36).
    - Forward-only modifications for active sessions (`In Progress` lock, `Back to Timer`, and `End Plan` CTA).
- **Out of Scope / Anti-Goals**:
  - No mandatory task assignments: `Free Focus` remains a first-class citizen.
  - No embedded break catalog editing forms in the timeline track (isolated in Issue #36).
  - No timer FSM disruption: running blocks maintain elapsed ticks and cannot be mutated retroactively.

## Acceptance Criteria

- [ ] `calculateSessionBudgetByBlocks` and `calculateSessionBudgetByEndTime` correctly compute block sequences terminating on final focus block.
- [ ] End-time budget underflow (< 1 focus block) emits safe empty blocks and residual margin without fractional blocks.
- [ ] Multiple blocks can reference the same task ID without backlog duplication.
- [ ] `LocalStoragePlanRepository` reliably persists and restores active plan with schema versioning.
- [ ] `PlanningState` coordinates draft editing, session launch, block progression on timer events, and forward-only hot edits.
- [ ] Mode switcher toggles between By Blocks and By End Time with immediate reactive recalculation.
- [ ] Timeline track renders discrete focus blocks, breaks with Smart Revitalization badges, and terminal Free Margin.
- [ ] Launch CTA starts session, configures timer for Block 1, assigns initial task to Task Pill, and navigates to Timer.
- [ ] Active session displays lock on running block; modifying upcoming blocks applies forward-only.
- [ ] Completing last focus block displays clear session completion feedback.
- [ ] 100% test coverage for domain projections, repository adapter, state store, and UI components.

## Delivery Strategy

- Strategy: `ask-on-risk`
- Review line budget: ~400 lines per work-unit commit

---

## Task Checklist

- [x] **TASK-1**: Pure domain planning entity, contracts, and mathematical projection engine
  - Route: delegated direct (writer trigger: creates domain contracts, budget calculations, and extensive unit tests)
  - Target files: `src/lib/domain/planning/session-plan.entity.ts`, `src/lib/domain/planning/session-plan.test.ts`, `src/lib/domain/planning/index.ts`
  - Applicable checks: `pnpm test:unit src/lib/domain/planning/session-plan.test.ts` (44/44 passed)
  - Evidence: Commit `2b03552` (feat(domain): add SessionPlan entity, contracts, and budget projection engine)

- [x] **TASK-2**: Repository port and localStorage persistence adapter
  - Route: delegated direct (writer trigger: creates port, storage adapter, and unit tests)
  - Target files: `src/lib/domain/ports/session-plan-repository.port.ts`, `src/lib/adapters/storage/local-session-plan-repository.ts`, `src/lib/adapters/storage/local-session-plan-repository.test.ts`
  - Applicable checks: `pnpm test:unit src/lib/adapters/storage/local-session-plan-repository.test.ts` (39/39 passed)
  - Evidence: Commit `3a9172d` (feat(storage): implement ISessionPlanRepository and LocalStoragePlanRepository)

- [x] **TASK-3**: Reactive `PlanningState` store and timer lifecycle orchestration
  - Route: delegated direct (writer trigger: creates Svelte 5 state class, timer synchronization bridge, and unit tests)
  - Target files: `src/lib/state/planning.svelte.ts`, `src/lib/state/planning.test.ts`, `src/lib/state/index.ts`
  - Applicable checks: `pnpm test:unit src/lib/state/planning.test.ts` (31/31 passed)
  - Evidence: Commit `1069c6a` (feat(state): implement reactive PlanningState store with Svelte 5 Runes)

- [ ] **TASK-4**: Interactive planning timeline, inline controls, and task backlog slotting
  - Route: delegated direct (writer trigger: updates multiple Svelte components, bits-ui integration, styling)
  - Target files: `src/lib/components/planning/planning-timeline.svelte`, `src/lib/components/planning/planning-view.svelte`, `src/lib/components/planning/task-backlog.svelte`, `src/lib/components/planning/task-item.svelte`, `src/lib/components/planning/planning-view.svelte.test.ts`
  - Applicable checks: `pnpm check`, `pnpm test:unit`, `pnpm test:browser`
  - Evidence: Pending

- [ ] **TASK-5**: End-to-end verification, type check, lint & build
  - Route: direct inline (bounded verification check)
  - Target files: Full repository verification
  - Applicable checks: `pnpm check` (0 errors), `pnpm lint` (0 errors), `pnpm test` (all tests passed), `pnpm build` (clean build)
  - Evidence: Pending
