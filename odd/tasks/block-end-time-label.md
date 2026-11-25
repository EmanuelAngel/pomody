# Block End-Time Label

Shows the estimated wall-clock end time (HH:MM) of the current block in a single centered line below the main timer arc, updating live through pauses. Driven by Fede's proposal #7. Branch: `EmanuelAngel/feat-focus-block-end`.

## Specs

S1 — Core display (Fede, verbatim): «Justo debajo del foco actual, mostrar siempre a qué hora va a terminar el bloque en curso. Se calcula sumando a la hora actual el tiempo que le queda al bloque. Ejemplo: si son las 15:00 y empiezo un foco de 40 minutos, debajo aparece "Termina a las 15:40". Si pauso el bloque, la hora de finalización se va actualizando mientras dure la pausa, porque el final se corre. Ejemplo: si pauso 10 minutos, pasa a mostrar "Termina a las 15:50".»

S2 — Pause behavior (Fede, verbatim): «Mi preferencia es que se actualice directamente.» Live update during the pause; the frozen pre-pause estimate alternative is rejected.

S3 — Acceptance criteria (Fede, verbatim):

1. «Con un bloque de foco en curso, debajo del foco actual se ve la hora estimada de finalización (HH:MM).»
2. «A las 15:00, un bloque de 40 minutos recién iniciado muestra 15:40.»
3. «Mientras el bloque corre sin pausas, la hora mostrada no cambia.»
4. «En pausa, la hora avanza a medida que pasan los minutos (pausa de 10 minutos: 15:50).»
5. «Al reanudar, queda fija en la nueva hora calculada.»
6. «Si se reinicia el bloque o se cambia su duración, la hora se recalcula.»
7. «Se ve bien en los tres temas y en el mini-player no rompe el diseño (a definir si ahí también se muestra).»

S4 — Scope (user, verbatim): «Alcance: etiqueta + toggle, con tests.»

S5 — Idle state (user decision: «Mostrar hora proyectada»): while idle the label shows the projected end time if started now — "Terminaría a las HH:MM" (`now + durationMs`), recomputing as minutes pass.

S6 — Modes (user decision: «Foco y descansos»): the label shows during focus blocks AND breaks, same treatment.

S7 — Mini-player (user decision: «Solo vista principal»): the label is NOT added to the mini-player. S3.7 is satisfied by leaving that surface untouched; the label must not break the three themes (it uses existing semantic tokens).

S8 — Placement (user, verbatim): «bajo el arco junto al waiting-since pero ambas horizontales divididas por un puntito centrado, centradas» — one single centered line below the arc, in the reserved waiting slot (`src/lib/components/timer/timer.svelte:68-71`). When both texts are present (paused state), they share the line separated by a centered "·". The reserved-height invariant ("controls never jump", `timer.svelte:68`) must be preserved: still one line.

S9 — Toggle (from S4): a settings toggle, default ON, shows/hides the end-time text. When OFF, the line falls back to the current waiting-since-only behavior.

S10 — Completed state (derived from S1 «bloque en curso»): in the completed state no end time is shown (the block already ended); the waiting-since completed text remains alone on the line.

## Tasks

- T1, S1-S3, S5-S8, S10: End-time label in the main timer view — pure domain helper next to `elapsed-since.ts`, `TimerState` derived end time + minute-level clock for paused/idle updates, single shared centered line in the waiting slot, i18n es/en, unit + component tests. Route: gentle-ai-worker. Commit: (pending)
- T2, S4, S9: Settings toggle — new persisted settings field (default `true`), `TimerState` flag following the `revitalizationEnabled` pattern, behavior panel row with shadcn-svelte Switch, conditional render of the label, i18n, tests. Route: gentle-ai-worker. Commit: (pending)

## Log

L1 — User's original request (verbatim): «Me llegó la siguiente solicitud de un usuario de Pomody: […] POMODY — PROPUESTAS DE FEDE — 7. Hora de finalización del bloque de foco actual […] Descripción: Justo debajo del foco actual, mostrar siempre a qué hora va a terminar el bloque en curso. Se calcula sumando a la hora actual el tiempo que le queda al bloque. Ejemplo: si son las 15:00 y empiezo un foco de 40 minutos, debajo aparece "Termina a las 15:40". Si pauso el bloque, la hora de finalización se va actualizando mientras dure la pausa, porque el final se corre. Ejemplo: si pauso 10 minutos, pasa a mostrar "Termina a las 15:50". […] Mi preferencia es que se actualice directamente. […] Complejidad estimada: Baja […] Decime de qué se trata, si es viable, estimaciones de costo y tiempo, si toca domain, si hay riesgo de romper algo existente» (full proposal text quoted across S1-S3; the "PUNTOS A DEFINIR" — idle display and focus-vs-breaks — were resolved as L3).

L2 — Scope evolution: first turn was analysis-only (viability, cost, domain impact, risk). User then asked the cost of adding a settings toggle («¿Y si le sumamos poder desactivarlo/activarlo mediante ajustes? ¿Qué tanto subirían los costos?») and set the definitive scope: «Alcance: etiqueta + toggle, con tests.»

L3 — Product decisions (ask_user_question): idle → «Mostrar hora proyectada»; modes → «Foco y descansos»; mini-player → «Solo vista principal».

L4 — Placement decision (ask_user_question, custom answer, verbatim): «bajo el arco junto al waiting-since pero ambas horizontales divididas por un puntito centrado, centradas».

L5 — Explorer evidence (gentle-ai-explore task mwwizeee-1-4ihu): main view order is arc → waiting line (`grid h-5`, `timer.svelte:68-71`, reserved so controls never jump) → controls (`timer.svelte:73-79`) → bottom slot (task pill / break revitalization, `timer.svelte:81-91`); i18n strings live in `messages/{en,es}.json` consumed through the Paraglide proxy `t` (`src/lib/state/locale.svelte.ts:91-96`), pattern example `timer_waiting_since_paused` (`waiting-since.svelte:31-43`); `remainingMs` is frozen while paused and the ticker stops on pause, so paused/idle minute updates need a clock like waiting-since uses; `endsAt` exists only in the persisted snapshot record (`timer-snapshot.entity.ts:20,393`), not as a `TimerState` getter; planning owns a separate `estimatedFinishTime` for planned sessions (`planning.svelte.ts:180`) — the live label supersedes it for the running block.
