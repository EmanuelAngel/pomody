# Contador de tiempo perdido (pausa y fin de bloque)

> Qué muestra Pomody mientras espera que el usuario retome, y por qué el ancla vive donde vive.

---

## 1. Problema

El timer solo avanza cuando el usuario aprieta continuar. Si pausó para atender algo, o el bloque terminó mientras estaba en otra ventana, el cronómetro queda quieto sin decir **cuánto tiempo pasó** desde ese instante. La campanada y el aviso de fin de bloque registran que algo terminó, pero no cuánto se perdió después.

## 2. Alcance

**Incluye**:

- Una línea bajo el reloj, visible solo en `paused` y `completed`, con el tiempo transcurrido desde ese instante y actualizada cada segundo.
- Copy distinto según lo que se espera: una pausa o un bloque terminado.
- Ancla recuperada tras recargar la app, a partir del `savedAt` del snapshot persistido.

**Excluye, a propósito**:

- Historial o Métricas: el tiempo perdido no se agrega ni se guarda como métrica. El contador es un aviso en pantalla, no un registro.
- El Mini-Player: su altura de 64 px ya está repartida y el contador no entra sin desplazar los controles.
- Avisos del sistema operativo por tiempo perdido: esos canales ya existen para el fin de bloque y este contador no los dispara.

## 3. Regla de disparo

| Estado del FSM | Contador                      |
| -------------- | ----------------------------- |
| `idle`         | No                            |
| `running`      | No                            |
| `paused`       | Sí, «Pausado hace …»          |
| `completed`    | Sí, «Bloque terminado hace …» |

El contador desaparece al reanudar, al empezar el bloque siguiente, al saltar y al reiniciar: los cuatro caminos sacan al FSM de un estado de espera.

## 4. Ancla y formato

- **En sesión**: el instante se toma del reloj inyectado (`now`) en el momento exacto de la transición a `paused` o `completed`, en el suscriptor del FSM de `TimerState`. Ningún tick lo mueve.
- **Tras recargar**: `resolveTimerRestore` copia el `savedAt` del registro persistido al campo `waitingSince` de la decisión `adopt`, y el estado lo adopta. Para `paused`/`completed` ese sello es el momento de la última escritura, que es la transición misma, así que el contador retoma donde estaba. Si el registro no trae ancla, el contador no se muestra: nunca se inventa un cero.
- **Formato** (`formatElapsed`, dominio puro): trunca a segundos enteros (`00:00` recién ocurrido, nunca `00:01`), usa `MM:SS` por debajo de una hora y `H:MM:SS` desde ahí, para que una ausencia larga no se lea como `75:12`.
- La línea reserva su altura (`h-5`) siempre, así los controles no saltan cuando el contador aparece o se va.

## 5. Copy (i18n)

- `timer_waiting_since_paused`: «Paused for {elapsed}» / «Pausado hace {elapsed}»
- `timer_waiting_since_completed`: «Block finished {elapsed} ago» / «Bloque terminado hace {elapsed}»

## 6. Piezas

| Archivo                                         | Rol                                                            |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `src/lib/domain/timer/elapsed-since.ts`         | `formatElapsed`, puro y sin DOM.                               |
| `src/lib/state/timer.svelte.ts`                 | `waitingSince` reactivo, anclado en las transiciones.          |
| `src/lib/domain/timer/timer-snapshot.entity.ts` | `waitingSince` en la decisión de restore, tomado de `savedAt`. |
| `src/lib/components/timer/waiting-since.svelte` | La línea y su tick de un segundo.                              |
| `src/lib/components/timer/timer.svelte`         | La monta entre el arco y los controles.                        |

## 7. Límite conocido

El `savedAt` se reescribe en cada `persistNow`, incluido el que el bootstrap hace al terminar de restaurar. Por eso, tras **dos** recargas sin reanudar, el ancla se corre a la recarga anterior y el contador arranca más cerca del cero. Se acepta: la precisión del primer regreso es la que importa, y persistir un campo propio exigiría cambiar el formato del snapshot para un caso de borde.
