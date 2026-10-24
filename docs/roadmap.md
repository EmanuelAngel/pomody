# Hoja de Ruta (Roadmap) de Pomody

> Planificación incremental y orientada a valor para el desarrollo de Pomody en Web y Windows.

El proyecto organiza sus objetivos en **Milestones temáticos** orientados a valor de producto. Este esquema opera desacoplado del versionado semántico técnico (SemVer) que automatiza `release-please` en cada integración. La ejecución semanal del equipo se estructura en torno a los criterios de aceptación de cada Milestone.

---

## Resumen de Hitos

| Milestone       | Enfoque Principal                                                              | Prioridad | Estado           |
| :-------------- | :----------------------------------------------------------------------------- | :-------- | :--------------- |
| **Milestone 1** | Cimientos del sistema, FSM pura, UI minimalista, temas Rosé Pine y Tauri v2    | Base      | **Completado**   |
| **Milestone 2** | Planificación (Mini To-Do), descansos guiados, persistencia y contador diario  | Base      | **Completado**   |
| **Milestone 3** | Internacionalización (i18n ES/EN) y Desktop Shell (Mini-Player & Tray)         | P0 / P1   | **Completado**   |
| **Milestone 4** | Recompensa visual (Ilustración por fases — Compañía Viva)                      | P2        | **Completado**   |
| **Milestone 5** | Hábitos avanzados en timeline y Detector de dispersión ligero                  | P3        | **Próximo foco** |
| **Milestone 6** | Analítica avanzada, métricas visuales nativas y calidad de sesión              | P4        | **En progreso**  |
| **Milestone 7** | Blindaje de foco (No Molestar del SO) e Integración de presencia (Discord RPC) | P5        | Roadmap futuro   |

---

## Detalle de Hitos

### Milestone 1 — Cimientos y MVP Base (Completado)

_Objetivo: Disponer de un temporizador Pomodoro autónomo, robusto, testeable y estéticamente superior en Web y Desktop._

- [x] **Núcleo del temporizador (FSM)**: Máquina de estados desacoplada en memoria con duraciones configurables (foco, descanso corto y descanso largo).
- [x] **Pantalla principal minimalista**: Vista reactiva a la FSM que oculta configuraciones durante el estado `Running` (modo Zen) para proteger el foco.
- [x] **Drawer de ajustes desacoplado**: Panel lateral para configuración de intervalos sin contaminar la vista principal.
- [x] **Shell de navegación con Tabs superiores**: Barra de navegación superior central que incluye la vista activa y placeholders para próximas secciones.
- [x] **Sistema de diseño Rosé Pine**: Implementación de tres paletas de color con variables/tokens CSS (`Dark`, `Dawn`, `OLED`).
- [x] **Alertas sonoras de transición**: Notificaciones de audio Web Audio al completar bloques de trabajo y descanso.
- [x] **Emisión de eventos de dominio**: Eventos desacoplados en memoria (`BlockCompleted`) listos para extensiones y métricas.
- [x] **Despliegue Web**: Despliegue en producción completado y operativo en Cloudflare Pages.
- [x] **Despliegue Desktop (Windows)**: Scaffold de Tauri v2 con Rust y generación de binario ejecutable (`.exe` / instalador).

---

### Milestone 2 — Planificación, Descansos y Persistencia (Completado)

_Objetivo: Integrar el flujo ágil de tareas, dinámicas de pausa saludable y persistencia local sin saturar la aplicación ni depender de APIs de bajo nivel (100% paridad Web/Desktop)._

- [x] **Mini To-Do híbrido**:
  - _Task Pill_ interactivo y sutil en la pantalla del Timer para fijar o cambiar la tarea activa al vuelo sin salir del flujo de foco.
  - Pestaña de navegación _Planning_ habilitada para listar tareas pendientes, estimar pomodoros y gestionar la cola de objetivos.
- [x] **Presupuesto de sesión (Session Budget)**: Cálculo proyectado en la pestaña _Planning_ a partir de una meta de bloques o límite horario con cálculo determinista de intervalos.
- [x] **Revitalización automática**: Sugerencia suave de actividades saludables bajo el temporizador al entrar en descanso (estiramientos, hidratación, respiración) con botón de rotación (_shuffle_) y toggle en ajustes.
- [x] **Catálogo y gestión de hábitos de descanso**: Segmento en vista Planning para explorar hábitos predefinidos y gestionar hábitos personalizados (CRUD accesible con modales shadcn-svelte).
- [x] **Persistencia y repositorios desacoplados**: Puertos de dominio (`ITaskRepository`, `ISessionPlanRepository`, `IBreakActivityRepository`, `IFocusHistoryRepository`) con adaptadores síncronos en `localStorage` y botón de purga defensiva en Settings Drawer.
- [x] **Contador diario (Zen Statusline)**: Indicador numérico pasivo de bloques completados y tiempo acumulado al pie de pantalla, con desvanecimiento suave a `opacity-0` en ejecución.

> [!NOTE]
> La ilustración progresiva y el auto-avance continuo se reubicaron al Milestone 4 para priorizar la estabilidad del núcleo y la incorporación de soporte multiidioma.

---

### Milestone 3 — i18n & Desktop Shell (Completado)

_Objetivo: Eliminar barreras de idioma en el equipo/usuarios y potenciar la experiencia nativa de escritorio en Windows._

- [x] **P0 — Internacionalización (i18n)**:
  - Arquitectura de internacionalización desacoplada: el dominio puro emite códigos semánticos mientras la capa de presentación resuelve las traducciones.
  - Soporte bilingüe completo: Español y base existente en Inglés para toda la interfaz (Timer, Planning, Settings, Statusline, diálogos).
  - Selector reactivo de idioma en el panel de Settings con persistencia local en `localStorage`.
- [x] **P1 — Modo Compacto / Mini-Player (Desktop Windows)**:
  - Redimensionamiento instantáneo de la ventana principal a formato reducido de **320x48px** (el valor original estimado de ~220x80px no entró: los 4 controles revelados más el ícono y el timer no entran cómodo en 260. Ver [`features/mini-player/decisions.md`](./features/mini-player/decisions.md)).
  - Bandera nativa _Always on Top_ activada automáticamente al entrar al modo compacto.
  - Controles compactos esenciales sin perder la estética Rosé Pine.
- [x] **P1 — Integración con System Tray (Bandeja del sistema)**:
  - Intercepción del **cierre** de ventana en Windows para ocultar la app a la bandeja del sistema (`prevent_close()` + `hide()`, Tauri v2 `tray-icon`). El botón minimizar sigue yendo al taskbar por convención de Windows.
  - Menú contextual con `Open` y `Exit`, más restauración con click simple izquierdo sobre el ícono.
  - Instancia única: reabrir Pomody con la app en la bandeja sube la ventana existente en vez de lanzar un segundo proceso.
  - _Sin pausa/reanudar en el menú_, deliberadamente: el estado del timer vive en un Web Worker y el menú en Rust, así que un menú con estado real exige sincronización bidireccional para controlar un botón que el Mini-Player ya resuelve. Ver [`features/tray/decisions.md`](./features/tray/decisions.md) §4.

---

### Milestone 4 — Recompensa Visual por Fases (Completado)

_Objetivo: Ofrecer feedback visual liviano sobre el progreso del ciclo sin generar distracciones periféricas ni consumo excesivo de recursos._

- [x] **P2 — Ilustración progresiva por fases (Compañía Viva)** ([spec](./features/compania-viva/spec.md) · [decisiones](./features/compania-viva/decisiones.md)):
  - Paisaje pixel art de fondo full-screen en pestaña Timer derivado de minutos de foco acumulados (`dailyStats`).
  - Ilustraciones minimalistas: Bosque (5 fases) y Desierto (3 fases con día/atardecer/noche) adaptadas a la paleta Rosé Pine.
  - Escalado entero en modo cover con `ResizeObserver` y sin bucles continuos de animación (cero Canvas, cero drenaje de batería).
  - Configuración reactiva en Settings (toggle on/off, movimiento estático/animado, ocultar durante bloque de foco) y selector con miniaturas.

---

### Milestone 5 — Hábitos Avanzados & Detección de Dispersión (Próximo foco)

_Objetivo: Vincular la planificación con los descansos y ofrecer contención activa ante distracciones en Windows._

- [x] **P3 — Detector de dispersión ligero** ([spec](./features/distraction-detector/spec.md) · [decisiones](./features/distraction-detector/decisions.md)):
  - Sondeo no invasivo de metadatos de la ventana activa en Windows (`IDistractionMonitor` vía Rust/Win32), armado **sólo mientras corre un bloque de foco**.
  - Detección **por declaración, sin inferencia**: la app no juzga sola. El usuario marca qué le distrae (ejecutable + patrón de título opcional) desde la vista _Distracciones_, con un picker de ventanas abiertas y campos manuales como escape. **Sin semilla pre-cargada.**
  - Aviso: notificación del SO con tres acciones — _"Gracias por recordarme"_ (no cambia nada), _"Esto no es una distracción por hoy"_ y _"Esto nunca es una distracción"_ — con guarda de inactividad y re-disparo parametrizable.
  - Lista blanca **permanente** + **diaria** (se purga sola al cambiar el día). Se guardan reglas, nunca observaciones.
  - Fallback inocuo (`NoopDistractionMonitor`) en Web, con la UI del detector oculta por completo.
- [ ] **P3 — Integración de actividades de descanso en timeline**:
  - Selección o sugerencia de actividades saludables enlazadas directamente a las pausas proyectadas de la sesión de Planning.

---

### Milestone 6 — Analítica Avanzada & Métricas Visuales (En progreso)

_Objetivo: Transformar los datos reales acumulados de sesiones, tareas y pausas en retrospectivas visuales accionables._

- [x] **P4 — Panel de Métricas nativo** ([decisiones](./features/metrics-panel/decisions.md)):
  - Desbloqueo de la pestaña _Métricas_ en la barra superior.
  - Gráficos de barras semanales y patrones de productividad renderizados con CSS/SVG nativo (sin dependencias externas pesadas).
- [ ] **P4 — Calidad de sesión y correlación**:
  - Indicador heurístico de consistencia de bloques basado en cumplimiento de metas y pausas efectivas.

---

### Milestone 7 — Blindaje de Foco & Ecosistema (Roadmap futuro)

_Objetivo: Blindaje contra interrupciones externas y sincronización con herramientas sociales y de trabajo._

- [ ] **P5 — Blindaje de foco (No Molestar del SO)**:
  - Activación automática del modo concentración del sistema operativo durante bloques de trabajo en Windows.
- [ ] **P5 — Integración de presencia (Discord RPC)**:
  - Notificación pasiva del estado de concentración en el perfil de Discord con opción de privacidad (mostrar solo "En Foco").

---

## Propuestas Reubicadas

_Ítems retirados del roadmap activo, con la precondición explícita para reabrirlos. No son promesas: son hipótesis pendientes de validación._

### P2 — Flujo continuo y auto-avance de ciclos (Reubicado)

> [!NOTE]
> **Precondición para reabrir:** un canal real y verificable de feedback de usuarios (o un piloto acotado con 2-3 testers que efectivamente respondan). Sin esa vía, el feature no es evaluable: Pomody es offline-first, sin telemetría y con persistencia puramente local, así que su fracaso sería invisible.

- ~~Switch configurable en Settings Drawer para transicionar e iniciar automáticamente el siguiente bloque al finalizar el intervalo actual sin requerir interacción manual.~~
- ~~Señal sonora diferenciada al encadenar bloques de forma autónoma.~~

**Por qué se reubica:**

- **Contradice el objetivo de M4.** El clic manual de transición no es fricción, sino el ritual que actualiza el modelo mental del ciclo ("ahora toca el descanso", "ahora a ponerse las pilas"). El auto-avance lo elimina para agregar _unattended-ness_, que es exactamente el modo de fallo de las apps que inspiraron Pomody: avanzar solo sin que el usuario se entere.
- **Degrada el ítem activo del milestone.** La ilustración progresiva progresa por bloque completado; con avance instantáneo, la recompensa (el árbol creciendo) ocurre en un frame no percibido.
- **Contamina las métricas.** `planning.svelte.ts` y `daily-stats.svelte.ts` reaccionan al evento `block-completed`. Con la app en la bandeja, los bloques encadenados se contabilizan como completados sin que nadie haya trabajado: el contador diario y el timeline pasarían a medir "el timer estuvo prendido" en vez de trabajo real.
- **El comportamiento actual ya es el diseño validado**: presencia del usuario en los límites de bloque + awareness pasivo vía Mini-Player.

**Nota de diseño para una eventual reapertura:** la variante defendible es auto-avance **con gracia visible y cancelable** (cuenta regresiva de ~5s con escape), que resuelve el problema de awareness sin generar bloques desatendidos. No viene al caso actual porque igual elimina el ritual del clic.

---

## Documentación Relacionada

- Fundamentos del producto y arquitectura: [`vision.md`](./vision.md) y [`architecture.md`](./architecture.md)
- Especificación técnica de Tareas, Revitalización y Planning: [`features/tasks-and-planning.md`](./features/tasks-and-planning.md)
- Especificación técnica de Internacionalización (i18n): [`features/i18n.md`](./features/i18n.md)
- Especificación técnica de Modo Compacto / Mini-Player: [`features/mini-player/spec.md`](./features/mini-player/spec.md)
- Especificación técnica de Compañía Viva (Recompensa Visual): [`features/compania-viva/spec.md`](./features/compania-viva/spec.md) y sus [decisiones de diseño](./features/compania-viva/decisions.md)
- Especificación técnica del Detector de Dispersión: [`features/distraction-detector/spec.md`](./features/distraction-detector/spec.md) y sus [decisiones de diseño](./features/distraction-detector/decisions.md)
- Análisis y resoluciones de las propuestas de Fede: [`proposals/fede-ideas.md`](./proposals/fede-ideas.md)
- Análisis y resoluciones de las propuestas de Vortex: [`proposals/vortex-ideas.md`](./proposals/vortex-ideas.md)
