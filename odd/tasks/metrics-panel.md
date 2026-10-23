# metrics-panel — Panel de Métricas nativo (M6, P4)

Objetivo: desbloquear la pestaña _Métricas_ con gráficos semanales y patrones de productividad en SVG propio, sobre un historial nuevo de un evento por bloque del que también se deriva el contador diario. Issue: #214. Decisión aparte sobre la purga general: #215.
Rama: `feat/metrics-panel` (a crear al arrancar la implementación). Estrategia de entrega: PR sobre `main` en slices de ~400 líneas; los slices con ítem de riesgo alto van en commit propio. Runner: `pnpm vitest run <file>` (server) y `pnpm vitest run <file> --project client` (browser).

## Specs

S1 — Alcance, pedido original: «el primer ítem del Milestone 6: desbloquear la pestaña _Métricas_ y mostrar gráficos semanales y patrones de productividad con CSS/SVG nativo, sin dependencias de gráficos.» Fuera: «"Calidad de sesión y correlación" (el segundo ítem del M6)», salvo el objetivo diario y la racha de S16–S19, que se adelantan (L3).
S2 — Unidad del historial: un registro por bloque terminado (elegido: «Evento por bloque»). Forma de referencia: `{ v:1, at:'2026-10-23T14:05Z', mode:'focus', plannedMs:1500000, outcome:'completed', taskId:'t_3' }`.
S3 — Cada registro anota también los minutos realmente trabajados y los bloques abandonados con Reset (elegido: «Sí, anotar todo»). Resultados: `completed | skipped | abandoned`. El dominio agrega `elapsedMs` (tiempo corrido sin pausas, `duración − remaining`) a `block-completed` y `block-skipped`, y `reset()` emite `block-abandoned` cuando había un bloque en curso. Un `skip` con `elapsedMs = 0` es un salto en frío.
S4 — Se registran foco y descansos (cortos y largos) (elegido: «Foco y descansos»).
S5 — Cada registro guarda el ID de la tarea activa y una copia de su nombre al momento del bloque (elegido: «ID + copia del nombre»). Sin tarea activa, ambos quedan ausentes.
S6 — Retención: 1 año (elegido: «1 año»); al guardar se recortan los registros más viejos que eso. Almacenamiento en `localStorage`, detrás de un puerto de dominio con firma asíncrona como `ITaskRepository`, para poder migrar a IndexedDB sin tocar consumidores. Si `setItem` falla por cuota, se recorta lo más viejo y se reintenta una vez; si vuelve a fallar, se descarta en silencio (convención del repo).
S7 — Formato persistido con sobre versionado según la convención de `local-cadence-preset-repository.ts` / `local-break-activity-repository.ts`: registros inválidos se descartan uno por uno; si el almacenamiento tiene una versión más nueva que la soportada, no se escribe.
S8 — El contador del pie pasa a calcularse desde el historial (elegido: «Sí, se calcula del historial»); se elimina su registro propio y la lógica de reseteo a medianoche.
S9 — Migración: si `pomody:daily-stats` tiene un registro de hoy, sus bloques se convierten en registros marcados como migrados (elegido: «Convertir y marcar como migradas») y la clave vieja se elimina. Los registros migrados cuentan para el contador y las barras, pero se excluyen del patrón por hora.
S10 — Concurrencia entre pestañas: antes de agregar un registro se relee lo guardado, y el evento `storage` refresca el contador y el panel en las otras pestañas (elegido: «Releer antes de escribir + evento 'storage'»).
S11 — Panel v1: «Barras semanales», «Patrón por hora del día» y «Resumen: totales, cumplimiento, racha». Top de tareas queda diferido.
S12 — Semana de calendario de lunes a domingo, fija, con navegación a semanas anteriores (elegido: «Semana calendario lun–dom»).
S13 — Un bloque que cruza la medianoche, una hora o un cambio de horario cuenta entero en el momento en que terminó (elegido: «Entero, al momento de fin»).
S14 — Cada registro guarda la hora UTC y el desfase local de ese momento; día y hora se calculan con ese desfase (elegido: «UTC + desfase de ese momento»).
S15 — Sin registros, la pestaña muestra un `Empty` de shadcn-svelte («Completá tu primer pomodoro para ver tus métricas» como referencia de copy); desde el primer registro se muestran los gráficos.
S16 — Cumplimiento = focos terminados ÷ focos empezados, donde empezados = terminados + saltados con `elapsedMs > 0` + abandonados. Los descansos no entran (elegido: «Sí, solo focos empezados»).
S17 — Objetivo diario, pedido del usuario: «racha + porcentaje y no por bloques, si no por minutos acumulados. ej: "mi objetivo es X minutos cada día, menos Z e Y días"». Es decir: objetivo en minutos de foco por día y días de la semana de descanso. Se muestran «Progreso de hoy + % de días de la semana» (por ejemplo 75 / 120 min, 62 %; y 4 de 5 días hábiles, 80 %). Los días de descanso no cuentan en el porcentaje.
S18 — Racha: días consecutivos que cumplieron el objetivo vigente. Los días de descanso se saltean sin cortarla ni sumarla. Hoy no la corta mientras no termine el día.
S19 — Cambiar el objetivo o los días de descanso aplica desde ese día; cada día pasado se evalúa con el objetivo vigente entonces (elegido: «Desde hoy; el pasado conserva el suyo»): se persiste una lista de cambios con fecha de vigencia, en formato versionado. Sin objetivo configurado no hay valor por defecto: las tarjetas de racha y porcentaje se reemplazan por una invitación a configurarlo con acceso al panel de Settings (elegido: «Sin default, invitar a configurarlo»). Los días anteriores al primer objetivo no se evalúan.
S20 — El patrón por hora usa los minutos de foco terminados de los últimos 30 días, independiente de la semana seleccionada (elegido: «Últimos 30 días fijos»).
S21 — Los minutos de foco (barras, contador del pie y objetivo diario) suman solo focos terminados; los parciales se guardan pero no suman (elegido: «Solo focos terminados»).
S22 — Settings tiene un panel nuevo «Metrics» con objetivo diario, días de descanso y «Borrar historial» con `AlertDialog` (elegido: «Panel "Metrics" en Settings»). Borrar historial elimina todos los registros (el contador del pie vuelve a 0) y conserva el objetivo.
S23 — El mini-player no muestra métricas (elegido: «Nada en el mini-player»). En desktop es la misma ventana, así que no hay doble registro.
S24 — Gráficos con SVG propio, sin dependencias, con el estilo de los charts de shadcn-svelte sobre los tokens Rosé Pine; lo que los rodea (tarjetas, tooltip, navegación, estado vacío) usa shadcn-svelte (elegido: «SVG propio con estilo shadcn»). Se documenta la excepción a la regla 3 de `AGENTS.md`. Cada gráfico tiene un resumen accesible en texto.
S25 — Convenciones: dominio puro sin Svelte/DOM/Tauri; sin barrel files; Svelte 5 runes; copy en ES y EN (`messages/`); tests sin dobles locales de `Storage` (solo `InMemoryStorage`). La pestaña Métricas se carga con import dinámico para que el timer no pague su costo.
S26 — `pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:browser` y `pnpm test:e2e` pasan.

## Tasks

- [x] T1 — S3 S25 — inline — Dominio del timer: `elapsedMs` en `block-completed`/`block-skipped`, evento `block-abandoned` en `reset()` con bloque en curso; consumidores actuales (`daily-stats`, `block-notice`, etc.) ignoran el tipo nuevo — commit: d6cc304 — Risk: bajo (aditivo, tests puros). Además `block-skipped` lleva `durationMs` (S2 lo necesita)
- [x] T2 — S2 S4 S5 S6 S7 S10 S13 S14 S25 — inline — Historial: entidad de registro, puerto, adapter `localStorage` (sobre versionado, recorte a 1 año, cuota, releer antes de escribir, evento `storage`) y registrador en state que une eventos con la tarea activa — commit: dab2b8e — Risk: items 1 y 4 (formato persistido nuevo, concurrencia) → commit propio + verificación independiente — verificado (sin bloqueantes; fix de rango de `endedAt` aplicado)
- [ ] T3 — S8 S9 S21 — inline — Migración de `pomody:daily-stats` a registros migrados, eliminación de la clave vieja y contador del pie derivado del historial — commit: — Risk: item 1 (elimina datos persistidos) → commit propio + verificación independiente
- [ ] T4 — S17 S19 S22 S25 — inline — Objetivo diario: lista de cambios con vigencia, repositorio versionado, panel «Metrics» en Settings y «Borrar historial» con `AlertDialog` — commit: — Risk: item 1 (formato nuevo y acción destructiva) → commit propio + verificación independiente
- [ ] T5 — S12 S13 S14 S16 S17 S18 S19 S20 S21 — inline — Agregaciones puras: semana lun–dom, patrón por hora 30 días (sin migrados), cumplimiento, racha con días de descanso, progreso de hoy y % semanal — commit: — Risk: bajo (funciones puras)
- [ ] T6 — S1 S11 S12 S15 S23 S24 S25 — inline — UI: habilitar la pestaña Métricas con carga diferida, gráficos SVG, tarjetas, `Empty`, invitación a objetivo, navegación de semana, i18n ES/EN, resumen accesible; documentar la excepción a la regla 3 y actualizar el roadmap — commit: — Risk: item 6 (lo visual no queda cubierto del todo por tests)
- [ ] T7 — S26 — inline — Verificación final: `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` y diferencial del contador del pie contra `main` — commit: n/a

## Log

L1 — (2026-10-23) Pedido original, verbatim:

> # Sesión de grilling: Panel de Métricas nativo (Milestone 6)
>
> Quiero planificar la feature **"Panel de Métricas nativo"** del Milestone 6 (`docs/roadmap.md`, sección "Milestone 6"). Esta sesión es de **consideración y planificación**, no de implementación.
>
> ## Reglas de la sesión
>
> - **Modo solo lectura.** No escribas código, no crees ramas, no crees `odd/tasks/*.md` ni issues hasta que yo lo autorice explícitamente al final.
> - Cargá y seguí la skill `grilling` (`.agents/skills/grilling/SKILL.md`).
> - Hacé las preguntas con la herramienta de preguntas de Pi (`ask_user_question` o `ask_user_choice`). **Una decisión por vez**, con opciones concretas, sus tradeoffs y tu recomendación. Después esperá mi respuesta.
> - Antes de cada pregunta, verificá en el código lo que haga falta. No me preguntes cosas que el repo ya responde.
> - Si una respuesta mía contradice una decisión anterior o algo del código, marcalo.
>
> ## Alcance
>
> - **Dentro:** el primer ítem del Milestone 6: desbloquear la pestaña _Métricas_ y mostrar gráficos semanales y patrones de productividad con CSS/SVG nativo, sin dependencias de gráficos.
> - **Fuera:** "Calidad de sesión y correlación" (el segundo ítem del M6). Es otra feature y depende de que esta exista. Mencionala solo si una decisión de ahora la condiciona.
>
> ## Hallazgos ya verificados (punto de partida)
>
> 1. **No hay historial.** `LocalDailyStatsRepository` (`src/lib/adapters/storage/local-daily-stats-repository.ts`) guarda un único registro bajo `pomody:daily-stats` y lo **resetea cuando cambia el día** (`loadStats`). Los datos de días anteriores se pierden. Sin historial no hay gráfico semanal, así que la feature empieza por la capa de datos.
> 2. **El modelo actual** es `DailyStats { date, completedBlocks, accumulatedMinutes }` (`src/lib/domain/ports/daily-stats-repository.port.ts`). Lo consume el `daily-counter` del pie de pantalla vía `src/lib/state/daily-stats.svelte.ts`.
> 3. **Existe un evento de dominio** `BlockCompleted` (`src/lib/domain/events/block-completed.event.ts`), candidato natural para alimentar el historial.
> 4. **La pestaña Metrics ya existe** en `src/lib/components/layout/header.svelte`, pero deshabilitada.
> 5. **Restricciones del proyecto** (`AGENTS.md`): offline-first, sin telemetría, menos de 30 MB de RAM, dominio en TypeScript puro, sin barrel files, shadcn-svelte para toda la UI y Svelte 5 runes.
>
> ## Decisiones que quiero que me hagas defender (en este orden aproximado)
>
> 1. **Unidad del historial:** un resumen por día o un evento por bloque completado (con hora, duración, tarea, completado o interrumpido). Esta decisión define qué métricas van a ser posibles después.
> 2. **Retención y tamaño:** cuánto tiempo se guarda, cuánto ocupa en `localStorage` y qué pasa al llegar al límite.
> 3. **Relación con `pomody:daily-stats`:** si el contador diario pasa a derivarse del historial o si conviven las dos fuentes. Incluí cómo se migra el registro actual y cómo se versiona el formato.
> 4. **Qué se mide:** las métricas concretas del panel v1 (barras semanales, patrón por hora o por día de la semana, rachas, tareas) y cuáles quedan para después.
> 5. **Estado vacío y arranque en frío:** el día que se publique no hay datos.
> 6. **Zona horaria y bordes de día:** qué pasa con los bloques que cruzan la medianoche, con los cambios de hora y con la fecha local.
> 7. **El botón de purga de Settings:** si borra también el historial.
> 8. **Paridad Web y Desktop**, y si el mini-player muestra algo.
> 9. **Partición en slices y work units:** el orden y qué partes tienen riesgo alto (formato de datos persistidos nuevo y migración: ítem 1 de Task Size).
>
> ## Cierre esperado
>
> Cuando no queden decisiones abiertas, dame un resumen con:
>
> - Las decisiones tomadas, cada una con su justificación en una línea.
> - Las preguntas que quedaron abiertas o diferidas.
> - Una propuesta de slices, con su riesgo.
>
> **Después frená** y preguntame si avanzamos a crear el documento de feature ODD y los issues.

L2 — (2026-10-23) Sesión de grilling: 22 decisiones tomadas con la herramienta de preguntas, todas en la opción recomendada salvo S17 (respuesta propia del usuario). Sobre la retención el usuario preguntó «si ahora lo dejamos por un año y en un futuro se nos ocurre ampliarlo a sin limite, ¿sería posible?»; tras la explicación (ampliar es cambiar una constante; ilimitado implica IndexedDB detrás del mismo puerto) eligió 1 año.
L3 — (2026-10-23) Sobre la racha, respuesta propia del usuario: «racha + porcentaje y no por bloques, si no por minutos acumulados. ej: "mi objetivo es X minutos cada día, menos Z e Y días"». Se le marcó que adelanta parte de «Calidad de sesión» (cumplimiento de metas) y lo aceptó al confirmar el resumen.
L4 — (2026-10-23) Sobre los gráficos el usuario pidió: «Ahora quiero analizar esto mejor porque vi los charts de shadcn-svelte y me gustaron, ¿qué diferencia real habría entre uno y otro? Quiero ver si inflar el bundle vale la pena.» Evidencia: el Chart de shadcn-svelte usa LayerChart sin envolverlo; `layerchart@2.0.0-next.66` es prerelease con 29 dependencias de runtime y 4,1 MB descomprimido; el costo real tras tree-shaking no se midió. El usuario eligió SVG propio con estilo shadcn.
L5 — (2026-10-23) Evidencia del repo durante el grilling: `durationMs` de `block-completed` es la duración configurada; `reset()` no emite eventos; `skip()` emite aun en `idle`; el modo mini es la misma ventana `main` de Tauri; el «botón de purga defensiva en Settings Drawer» de `docs/roadmap.md` no existe en la UI (los repositorios exponen `clearAll()` sin llamador) → issue #215.
L6 — (2026-10-23) El usuario autorizó crear el documento ODD y los issues: «Adelante». Creados #214 (feature) y #215 (decisión sobre la purga general).
L7 — (2026-10-23) Autorización de implementación: «Adelante». Rama `feat/metrics-panel`.
L8 — (2026-10-23) Evidencia de T1: `skip()` es alcanzable desde `completed` (Skip de `timer-controls.svelte` solo se deshabilita en `running`; el del mini-player no tiene guarda) y emite `block-skipped` con `elapsedMs = durationMs` para un bloque ya completado. `planning.svelte.ts` también lo procesa como salto. T2: el registrador ignora un `block-skipped` que sigue a un `block-completed` del mismo modo y ronda. El comportamiento de `planning` no se toca en esta feature.
L9 — (2026-10-23) Evidencia de T2: `planning.advanceActiveBlock` llama a `setActiveTask` de forma síncrona (antes de su primer `await`) cuando el bloque siguiente es de foco, o sea al terminar un descanso. Ajuste de S5: la tarea se adjunta solo a registros de foco; los descansos nunca llevan `taskId`/`taskTitle`. El dedupe de L8 exige además `elapsedMs === durationMs`, para no tragarse un salto en frío tras un reset en la misma ronda.
L10 — (2026-10-23) Verificación de T3 sin bloqueantes. Riesgo aceptado: dos pestañas abiertas en el mismo instante el día de la actualización pueden migrar dos veces el registro de hoy (efecto cosmético en el contador de ese día, sin pérdida de datos). `docs/roadmap.md:51` todavía nombra `IDailyStatsRepository`; se corrige en T6 junto con la actualización del roadmap.
