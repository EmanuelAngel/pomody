# Especificación de Diseño: Mini-Player Compacto (Desktop Windows)

> Documento de diseño técnico y decisiones de UI/UX para el modo compacto / mini-player de Pomody en Windows Desktop (Tauri v2).

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
  - `focus`: `Target`
  - `shortBreak`: `Leaf` / `Sparkle`
  - `longBreak`: `Sprout` / `Sparkles`
  - **Tratamiento visual**: Contenedor cuadrado redondeado (`rounded-md p-1`) con fondo sutil tintado y texto a tono del estado (`bg-foam/10 text-foam`, `bg-pine/10 text-pine`, `bg-iris/10 text-iris`).
- **Título de la tarea y estados vacíos**:
  - Si hay tarea activa: texto atenuado (`text-muted-foreground`), truncado con elipsis en reposo.
  - **Marquee en hover**: Al posar el cursor sobre el texto o la región izquierda, se inicia un desplazamiento suave horizontal para permitir leer el título completo sin agrandar la ventana.
  - **Sin tarea asignada (`Free focus`)**: Muestra `Free focus` (o `Foco libre` según idioma) en tono atenuado (`text-muted-foreground/50 italic`) para preservar la simetría visual de 3 columnas y la consistencia con `task-pill.svelte`.
  - **Durante descansos**: La etiqueta muestra de forma natural `Short Break` o `Long Break` acompañada de su ícono correspondiente (`Leaf` o `Sprout`).

### 2.2. Columna Central: Temporizador Matemáticamente Centrado

- **Dígitos tabulares (`mm:ss`)**:
  - Centrados de forma absoluta (`absolute left-1/2 -translate-x-1/2`).
  - Escala contenida (`text-sm font-medium tabular-nums`) con altura equivalente a los íconos para evitar dominancia visual en la visión periférica.
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
    3. `[Restaurar]` (Volver a la ventana principal de 800x650px).
    4. `[Play/Pause]` (Fijo e inamovible al extremo derecho).

### 2.4. Barra de Progreso Flotante

- Línea de 2px de grosor ubicada al pie, con márgenes en todas las direcciones (`mx-3 mb-1.5 rounded-full`).
- Color semántico del bloque activo (`bg-foam`, `bg-pine`, `bg-iris`).
- **Cero números de porcentaje**: Sin etiquetas numéricas que saturen la estética minimalista.

---

## 3. Estética y Sistema de Diseño

- **Geometría**: Bordes contenidos y sobrios con `rounded-md` o `rounded-lg` (6–8px). Se evita el aspecto de píldora móvil para respetar el lenguaje de herramientas de ingeniería de escritorio.
- **Temas Rosé Pine**:
  - Soporte nativo para `Dark`, `Dawn` y `OLED`.
  - En `OLED`: Fondo negro puro (`#000000`), superficie widget `#050508`, bordes sutiles `#26233a`, texto `#e0def4` e íconos en `#908caa`.

---

## 4. Comportamiento Nativo de Ventana (Tauri v2)

### 4.1. Región de Arrastre (`data-tauri-drag-region`)

- El contenedor general y el área central del widget cuentan con `data-tauri-drag-region`, permitiendo mover la ventana libremente por cualquier parte del monitor.
- **Aislamiento de la botonera**: El contenedor de botones interactivos a la derecha queda explícitamente excluido de la región de arrastre para evitar que WebView2 capture el mousedown como inicio de drag y cancele los eventos de click.

### 4.2. Dimensiones y Transiciones

- **Tamaño modo compacto**: ~260x60px o ~280x64px (a calibrar con el marco nativo de Windows).
- **Manejo de restricciones**: Ajuste en caliente de `minWidth` y `minHeight` antes de solicitar el redimensionamiento, ya que la ventana normal restringe a 480x500px en `tauri.conf.json`.
- **Bandera _Always on Top_**: Activación automática o manual de `setAlwaysOnTop(true)` al ingresar a modo compacto para que el widget flote sobre cualquier IDE o navegador.
- **Preservación de coordenadas**: Al restaurar a modo normal, la ventana vuelve a las dimensiones originales (800x650px) y posición centrada previa.
