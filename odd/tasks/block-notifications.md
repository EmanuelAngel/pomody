# Feature: Block-End Notifications (#138)

- Branch `feat/block-notifications` · Delivery `feature-branch-chain` (PR 1 OS channel, PR 2 in-app toast) · Runner `pnpm vitest` (`server` + `client` projects), `pnpm check`, `pnpm lint`, `pnpm test:e2e`
- Worktree `C:\Users\Usuario\dev\pomody-worktrees\138-block-notifications`

## Specs

- **S1 — Trigger.** Only the natural `block-completed` domain event notifies. `skip()` (`block-skipped`) and `reset()` never do. The user string behind it: "Al terminar un bloque solo hay alerta de audio. Si el usuario esta fuera de la ventana, no se entera del cambio de fase." (#138)
- **S2 — Attention predicate.** Notify only when the window is unattended: `document.visibilityState === 'hidden' || !document.hasFocus()`, with one exception: when the window is always-on-top (`windowState.isAlwaysOnTop`, i.e. Mini-Player) the phase change is already visible on the floating window, so nothing is shown. Predicate is injected so it is testable in Node.
- **S3 — Channels (hybrid).** Desktop shows an OS notification (`tauri-plugin-notification`, already a dependency and already granted `notification:default`). Every platform shows the in-app toast (PR 2, shadcn-svelte `sonner`, `duration: Infinity`, informational only, dismissed by the next block, reset, skip or a click). The web build shows no browser notification: the user rejected the Notification API prompt.
- **S4 — Setting.** `blockNotificationsEnabled: boolean` in `UserSettings`, default `true`, persisted through `ISettingsStorage`. Its switch lives in the Behavior tab next to Sound Alerts and is independent of `soundEnabled`: the user string is "Independiente del sonido (Recomendado)".
- **S5 — Permission.** The OS permission is requested when the user turns the switch on. A denied permission reverts the switch to off and shows an explanatory line; the state never reports a notification it cannot deliver.
- **S6 — Notice copy and tap.** Title names the completed phase, body names the next phase; no action buttons (Windows may not render them — `docs/features/distraction-detector/decisions.md` §5.2). A tap focuses the window through `onAction` (`actionId === 'tap'`); on Windows that click is only reported while the toast is on screen, which is recorded as a degradation.
- **S7 — Seams.** New files in kebab-case: `src/lib/domain/ports/block-notifier.port.ts` (`IBlockNotifier`), `src/lib/adapters/notification/tauri-block-notifier.ts`, `src/lib/adapters/notification/noop-block-notifier.ts`, `src/lib/state/block-notice.svelte.ts`. The state follows the `distractionState` precedent: it subscribes to `timerState.onEvent`, owns its setting through `LocalSettingsStorage`, and composes the ports. `timer.svelte.ts` gains no notification logic. Domain stays pure; no barrel files.
- **S8 — Docs.** `docs/features/block-notifications/spec.md` + `decisions.md` in the language of the rest of `docs/features` (Spanish), recording canal, predicate, degradation and rejected alternatives.
- **S9 — Checks.** Targeted tests while iterating; `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` at closure. The desktop build is verified only by `desktop-ci.yml`.

## Tasks

| ID  | Spec           | Route  | Status  | Commit      |
| --- | -------------- | ------ | ------- | ----------- |
| T1  | S6, S7         | inline | done    | 5ecee71     |
| T2  | S4             | inline | done    | 03ef2c9     |
| T3  | S1, S2, S5, S7 | inline | done    | 0993bc2     |
| T4  | S4, S5         | inline | done    | fab0346     |
| T5  | S8             | inline | done    | this commit |
| T6  | S3 (toast)     | inline | pending | —           |

- **T1** Port + `TauriBlockNotifier` + `NoopBlockNotifier` + tests.
- **T2** `blockNotificationsEnabled` in the settings port, envelope, sanitizer, fake and tests.
- **T3** `block-notice.svelte.ts`: setting ownership, permission flow, attention predicate, notice copy, tests.
- **T4** Behavior panel switch + denied line + i18n keys (en/es) + component test.
- **T5** Feature spec + decisions.
- **T6** `sonner` install, `<Toaster>` in the layout, persistent informational toast, tests.

## Log

- **L1 (user, verbatim).** "usa tu sistema de question para que discutamos cómo resolver el issue #138"
- **L2 (user, verbatim).** "Sin querer cerré el formulario, hazlo otra vez por favor y te aviso acá de paso: cuando comiences a trabajar hacelo en un worktree"
- **L3 (user, verbatim).** "lo que recomendás, pero que los nombres de archivos vayan en kebab-case. sé que hay alguno que otro suelto ahí que no cumple esta regla pero es porque es eso, uno suelto rebelde"
- **L4 (user, verbatim).** "Solo informativo, sin acción" — the toast offers no button.
- **L5 (user, verbatim).** "Sí" — confirms the design and authorizes implementation in a worktree.
- **L6 (decision).** Facts verified before designing: no toast infrastructure exists; `tauri-plugin-notification ~2.6.0` and `notification:default` are already wired for the distraction detector; completion today only plays audio (`timer.svelte.ts:198-202`); `PlanningState` does not advance the next block on its own; `onAction` documents `tap` on desktop; `svelte-sonner` is absent.
- **L7 (evidence, T1–T4).** 25 port/adapter tests, 46 settings tests, 16 state tests and 3 panel tests green. Full suite 94 files / 1376 tests, `pnpm check` 0 errors, `pnpm lint` clean, E2E 12/12. Differential check of `LocalSettingsStorage` against `874fb86` over seven pre-existing patches: same envelope plus `blockNotificationsEnabled: true`, same load result, 14/14.
- **L8 (decision, during T3).** `setEnabled` is synchronous and optimistic: it flips the preference first and reverts on a denied permission. Binding a local mirror with `bind:checked` left the thumb on after the denial because the prop never changed value; the optimistic flip both fixes the UI and matches the "the switch never lies" rule.
