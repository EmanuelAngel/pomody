# Especificación Técnica: Persistencia del Estado del Timer (v0.5)

> Documento de diseño técnico y contrato de restauración para que el reloj sobreviva a un reload del navegador y a un reinicio de la app de escritorio.
>
> El **por qué** de cada decisión está en [`decisions.md`](./decisions.md). Este documento define **qué** se construye y **cómo** se integra.
>
> Issue: [#155](https://github.com/EmanuelAngel/pomody/issues/155) · Absorbe [#149](https://github.com/EmanuelAngel/pomody/issues/149) · Padre: [#151](https://github.com/EmanuelAngel/pomody/issues/151) (ownership de estado).

---

## 1. Contexto y Objetivos

Hoy el plan de sesión ya se persiste en `pomody:session-plan` (v1), pero la ejecución del reloj vive únicamente en memoria:

- `TimerFSM` pierde `state`, `mode`, `remainingMs`, `durationMs`, `currentRound` y `totalRoundsCompleted`.
- `planningState.load()` solo corre al abrir la pestaña Planning, así que tras un reload el timer muestra `idle` y el task pill queda vacío.
- Nada identifica qué bloque del plan estaba ejecutándose.

**Objetivo**: un reload o un reinicio no cuesta tiempo de foco ni contexto de sesión.

**No objetivos**: sincronizar dos pestañas, rehacer la FSM, ni resolver la duplicación entre el ciclo del FSM y la secuencia del plan (ver §7).

---

## 2. Contrato de Persistencia

### 2.1 Clave y envelope

| Elemento             | Valor                                          |
| :------------------- | :--------------------------------------------- |
| Clave                | `pomody:timer-state`                           |
| Envelope             | `{ "version": 1, "snapshot": TimerSnapshot }`  |
| Dueño                | `ITimerStateRepository`                        |
| Independiente de     | `pomody:session-plan` (sigue en v1, sin tocar) |
| Fallback SSR / tests | `InMemoryStorage`                              |

No se migra el envelope del plan. Un snapshot corrupto nunca daña el plan y viceversa.

### 2.2 Snapshot

```ts
export interface TimerSnapshotRecord {
	readonly planId: string | null; // null = reloj libre, sin sesión
	readonly blockIndex: number | null; // índice del bloque del plan que ejecuta el FSM
	readonly state: 'idle' | 'running' | 'paused' | 'completed';
	readonly mode: 'focus' | 'shortBreak' | 'longBreak';
	readonly durationMs: number; // duración anclada del bloque en curso
	readonly currentRound: number;
	readonly totalRoundsCompleted: number;
	readonly endsAt?: number; // solo en running: ancla absoluta (now + remaining)
	readonly remainingMs?: number; // idle / paused / completed
	readonly savedAt: number;
}
```

Reglas de forma:

- `running` exige `endsAt` finito y prohíbe `remainingMs`.
- `idle`, `paused` y `completed` exigen `remainingMs` finito entre `0` y `durationMs`.
- `idle` exige `remainingMs === durationMs`; `completed` exige `remainingMs === 0`.
- `planId === null` exige `blockIndex === null`, y viceversa.
- `durationMs` entero positivo; `currentRound` entero `>= 1`; `totalRoundsCompleted` entero `>= 0`.

### 2.3 Puerto y adaptador

```ts
export interface ITimerStateRepository {
	load(): Promise<TimerSnapshotRecord | null>;
	save(snapshot: TimerSnapshotRecord): Promise<void>;
	clear(): Promise<void>;
}
```

`LocalStorageTimerStateRepository` valida el envelope y el snapshot al leer, ignora versiones desconocidas o más nuevas, y absorbe `QuotaExceededError`/`SecurityError` como el resto de adaptadores del repo. La escritura nunca lanza hacia la UI.

---

## 3. Semántica de Restauración

La resolución es una función pura de dominio:

```ts
resolveTimerRestore({ persisted, plan, now }): RestoreDecision

type RestoreDecision =
	| { kind: 'adopt'; state; mode; durationMs; remainingMs; currentRound; totalRoundsCompleted }
	| { kind: 'anchor'; mode; durationMs; currentRound; totalRoundsCompleted }
	| { kind: 'fresh' };
```

`plan` es una vista estructural del plan activo (`id`, `activeBlockIndex`, `blocks[]` con `index`, `mode`, `durationSeconds`), sin acoplar `domain/timer` a `domain/planning`.

### 3.1 Matriz de decisión

| Snapshot persistido                                  | Plan activo                                        | Resultado                                                       |
| :--------------------------------------------------- | :------------------------------------------------- | :-------------------------------------------------------------- |
| `running`, `0 < endsAt - now <= durationMs`          | `planId` y bloque coinciden                        | `adopt running`, remaining recalculado y reanudación automática |
| `running`, `endsAt - now <= 0`                       | cualquiera                                         | descarte → `anchor` al bloque activo                            |
| `running`, `endsAt - now > durationMs` (reloj atrás) | cualquiera                                         | descarte → `anchor` al bloque activo                            |
| `paused`                                             | `planId` y bloque coinciden                        | `adopt paused` con su remaining exacto                          |
| `idle`                                               | `planId` y bloque coinciden                        | `adopt idle` con su mode y duración                             |
| `completed`                                          | `planId` y bloque `activeBlockIndex - 1` coinciden | `adopt completed` con `remainingMs = 0`                         |
| ausente o inválido                                   | con bloque activo                                  | `anchor` al bloque activo                                       |
| ausente o inválido                                   | sin plan activo                                    | `fresh`                                                         |
| `planId = null`                                      | sin plan activo                                    | `adopt` tal cual (reloj libre)                                  |
| `planId = null`                                      | con plan activo                                    | descarte → `anchor` al bloque activo                            |
| `planId` con plan ausente                            | sin plan activo                                    | `fresh`                                                         |
| snapshot `completed` del mismo plan                  | plan activo **completo**                           | `adopt completed`                                               |
| cualquier otro snapshot                              | plan activo **completo**                           | `fresh`                                                         |

### 3.2 Descarte silencioso

Un descarte nunca bloquea al usuario ni muestra un diálogo:

1. Se borra `pomody:timer-state`.
2. Se registra una traza en consola con el motivo (`invalid-snapshot`, `plan-mismatch`, `expired`, `clock-skew`, `orphan-plan`).
3. Se aplica `anchor` si hay plan activo, o `fresh` si no lo hay.

El bloque vencido **no** se marca `skipped` ni se cierra la sesión: queda `in_progress` y reintentarlo es pulsar Start.

### 3.3 Anclaje al bloque activo

`anchor` deja el FSM en `idle` con el `mode` y la duración congelada del bloque activo, y deriva:

- `currentRound` = cantidad de bloques focus hasta el índice activo inclusive.
- `totalRoundsCompleted` = cantidad de bloques focus ya `completed` en el plan.

Así un reintento corre la duración de la sesión y no la de settings.

---

## 4. Bootstrap

`+layout.svelte` no renderiza el shell hasta que el restore termina (evita el flash de `25:00` idle). Orden fijo:

```text
1. planningState.load()            → plan activo y activeBlockIndex
2. timerState.applyPlanBinding()   → planId + activeBlockIndex
3. resolver + adopt/anchor/fresh   → config congelada de la sesión, sin escribir settings
4. tasksState.load()               → backlog disponible para el task pill
5. derivar tarea activa            → bloque activo si es focus; null si es break
```

- **Tarea activa**: se deriva del plan. En break no se toca `tasksState`; el avance del bloque la repone.
- **Config congelada**: el FSM adopta `plan.sessionConfig` sin persistirlo en `pomody:settings`. Un reload nunca revierte preferencias del usuario.
- **Idempotencia**: `planningState.load()` retorna temprano si ya cargó. Abrir Planning después del bootstrap no re-lee ni re-aplica el plan.
- **Fallback**: si el restore falla por una excepción inesperada, la app arranca con el estado por defecto y deja traza. Nunca queda una pantalla en blanco.

---

## 5. Escritura

| Evento                     | Escritura                                        |
| :------------------------- | :----------------------------------------------- |
| `start` / `resume`         | `running` con `endsAt = now + remainingMs`       |
| `pause`                    | `paused` con `remainingMs` exacto                |
| `skip`                     | tras el avance del plan, `idle` del bloque nuevo |
| `reset` / `resetToInitial` | `idle` del mode resultante, duración completa    |
| completación de bloque     | `completed` del bloque que acaba de terminar     |
| `restore`                  | se reescribe el snapshot ya normalizado          |
| `endSession`               | se borra la clave                                |
| tick (250 ms)              | **cero escrituras**                              |

**Orden de settle**: cuando una completación o un skip mueven el plan, `PlanningState` guarda el plan y recién después persiste el snapshot. Sin ese orden, `blockIndex` podría apuntar al bloque siguiente mientras el FSM todavía pertenece al anterior.

`blockIndex` lo aporta el dueño del plan, no el FSM: `completedBlockIndex` cuando el FSM está `completed`, `activeBlockIndex` en cualquier otro estado. Un FSM `completed` sigue perteneciendo al bloque que acaba de cerrar, incluso si el plan ya avanzó; en el último bloque de la sesión el plan no avanza y ambos índices coinciden.

---

## 6. Ciclo de Vida

| Acción                   | Efecto sobre la persistencia                                        |
| :----------------------- | :------------------------------------------------------------------ |
| `startSession`           | binding al plan nuevo, snapshot `running`                           |
| `advanceActiveBlock`     | plan guardado, binding actualizado, snapshot del bloque cerrado     |
| `endSession`             | FSM reset, plan borrado, binding a `null` y clave del timer borrada |
| Reloj libre (sin sesión) | `planId = null`, se restaura sin validar contra el plan             |
| Cierre de app / pestaña  | no requiere hook: `endsAt` ya está persistido                       |

---

## 7. Límites y No Objetivos

- **Dos pestañas web**: la última escritura gana. No hay evento `storage`, ni lock, ni bloqueo de la segunda pestaña.
- **Deriva de ciclo**: cambiar `roundsBeforeLongBreak` a mitad de sesión puede hacer que `TimerFSM.advanceMode` pida un break distinto al que tiene el plan. #155 valida y resetea; la duplicación se resuelve en un issue aparte.
- **Desktop**: el mini-player es la misma ventana redimensionada, no una segunda webview. El reinicio usa el mismo `localStorage` de WebView2; no hay adaptador nativo nuevo.
- **Historial y métricas**: no se persiste nada nuevo para estadísticas. Un bloque vencido con la app cerrada nunca cuenta como completado.

---

## 8. Verificación

### 8.1 Unit (Node / Vitest)

- `resolveTimerRestore`: cada fila de §3.1, incluidos reloj hacia atrás, plan ausente y `completed` en `activeBlockIndex - 1`.
- Sanitizer: campos faltantes, tipos incorrectos, `remainingMs` fuera de rango, envelope de versión desconocida.
- `TimerFSM.adopt`: validaciones y snapshot resultante.
- `TimerState`: escritura solo en transiciones (contador de `save` invariante durante N ticks).
- `PlanningState`: binding, orden plan→snapshot, idempotencia de `load`, limpieza en `endSession`.

### 8.2 E2E (Playwright)

1. Reload con bloque `running`: mismo remaining (±2 s) y sigue corriendo.
2. Reload con bloque vencido mientras la app estaba cerrada (snapshot sembrado con `endsAt` viejo): `idle` anclado al bloque, plan con el bloque `in_progress`.
3. Reload con sesión activa: plan, bloque activo y tarea se restauran sin abrir Planning.
4. `endSession` + reload: arranque limpio, sin plan ni snapshot.

---

## 9. Trazabilidad

| Requisito                       | Issue       | Slice            |
| :------------------------------ | :---------- | :--------------- |
| Reloj sobrevive reload/restart  | #155        | 1-3              |
| Cobertura e2e de reload         | #149        | 3                |
| Ownership timer/sesión/settings | #151        | previo           |
| Deriva FSM vs plan              | issue nuevo | fuera de alcance |
