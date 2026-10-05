# Hoja de Ruta (Roadmap) de Pomody

> Planificación incremental y orientada a valor para el desarrollo de Pomody en Web y Windows.

El proyecto organiza sus objetivos en **Milestones temáticos** orientados a valor de producto. Este esquema opera desacoplado del versionado semántico técnico (SemVer) que automatiza `release-please` en cada integración. La ejecución semanal del equipo se estructura en torno a los criterios de aceptación de cada Milestone.

---

## Resumen de Hitos

| Milestone       | Enfoque Principal                                                              | Prioridad | Estado           |
| :-------------- | :----------------------------------------------------------------------------- | :-------- | :--------------- |
| **Milestone 1** | Cimientos del sistema, FSM pura, UI minimalista, temas Rosé Pine y Tauri v2    | Base      | **Completado**   |
| **Milestone 2** | Planificación (Mini To-Do), descansos guiados, persistencia y contador diario  | Base      | **Completado**   |
| **Milestone 3** | Internacionalización (i18n ES/EN) y Desktop Shell (Mini-Player & Tray)         | P0 / P1   | **Próximo foco** |
| **Milestone 4** | Fluidez de foco (Auto-avance) y Recompensa visual (Ilustración SVG por fases)  | P2        | Planificado      |
| **Milestone 5** | Hábitos avanzados en timeline y Detector de dispersión ligero                  | P3        | Roadmap futuro   |
| **Milestone 6** | Analítica avanzada, métricas visuales nativas y calidad de sesión              | P4        | Roadmap futuro   |
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
- [x] **Persistencia y repositorios desacoplados**: Puertos de dominio (`ITaskRepository`, `ISessionPlanRepository`, `IBreakActivityRepository`, `IDailyStatsRepository`) con adaptadores síncronos en `localStorage` y botón de purga defensiva en Settings Drawer.
- [x] **Contador diario (Zen Statusline)**: Indicador numérico pasivo de bloques completados y tiempo acumulado al pie de pantalla, con desvanecimiento suave a `opacity-0` en ejecución.

> [!NOTE]
> La ilustración progresiva y el auto-avance continuo se reubicaron al Milestone 4 para priorizar la estabilidad del núcleo y la incorporación de soporte multiidioma.

---

### Milestone 3 — i18n & Desktop Shell (Próximo foco)

_Objetivo: Eliminar barreras de idioma en el equipo/usuarios y potenciar la experiencia nativa de escritorio en Windows._

- [ ] **P0 — Internacionalización (i18n)**:
  - Arquitectura de internacionalización desacoplada: el dominio puro emite códigos semánticos mientras la capa de presentación resuelve las traducciones.
  - Soporte bilingüe completo: Español y base existente en Inglés para toda la interfaz (Timer, Planning, Settings, Statusline, diálogos).
  - Selector reactivo de idioma en el panel de Settings con persistencia local en `localStorage`.
- [ ] **P1 — Modo Compacto / Mini-Player (Desktop Windows)**:
  - Redimensionamiento instantáneo de la ventana principal a formato reducido (~220x80px).
  - Bandera nativa _Always on Top_ fijable al frente para monitorear el foco mientras se trabaja en otras ventanas.
  - Controles compactos esenciales sin perder la estética Rosé Pine.
- [ ] **P1 — Integración con System Tray (Bandeja del sistema)**:
  - Intercepción de minimización o cierre de ventana en Windows para ocultar la app a la bandeja del sistema (Tauri v2 tray icon).
  - Menú contextual rápido en el icono de bandeja para restaurar la ventana principal, pausar/reanudar o finalizar la aplicación.

---

### Milestone 4 — Fluidez de Foco & Recompensa Visual (Planificado)

_Objetivo: Pulir la experiencia de uso continuo y ofrecer feedback visual liviano sin generar distracciones periféricas ni consumo excesivo de recursos._

- [ ] **P2 — Flujo continuo y auto-avance de ciclos**:
  - Switch configurable en Settings Drawer para transicionar e iniciar automáticamente el siguiente bloque (foco o descanso) al finalizar el intervalo actual sin requerir interacción manual.
  - Señal sonora diferenciada al encadenar bloques de forma autónoma.
- [ ] **P2 — Ilustración progresiva por fases (SVG)**:
  - Revisión y alineación técnica con Fede.
  - Componente vectorial minimalista en SVG que progresa en 4 o 5 fases discretas por bloque completado (ej. semilla -> brote -> planta -> flor -> árbol).
  - Restricción estricta de rendimiento: sin bucles de animación continuos a 60 FPS (cero Canvas, cero drenaje de batería o GPU).
  - Ubicación en laterales (_flank_) con toggle global en ajustes y soporte para ocultar en modo Zen.

---

### Milestone 5 — Hábitos Avanzados & Detección de Dispersión (Roadmap futuro)

_Objetivo: Vincular la planificación con los descansos y ofrecer contención activa ante distracciones en Windows._

- [ ] **P3 — Detector de dispersión ligero**:
  - Sondeo no invasivo de metadatos de ventana activa en Windows (`IDistractionMonitor` vía Rust/Win32).
  - Diálogo interactivo amable: _"Gracias por recordarme"_ o _"Esto no es una distracción"_ (lista blanca temporal por sesión o día).
  - Fallback inocuo (`NoopDistractionMonitor`) en Web para garantizar 100% paridad.
- [ ] **P3 — Integración de actividades de descanso en timeline**:
  - Selección o sugerencia de actividades saludables enlazadas directamente a las pausas proyectadas de la sesión de Planning.

---

### Milestone 6 — Analítica Avanzada & Métricas Visuales (Roadmap futuro)

_Objetivo: Transformar los datos reales acumulados de sesiones, tareas y pausas en retrospectivas visuales accionables._

- [ ] **P4 — Panel de Métricas nativo**:
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

## Documentación Relacionada

- Fundamentos del producto y arquitectura: [`vision.md`](./vision.md) y [`architecture.md`](./architecture.md)
- Especificación técnica de Tareas, Revitalización y Planning: [`features/tasks-and-planning.md`](./features/tasks-and-planning.md)
- Especificación técnica de Internacionalización (i18n): [`features/i18n.md`](./features/i18n.md)
- Especificación técnica de Modo Compacto / Mini-Player: [`features/mini-player/spec.md`](./features/mini-player/spec.md)
- Análisis y resoluciones de las propuestas de Fede: [`proposals/fede-ideas.md`](./proposals/fede-ideas.md)
- Análisis y resoluciones de las propuestas de Vortex: [`proposals/vortex-ideas.md`](./proposals/vortex-ideas.md)
