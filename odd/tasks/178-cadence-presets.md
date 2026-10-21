# 178 — Save and reuse custom cadence presets

Objetivo: guardar la cadencia vigente (foco / pausa corta / pausa larga / intervalo) como preset con nombre propio, aplicarlo con un click, renombrarlo y eliminarlo, persistiéndolo entre recargas.
Rama: `feat/178-cadence-presets` (worktree `../pomody-worktrees/issue-178`). Estrategia de entrega: `single-pr` sobre `main`. Runner: `pnpm vitest run <file>` (server) y `pnpm vitest run <file> --project client` (browser).

## Specs

S1 — El usuario puede guardar la cadencia actual (foco / pausa corta / pausa larga / intervalo) como un preset con nombre.
S2 — Con `45/15/30/3` guardado, un click sobre ese preset restaura exactamente esos cuatro valores, incluido `roundsBeforeLongBreak = 3`.
S3 — Los presets personalizados se persisten entre recargas y reinicios, con el mismo mecanismo que ya persiste `timer`, y un payload corrupto cae a los presets por defecto sin romper la vista.
S4 — El usuario puede renombrar y eliminar sus presets. Eliminar el preset seleccionado no altera la cadencia vigente: solo deja de marcarlo como activo.
S5 — Los presets personalizados conviven con los tres integrados en el mismo selector y se distingue visualmente cuáles son del usuario.
S6 — El preset activo se calcula comparando los cuatro valores: hoy `activePresetId` solo compara foco y pausa corta, así que `45/15/30/3` quedaría marcado como si fuera otro preset.
S7 — Guardar con nombre vacío, nombre duplicado o valores fuera de rango se rechaza con un mensaje claro y no persiste nada.
S8 — Aplicar un preset con una sesión activa respeta la regla vigente de no mutar el bloque en curso (misma semántica que los steppers).
S9 — Copy nuevo disponible en ES y EN.
S10 — `pnpm check` pasa sin errores ni advertencias.
S11 — `pnpm test:unit` pasa todas las pruebas.
S12 — Tests: validación de la entidad de preset y round-trip de persistencia, incluido el caso de payload corrupto.

### Decisiones tomadas en la sesión de grilling (2026-10-21)

S13 — `PlanningState.applyCadence({focus, short, long, interval})` es atómico: valida los cuatro juntos con `validateTimerConfig` y hace una sola pasada forward-only y una sola persistencia. Los cuatro setters existentes delegan en él conservando su semántica exacta.
S14 — Los tres integrados viven en el dominio (`BUILT_IN_CADENCE_PRESETS`, con `labelKey` que la UI resuelve con paraglide). El matching compara los cuatro valores y, en empate, gana el preset personalizado.
S15 — El id del preset personalizado se deriva de sus valores (`custom:45:15:30:3`): los valores son inmutables (solo se renombra) y los duplicados por valores se rechazan.
S16 — Guardar un preset personalizado cuyos cuatro valores ya existen en otro personalizado se rechaza con un mensaje claro.
S17 — Tope de 10 presets personalizados; el chip `+` se deshabilita al alcanzarlo con `aria`/`title` explicando el tope.
S18 — El chip personalizado muestra el nombre como texto principal, `45/15/30/3` como secundario y un kebab siempre visible. El chip integrado mantiene `25/5` + label localizado.
S19 — Eliminar desde el menú del kebab es inmediato, sin diálogo de confirmación.
S20 — Nombre: se recorta, se rechaza vacío o de más de 24 caracteres, y se rechaza duplicado contra presets personalizados comparando sin distinguir mayúsculas y sin espacios extra.
S21 — Payload corrupto: envelope ilegible o versión desconocida → lista personalizada vacía; array válido con entradas rotas → se descartan solo las entradas inválidas. Los integrados nunca se pierden porque vienen del código.
S22 — Se persisten solo los presets. La cadencia vigente sigue en memoria y se restaura desde el plan activo, como hoy.
S23 — La hidratación es async dentro de `AppBootstrap.restore()`, junto a planning/tasks; el shell ya espera `isReady`.
S24 — Registro ES con voseo, alineado al copy más reciente del área de planning, con las 14 claves de copy aprobadas.
S25 — Matriz completa de tests: entidad, repositorio, estado, `applyCadence` forward-only, componente y un test que fije el comportamiento previo de los steppers antes del refactor.
S26 — `CADENCE_LIMITS` en el dominio es la única fuente de los rangos (foco 1-120, pausa corta 1-60, pausa larga 1-90, intervalo 1-12) que hoy están duplicados como literales en los setters.

### Fuera de alcance y restricciones

- NO introducir dependencias externas sin validación previa.
- NO importar APIs de Tauri o DOM dentro de `src/lib/domain/`.
- NO tocar la FSM ni el cálculo del plan.
- Fuera de alcance: compartir, sincronizar o exportar presets entre dispositivos o cuentas.

## Tasks

| ID  | Specs                      | Route                | Estado  | Evidencia                                                  |
| --- | -------------------------- | -------------------- | ------- | ---------------------------------------------------------- |
| T1  | S6, S14-S16, S20, S21, S26 | inline               | done    | `7343cf5` — 34 tests de entidad                            |
| T2  | S3, S21                    | inline               | done    | `7343cf5` — 18 tests de adapter + contrato del puerto      |
| T3  | S8, S13, S25               | inline               | done    | `cd2f81b` — 80 tests de planning + 41 client sin regresión |
| T4  | S1, S4, S17, S22, S23      | inline               | pending | —                                                          |
| T5  | S9, S24                    | inline               | pending | —                                                          |
| T6  | S2, S5, S7, S18, S19       | inline               | pending | —                                                          |
| T7  | S10, S11                   | delegated (verifier) | pending | —                                                          |

Work units previstas: C1 = T1+T2 (dominio, puerto, adapter); C2 = T3 (applyCadence atómico); C3 = T4 (estado + bootstrap); C4 = T5+T6 (copy + UI); T7 cierra la feature.

## Log

L1 (2026-10-21, verbatim) — "@grilling usa tu sistema de question para que discutamos cómo resolver el issue #178"

L2 (2026-10-21, verbatim) — "Todo lo que hagas hacelo en un worktree"

L3 (2026-10-21) — Hechos verificados antes de decidir: la cadencia vigente no se persiste (solo se restaura desde el plan activo o `timer.config`); el snapshot del timer no guarda config; el copy editable vive en `messages/{es,en}.json` y `src/lib/paraglide/messages/*` es generado (el issue apunta al archivo generado); `CADENCE_PRESETS` vive en el `<script module>` del componente; `activePresetId` compara solo foco y pausa corta (`planning-cadence-config.svelte:71-78`); los cuatro setters los consumen los 8 steppers y los tests existentes.

L4 (2026-10-21) — Riesgo declarado: `Risk: item 3` — el diff toca los cuatro setters y los límites que consumen los steppers y tests existentes (código compartido). Consecuencia: test que fija el comportamiento previo + verificación independiente al cierre (T7).

L5 (2026-10-21) — Worktree creado: `git worktree add -b feat/178-cadence-presets ../pomody-worktrees/issue-178 main`. Sesión movida a ese directorio. `pnpm install --frozen-lockfile` lanzado.

L6 (2026-10-21) — Próximo paso: T1 (entidad de dominio) con RED primero.

L7 (2026-10-21) — C1 (`7343cf5`): entidad `cadence-preset.entity.ts` (límites como autoridad única, id derivado, validación con motivos tipados, saneo por entrada, matching de 4 valores con desempate al personalizado), puerto `ICadencePresetRepository`, adapter `local-cadence-preset-repository.ts` (clave `pomody:cadence-presets`, envelope v1, descarte de entradas inválidas, dedupe por id derivado, tope 10, fallback `InMemoryStorage`, aborto ante versión mayor) y `FakeCadencePresetRepository`. RED observado antes de cada implementación: módulo faltante y `clampCadence is not a function`. 34 + 18 + 1 tests verdes.

L8 (2026-10-21) — C2 (`cd2f81b`): `PlanningState.applyCadence()` atómico + los cuatro setters delegan vía `clampCadence`. Dos ajustes honestos durante la implementación: (a) el id derivado usa separador `:` (`custom:45:15:30:3`), no `/`, como fija S15; (b) los setters normalizan toda la cadencia con `clampCadence` en vez de sólo el campo editado, para que un plan restaurado con valores corruptos no convierta el click en un no-op silencioso.

L9 (2026-10-21) — Cambio en aserciones existentes (declarado, no silencioso): 4 tests de "Active session duration setters (forward-only)" afirmaban la forma del argumento parcial de `updateUpcomingPlanForwardOnly` (`{ focusDurationSeconds: 2700 }`). Con la escritura atómica el argumento es el config completo. Se reescribieron esas 4 aserciones al config completo, que es un pin más fuerte; todas las demás aserciones de esos mismos tests (estado, `timer.config`, duraciones y modos de bloques futuros, bloques pasados y activos intactos, stats derivadas) siguen intactas y pasan sin cambios. Verificación diferencial del refactor: 80 tests de `planning.test.ts` + 41 tests de componente del área planning en verde.
