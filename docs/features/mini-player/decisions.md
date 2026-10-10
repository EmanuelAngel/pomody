# Mini-Player — Decisiones de Implementación

> Registro de las decisiones tomadas antes de escribir la primera línea de `mini-player.svelte`.
> Este documento explica **por qué** cada cosa es como es. **Qué** se construye vive en [`design.md`](./design.md) y [`spec.md`](./spec.md); si los tres se contradicen, mandan esos dos.
>
> Issues: [#102](https://github.com/Gentleman-Programming/pomody/issues/102) (componente) · [#103](https://github.com/Gentleman-Programming/pomody/issues/103) (integración con la ventana) · [#101](https://github.com/Gentleman-Programming/pomody/issues/101) (puerto de ventana, cerrado).

---

## 1. Reparto de alcance

El trabajo quedó partido en **dos slices**, no en uno grande.

| Slice                     | Entrega                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| **#102** (este documento) | `mini-player.svelte`, sus tests, claves i18n, correcciones a los docs y `MINI_WINDOW_DIMENSIONS` |
| **#103**                  | `setDecorations(false)`, `setResizable(false)`, `Escape`, disparador en `Header`                 |

**Por qué la separación es obligatoria y no una preferencia de tamaño.** `IWindowShell` expone hoy exactamente tres métodos: `enterMiniPlayer()`, `restoreMainWindow()` e `isAlwaysOnTop()`. **No hay forma de pedirle que cambie decorations ni resizable**, y `src-tauri/capabilities/default.json` no incluye `core:window:allow-set-decorations` ni `core:window:allow-set-resizable`.

Meter eso en #102 obligaría a tocar el puerto, el adaptador de Tauri, los permisos, el fake de test y sus tests. Eso ya no es "el componente", y #103 existe con exactamente ese título y ese alcance. #102 entrega el widget probándose con `FakeWindowShell`, que es justo para lo que ese fake existe.

---

## 2. Decisiones

### Estructura

| Decisión              | Valor                                   | Por qué                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nombre del componente | `mini-player.svelte`                    | kebab-case, convención del 100% del repo (`task-pill`, `timer-controls`, `break-confirm-dialog`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Layout                | 3 columnas + barra de progreso flotante | `_spec.md` §3.1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Botones               | Bespoke dentro del componente           | `timer-controls.svelte` usa `size-16` (64px) para Play y `size-12` (48px) para Reset/Skip. En un widget de 64px de alto no entra. Reusarlo exige overridear tamaño, gap, alineado y lógica de visibilidad: deja de ser reuso y pasa a ser pelear contra el componente. Se usa `size="icon-xs"` (24px reales).                                                                                                                                                                                                                                                                       |
| Dimensiones           | **320x48**                              | 4 controles revelados + ícono + timer no entran cómodo en 260. Los píxeles de más no cuestan nada; el _layout shift_ al revelar, sí. **Implica editar `MINI_WINDOW_DIMENSIONS` (260x60) en `src/lib/domain/ports/window-shell.port.ts:23` y su test** — es una constante de dominio congelada que consume `TauriWindowShell`, no un valor del componente. Dos iteraciones de dogfooding: 280→320 por los botones pegados al timer y los títulos que lo pisaban; 64→48 porque a 64px el contenido (24px) flotaba con 16px de aire muerto arriba y abajo y el widget se veía cabezón. |
| Altura mínima         | `MINI_WINDOW_MIN_DIMENSIONS` 200x**40** | Tiene que quedar **por debajo** de la altura del mini. Windows clampea el tamaño pedido al mínimo sin reportar nada, así que un mínimo de 50px con un mini de 48px habría dejado la ventana 2px más alta en silencio.                                                                                                                                                                                                                                                                                                                                                               |
| Redimensionable       | No                                      | Todo el diseño (centering absoluto, ancla de Play, marquee) está calibrado para un ancho fijo. Estirado a 600px el centering queda ridículo y el marquee nunca dispara.                                                                                                                                                                                                                                                                                                                                                                                                             |

### Comportamiento

| Decisión                | Valor                                                  | Por qué                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estado                  | Props con default al singleton                         | Patrón exacto de `task-pill.svelte` (`tasksState?: TasksState` con default). Permite inyectar `FakeWindowShell` en Vitest sin arrancar una ventana real.                                                                                                                                                                                                                                              |
| Hover                   | **Un único estado** para todo el widget                | La botónera se revela en hover (`design.md` §2.3) y el marquee arranca en hover (§2.1). En 64px de alto las zonas se pisan y el usuario no las distingue. Un solo `$state` booleano cubre ambas y simplifica el marquee.                                                                                                                                                                              |
| Botonera                | `[Reset]` `[Skip]` `[Restaurar]` + `[Play/Pause]` fijo | 4 controles, los tres primeros revelados en hover hacia la izquierda del Play, que queda anclado al margen derecho sin moverse 1px.                                                                                                                                                                                                                                                                   |
| **Sin botón de cerrar** | —                                                      | El mini-player es un modo de la misma app, no una app. Cerrarlo debe devolver a la ventana principal, no matar el timer. `Restaurar` es la salida.                                                                                                                                                                                                                                                    |
| Play/Pause              | 3 líneas compuestas inline                             | `timerState` **no tiene `isPaused` ni método toggle**. El play/pause se compone en el call site (`timer.svelte:30-38`): `isRunning → pause()`, `state === 'paused' → resume()`, si no `start()`. Se replica en vez de extraer un helper compartido: 3 líneas duplicadas son más baratas que un archivo nuevo con sus propios tests para dos consumidores. Si aparece un tercer consumidor, se extrae. |
| Foco de la ventana      | El componente **no asume foco propio**                 | En Windows, hacer clic en una ventana la enfoca, y enfocarla hace que lo que el usuario escriba a partir de ahí vaya a Pomody. Es exactamente lo contrario de lo que debe hacer un widget periférico. Los clics en sus botones funcionan siempre; `Escape` queda como atajo opcional, no como vía principal.                                                                                          |
| Always-on-top           | Automática al entrar                                   | `windowState.toggleMiniPlayer()` ya lo hace. Windows permite sacarla del menú de contexto de la ventana; gastar un control del mini en eso no vale el costo.                                                                                                                                                                                                                                          |
| Marquee                 | JS con medición de overflow                            | Con CSS puro el texto se mueve siempre, incluso cuando entra bien — y el caso "el título cabe" es el más común. Se mide `scrollWidth > clientWidth` y solo se anima cuando corresponde.                                                                                                                                                                                                               |

### Estética

| Decisión           | Valor                                                             | Por qué                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Color del ícono    | `bg-accent-foam/10 text-accent-foam`, `-pine`, `-iris`            | **Los tokens del `design.md` no existen.** Dice `bg-foam`; `app.css:148-153` define `--color-accent-foam`, `--color-accent-pine`, `--color-accent-iris`. Las clases reales llevan el prefijo `accent-`.                                                                                                                                                                                                |
| Íconos de estado   | `circle-dot` (focus) · `leaf` (shortBreak) · `sprout` (longBreak) | Verificados en `node_modules/@lucide/svelte/dist/icons/`. `Target` (el que pedía `design.md` §2.1) queda reemplazado por decisión de diseño.                                                                                                                                                                                                                                                           |
| Ícono de restaurar | `maximize-2`                                                      | `maximize` de flecha simple se lee como "pantalla completa", y eso es un error: la ventana no maximiza, vuelve a 800x650. `maximize-2` es lo más cercano al `⤢` del §2.3.                                                                                                                                                                                                                              |
| Esquina y sombra   | Cuadradas, sin sombra, **en todas las plataformas**               | `decorations: false` elimina radio, marco y sombra también en Windows 11 — confirmado en [tauri#4733](https://github.com/tauri-apps/tauri/issues/4733). Ver [`003-tauri-frameless-window-quirks.md`](../learnings/003-tauri-frameless-window-quirks.md). Recuperarlas en Win11 requiere la crate Rust `window-shadows`, que toca `Cargo.lock` (regla 8 de AGENTS.md): issue aparte, no efecto lateral. |
| Drag region        | Atributo **elemento por elemento**, nunca en la botonera          | No se hereda en Tauri. Y el diseño es _opt-in_, no opt-out: un elemento nuevo nace sin drag. Ver el learning 003. Requiere además el permiso `core:window:allow-start-dragging`, que **no viene incluido en `core:window:default`**: sin él todas las regiones de arrastre de la app quedan inertes, sin ningún error visible.                                                                         |
| Barra de progreso  | 2px, `mx-3 mb-1.5 rounded-full`, `bg-accent-<modo>`               | `timerState.progress` **ya devuelve `0..1`** (`timer-fsm.ts:192-197`), no `0..100`. No hay que recalcular nada.                                                                                                                                                                                                                                                                                        |
| Dígitos del timer  | `font-mono text-sm font-medium tabular-nums`                      | `formattedTime` ya devuelve `MM:SS` con padding. La tipografía monoespaciada es la que evita la oscilación de ancho; `tabular-nums` por sí solo iguala el ancho de los dígitos pero no cambia la familia. JetBrains Mono ya estaba instalada.                                                                                                                                                          |
| Layout del timer   | Grid de 3 columnas `1fr auto 1fr`                                 | Reemplaza el `absolute left-1/2` original, con el que la caja del texto de la tarea pasaba por debajo de los dígitos y ambos se solapaban. Dos pistas `1fr` simétricas hacen el solapamiento imposible por construcción.                                                                                                                                                                               |

### Localization

| Decisión    | Valor                                                                                      | Por qué                                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claves i18n | Prefijo `mini_player_*`, agregadas en este slice a `messages/en.json` y `messages/es.json` | Convención snake_case del repo (`timer_*`, `task_pill_*`). Un componente que shippea labels hardcodeados rompe el precedente de `task-pill`. Laskeys son functions: `t.mini_player_restore()`. |

---

## 3. Correcciones que este slice aplica a los docs

Los dos documentos de diseño tienen errores que, implementados al pie de la letra, producen código roto o muerto. **Ya están aplicados** a `design.md` y `spec.md` como parte de este slice:

| Doc         | Sección    | Corrección                                                                          |
| ----------- | ---------- | ----------------------------------------------------------------------------------- |
| `design.md` | §2.1       | `Target` → `CircleDot`                                                              |
| `design.md` | §2.1       | `bg-foam` → `bg-accent-foam` (idem `pine`, `iris`)                                  |
| `design.md` | §2.3       | Nota explícita de que no hay botón de cerrar y de que el hover es único             |
| `design.md` | §2.4       | `bg-foam` → `bg-accent-foam` (idem `pine`, `iris`)                                  |
| `design.md` | §3         | Aclaración de que el radio de la ventana no existe con `decorations: false`         |
| `design.md` | §4.1       | El drag no va en "el contenedor general": no se hereda. Atributo por elemento.      |
| `design.md` | §4.2       | 280x64 en vez de "~260x60 o ~280x64". No redimensionable. Always-on-top automática. |
| `spec.md`   | §2.2       | `enterMiniPlayer({ width: 260, height: 60 })` → `MINI_WINDOW_DIMENSIONS`            |
| `spec.md`   | §3.1       | `Target` → `CircleDot`, tokens con prefijo `accent-`                                |
| `spec.md`   | §3.2       | Drag elemento por elemento; la botonera nunca lleva el atributo                     |
| `spec.md`   | §6         | PR 3.2 pasa a ser #102 (solo componente) y se agrega PR 3.3 como #103               |
| `spec.md`   | §7         | `~260x60px` → `280x64px`                                                            |
| ambos       | encabezado | Enlace a este documento                                                             |

---

## 4. Contexto para #103

> **Actualizado después de implementar #103.** Los puntos 1, 3 y 6 estaban mal: el plan cambió cuando se leyó el adaptador real.

Lo que hay que saber para integrar la ventana:

1. **`IWindowShell` NO se extiende.** Este punto decía "agregar `setDecorations` y `setResizable` al puerto". Es incorrecto: el puerto describe capacidades, y "entrar al modo compacto" **ya es** esa capacidad. Exponer los métodos le enseñaría Tauri al dominio y obligaría a tocar `FakeWindowShell` y a todos sus consumidores por algo que el nombre del método ya implica. Lo que crece es el seam `TauriWindowClientLike`, y `enterMiniPlayer` / `restoreMainWindow` absorben las llamadas.
2. **Faltan 2 permisos.** `core:window:allow-set-decorations` y `core:window:allow-set-resizable` en `src-tauri/capabilities/default.json`. Verificados contra el `permissions/window/autogenerated/reference.md` del crate `tauri 2.11.6`: un nombre inventado no falla en el typecheck ni en ningún test, solo en runtime.
3. **Chrome antes que tamaño — el invariante central.** `setSize` de Tauri define el tamaño **externo**. Sin decorations, externo es igual a interno. Por lo tanto, en **ambos** sentidos se configura el chrome primero y después se resizea:

   ```
   enterMiniPlayer    setDecorations(false) → setMinSize(MINI_MIN) → setSize(dims)
                     → setResizable(false) → setAlwaysOnTop(true)

   restoreMainWindow  setAlwaysOnTop(false) → setResizable(true) → setMinSize(MAIN_MIN)
                     → setDecorations(true) → setSize(MAIN)
   ```

   Al revés, la ventana queda 30px más baja de lo pedido al entrar, o el área cliente cae a ~620x620 al restaurar. Este es el punto que **ningún test de Vitest puede verificar**: hace falta una ventana nativa real.

4. **`Escape` son ~5 líneas**, pero **no puede ir dentro del `{#if}`**: Svelte rechaza `<svelte:window>` en un bloque (`svelte_meta_invalid_placement`). Va al top level del componente con el guard en el handler, que es justo lo que `restore()` ya hace.
5. **Restaurar decorations.** `restoreMainWindow()` tiene que devolver `setDecorations(true)` y `setResizable(true)`, no solo el tamaño. Si se olvida, el usuario vuelve a una ventana de 800x650 sin marco y sin forma de moverla.
6. **`WindowState` no exponía `isSupported`.** La capacidad estaba en `IWindowShell` pero no era alcanzable desde la UI, así que el disparador del header no se podía gatear. Se agregó el getter.
7. **El modo Zen hace inutilizable al disparador.** `header.svelte` aplicaba `opacity-0 pointer-events-none` sobre el `<header>` root mientras el timer corre. El modo compacto se entra **antes** de pasar al editor; si hay que ir a Pomody a pulsarlo, el Alt+Tab que el feature evita sigue siendo necesario. Un `opacity-0` de CSS en un ancestro no lo deshace un descendiente, así que la regla bajó a cada slot: marca, nav y ajustes se siguen desvaneciendo; solo el disparador queda alcanzable.

### Verificación pendiente

El orden chrome-antes-de-tamaño está unit-testeado contra un cliente espía, pero **probarlo requiere correr el `.exe` en Windows**: entrar al modo compacto y salir, y confirmar que el área cliente vuelve a 800x650. `desktop-ci.yml` valida que compile y que los permisos sean válidos, no este comportamiento.
