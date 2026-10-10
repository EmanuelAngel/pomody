# Especificación de Diseño: Mini-Player Compacto (Desktop Windows)

> Documento de diseño técnico y decisiones de UI/UX para el modo compacto / mini-player de Pomody en Windows Desktop (Tauri v2).
>
> El **por qué** de cada decisión está en [`decisions.md`](./decisions.md). Este documento define **qué** se construye.

---

## 1. Contexto y Objetivos

El **Mini-Player** responde al requerimiento **P1 del Milestone 3** del roadmap, permitiendo a los usuarios mantener visibilidad periférica del tiempo y del estado de foco mientras trabajan activamente en otras aplicaciones (editores de código, terminales, documentación) sin alternar ventanas con Alt+Tab ni ocupar espacio valioso de pantalla.

- **Modo**: _Operate_ (herramienta de alta frecuencia, escaneabilidad periférica y baja fricción).
- **Plataforma**: Exclusivo para la aplicación de escritorio en Windows vía Tauri v2.
- **Principio rector**: Zen minimalista. Ocultar lo superfluo en reposo; revelar controles secundarios a demanda sin provocar saltos visuales (_layout shift_).

---

## 2. Topología y Ergonomía del Layout

El mini-player adopta una estructura simétrica de tres columnas con barra de progreso flotante y anclaje fijo del botón primario en el extremo derecho:

**Estado en Reposo (_Rest State_)**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [Icon] Task name...          24:18                               [▶]   │
│  ═══════════════════════════════════════════════════════════════════   │
└────────────────────────────────────────────────────────────────────────┘
```

**Estado en Hover (_Hover State - Progressive Revelation_)**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [Icon] Task name...          24:18               [↺] [⏭] [⤢]     [▶]   │
│  ═══════════════════════════════════════════════════════════════════   │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1. Columna Izquierda: Identificador de Estado y Tarea Activa

- **Ícono de estado semántico**:
  - `focus`: `CircleDot`
  - `shortBreak`: `Leaf`
  - `longBreak`: `Sprout`
  - **Tratamiento visual**: Contenedor cuadrado redondeado (`rounded-md p-1`) con fondo sutil tintado y texto a tono del estado (`bg-accent-foam/10 text-accent-foam`, `bg-accent-pine/10 text-accent-pine`, `bg-accent-iris/10 text-accent-iris`). Los acentos llevan prefijo `accent-` según `app.css`.
- **Título de la tarea y estados vacíos**:
  - Si hay tarea activa: texto atenuado (`text-muted-foreground`), truncado con elipsis en reposo.
  - **Marquee en hover**: Al posar el cursor sobre el texto o la región izquierda, se inicia un desplazamiento suave horizontal para permitir leer el título completo sin agrandar la ventana.
  - **Sin tarea asignada (`Free focus`)**: Muestra `Free focus` (o `Foco libre` según idioma) en tono atenuado (`text-muted-foreground/50 italic`) para preservar la simetría visual de 3 columnas y la consistencia con `task-pill.svelte`.
  - **Durante descansos**: La etiqueta muestra de forma natural `Short Break` o `Long Break` acompañada de su ícono correspondiente (`Leaf` o `Sprout`).

### 2.2. Columna Central: Temporizador Matemáticamente Centrado

- **Dígitos tabulares (`mm:ss`)**:
  - Ubicados en una **rejilla real de tres columnas** (`grid-cols-[1fr_auto_1fr]`), no con posicionamiento absoluto. Con `absolute left-1/2` y una columna izquierda `flex-1`, la caja del texto de la tarea pasaba **por debajo** de los dígitos y ambos se solapaban. Dos pistas `1fr` simétricas hacen el solapamiento imposible por construcción: la caja del texto termina donde empiezan los dígitos.
  - `font-mono text-sm font-medium tabular-nums`. La tipografía monoespaciada es lo que realmente evita la oscilación; `tabular-nums` por sí solo iguala el ancho de los dígitos pero no cambia la familia.
  - Color de primer plano de alto contraste (`text-foreground`).

### 2.3. Columna Derecha: Botonera con Anclaje al Extremo Derecho (_No Layout Shift_)

- **Principio de Ancla Fija**: El botón primario `[Play/Pause]` está permanentemente anclado contra el margen derecho de la ventana. Su posición horizontal no se mueve ni 1px entre reposo y hover.
- **Estado en Reposo (_Rest State_)**:
  - Solo el botón `[Play/Pause]` permanece visible al extremo derecho.
  - La superficie central y circundante queda completamente despejada como área de arrastre (`data-tauri-drag-region`).
- **Estado en Hover (_Progressive Revelation_)**:
  - Los controles secundarios se revelan suavemente hacia la izquierda del botón de Play mediante transición de opacidad (`transition-opacity duration-200`):
    1. `[Reset]` (Rotar / Reiniciar intervalo).
    2. `[Skip]` (Avanzar al siguiente bloque).
    3. `[Restaurar]` (Volver a la ventana principal de 800x650px). Ícono `Maximize2`.
    4. `[Play/Pause]` (Fijo e inamovible al extremo derecho).

- **No hay botón de cerrar.** El mini-player es un modo de la misma aplicación, no una aplicación: cerrarlo debe devolver a la ventana principal, no terminar el timer. `[Restaurar]` es la salida.
- **Un único estado de hover** gobierna la revelación de la botónera y el arranque del marquee del título (§2.1). En 64px de alto dos zonas separadas se pisan y el usuario no las distingue.

### 2.4. Barra de Progreso Flotante

- Línea de 2px de grosor ubicada al pie, con márgenes en todas las direcciones (`mx-3 mb-1.5 rounded-full`).
- Color semántico del bloque activo (`bg-accent-foam`, `bg-accent-pine`, `bg-accent-iris`).
- **Cero números de porcentaje**: Sin etiquetas numéricas que saturen la estética minimalista.

---

## 3. Estética y Sistema de Diseño

- **Geometría**: Bordes contenidos y sobrios con `rounded-md` o `rounded-lg` (6–8px). Se evita el aspecto de píldora móvil para respetar el lenguaje de herramientas de ingeniería de escritorio.
- **Radio de la ventana**: con `decorations: false` la ventana es **rectangular y sin sombra en todas las plataformas, Windows 11 incluida** — el redondeo de esquinas es parte de las decorations nativas y desaparece con ellas. El `rounded-*` de arriba aplica **solo al contenido interno**, no a la ventana. Recuperar esquinas redondeadas en Win11 requiere la crate Rust `window-shadows` y queda fuera de alcance.
- **Temas Rosé Pine**:
  - Soporte nativo para `Dark`, `Dawn` y `OLED`.
  - En `OLED`: Fondo negro puro (`#000000`), superficie widget `#050508`, bordes sutiles `#26233a`, texto `#e0def4` e íconos en `#908caa`.

---

## 4. Comportamiento Nativo de Ventana (Tauri v2)

### 4.1. Región de Arrastre (`data-tauri-drag-region`)

- El área de arrastre se marca **elemento por elemento**: el contenedor de la columna izquierda, su ícono, su título, el contenedor de la columna central y el texto del timer. **El atributo no se hereda a los hijos** en Tauri v2, y como las columnas cubren la totalidad del root, ponerlo solo en el raíz deja una ventana completamente inmovible. Ver [`003-tauri-frameless-window-quirks.md`](../../learnings/003-tauri-frameless-window-quirks.md).
- **Aislamiento de la botonera**: la fila de botones **nunca** lleva el atributo. No se desactiva con `data-tauri-drag-region="false"`; directamente no se le pone. Este diseño es _opt-in_: cualquier elemento nuevo nace sin drag, que es el default seguro.

### 4.2. Dimensiones y Transiciones

- **Tamaño modo compacto**: **320x48px**. La ventana en modo compacto **no es redimensionable**: el centrado del timer y el ancla del botón Play están calibrados para un ancho fijo.
- **Altura sin espacio muerto**: el contenido mide 24px (botones `icon-xs`) y la barra de progreso ocupa una franja de 8px al pie. Con 48px quedan 8px de aire arriba y abajo. A 64px la fila contenía 24px dentro de 56px: 16px de vacío a cada lado, que hacían que el widget se leyera cabezón. La fila es `h-10` dentro de un root `h-12` porque la barra es dueña de la franja inferior.
- **`MINI_WINDOW_MIN_DIMENSIONS` debe quedar por debajo de `MINI_WINDOW_DIMENSIONS`**: Windows clampea el tamaño pedido al mínimo sin reportar error, así que un mínimo más alto que el objetivo dejaría el widget 2px más alto en silencio.
- **Aislamiento de la región de arrastre**: `data-tauri-drag-region` no funciona sin el permiso `core:window:allow-start-dragging`. Tauri lo implementa invocando ese comando, y el permiso **no viene incluido en `core:window:default`**. Sin él, todas las regiones de arrastre de la app quedan inertes sin ningún error visible.
- **Manejo de restricciones**: Ajuste en caliente de `minWidth` y `minHeight` antes de solicitar el redimensionamiento, ya que la ventana normal restringe a 480x500px en `tauri.conf.json`.
- **Bandera _Always on Top_**: Activación automática al ingresar a modo compacto para que el widget flote sobre cualquier IDE o navegador. No hay control para desactivarla desde el widget.
- **Preservación de coordenadas**: Al restaurar a modo normal, la ventana vuelve a las dimensiones originales (800x650px) y posición centrada previa.
