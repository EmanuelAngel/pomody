# Especificación: Compañía Viva

> Feature del issue [#114](https://github.com/EmanuelAngel/pomody/issues/114), a partir de la propuesta del comentario `6186935872`.
> El **por qué** de cada decisión está en [`decisions.md`](./decisions.md). Este documento define **qué** se construye.

## 1. Objetivo

Agregar una compañía visual tranquila al timer: un paisaje pixel art de fondo que crece con los minutos de foco acumulados en el día. La recompensa es visual y no funciona como métrica: no agrega números, puntos ni interacción.

## 2. Progresión

- Fuente única: `dailyStats.accumulatedMinutes`, ya persistido por día calendario local.
- `step = min(15, floor(minutos / 25))`. El paso vive en `0..15`; el techo son 375 minutos (~6 h).
- `phase = min(fases - 1, floor(step * fases / 15))`. El clamp es obligatorio: sin él, el paso 15 devuelve una fase fuera de rango.
- Solo avanza al completar un bloque de foco. No hay progreso intra-bloque.
- El reset es perezoso, igual que `daily-stats`: al cargar la app o al completar el próximo bloque de foco. No hay scheduler de medianoche.
- Un bloque que cruza la medianoche puede reiniciar el contador al completarse. Es un caso borde aceptado.

## 3. Catálogo e ilustraciones

| id       | Fases | Cambio cada | Paleta                        |
| :------- | :---- | :---------- | :---------------------------- |
| `forest` | 5     | 75 min      | `pine`, `foam`, `text-subtle` |
| `desert` | 3     | 125 min     | `gold`, `pine`, `love`        |

- Las fases deben dividir 15: `1`, `3`, `5` o `15`.
- El desierto ata día, atardecer y noche al **progreso**, nunca a la hora real.
- El bosque progresa de amanecer a hora dorada y suma capas: semilla, brotes, árboles jóvenes, arboleda y bosque completo con hongos, flores y luciérnagas.
- Paleta derivada de tokens Rosé Pine con opacidades (`pine`, `foam`, `gold`, `love`, `rose`, `iris`): el límite inicial de 3 acentos se relajó para dar profundidad. El fondo del tema sigue actuando como cielo/base.
- Arte en una grilla nativa de `320 × 180`, con escala entera en modo **cover** calculada por `ResizeObserver`: `scale = ceil(max(w / 320, h / 180))`. La escena llena siempre la ventana y el sobrante se recorta.
- Sin `<canvas>`, WebGL, librerías de animación ni dependencias nuevas.

## 4. Ubicación

- Capa fija de fondo (`fixed inset-0`), solo en la pestaña **Timer**.
- `z-0` para la capa; el contenido de la app vive en `z-10`, el contador diario en `z-20` y el header en `z-30`.
- Oculta por debajo del breakpoint `md` y nunca se renderiza en el Mini-Player.
- `aria-hidden="true"` y `pointer-events-none`: es decorativa.
- Los dígitos, controles y la tarea conservan su contraste y su espacio.

## 5. Preferencias

```ts
illustration: {
  enabled: false,
  motionEnabled: true,
  hideWhileFocusing: false,
  selectedId: 'forest'
}
```

- `enabled`: switch maestro. Apagada por defecto.
- `motionEnabled`: deja la escena estática cuando está apagada.
- `hideWhileFocusing`: oculta la capa mientras corre un bloque de foco.
- `selectedId`: selector con miniatura por ilustración.
- Persisten en el envelope existente `pomody:settings`, sin bump de versión. Los registros viejos caen a los defaults campo por campo.
- Etiquetas por i18n (`en` / `es`).

## 6. Movimiento y accesibilidad

- `isVisible = enabled && !(hideWhileFocusing && focoCorriendo)`.
- `shouldAnimate = isVisible && motionEnabled && focoCorriendo`.
- La animación es solo CSS: un desplazamiento de un píxel de arte con `ease-in-out` largo.
- `animation-play-state: paused` cuando no corresponde animar; en pausa y en descansos no corre ninguna animación.
- `@media (prefers-reduced-motion: reduce)` elimina la animación.
- Sin bucles de JavaScript ni `requestAnimationFrame`.

## 7. Criterios de aceptación

- `step` y `phase` se calculan con funciones puras y están cubiertos por tests de dominio, incluido el clamp del paso 15.
- Un bloque de foco completado mueve `daily-stats` y la fase en un solo test de integración; un descanso no la mueve.
- El catálogo se valida con un test parametrizado: toda entrada monta todas sus fases y clampea valores fuera de rango. Agregar una ilustración no requiere tests nuevos.
- Los tres switches y el selector actualizan el estado y persisten.
- La capa no se monta apagada, ni al enfocar con `hideWhileFocusing`, ni durante un descanso en curso.
- `pnpm check`, `pnpm test:unit`, `pnpm test:browser` y `pnpm lint` pasan.

## 8. Fuera de alcance

- La franja de entorno de 4 etapas.
- Persistir el bosque entre días o ciclos.
- Interacción, puntos o logros.
- Selector de hora de reinicio del día.
- Modificaciones al FSM del timer o a sus eventos.
