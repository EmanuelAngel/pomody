# Persistencia del Timer — Decisiones de Implementación

> Registro de las decisiones tomadas antes de escribir la primera línea de código.
> Este documento explica **por qué** cada cosa es como es. **Qué** se construye vive en [`spec.md`](./spec.md); si los dos se contradicen, manda la spec.
>
> Issue: [#155](https://github.com/EmanuelAngel/pomody/issues/155) · Absorbe [#149](https://github.com/EmanuelAngel/pomody/issues/149) · Padre: [#151](https://github.com/EmanuelAngel/pomody/issues/151).

---

## 1. Semántica del tiempo

**Reloj real con umbral.** Un bloque que estaba `running` y todavía no venció continúa con `remaining = endsAt - now` y se reanuda solo. Un bloque que venció mientras la app estaba cerrada se descarta a `idle` y **no** cuenta como pomodoro.

Descartadas:

- **Congelar el bloque** (restaurar pausado): cada reload costaría un clic, que es exactamente la fricción que la feature elimina.
- **Reloj real puro** (marcar `completed` al vencer): contaría como hecho un pomodoro que nadie hizo. Es la mentira más caras que puede decir un timer de foco.

El umbral no es un número configurable: es el propio `remainingMs`. Si `elapsed >= remainingMs`, el bloque venció; si no, seguir corriendo es la lectura honesta.

## 2. Qué se restaura

**Sesión completa**, no solo el reloj. El plan ya se persistía, pero `planningState.load()` solo corría al abrir Planning. Sin mover la carga al bootstrap, un reload dejaría un reloj corriendo sin sesión, sin bloque activo y sin task pill. El issue pide "sobrevivir", y eso incluye el contexto que hace legible el reloj.

## 3. Dato inválido

**Reset silencioso.** Es lo que ya hacen `sanitizeSessionPlan` y `sanitizePlanBlock`: nunca se abre un diálogo por un dato local corrupto. Se borra la clave, se deja traza en consola y se ancla al bloque activo.

## 4. Alcance de #149

**Absorbido.** Los e2e con `page.reload()` son la prueba natural de esta feature. Mantenerlos separados obligaría a duplicar el harness y a sembrar el mismo estado dos veces.

## 5. Forma del snapshot

**Ancla absoluta (`endsAt`) y escritura solo en transiciones.** Escribir `remainingMs` por tick castiga storage y frame sin aportar precisión; escribir `endsAt` en `start`/`resume` hace que un cierre inesperado no pierda nada. Coincide además con lo que `docs/architecture.md` §4.2 ya declaraba (y el código no hacía).

## 6. Bloque vencido y plan

**El bloque queda `in_progress`.** No se marca `skipped` (la sesión progresaría sin que el usuario hiciera el bloque) ni se cierra la sesión (destructivo y no pedido). Reintentarlo es pulsar Start.

## 7. Reanudación

**Automática** cuando el bloque no venció. Restaurar en pausa convertiría la feature en "recuerda dónde estabas, pero decide de nuevo".

## 8. `completed`

**Sobrevive.** Si el bloque terminó y la app se cerró antes del Start, al volver sigue `completed` y el próximo Start avanza el ciclo como hoy. Restaurarlo como `idle` perdería el avance que hace `start()` y dejaría el plan desfasado.

## 9. Fuente de verdad

**El snapshot manda en ejecución y valida contra el plan.** `mode` y `durationMs` deben coincidir con el bloque del plan; si no, reset. La alternativa (reconstruir todo desde el plan) le quitaría al FSM la propiedad de su ejecución, que es justo lo que fijó #151.

## 10. Contrato de persistencia

**Puerto y clave dedicados.** `ITimerStateRepository` + `pomody:timer-state` v1. Extender el envelope del plan a v2 habría dado atomicidad entre plan y reloj, pero al costo de migrar v1 y de acoplar dos dueños distintos. El orden de escritura (§5 de la spec) cubre la consistencia sin fusión.

## 11. Dos pestañas web

**Last-write-wins, documentado.** Sincronizar ventanas es otro problema (evento `storage`, un solo dueño) y bloquea un caso de uso legítimo. Se acepta la limitación explícitamente.

## 12. Tarea activa

**Derivada del plan.** El bloque activo la define si es focus; en break no se toca `tasksState` porque el avance del plan la repone. Persistir `activeTaskId` habría duplicado un dato que ya vive en el plan.

## 13. Plan sin snapshot

**`idle` anclado al bloque activo.** Es el caso de un upgrade a mitad de sesión o de un snapshot borrado. Resetear a `focus 25:00` haría correr el bloque con una duración distinta a la del plan; terminar la sesión sería destructivo.

El mismo anclaje se usa al descartar un bloque vencido, lo que además corrige un hueco: sin él, el reintento correría la duración de settings y no la congelada en la sesión.

## 14. Deriva FSM vs plan

**Fuera de alcance, con issue aparte.** Cambiar `roundsBeforeLongBreak` a mitad de sesión ya puede desincronizar `advanceMode` del plan. Resolverlo exige que el FSM tome el ciclo del plan, lo que reabre la decisión de ownership de #151. #155 valida y resetea; la duplicación se ataca en un issue propio.

## 15. Identidad del bloque

**`blockIndex` explícito.** Cuando un bloque termina, el plan ya avanzó al siguiente `in_progress` mientras el FSM sigue `completed` en el anterior. Sin índice explícito habría que adivinar contra qué bloque validar; con él, `completed` valida contra `activeBlockIndex - 1` y el resto contra `activeBlockIndex`.

## 16. Entrega

**Tres PRs encadenados**: dominio y contrato → bootstrap y wiring → e2e y docs. El repo corta PRs de ~400 líneas y cada slice tiene una superficie de revisión distinta.
