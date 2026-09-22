# Pomody

> El temporizador Pomodoro pensado para el foco real: planificá tus tareas, protegé tu concentración y descansá con propósito, sin bloatware ni suscripciones abusivas.

[![Estado del Proyecto](https://img.shields.io/badge/Estado-En%20Definici%C3%B3n%20%2F%20v0.1-blue)](docs/roadmap.md)
[![Plataformas](https://img.shields.io/badge/Plataformas-Web%20%7C%20Windows-informational)](docs/vision.md#3-plataformas-objetivo)
[![Licencia](https://img.shields.io/badge/Licencia-MIT-green)](#licencia)

---

## Visión general

La mayoría de las herramientas de Pomodoro caen en uno de dos extremos: o son temporizadores excesivamente básicos que no permiten organizar la sesión, o son aplicaciones sobrecargadas de funciones accesorias bloqueadas bajo suscripciones costosas.

**Pomody** nace como una herramienta personal y colaborativa orientada a resolver esos problemas desde la práctica diaria:

- **Planificación sin fricción**: saber exactamente qué tarea encarar antes de iniciar un bloque de concentración.
- **Descansos con propósito**: pausas sugeridas que realmente recarguen energía en lugar de fomentar la dispersión pasiva.
- **Cero bloatware**: una experiencia visual limpia, sin publicidad, sin telemetría invasiva y sin costos artificiales.

---

## Núcleo de la experiencia

El flujo esencial de Pomody optimiza cada etapa del método clásico mediante una **Máquina de Estados Finita (FSM)** predecible y desacoplada:

```text
Configurar tiempo ──▶ Iniciar Bloque ──▶ Trabajar (Foco) ──▶ Alerta de Fin ──▶ Descanso Guiado ──▶ Repetir
```

1. **Definición de sesión**: fijá la duración de los intervalos y tu objetivo inmediato.
2. **Foco protegido (Modo Zen)**: interfaz minimalista durante el trabajo que oculta distracciones.
3. **Pausa revitalizante**: sugerencias concretas de descanso para despejar la mente antes del siguiente ciclo.

---

## Documentación del Proyecto

El diseño funcional, técnico y las decisiones de arquitectura están organizados de forma modular en [`docs/`](docs/):

- 📖 **[Visión del Producto](docs/vision.md)**: Propósito, público objetivo, análisis de mercado y plataformas (Web y Windows).
- 🗺️ **[Hoja de Ruta (Roadmap)](docs/roadmap.md)**: Planificación por versiones, criterios de entrega y desglose detallado de tareas.
- 💡 **[Propuestas de Fede](docs/proposals/fede-ideas.md)**: Propuestas originales y resoluciones técnicas de arquitectura (analizador de pantalla, temas, métricas, UI minimalista y widget flotante).
- 🛠️ **[Propuestas de Vortex](docs/proposals/vortex-ideas.md)**: Funcionalidades de planificación ágil (Mini To-Do), pausas guiadas, presupuesto de sesión y blindaje de foco.
- 🏗️ **[Arquitectura y Stack](docs/architecture.md)**: Stack técnico definitivo (SvelteKit + Tauri v2), cobertura de requerimientos y patrones de diseño.

---

## Hoja de ruta resumida

Para consultar el checklist completo y criterios de aceptación, visitá [`docs/roadmap.md`](docs/roadmap.md).

| Versión                                                                                               | Enfoque Principal                                                                            | Responsable   | Estado                   |
| :---------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------- | :------------ | :----------------------- |
| **[v0.1 — Cimientos](docs/roadmap.md#v01--cimientos-y-mvp-base-inmediato)**                           | Temporizador base (FSM), UI minimalista Zen, temas Rosé Pine y Domain Events.                | Vortex        | **En desarrollo activo** |
| **[v0.2 — Planificación](docs/roadmap.md#v02--planificación-descansos-y-asistencia-al-foco-cercano)** | Mini To-Do integrado, pausas guiadas, presupuesto de sesión y detector de dispersión ligero. | Vortex & Fede | Planificado              |
| **[+v0.3 — Automatización](docs/roadmap.md#v03--automatización-presencia-y-modo-compacto-futuro)**    | Modo Compacto / Mini-Player (Always on Top), Discord RPC y analítica avanzada.               | Equipo Pomody | Roadmap futuro           |

---

## Equipo y Desarrollo

Pomody se desarrolla mediante pair programming y mentoría técnica continua:

- **Vortex** ([`docs/profiles/vortex.md`](docs/profiles/vortex.md)) — Tech Lead / Arquitecto.
- **Fede** ([`docs/profiles/fede.md`](docs/profiles/fede.md)) — Trainee Vibe Coder / Manual Tester.

---

## Estado y Tecnologías

- **Plataformas objetivo**: Web (navegadores modernos) y Windows (aplicación de escritorio).
- **Stack tecnológico**: SvelteKit + Tauri v2 + Tailwind CSS v4 / shadcn-svelte (ver [`docs/architecture.md`](docs/architecture.md)).
- **Especificaciones detalladas**: Consultar [`docs/`](docs/).

---

## Requisitos de Entorno

Para levantar y desarrollar el proyecto localmente:

| Herramienta             | Versión requerida                  | Rol / Notas                                                                                   |
| :---------------------- | :--------------------------------- | :-------------------------------------------------------------------------------------------- |
| **pnpm**                | `>= 9.0.0` (v10 recomendada)       | **Gestor oficial y mandatorio.** Usar siempre antes y sobre `npm` (`corepack enable`).        |
| **Node.js**             | `>= 20.18.0 LTS` (v22 recomendada) | Runtime para desarrollo frontend y tooling (Vite, SvelteKit, Vitest).                         |
| **Playwright Chromium** | `v1.60.0+`                         | Opcional: Solo necesario para correr tests de componentes en navegador (`pnpm test:browser`). |
| **Rust**                | `Stable` (`>= 1.77.2`)             | Solo necesario para compilar la app de escritorio (Tauri v2).                                 |
| **C++ Build Tools**     | Visual Studio Build Tools 2022     | Dependencia del toolchain MSVC de Rust en Windows.                                            |

> [!IMPORTANT]
> **Uso estricto de pnpm:** Pomody utiliza `pnpm` de forma exclusiva para garantizar resolución determinista de dependencias mediante `pnpm-lock.yaml`. No ejecutes `npm` ni `yarn`.
>
> Para instalar el navegador de pruebas de componentes cuando sea requerido:
>
> ```bash
> pnpm exec playwright install chromium
> ```

> [!TIP]
> **Desarrollo ágil de UI y Dominio:** Para trabajar en la lógica pura (`pnpm test:unit`) o levantar el servidor de desarrollo (`pnpm dev`), únicamente se requiere **Node.js** y **pnpm**. No es obligatorio instalar Playwright, Rust ni C++ salvo que se ejecuten pruebas de navegador o empaquetado desktop.

---

## Licencia

Este proyecto está bajo la Licencia MIT.
