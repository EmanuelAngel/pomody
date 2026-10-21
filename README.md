# Pomody

> El temporizador Pomodoro pensado para el foco real: planificá tus tareas, protegé tu concentración y descansá con propósito, sin bloatware ni suscripciones abusivas.

[![Estado del Proyecto](https://img.shields.io/badge/Estado-Milestones%201--4%20Completados-brightgreen)](docs/roadmap.md)
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
- 🤝 **[Flujo de Git y Calidad](docs/git-workflow.md)**: Estándares de Git, Conventional Commits y arneses automáticos de calidad (Husky, lint-staged, CI).
- 🎯 **[Backlog y Hallazgos](https://github.com/EmanuelAngel/pomody/issues)**: Todo hallazgo de revisión, bug, feature request y decisión pendiente vive como issue con labels `area:*` y `size:*`.
- 🤖 **[Convenciones para Agentes de IA](AGENTS.md)**: Convenciones técnicas, arquitectura hexagonal y comandos de ejecución para desarrollo asistido por agentes.

---

## Hoja de ruta resumida

Para consultar el checklist completo y criterios de aceptación, visitá [`docs/roadmap.md`](docs/roadmap.md).

| Milestone                                                                                               | Enfoque Principal                                                               | Prioridad | Estado           |
| :------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------ | :-------- | :--------------- |
| **[Milestone 1](docs/roadmap.md#milestone-1--cimientos-y-mvp-base-completado)**                         | Cimientos del sistema, FSM pura, UI minimalista, temas Rosé Pine y Tauri v2.    | Base      | **Completado**   |
| **[Milestone 2](docs/roadmap.md#milestone-2--planificación-descansos-y-persistencia-completado)**       | Planificación (Mini To-Do), descansos guiados, persistencia y contador diario.  | Base      | **Completado**   |
| **[Milestone 3](docs/roadmap.md#milestone-3--i18n--desktop-shell-completado)**                          | Internacionalización (i18n ES/EN) y Desktop Shell (Mini-Player & Tray).         | P0 / P1   | **Completado**   |
| **[Milestone 4](docs/roadmap.md#milestone-4--recompensa-visual-por-fases-completado)**                  | Recompensa visual (Ilustración por fases — Compañía Viva).                      | P2        | **Completado**   |
| **[Milestone 5](docs/roadmap.md#milestone-5--hábitos-avanzados--detección-de-dispersión-próximo-foco)** | Hábitos avanzados en timeline y detector de dispersión ligero.                  | P3        | **Próximo foco** |
| **[Milestone 6](docs/roadmap.md#milestone-6--analítica-avanzada--métricas-visuales-roadmap-futuro)**    | Analítica avanzada, métricas visuales nativas y calidad de sesión.              | P4        | Roadmap futuro   |
| **[Milestone 7](docs/roadmap.md#milestone-7--blindaje-de-foco--ecosistema-roadmap-futuro)**             | Blindaje de foco (No Molestar del SO) e integración de presencia (Discord RPC). | P5        | Roadmap futuro   |

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

| Herramienta             | Versión requerida                  | Rol / Notas                                                                                       |
| :---------------------- | :--------------------------------- | :------------------------------------------------------------------------------------------------ |
| **pnpm**                | `>= 9.0.0` (v10 recomendada)       | **Gestor oficial y mandatorio.** Usar siempre antes y sobre `npm` (`corepack enable`).            |
| **Node.js**             | `>= 20.18.0 LTS` (v22 recomendada) | Runtime para desarrollo frontend y tooling (Vite, SvelteKit, Vitest).                             |
| **Playwright Chromium** | `v1.60.0+`                         | Opcional en local: la suite usa Microsoft Edge por defecto. CI instala el Chromium de Playwright. |
| **Rust**                | `Stable >= 1.90.0`                 | Solo necesario para compilar la app de escritorio (Tauri v2).                                     |
| **C++ Build Tools**     | Visual Studio Build Tools 2022     | Dependencia requerida del toolchain MSVC de Rust en Windows.                                      |

> [!IMPORTANT]
> **Uso estricto de pnpm:** Pomody utiliza `pnpm` de forma exclusiva para garantizar resolución determinista de dependencias mediante `pnpm-lock.yaml`. No ejecutes `npm` ni `yarn`.
>
> Para instalar el navegador de pruebas cuando sea requerido (CI lo hace solo en cada corrida):
>
> ```bash
> pnpm exec playwright install chromium
> ```

> [!NOTE]
> **Navegador local:** la suite usa **Microsoft Edge** por defecto fuera de CI. `PLAYWRIGHT_CHANNEL` permite forzar otro canal (`chrome`, `bundled`, ...). El puerto del preview de E2E se deriva de la ruta del worktree, así que dos worktrees no comparten servidor; `POMODY_E2E_PORT` lo fija a mano.

> [!TIP]
> **Desarrollo ágil de UI y Dominio:** Para trabajar en la lógica pura (`pnpm test:unit`) o levantar el servidor de desarrollo (`pnpm dev`), únicamente se requiere **Node.js** y **pnpm**. No es obligatorio instalar Playwright, Rust ni C++ salvo que se ejecuten pruebas de navegador o empaquetado desktop.

---

## Comandos esenciales

| Tarea                           | Comando                     | Notas                                  |
| :------------------------------ | :-------------------------- | :------------------------------------- |
| **Instalar dependencias**       | `pnpm install`              | Instalación determinista               |
| **Servidor de desarrollo**      | `pnpm dev`                  | Inicia Vite en `http://localhost:5173` |
| **Pruebas unitarias (Dominio)** | `pnpm test:unit`            | Ejecución en Node (<500ms)             |
| **Pruebas de componentes (UI)** | `pnpm test:browser`         | Vitest Browser Mode con Chromium       |
| **Suite completa de pruebas**   | `pnpm test`                 | Ejecuta todos los tests de Vitest      |
| **Verificación de tipos**       | `pnpm check`                | `svelte-check` en modo estricto        |
| **Linter y formato**            | `pnpm lint` / `pnpm format` | Prettier y ESLint                      |
| **Compilar SPA Web**            | `pnpm build`                | Salida estática en `build/`            |

---

## Licencia

Este proyecto está bajo la Licencia MIT.
