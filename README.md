# Pomody

> El temporizador Pomodoro pensado para el foco real: planificá tus tareas, protegé tu concentración y descansá con propósito, sin bloatware ni suscripciones abusivas.

[![Estado del Proyecto](https://img.shields.io/badge/Estado-En%20Definici%C3%B3n%20%2F%20v0.1-blue)](docs/roadmap.md)
[![Licencia](https://img.shields.io/badge/Licencia-MIT-green)](#)

---

## Documentación

El diseño funcional y técnico del proyecto está organizado de manera modular en [`docs/`](docs/):

* **[Visión del Producto](docs/vision.md)**: Propósito, público objetivo, análisis de mercado y plataformas (Web y Windows).
* **[Hoja de Ruta (Roadmap)](docs/roadmap.md)**: Planificación por versiones (v0.1, v0.2, +v0.3) y distribución de entregas.
* **[Propuestas de Fede](docs/proposals/fede-ideas.md)**: Las 5 propuestas de Fede con su formato dual (propuesta original y resolución técnica de arquitectura).
* **[Propuestas de Vortex](docs/proposals/vortex-ideas.md)**: Funcionalidades de planificación ágil, pausas guiadas y blindaje de foco.

---

## Visión general

Muchas aplicaciones de Pomodoro caen en uno de dos extremos: o son temporizadores excesivamente básicos que no permiten organizar qué vas a hacer en cada bloque de trabajo, o son herramientas sobrecargadas de funciones accesorias bloqueadas bajo suscripciones costosas, con interfaces pesadas o limitadas a un único sistema operativo.

**Pomody** nace como una herramienta personal orientada a resolver esos problemas desde la práctica diaria:
- **Planificación sin fricción**: saber exactamente qué tarea encarar antes de iniciar un bloque de concentración.
- **Descansos con propósito**: pausas sugeridas que realmente recarguen energía en lugar de fomentar la dispersión pasiva.
- **Respeto al usuario**: una experiencia visual limpia, enfocada en el flujo de trabajo y sin costos artificiales.

---

## Núcleo de la experiencia

El flujo esencial de Pomody mantiene la premisa clásica, optimizando cada etapa:

```text
Configurar tiempo ──▶ Iniciar Bloque ──▶ Trabajar (Foco) ──▶ Alerta de Fin ──▶ Descanso Guiado ──▶ Repetir
```

1. **Definición de sesión**: fijá la duración de los intervalos y tu objetivo inmediato.
2. **Foco protegido**: interfaz minimalista durante el trabajo para minimizar distracciones.
3. **Pausa revitalizante**: sugerencias concretas de descanso para despejar la mente antes del siguiente ciclo.

---

## Hoja de ruta (Roadmap)

El desarrollo de Pomody está organizado en entregas incrementales para validar cada funcionalidad con uso real antes de sumar complejidad:

### v0.1 — Cimientos y MVP base (En desarrollo activo)
- [ ] Temporizador Pomodoro tradicional con Máquina de Estados Finita (FSM) desacoplada y configurable.
- [ ] Interfaz principal minimalista y reactiva a la FSM (oculta controles en modo foco).
- [ ] Drawer/Modal de ajustes y configuración desacoplado.
- [ ] Shell con barra de pestañas superior central con soporte de navegación y placeholders `(en v0.X)`.
- [ ] Sistema de diseño con tres paletas basadas en Rosé Pine (*Dark*, *High-Contrast* y *Light Dawn*) mediante tokens CSS.
- [ ] Notificaciones sonoras de fin de bloque.
- [ ] Emisión de Domain Events en memoria y contador numérico diario elemental.
- [ ] Base arquitectónica desacoplada orientada a Web y Windows.

### v0.2 — Planificación, descansos y asistencia al foco
- [ ] **Mini To-Do integrado**: asignación de objetivos o subtareas específicas por bloque de trabajo.
- [ ] **Revitalización automática**: catálogo de actividades sugeridas para descansos saludables (evitando el scroll pasivo).
- [ ] **Presupuesto de sesión**: proyección automática de bloques disponibles según un horario límite o cantidad de pomodoros objetivo.
- [ ] **Detector de dispersión simplificado**: recordatorio de distracción basado en metadatos de ventana activa en Windows (`IDistractionMonitor`) con whitelist por sesión.
- [ ] **Ilustraciones progresivas**: gráficos SVG estáticos que evolucionan por fases fijas por bloque completado (sin bucles de animación pesados).
- [ ] **Historial persistido y métricas semanales**: almacenamiento local y gráficos de barras renderizados en CSS/SVG nativo.

### v0.3 / Futuro — Automatización y modo compacto
- [ ] **Modo Compacto / Mini-Player**: vista reducida (~220x80px) Always on Top en Windows para monitorear el tiempo sobre otras aplicaciones.
- [ ] **Blindaje de foco**: sincronización con estados de presencia (Discord RPC) y activación automática del modo "No molestar" del sistema.
- [ ] **Analítica avanzada**: estimación heurística de calidad de sesión y correlación de foco vs distracciones.

---

## Estado del proyecto y tecnologías

Actualmente Pomody se encuentra en **fase de definición de arquitectura y prototipado conceptual**.

* **Objetivo de plataforma**: Web y Windows (aplicación de escritorio).
* **Stack tecnológico**: En evaluación (priorizando rendimiento, bajo consumo de recursos y arquitectura limpia desacoplada).
* **Progreso de diseño**: Podés consultar las especificaciones y acuerdos funcionales detallados en [`docs/`](docs/).

---

## Licencia

Este proyecto está bajo la Licencia MIT.
