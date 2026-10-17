# Feature: Lightweight Distraction Detector (Epic #122, Milestone 5 P3)

Objective: implement the declared, opt-in distraction detector (pure TS domain + ports, local persistence, Windows native bridge, "Distractions" view, OS notification with three actions) across five slices.
Branch: `feat/distraction-detector`. Delivery strategy: `ask-on-risk` (default), one work-unit commit per slice. Test runner: Vitest (`server` project for domain/state/storage, `client` for components).
Design source of truth: `docs/features/distraction-detector/spec.md` and `decisions.md` (committed in `7641d1f`). Not re-derived.

## Specs

S1 (#123, slice 5.1) `DistractionRule` entity in `src/lib/domain/distraction/distraction-rule.entity.ts` with fields `id`, `exe` (normalized executable: lowercase, no path, no duplicated extension — `chrome`, `steam`), optional `titlePattern` (case-insensitive substring; absent = whole application), `createdAt`.

S2 (#123, slice 5.1) `normalizeExe(rawExecutablePath: string): string` lowercases, drops any path prefix, and drops the `.exe` extension.

S3 (#123, slice 5.1) `matchesRule(rule, observation): boolean` in this order: (1) `rule.exe === normalizeExe(observation.exe)`; (2) absent `titlePattern` matches any window of that app; (3) present pattern compares as case-insensitive substring against `observation.title`; (4) empty or whitespace-only pattern normalizes to absent (whole app), never to a never-matching empty string.

S4 (#123, slice 5.1) `shouldNotify` and `DEFAULT_NOTIFY_POLICY` in `src/lib/domain/distraction/distraction-policy.ts`: pure function receiving `{ ruleId, observation, firedThisBlock, now, policy? }`, with `now` injected (never `Date.now()` inside). `DEFAULT_NOTIFY_POLICY = { intervalMinutes: 5, idleGuardSeconds: 300 }`.

S5 (#123, slice 5.1) Policy behavior: no notice when `observation.idleSeconds >= policy.idleGuardSeconds`; at most one notice per rule per `intervalMinutes`; independent rules do not affect each other; when no notice was fired for the rule, notify.

S6 (#123, slice 5.1) Ports: `IDistractionMonitor` (`OpenWindow`, `WindowObservation`, `isSupported`, `getForegroundWindow`, `listOpenWindows`) in `src/lib/domain/ports/distraction-monitor.port.ts`; `IDistractionRuleRepository` and `IDistractionWhitelistRepository` (`getAll`, `save`, `delete`, `clearAll`; `getSilenced(dateKey)`, `silence(ruleId, dateKey)`, `unsilence(ruleId, dateKey)` (added in slice 5.2, see `decisions.md` §3.1), `clearAll`) in `src/lib/domain/ports/distraction-repository.port.ts`.

S7 (#123, slice 5.1) Zero imports of Svelte, DOM, or Tauri inside `src/lib/domain/`. No barrel files. `pnpm check` and `pnpm test:unit` pass with no warnings.

S8 (#124, slice 5.2) Local adapters `local-distraction-rule-repository.ts` and `local-distraction-whitelist-repository.ts` following the `local-break-activity-repository.ts` pattern (versioned envelope + validating fallback), with `pomody:distraction-rules` and `pomody:distraction-whitelist` keys and lazy purge of a stale `silencedUntil`.

S9 (#125, slice 5.3) Windows native bridge: `active_window` and `open_windows` Tauri commands in `src-tauri/src/lib.rs`, `TauriDistractionMonitor`, `NoopDistractionMonitor` (`isSupported = false`), platform selector; `Cargo.lock` measured with `cargo add` on a disposable copy first (Rule 8). Its acceptance criteria, quoted verbatim from issue #125:

S9.1 "**Primer paso, antes de escribir código**: medición de la regla 8 con `cargo add` sobre una copia desechable, documentada. Si la familia Tauri se mueve, se para y se reporta."

S9.2 "`windows-sys` agregado como dependencia directa con la lista de features mínima confirmada en la medición."

S9.3 "`active_window()` y `open_windows()` registrados en el `invoke_handler` de `src-tauri/src/lib.rs`."

S9.4 "Los comandos descartan la ventana propia de Pomody, las ventanas sin título y las invisibles; y devuelven `idle_seconds` vía `GetLastInputInfo`."

S9.5 "Procesos elevados ilegibles se omiten sin romper la enumeración."

S9.6 "`TauriDistractionMonitor` y `NoopDistractionMonitor` en `src/lib/adapters/window/`, con el selector de plataforma en el composition root."

S9.7 "En Web el adaptador Noop devuelve `null` y `[]` sin lanzar, y nada del build se rompe."

S9.8 "`desktop-ci.yml` verde. **Nunca** se corre `pnpm tauri:build` localmente." and "`pnpm check` pasa sin errores ni advertencias". Out of scope, also verbatim: "NO introducir dependencias externas sin validación previa.", "NO `cargo update`, NO `cargo update -p`, NO `cargo generate-lockfile` y NO borrar `Cargo.lock`.", "NO importar `@tauri-apps/*` fuera de `src/lib/adapters/`.", "NO notificación, NO UI y NO sondeo: son los slices 5.4 y 5.5."

S10 (#126, slice 5.4) "Distractions" third navigation tab, `distraction-view.svelte` (picker + manual fields + rule list + daily-silence list + empty state), global switch in `settings-drawer.svelte` (off by default), i18n keys of spec §9, `client` tests.

S11 (#127, slice 5.5) `tauri-plugin-notification`, `notification:default` capability, action-type registration, `onAction`, `distractionState.svelte.ts` (polling + evaluation), documented toast-button degradation.

## Tasks

- [x] T1 / #123 — Pure domain and ports (entity, matching, cadence policy, three ports + `server` tests) · S1-S7 · route: inline · commit `f150fa2` (squash of `02d24b6`, PR #128)
- [x] T2 / #124 — Local rule/whitelist persistence adapters, fakes, `distractionDetectorEnabled` in settings, and tests · S8 · route: inline · commit `feat(distraction): persist rules, daily silences and the detector switch`
- [ ] T3 / #125 — Native Windows bridge, monitor adapters and platform selector · S9.1-S9.7 delivered and verified locally, S9.8 (`desktop-ci.yml` verde) pending on the pull request · route: inline · commit `feat(desktop): add the native window bridge for the distraction detector (#125)` (short hash backfilled with slice 5.4's document edit) · evidence: L13 (Rule 8 measurement) and L14 (implementation, tests, gates)
- [ ] T4 / #126 — "Distractions" view, picker, global switch and i18n · S10 · route: inline
- [ ] T5 / #127 — OS notification with three actions and poll/evaluate state loop · S11 · route: inline

## Log

L1 (2026-10-16, user request, verbatim):

> Repo Pomody (C:\Users\Usuario\dev\pomody). Sesión de IMPLEMENTACIÓN del detector de dispersión.
> Flujo: ODD. NO uses la pipeline de openspec/ ni las skills sdd-*: esta feature no va por ahí.
>
> El diseño está cerrado y commiteado en main (7641d1f). No se re-deriva: lo que no está en
> estas páginas ya se decidió, y lo descartado está descartado con motivo.
>
> Leer antes de tocar nada:
>
> - docs/features/distraction-detector/spec.md — contratos, slices, DoD y verificación manual (§13)
> - docs/features/distraction-detector/decisions.md — el por qué, y las 15 alternativas descartadas
> - La épica #122 y el issue del slice que vas a implementar
>
> Slices, uno por issue, en este orden:
> #123 dominio puro y puertos → #124 persistencia → #125 puente nativo Windows →
> #126 vista + picker + switch → #127 notificación + sondeo.
> Arrancá por #123. Un slice = un work unit = un commit convencional con sus tests adentro.
>
> Antes de escribir código: creá odd/tasks/distraction-detector.md con una línea por slice
> (issue, objetivo, estado) y decímelo en una línea.
>
> Reglas del repo: AGENTS.md. No las repito acá.
>
> Cerrá cada slice corriendo su gate de verificación y reportando el comando exacto con el
> resultado observado. Si algo del spec te resulta ambiguo, preguntá UNA sola cosa y esperá.
>
> Primer entregable: #123 — entidad DistractionRule, normalizeExe, matchesRule, shouldNotify
> y los tres puertos, con sus tests en el proyecto server.

L2 (2026-10-16) Read spec.md, decisions.md and issue #123. Task classified small: pure TypeScript, no Rust, no native surface, no high-risk item (new public modules, nothing changed that others already consume). Implementation runs inline.

L3 (2026-10-16) Assumption pinned in tests: the idle guard blocks when `idleSeconds >= idleGuardSeconds` (spec §3.4 "no input in these seconds"; DoD "sin input por más de idleGuardSeconds"). The two phrasings differ only at the exact boundary (`idleSeconds === idleGuardSeconds`); the stricter reading was chosen so the chair-empty case never fires. The interval boundary is inclusive (`now - firedAt >= intervalMinutes`) because the policy text says "minimum minutes between two notices".

L4 (2026-10-16) T1 red→green: added `distraction-rule.entity.test.ts` and `distraction-policy.test.ts` first (observed RED), then the entity, the policy and the three ports (GREEN). Port contract tests use test-local stubs; the real fakes and Noop adapter arrive with slices 5.2/5.3 (spec §10), so they are not duplicated here.

L5 (2026-10-16) T1 gate on the committed state: `pnpm test:unit` → 43 files / 735 tests passed. `pnpm check` → 0 errors, 0 warnings. `pnpm lint` → Prettier clean + ESLint clean (exit 0). Focused run: `pnpm test:unit src/lib/domain/distraction src/lib/domain/ports/distraction-*.port.test.ts` → 4 files / 33 tests passed. The slice is one commit; its short hash is backfilled into this line with the next slice's document edit, as in `break-revitalization.md`.

L6 (2026-10-16) T1 merged as PR #128 via **squash**, so the work-unit commit `02d24b6` became `f150fa2` in `main`. Repo PR convention confirmed against the real repo, not the generic skill: Spanish `pull_request_template.md`, labels are `enhancement`/`bug`/`documentation` (there is no `status:approved` or `type:*`), and the `ci.yml` bloat guard is skipped for PRs authored by the repository owner. Remote branch is deleted by GitHub on merge; local deletion needs `-D` after squash, and only after `git diff main <branch>` comes back empty.

L7 (2026-10-16) T2 / slice 5.2 (#124) scope read from the issue: rule repository, whitelist repository, `distractionDetectorEnabled` added to the existing settings port and adapter, and fakes. Tests written first (RED: modules not found), then the adapters and fakes (GREEN). Deliberate difference from `local-break-activity-repository.ts`: **an empty rules list is a valid state, never corruption**, because there is no seed catalogue here — a rule exists only because the user created it. The whitelist adapter keeps a single day in the envelope (`silencedUntil` + `ruleIds`) and purges lazily on read when the day changed; no timers, no periodic writes. The adapter never reads the clock: the caller passes the local `YYYY-MM-DD`.

L8 (2026-10-16) Observations recorded for later slices, not acted on now:

- **Port gap for 5.4** — RESOLVED in L10: §6.4 promises a per-rule release, but `IDistractionWhitelistRepository` (§3.2, frozen in 5.1) exposes only `silence`, `getSilenced` and `clearAll`. Closed in `decisions.md` §3.1 as an added `unsilence(ruleId, dateKey)` and implemented in the same commit as L10.
- **"Nunca" had no permanent home** — RESOLVED in L10: the §7 key table defines no permanent whitelist and the existing one is day-scoped and self-purging, so "Nunca" is `IDistractionRuleRepository.delete(ruleId)`. Recorded in `decisions.md` §3.1; needs no new code, because `delete` already existed.
- The whitelist fake mirrors the adapter's lazy purge (reading on a different day drops the list) so state tests cannot rely on behavior the adapter does not have.
- `FakeSettingsStorage` needed no change: it spreads `DEFAULT_USER_SETTINGS`, so the new field flows through. Its own tests are unaffected.

L9 (2026-10-16) T2 gate on the working tree: `pnpm test:unit` → 47 files / **807 tests passed** (focused run over the two adapter tests and the two fake tests: 4 files / 69 tests passed). `pnpm check` → 0 errors, 0 warnings. `pnpm lint` → exit 0. `pnpm test:browser` → 21 files / 213 tests passed (run because the slice touches the shared `settings-storage` port, even though it adds no client code). Legacy-envelope coverage pins the unchanged settings fields, so an envelope written before this slice still loads with the detector off.

L10 (2026-10-16) Both design gaps closed on user instruction ("dejalas cerradas"), docs and code together. `unsilence(ruleId, dateKey): Promise<void>` added to `IDistractionWhitelistRepository` and implemented in `LocalStorageDistractionWhitelistRepository`: drops the id, removes the key once the day's last silence is lifted, is a no-op for a rule that was not silenced / for a different day / on invalid input, and never purges because the read path owns the purge. The fake implements it and tracks `unsilenceCalls`. `spec.md` §3.2 and §5, and `decisions.md` §3 (amended row) plus the new §3.1, updated so documents and code agree; the §7 key table is the documented reason "Nunca" is a rule deletion instead of a fourth storage key. Red then green: the new tests failed with `repository.unsilence is not a function` before the implementation. `pnpm check` also caught the stale `StubWhitelistRepository` in `distraction-repository.port.test.ts` — the 5.1 port contract test — and it was extended with an `unsilence` assertion: exactly the kind of consumer the contract change reaches. Gate after: `pnpm test:unit` → 47 files / 815 tests passed; `pnpm check` → 0 errors, 0 warnings; `pnpm lint` → exit 0; `pnpm test:browser` → 21 files / 213 tests passed.

L11 (2026-10-16) Judgment Day round 1 over the whole branch (`main...b87e2cc`, diff sha256 `95b46c07cbc68a97d47fea0fdea08a54084a33706b39de5ab92db562df7c3982`, two blind judges) returned APPROVED with no CRITICAL row: two findings confirmed by both judges, two suspect, zero contradictions. On user instruction ("hacé el fix del hallazgo compartido #1") only the shared destructive-read finding was fixed: `getSilenced(dateKey)` now normalizes its argument exactly like the write path — a non-string or blank key returns an empty list **without touching storage**, and the stored day is compared against the trimmed key — so a read can no longer purge the day it was asked about. Scope kept to that one method; `silence`/`unsilence` already trimmed. The stored-side value is left untouched on purpose: it is only ever written trimmed by this adapter, so normalizing it too would change the behavior of the sibling readers without a finding authorizing it. Red then green: the two new tests failed first (`getSilenced(' 2026-10-16 ')` returned `[]`, and `getSilenced('')` left the key `null` because the read had destroyed the day), then 31/31 passed once the guard landed; the pre-existing purge-on-day-change coverage kept passing unchanged. Not acted on, left for the user's PR review: the fakes still do not mirror the adapter's normalization (the other confirmed finding), S6 above still omits `unsilence` (judge B), and `delete()` on an empty rules store still writes an empty envelope (judge A). Independent differential verification (baseline `b87e2cc` vs candidate, in scratch copies) found **no blockers**: the padded-key read destroyed the day at baseline and returns it intact at the candidate, a genuinely different day is still purged at both, every invalid key leaves the stored envelope byte-identical, and the port surface is unchanged. That verified behavior is pinned in the module test, including the non-string keys and the byte-identical invariant. Gate on the changed working tree: `pnpm check` → 0 errors, 0 warnings; `pnpm lint` → exit 0; `pnpm test` → 68 files / 1031 tests passed.

L12 (2026-10-16) Post-review cleanup on user instruction ("Arreglalo"): the three items L11 left open were closed instead of parked. (a) The test fakes now normalize like their adapters — the divergence L11 recorded, and which the previous commit had widened on the whitelist read path. `sanitizeDistractionRule` moved from `local-distraction-rule-repository.ts` to `distraction-rule.entity.ts`, next to `normalizeExe` where the entity invariant lives, and is now imported by both the adapter and `FakeDistractionRuleRepository`, whose `save` drops what the adapter would refuse to persist; the whitelist fake trims and rejects blank input in `silence`/`unsilence`/`getSilenced`, and a padded key reads the day it names instead of purging it. No fake imports from `adapters/`, before or after: the shared authority is the domain, matching `sortBreakActivities` in `fake-break-activity-repository.ts`. The rule fake's constructor still seeds verbatim on purpose — that is the escape hatch for injecting a corrupt store, and its TSDoc now says so. (b) `LocalStorageDistractionRuleRepository.delete` no longer writes when nothing was removed, so deleting an absent id on empty storage stops creating `pomody:distraction-rules` with an empty envelope; deleting the last stored rule still writes the valid empty envelope, pinned by the pre-existing test. (c) S6 above now lists `unsilence(ruleId, dateKey)`, closing the doc-vs-contract drift judge B found, and `decisions.md` §3.1 gained the row that fixes the fakes' contract in writing. Red then green: 6 of the 7 new tests failed first (the delete assertion read `{"version":1,"rules":[]}` where it expected `null`; the whitelist fake returned `[]` for a padded key, lifted nothing with padded input, and returned `['   ','rule-2']` for a blank key; the rule fake stored `{ id: '  a  ' }` verbatim and kept rules with an empty id, a blank exe and `createdAt: 0`), and the seventh was tightened after it passed by accident because the first read in the test purged the state before the discriminating assertion. Gate: `pnpm check` → 0 errors, 0 warnings; `pnpm lint` → exit 0; focused → 6 files / 114 tests; `pnpm test` → 68 files / 1038 tests passed.

L13 (2026-10-16) T3 / slice 5.3 (#125) — Rule 8 measurement, the issue's mandated first step, run **before any source write**. Disposable copy outside the repo (`mktemp -d` → `C:\Users\Usuario\AppData\Local\Temp\...\measure`, `tar --exclude=target`): the copied `Cargo.lock` is byte-identical to the committed one (sha256 `305f5cd6c936e430e09bce752d472d0b475ebedb82c26411e84376e35fd581d9`). Command, on that copy only: `cargo add windows-sys@0.61 --features Win32_Foundation,Win32_UI_WindowsAndMessaging,Win32_UI_Input_KeyboardAndMouse,Win32_System_Threading,Win32_System_SystemInformation` (cargo 1.99.0, host `x86_64-pc-windows-msvc`). Results:

- **Tauri family byte-identical before/after**: tauri 2.11.6, tauri-build/tauri-codegen/tauri-macros/tauri-plugin 2.6.3, tauri-utils 2.9.3, tauri-runtime 2.11.3, tauri-runtime-wry 2.11.4, muda 0.19.3, wry 0.55.1, tauri-winres 0.3.6.
- **`windows-sys` reuses the already-locked 0.61.2**: 482 packages before and after, no fifth `windows-sys` version enters the tree (lock still has 0.45.0 / 0.59.0 / 0.60.2 / 0.61.2).
- The committed lock is CRLF in the working tree and cargo rewrites it LF; with `core.autocrlf=true` `git diff` reports no change, so the rewrite is invisible to the commit (the whole-file difference seen when diffing the two scratch files is a line-ending artifact, not content).
- **A re-resolve also applies two pre-existing drifts, neither caused by `windows-sys`**: `pomody-desktop` 0.12.0→0.13.0 (the lock never caught up with the 0.13.0 release of `2d58806`) and `tauri-plugin-single-instance` 2.4.5→2.4.1 (checksum swapped, its `tokio` edge dropped). The second is forced by `Cargo.toml`, which has pinned `=2.4.1` since the tray slice `62674a7` — while that same commit committed the lock with 2.4.5. The contradiction is on `main` today and is independent of this slice: on a second pristine copy, `cargo metadata --locked --offline` fails with `error: cannot update the lock file … because --locked was passed to prevent this`. Consequence: cargo (and `desktop-ci.yml`, which runs `pnpm tauri:build` without `--locked`) already resolves **2.4.1** on every build, so accepting the refresh makes the committed lock honest rather than changing what gets compiled — but the choice is the user's, per the issue's own gate ("Si la familia Tauri se mueve, se para y se reporta").
- Full semantic diff (CR-stripped) is 4 hunks: two version lines, one checksum, one added dependency line, one dropped `tokio` edge. The rest of the 5091-line lock is untouched.
- Second measurement, same day, outside the repo (`C:\Users\Usuario\AppData\Local\Temp\pomody-win32-measure`): a scratch crate depending only on `windows-sys` with those five features, holding the draft of the Win32 layer, compiled with `cargo check` to confirm the feature list is sufficient and the item paths are right.

At that point T3 was blocked on the lock-path decision and nothing of `src-tauri/` had been touched yet.

L14 (2026-10-16) T3 / slice 5.3 (#125) implemented on branch `feat/distraction-native-bridge`. The maintainer chose option A (full lock refresh), so `cargo add` ran on the working tree and the lock diff came out exactly as the measurement predicted: 4 semantic hunks — `pomody-desktop` 0.12.0→0.13.0, `"windows-sys 0.61.2"` added to its dependency list, `tauri-plugin-single-instance` 2.4.5→2.4.1 with its new checksum and its dropped `tokio` edge — with the package count unchanged at 482. The measurement is written up for review in `docs/features/distraction-detector/decisions.md` §5.1.

What the slice delivered:

- `src-tauri/src/window_bridge.rs` (new): the whole Win32 surface in one auditable file — the `WindowInfo` wire shape (`#[serde(rename_all = "camelCase")]`, hence `idleSeconds`), `active_window()` and `open_windows()`, and a single `describe_window` filter both commands share (drops the null handle, invisible windows, untitled windows, windows of this process and windows whose executable cannot be read), so the poll and the picker can never disagree about what a valid window is. Own-process dropping is by process id, so every Pomody window disappears, not only the main one. `idle_seconds` comes from `GetLastInputInfo` with a wrapping `GetTickCount` subtraction (both are 32-bit and wrap after ~49.7 days). The `EnumWindows` callback always returns 1: that is what makes an unreadable elevated process "skipped without breaking the enumeration" instead of truncating the list.
- `src-tauri/src/lib.rs`: `mod window_bridge`, the two thin `#[tauri::command]` wrappers, and `.invoke_handler(tauri::generate_handler![active_window, open_windows])`.
- `src-tauri/Cargo.toml`: `windows-sys = "0.61"` with the five measured features and a comment on why those and not the `Win32` umbrella.
- `src/lib/adapters/window/noop-distraction-monitor.ts` and `tauri-distraction-monitor.ts`: the Noop answers `null`/`[]` without throwing and reports `isSupported = false`; the Tauri adapter takes the invoke client through an injectable seam (so `@tauri-apps/api` never enters the static module graph), normalizes `exe` with the domain's `normalizeExe` — Rust reports what the OS says, the rule key is a domain concept — and validates every payload: a non-array, an unreadable executable, a blank title or an impossible idle time is dropped, and a _missing_ idle time is dropped rather than defaulted to `0`, because `0` would silently disarm the policy's idle guard and produce the avalanche the guard exists to prevent.
- `src/lib/state/distractionState.svelte.ts` (new): `createDefaultDistractionMonitor()`, the composition-root selector, mirroring `createDefaultWindowShell`. Slice 5.5 grows this module into the poll loop. Naming: `spec.md` §10 calls the state test `distraction.test.ts` while its §3 diagram names the module `distractionState.svelte.ts`; the diagram and the `windowState.svelte.ts` precedent were followed for both files.

Tests and gates on the final tree: RED first for the three new test files (`Cannot find module`, 3 files failed), then 20/20 green in `--project server`, including the contract test that parses `generate_handler![…]` out of `src-tauri/src/lib.rs` and requires both command names to be there — the test that pins the TS↔Rust seam, and the only red one between the TS and Rust halves of the slice. `pnpm check` → 0 errors, 0 warnings. `pnpm lint` → exit 0. `pnpm test` → 72 files / 1058 tests passed. Two things the first gate run caught, both fixed: Prettier reformatted the adapter test file, and ESLint flagged two `no-unused-vars` in two of my tests that were also asserting nothing — the spy client was created but never injected, so "calls is empty" was trivially true; they were rewritten to stub `__TAURI_INTERNALS__` with a throwing `invoke` and so prove the adapter never reaches the native runtime.

Rust verification, bounded honestly: the crate cannot be compiled locally (no MSVC toolchain; the `link.exe` on `PATH` is Git's). The real module was therefore type-checked outside the repo in `C:\Users\Usuario\AppData\Local\Temp\pomody-win32-check`, copied with the serde import, attribute and derive stripped so no proc-macro is involved: `cargo check --offline` → exit 0, 0 errors, 0 warnings, with `windows-sys 0.61.2` compiling from the five features. Not covered by that check, and left to CI: the `#[derive(Serialize)]` itself, the `#[tauri::command]` wrappers and `generate_handler!` (their registration is pinned by the TS test above; their compilation only by `desktop-ci.yml`). `pnpm tauri:build` was not run locally, per rule 9. S9.8 (`desktop-ci.yml` verde) therefore stays open until the pull request runs: pushing is the maintainer's decision.
