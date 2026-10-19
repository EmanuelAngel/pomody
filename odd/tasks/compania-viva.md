# Feature: Compañía Viva (Living Companion Background)

- **Issue**: #114 (comment 6186935872)
- **Branch**: `feat/compania-viva`
- **Status**: In progress
- **Delivery Strategy**: `feature-branch-chain` (4 reviewable PRs + final PR to `main`)
- **TDD Mode**: Standard Unit (`vitest run --project server`) + Web-First Browser Mode (`vitest run --project client`)

## Objective

Replace the per-cycle plant idea with a calm, full-screen pixel-art landscape on the Timer tab that grows with the focus minutes accumulated today. Progression is discrete (15 steps of 25 minutes), derived from the existing daily stats counter, with no new persistence and no JS animation loops.

## Specs

### S1 — Progression model

- Single source: `dailyStats.accumulatedMinutes` (already persisted per local calendar day).
- `step = min(15, floor(accumulatedMinutes / 25))`; steps range `0..15`, `15` = 375 focus minutes.
- `phase = min(phaseCount - 1, floor(step * phaseCount / 15))`. The clamp is mandatory: the formula gives `phaseCount` at step 15 without it.
- No intra-block progress. Only `block-completed` with `mode === 'focus'` moves the step, through the existing daily-stats subscription.
- Reset is lazy, identical to daily stats: on load or on the next completed focus block. Midnight-crossing blocks are an accepted edge case.
- Ambient motion is allowed during a focus block and never represents progress.

Verbatim user decision: "el motor DEBE permitir movimiento intra-bloque sin que represente progreso."

### S2 — Illustrations v1

Verbatim user decision: "Una ilustración de landscape pixel art minismalista del bosque, con plantas y árboles creciendo, 5 fases. Otra ilustración de landscape pixel art minimalista del desierto, con cactus abriendo sus flores, con sol/atardecer y luna, a la noche aparecen murcielagos en las flores de los cactus, 3 fases."

- Forest: 5 phases (changes every 75 minutes).
- Desert: 3 phases bound to progress only (day → sunset → night with bats), never to the real clock.
- Palette: 3 accent tokens per illustration, `--bg-base` acts as sky and does not count. Forest: `pine` + `foam` + `text-subtle`. Desert: `gold` + `pine` + `love`. Must work in Dark, Dawn and OLED.
- Integer pixel scale via `ResizeObserver`: `scale = floor(min(width / artWidth, height / artHeight))`. Resize only, never a per-frame loop.
- No `<canvas>`, WebGL, animation libraries, or new dependencies.

### S3 — Placement

- Full-screen background layer inside the Timer tab only, not the app shell.
- Layer `z-0`, timer content `z-10`; existing header `z-30` and daily counter `z-20` stay untouched.
- `aria-hidden="true"`, non-interactive.
- Hidden below the `md` breakpoint and never rendered in the Mini-Player.
- Digits, controls and task pill keep their contrast and space.

### S4 — Settings

- `illustration: { enabled: false, motionEnabled: true, hideWhileFocusing: false, selectedId: 'forest' }` inside `UserSettings`.
- Two switches (enabled, keep static) plus one switch to hide while a focus block runs, and a `ToggleGroup` selector with a thumbnail per illustration.
- Persist through the existing `pomody:settings` envelope. `validateAndSanitize` in `local-settings-storage.ts` must be extended, otherwise the new fields are silently dropped. No envelope version bump: per-field fallback covers old records.
- Labels through the existing i18n layer.

### S5 — Motion

- CSS-only ambient animation. `shouldAnimate = enabled && motionEnabled && focusRunning && !prefersReducedMotion`.
- When not animating, `animation-play-state: paused` (no animation runs during pause or breaks).
- System `prefers-reduced-motion` disables the motion entirely.
- No JS clock and no requestAnimationFrame loop.

### S6 — Catalog contract

- Pure metadata (`id`, `labelKey`, `phaseCount`) lives in `src/lib/domain/illustration/`.
- Renderers live in components and map `id -> renderer`.
- Adding an illustration = one catalog entry + one renderer, zero new tests.
- A single parameterized contract test iterates the whole catalog and mounts every phase.

### S7 — Tests

- Domain: step calculation, cap, invalid input, phase mapping for 1/3/5/15 phases, clamp at step 15.
- State: phase derivation from accumulated minutes, switches, `shouldAnimate`, and one integration case `block-completed (focus) -> daily stats -> phase`.
- Components: every catalog entry mounts every phase; selector and switches update state.
- Gates: `pnpm check`, `pnpm test:unit`, `pnpm test:browser`, `pnpm lint`.

### S8 — Docs

- `docs/features/compania-viva/spec.md`, `design.md`, `decisions.md` in Spanish (repo convention).
- `docs/proposals/fede-ideas.md` is not modified.

### S9 — Delivery

- `feature-branch-chain`: PR1 domain, PR2 settings persistence + state, PR3 art + background layer, PR4 settings UI + docs, then a final PR to `main`.
- Conventional Commits, no AI attribution.

## Tasks

| ID  | Scope                                          | Specs      | Route  | Status  | Commit |
| --- | ---------------------------------------------- | ---------- | ------ | ------- | ------ |
| T1  | Domain progress + catalog metadata + tests     | S1, S2, S6 | inline | pending | —      |
| T2  | Settings port, defaults, sanitize + tests      | S4         | inline | pending | —      |
| T3  | Illustration state + tests (incl. integration) | S1, S5, S7 | inline | pending | —      |
| T4  | Forest + desert renderers + contract test      | S2, S6     | inline | pending | —      |
| T5  | Timer-tab background layer + component test    | S3, S5     | inline | pending | —      |
| T6  | Settings UI (switches + selector + i18n)       | S4, S7     | inline | pending | —      |
| T7  | Feature docs                                   | S8         | inline | pending | —      |
| T8  | Full verification gates                        | S7         | inline | pending | —      |

## Log

### L1 — Original request (verbatim)

> @grilling con tu sistema de question, discutamos cómo realizar https://github.com/EmanuelAngel/pomody/issues/114#issuecomment-6186935872 , tomaremos ese comentario como lo que se desea hacer.

### L2 — Grill decisions

- Sign-off: this grill is the Vortex sign-off; implementation authorized.
- Art direction: 2-3 tones, minimal, but an extensible illustration system.
- Environment strip: out of scope.
- Progression: daily focus minutes, 15 steps x 25 min, stepwise, lazy reset; ambient intra-block motion allowed without representing progress.
- v1: two illustrations, selector, switches.
- Reset: lazy, same as `daily-stats` (no scheduler).
- Motion: boolean + pure CSS (`animation-play-state`).
- Illustrations: forest (5 phases) + desert (3 phases).
- Tests: data-driven catalog + one parameterized contract test.
- Zen: existing "focus running" state, illustration visible by default.
- Placement: Timer tab only.
- Pixel scale: `ResizeObserver` integer scale.
- Palette: 3 accents + theme background.
- Default: illustration disabled.
- Delivery: `feature-branch-chain`.
- Restored from the original DoD: explicit "keep static" switch (`motionEnabled`) and the `block-completed -> phase` integration test.

### L3 — Facts discovered

- `daily-stats` already persists `accumulatedMinutes` per local day (`src/lib/domain/ports/daily-stats-repository.port.ts:4`, `pomody:daily-stats`).
- Reset is lazy (`src/lib/state/daily-stats.svelte.ts:112-126`); there is no midnight scheduler.
- `BlockCompletedEvent` carries `mode` and `durationMs` (`src/lib/domain/events/block-completed.event.ts:3`).
- No Zen preference, no `prefers-reduced-motion` handling, no background layer exist today.
- `docs/proposals/fede-ideas.md` has no Idea 6 and its Idea 2 conflicts with the new model; feature docs supersede it.
