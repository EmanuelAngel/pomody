# timer-persistence

Objective: persist the timer execution state so a browser reload or a desktop restart restores the running block, the active session plan, and the active task. Branch `feat/timer-persistence`, delivery `chained-pr` (3 slices), runner `pnpm vitest run <path>` / `pnpm test`.

Spec: `docs/features/timer-persistence/spec.md` · Decisions: `docs/features/timer-persistence/decisions.md` · Issue: #155 (absorbs #149).

## Specs

- **S1** New `pomody:timer-state` key with a versioned envelope `{ version: 1, snapshot }`. It never touches `pomody:session-plan`, which stays at v1.
- **S2** New domain port `ITimerStateRepository` (`load`, `save`, `clear`) plus `LocalStorageTimerStateRepository` over the `Storage` interface, falling back to `InMemoryStorage` in SSR/Node.
- **S3** Snapshot fields: `planId: string | null`, `blockIndex: number | null`, `state`, `mode`, `durationMs`, `currentRound`, `totalRoundsCompleted`, `endsAt?` (running only), `remainingMs?` (idle/paused/completed), `savedAt`.
- **S4** Writes happen only on transitions (start, pause, resume, skip, reset, resetToInitial, completion, restore). Zero writes per tick.
- **S5** Restore of `running`: `remainingMs = endsAt - now`. If `0 < remaining <= durationMs` the timer resumes automatically. If `remaining <= 0`, `remaining > durationMs`, or any field is invalid, the snapshot is discarded.
- **S6** A discarded or missing snapshot with an active plan anchors the timer to `idle` at the plan's active block `mode` and frozen `durationSeconds`. The plan keeps that block `in_progress`; no skip, no session end.
- **S7** Restore of `paused` keeps its exact `remainingMs` and stays paused. Restore of `idle` keeps its mode and full duration. Restore of `completed` keeps `remainingMs = 0`.
- **S8** Validation against the plan: `running`/`paused`/`idle` must match `activeBlockIndex`; `completed` must match `activeBlockIndex - 1`; both require the same `mode` and `durationMs`. Any mismatch is a silent reset (console trace, snapshot cleared, anchor as S6).
- **S9** A snapshot with `planId = null` restores only when no active plan exists (free-running timer). A snapshot bound to a plan that no longer exists is discarded.
- **S10** Bootstrap runs before the app shell renders (`+layout.svelte` gate): load plan, apply the frozen session config, resolve the snapshot, adopt it into the FSM, then derive the active task from the active focus block.
- **S11** `planningState.load()` is idempotent: opening the Planning tab after bootstrap never re-reads and re-applies the plan.
- **S12** `endSession()` resets the FSM, clears the plan, drops the plan binding and removes the timer snapshot, so a reload starts clean.
- **S13** The restored FSM config is the plan's frozen `sessionConfig`, applied without writing `pomody:settings`; a reload never reverts user settings.
- **S14** Two open web tabs are last-write-wins. The limitation is documented, not synchronized.

## Tasks

- **T1** Domain restore contract + port + adapter (`timer-snapshot.entity.ts`, `timer-state-repository.port.ts`, `local-timer-state-repository.ts`, `TimerFSM.adopt`). Specs S1-S5, S7-S9. Route inline. PR #170. Commit b1e32e8.
- **T2** Wiring: `TimerState` persistence + restore, `PlanningState` binding/ordering/idempotency/endSession, bootstrap module and `+layout` gate, active task derivation. Specs S4, S6, S10-S13. Route inline. PR #171. Commit 971543f.
- **T3** E2E reload matrix, docs (`spec.md`, `decisions.md`, `architecture.md` §4.2/§4.3/§4.5), issue #149 absorbed. Specs S14 and the S1-S13 acceptance matrix. Route inline. PR #172. Commit 7e9139d. Absorbs #149.

## Log

- **L1** (user, verbatim) `Sí, trabaja en un worktree. Avisame cuando la/s PR/s estén listas para revisar.`
- **L2** Grilling rounds 1-5 settled: wall-clock with remaining-based threshold; whole-session restore at bootstrap; silent reset on invalid data; #149 absorbed; snapshot with absolute `endsAt` written only on transitions; expired block keeps the plan block `in_progress`; auto-resume; `completed` survives reload; FSM snapshot validates against the plan; dedicated port and key; single-tab last-write-wins; active task derived from the plan; silent reset anchors to the active block; cycle drift between FSM and plan is out of scope with a new issue; explicit `blockIndex`; 4 e2e scenarios; 3 chained PRs.
- **L3** Evidence: `docs/architecture.md` §4.2 claims `Δt = targetEndTime - Date.now()` but `TimerFSM.tick` subtracts ticker deltas; §4.3 claims IndexedDB while every adapter uses Web Storage. Both corrected in T3.
- **L4** Scope guard: `roundsBeforeLongBreak` changed mid-session can desynchronize `TimerFSM.advanceMode` from the frozen plan. #155 validates and resets; the underlying duplication is a separate issue.

- **L5** Evidence (slice 1): `pnpm exec vitest run src/lib/domain/timer src/lib/adapters/storage/local-timer-state-repository.test.ts --project server` → 140 passed. `pnpm check` clean.
- **L6** Evidence (slice 2): `pnpm test:unit` → 1083 passed; `pnpm check` 0 errors; `pnpm lint` clean. `planning.load()` idempotency verified; plan-before-snapshot order asserted with a write log.
- **L7** Evidence (slice 3): `pnpm test` → 1339 passed (87 files); `pnpm test:e2e` → 8 passed, including the 3 new reload journeys; `pnpm check` and `pnpm lint` clean.
- **L8** Follow-up issue #173 opened for the FSM/plan cycle duplication (out of scope per L4).
- **L9** Delivery: PR #170 (base main), #171 (base #170 branch), #172 (base #171 branch, closes #149).
