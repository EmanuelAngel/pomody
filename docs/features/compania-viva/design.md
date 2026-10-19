# Diseño técnico: Compañía Viva

## 1. Capas

```text
domain/illustration/illustration-progress.ts   step, phase, pixel scale (puro)
domain/illustration/illustration-catalog.ts    metadata del catálogo (puro)
domain/ports/settings-storage.port.ts          IllustrationSettings + defaults
adapters/storage/local-settings-storage.ts     envelope v1 + sanitización
state/illustration.svelte.ts                   derivaciones reactivas
components/illustration/                       escenas, registro y capa de fondo
components/settings/settings-drawer.svelte     switches + selector
```

El dominio no conoce Svelte, DOM ni Tauri. Los renderers son componentes Svelte y viven fuera de `domain/`.

## 2. Flujo de datos

```mermaid
flowchart LR
  FSM[TimerFSM] -->|block-completed focus| DS[dailyStatsState]
  DS -->|accumulatedMinutes| IS[illustrationState]
  SET[LocalSettingsStorage] -->|preferences| IS
  IS -->|selectedId, phase, shouldAnimate| BG[illustration-background]
  BG --> R[forest | desert renderer]
  UI[settings-drawer] -->|setEnabled, setMotionEnabled, setSelectedId| IS
  IS -->|saveSettings| SET
```

- `dailyStatsState` sigue siendo la única fuente del progreso.
- `illustrationState` no persiste progreso: solo deriva.
- El catálogo partido (metadata pura + renderers) evita que el dominio importe componentes.

## 3. Render

- Lienzo nativo `320 × 180` (`ART_WIDTH` / `ART_HEIGHT`).
- `calculatePixelScale(ancho, alto)` devuelve el mayor múltiplo entero que entra, con mínimo 1.
- `illustration-background` mide su contenedor con un `ResizeObserver` y fija el tamaño exacto del lienzo. El observer solo reacciona a cambios de tamaño: no hay bucle por frame.
- El SVG usa `shape-rendering="crispEdges"` y `preserveAspectRatio="xMidYMax slice"`.
- La capa se ancla abajo (`items-end`) para que la línea de suelo quede estable.

## 4. Animación

- Cada escena declara `animation` CSS y `animation-play-state: paused` por defecto.
- La clase `animated` en el `<svg>` habilita el movimiento.
- `prefers-reduced-motion: reduce` desactiva la animación.
- El desplazamiento es de 1 píxel de arte, así que a escala entera cae siempre en la grilla.

## 5. Persistencia y compatibilidad

- `illustration` se agrega al envelope `pomody:settings` versión 1 como campo opcional.
- `validateAndSanitize` valida los tres booleanos y resuelve `selectedId` contra el catálogo; cualquier valor inválido cae al default.
- Los registros previos sin `illustration` cargan los defaults sin migración.
- `FakeSettingsStorage` mergea el campo completo; no requiere cambios.

## 6. Tests

- Dominio (`server`): pasos, techo, entradas inválidas, mapeo de fases para 1/3/5/15, clamp y escala entera.
- Estado (`server`): derivaciones, visibilidad, animación, switches y la integración `block-completed → daily-stats → fase`.
- Componentes (`client`): contrato parametrizado del catálogo, capa de fondo y controles de Settings.

## 7. Riesgos y casos borde

- **Paso 15 sin clamp**: devolvería `fases` en lugar de `fases - 1`. Cubierto por tests.
- **Reset perezoso**: una app abierta toda la noche conserva la escena del día anterior hasta el próximo bloque. Se acepta y se documenta.
- **Cruce de medianoche**: un bloque que empieza antes y termina después de las 00:00 puede reiniciar el contador al completarse.
- **Ventanas angostas**: por debajo de `md` no se monta la capa. El Mini-Player nunca la renderiza porque reemplaza el shell completo.
- **Escala fraccionaria**: el observer solo aplica múltiplos enteros; en ventanas muy chicas la escena se dibuja a escala 1.
