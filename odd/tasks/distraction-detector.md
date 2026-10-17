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

S6 (#123, slice 5.1) Ports: `IDistractionMonitor` (`OpenWindow`, `WindowObservation`, `isSupported`, `getForegroundWindow`, `listOpenWindows`) in `src/lib/domain/ports/distraction-monitor.port.ts`; `IDistractionRuleRepository` and `IDistractionWhitelistRepository` (`getAll`, `save`, `delete`, `clearAll`; `getSilenced(dateKey)`, `silence(ruleId, dateKey)`, `clearAll`) in `src/lib/domain/ports/distraction-repository.port.ts`.

S7 (#123, slice 5.1) Zero imports of Svelte, DOM, or Tauri inside `src/lib/domain/`. No barrel files. `pnpm check` and `pnpm test:unit` pass with no warnings.

S8 (#124, slice 5.2) Local adapters `local-distraction-rule-repository.ts` and `local-distraction-whitelist-repository.ts` following the `local-break-activity-repository.ts` pattern (versioned envelope + validating fallback), with `pomody:distraction-rules` and `pomody:distraction-whitelist` keys and lazy purge of a stale `silencedUntil`.

S9 (#125, slice 5.3) Windows native bridge: `active_window` and `open_windows` Tauri commands in `src-tauri/src/lib.rs`, `TauriDistractionMonitor`, `NoopDistractionMonitor` (`isSupported = false`), platform selector; `Cargo.lock` measured with `cargo add` on a disposable copy first (Rule 8).

S10 (#126, slice 5.4) "Distractions" third navigation tab, `distraction-view.svelte` (picker + manual fields + rule list + daily-silence list + empty state), global switch in `settings-drawer.svelte` (off by default), i18n keys of spec §9, `client` tests.

S11 (#127, slice 5.5) `tauri-plugin-notification`, `notification:default` capability, action-type registration, `onAction`, `distractionState.svelte.ts` (polling + evaluation), documented toast-button degradation.

## Tasks

- [x] T1 / #123 — Pure domain and ports (entity, matching, cadence policy, three ports + `server` tests) · S1-S7 · route: inline · commit `feat(distraction): add pure domain and ports for the detector`
- [ ] T2 / #124 — Local persistence adapters, fakes and tests · S8 · route: inline
- [ ] T3 / #125 — Native Windows bridge, monitor adapters and platform selector · S9 · route: inline
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
