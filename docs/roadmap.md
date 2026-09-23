# Hoja de Ruta (Roadmap) de Pomody

> Planificación incremental y basada en valor para el desarrollo de Pomody en Web y Windows.

El proyecto está organizado en entregas modulares para validar la estabilidad y usabilidad de cada componente antes de sumar complejidad técnica o integraciones nativas.

---

## Resumen de Versiones

| Versión   | Enfoque Principal                                                         | Responsable Principal   | Estado                   |
| :-------- | :------------------------------------------------------------------------ | :---------------------- | :----------------------- |
| **v0.1**  | Cimientos del sistema, FSM pura, UI minimalista y temas Rosé Pine         | Vortex (Tech Lead)      | **En desarrollo activo** |
| **v0.2**  | Planificación (Mini To-Do), pausas guiadas, métricas locales y asistencia | Vortex & Fede (Trainee) | Planificado              |
| **+v0.3** | Automatizaciones del SO, modo compacto flotante y analítica avanzada      | Equipo Pomody           | Roadmap futuro           |

---

## Detalle de Hitos

### v0.1 — Cimientos y MVP Base (Inmediato)

_Objetivo: Disponer de un temporizador Pomodoro autónomo, robusto, testeable y estéticamente superior._

- [x] **Núcleo del temporizador (FSM)**: Máquina de estados desacoplada en memoria con duraciones configurables (foco, descanso corto y descanso largo).
- [ ] **Pantalla principal minimalista**: Vista reactiva a la FSM que oculta configuraciones durante el estado `Running` (modo Zen) para proteger el foco.
- [ ] **Drawer de ajustes desacoplado**: Panel lateral para configuración de intervalos sin contaminar la vista principal.
- [ ] **Shell de navegación con Tabs superiores**: Barra de navegación superior central que incluye la vista activa y placeholders para próximas secciones (_Planning_ y _Métricas_) rotuladas como `(en v0.X)`.
- [ ] **Sistema de diseño Rosé Pine**: Implementación de tres paletas de color con variables/tokens CSS:
  1. _Dark_: Fondo oscuro neutral.
  2. _High-Contrast_: Fondo negro puro OLED.
  3. _Light_: Rosé Pine Dawn.
- [ ] **Alertas sonoras de transición**: Notificaciones de audio al completar bloques de trabajo y descanso.
- [ ] **Métricas base en memoria**: Emisión de _Domain Events_ (`SessionStarted`, `BlockCompleted`) y contador diario visible en UI.
- [ ] **Compatibilidad de despliegue**: Arquitectura base lista para Web y Windows.

---

### v0.2 — Planificación, Descansos y Asistencia al Foco (Cercano)

_Objetivo: Integrar la gestión ágil de objetivos y dinámicas de descanso saludable sin saturar la aplicación._

- [ ] **Mini To-Do integrado**: Asignación de objetivos o tareas concretas por bloque de focus antes de arrancar.
- [ ] **Revitalización automática**: Catálogo de actividades saludables sugeridas para los descansos (estiramientos, hidratación, respiración), evitando la dispersión pasiva.
- [ ] **Presupuesto de sesión**: Cálculo automático de bloques disponibles y proyección del horario de finalización a partir de una meta horaria o cantidad de pomodoros.
- [ ] **Detector de dispersión simplificado**: Sondeo ligero de metadatos de ventana activa en Windows (`IDistractionMonitor`) con diálogo interactivo y lista blanca por sesión/día.
- [ ] **Ilustraciones progresivas**: Componente gráfico SVG que evoluciona en 4 o 5 fases discretas por bloque completado (ej. crecimiento botánico), sin animaciones continuas.
- [ ] **Historial persistido y métricas nativas**: Almacenamiento local de sesiones completadas y gráficos de barras semanales renderizados en CSS/SVG nativo (sin dependencias externas).

---

### +v0.3 — Automatización, Presencia y Modo Compacto (Futuro)

_Objetivo: Automatizar integraciones con el sistema operativo y herramientas del usuario._

- [ ] **Modo Compacto / Mini-Player**: Estado de ventana reducida (~220x80px) fijable al frente (_Always on Top_ en Windows) para monitoreo persistente mientras se trabaja en otras apps.
- [ ] **Blindaje de foco (No Molestar)**: Activación automática del modo concentración del sistema operativo durante bloques de trabajo.
- [ ] **Integración de presencia (Discord RPC)**: Notificación pasiva del estado de concentración en el perfil de Discord con opción de modo privado.
- [ ] **Analítica avanzada**: Estimación heurística de calidad de sesión/bloque basada en histórico de bloques y distracciones registradas.

---

## Documentación Relacionada

- Fundamentos del producto: [`vision.md`](./vision.md)
- Análisis y resoluciones de las propuestas de Fede: [`proposals/fede-ideas.md`](./proposals/fede-ideas.md)
- Análisis y resoluciones de las propuestas de Vortex: [`proposals/vortex-ideas.md`](./proposals/vortex-ideas.md)
