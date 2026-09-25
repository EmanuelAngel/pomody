# Hoja de Ruta (Roadmap) de Pomody

> Planificación incremental y basada en valor para el desarrollo de Pomody en Web y Windows.

El proyecto está organizado en entregas modulares para validar la estabilidad y usabilidad de cada componente antes de sumar complejidad técnica o integraciones nativas.

---

## Resumen de Versiones

| Versión  | Enfoque Principal                                                            | Responsable Principal   | Estado                   |
| :------- | :--------------------------------------------------------------------------- | :---------------------- | :----------------------- |
| **v0.1** | Cimientos del sistema, FSM pura, UI minimalista, temas Rosé Pine y Tauri v2  | Vortex (Tech Lead)      | **Completado / Testing** |
| **v0.2** | Planificación (Mini To-Do híbrido), pausas guiadas, estética y persistencia  | Vortex & Fede (Trainee) | **Próximo foco**         |
| **v0.3** | Desktop Focus: Modo Compacto flotante (Mini-Player) y detector de dispersión | Vortex & Fede           | Planificado              |
| **v0.4** | Analítica avanzada, métricas visuales y calidad de sesión                    | Equipo Pomody           | Roadmap futuro           |
| **v0.5** | Ecosistema y blindaje: Discord Rich Presence y Modo No Molestar del SO       | Equipo Pomody           | Roadmap futuro           |

---

## Detalle de Hitos

### v0.1 — Cimientos y MVP Base (Completado / Testing)

_Objetivo: Disponer de un temporizador Pomodoro autónomo, robusto, testeable y estéticamente superior en Web y Desktop._

- [x] **Núcleo del temporizador (FSM)**: Máquina de estados desacoplada en memoria con duraciones configurables (foco, descanso corto y descanso largo).
- [x] **Pantalla principal minimalista**: Vista reactiva a la FSM que oculta configuraciones durante el estado `Running` (modo Zen) para proteger el foco.
- [x] **Drawer de ajustes desacoplado**: Panel lateral para configuración de intervalos sin contaminar la vista principal.
- [x] **Shell de navegación con Tabs superiores**: Barra de navegación superior central que incluye la vista activa y placeholders para próximas secciones (_Planning_ y _Métricas_) rotuladas como `(en v0.X)`.
- [x] **Sistema de diseño Rosé Pine**: Implementación de tres paletas de color con variables/tokens CSS:
  1. _Dark_: Fondo oscuro neutral.
  2. _High-Contrast_: Fondo negro puro OLED.
  3. _Light_: Rosé Pine Dawn.
- [x] **Alertas sonoras de transición**: Notificaciones de audio al completar bloques de trabajo y descanso.
- [x] **Emisión de eventos de dominio**: Eventos desacoplados en memoria (`BlockCompleted`) listos para extensiones y métricas.
- [x] **Despliegue Web**: Despliegue en producción completado y operativo en Cloudflare Pages.
- [x] **Despliegue Desktop (Windows)**: Scaffold de Tauri v2 con Rust y generación de binario ejecutable (`.exe` / instalador).

---

### v0.2 — Planificación, Descansos y UX de Foco (Próximo foco)

_Objetivo: Integrar el flujo ágil de tareas, dinámicas de pausa saludable y progreso visual sin saturar la aplicación ni depender de APIs de bajo nivel del SO (100% paridad Web/Desktop)._

- [ ] **Mini To-Do híbrido**:
  - _Task Pill_ interactivo y sutil en la pantalla del Timer para fijar o cambiar la tarea activa al vuelo sin salir del flujo de foco.
  - Pestaña de navegación _Planning_ habilitada para listar tareas pendientes y gestionar la cola de objetivos.
- [ ] **Presupuesto de sesión (Session Budget)**: Cálculo proyectado en la pestaña _Planning_ a partir de una meta de bloques o límite horario. Comportamiento informativo y flexible (notifica meta cumplida pero no bloquea el hyperfocus).
- [ ] **Revitalización automática**: Sugerencia suave de actividades saludables bajo el temporizador al entrar en descanso (estiramientos, hidratación, respiración) con botón de rotación (_shuffle_) y toggle en ajustes.
- [ ] **Ilustración progresiva botánica (SVG)**: Obra vectorial minimalista ubicada en los laterales (_flank_) que evoluciona en fases discretas por bloque completado. Visible en pantallas estándar/grandes, oculta en pantallas pequeñas, con switch global en Settings y configuración para Zen mode.
- [ ] **Persistencia y repositorio desacoplado**: Puertos de dominio (`ITaskRepository`, `ISessionRepository`) con adaptador inicial en `localStorage` (cero dependencias externas, síncrono e instantáneo) y botón para purgar datos locales en Settings.
- [ ] **Contador diario**: Indicador numérico simple de bloques completados durante la jornada.

---

### v0.3 — Desktop Power & Blindaje Activo (Planificado)

_Objetivo: Maximizar el valor de la app en Windows mediante interacción nativa ligera con el sistema operativo._

- [ ] **Modo Compacto / Mini-Player**: Redimensionamiento instantáneo de la ventana a formato reducido (~220x80px) con bandera nativa _Always on Top_ fijable al frente para monitorear el foco mientras se trabaja en otras aplicaciones.
- [ ] **Detector de dispersión simplificado**: Sondeo ligero de metadatos de ventana activa en Windows (`IDistractionMonitor` vía Rust/Win32) con diálogo interactivo y lista blanca por sesión/día.

---

### v0.4 — Analítica Avanzada & Métricas Visuales (Roadmap futuro)

_Objetivo: Transformar los datos reales acumulados de sesiones, tareas y distracciones en insights visuales accionables._

- [ ] **Panel de Métricas nativo**: Desbloqueo de la pestaña _Métricas_ con gráficos de barras semanales y tendencias renderizados con CSS/SVG nativo (sin librerías externas pesadas).
- [ ] **Calidad de sesión y correlación**: Estimación heurística de efectividad de bloques basada en cumplimiento de tareas y pausas.

---

### v0.5 — Ecosistema y Automatización Externa (Roadmap futuro)

_Objetivo: Blindaje de interrupciones externas y sincronización con herramientas sociales/laborales._

- [ ] **Blindaje de foco (No Molestar)**: Activación automática del modo concentración del sistema operativo durante bloques de trabajo.
- [ ] **Integración de presencia (Discord RPC)**: Notificación pasiva del estado de concentración en el perfil de Discord con opción de modo privado.

---

## Documentación Relacionada

- Fundamentos del producto: [`vision.md`](./vision.md)
- Análisis y resoluciones de las propuestas de Fede: [`proposals/fede-ideas.md`](./proposals/fede-ideas.md)
- Análisis y resoluciones de las propuestas de Vortex: [`proposals/vortex-ideas.md`](./proposals/vortex-ideas.md)
