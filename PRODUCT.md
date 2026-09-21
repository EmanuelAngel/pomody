# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

SvelteKit (SPA, @sveltejs/adapter-static) + Tauri v2 + Tailwind CSS v4 + shadcn-svelte (Svelte 5 Runes) + TypeScript + IndexedDB

## Users

Primary users are software developers, students, and knowledge workers who require deep concentration intervals. They need to define concrete tasks before starting focus blocks and take intentional, restorative pauses without decision fatigue or algorithmic distractions.

## Product Purpose

Pomody is a distraction-free Pomodoro timer designed for sustained deep work. It exists to solve the tension between overly primitive timers that offer no task guidance and bloated subscription-locked tools. Success is defined by helping users sustain productive focus cycles with zero bloatware, zero telemetry, and guided recovery habits.

## Positioning

A lightweight, local-first, open-source (MIT) productivity application. Unlike monolithic commercial trackers (e.g., Rize) or bare timers without transition planning (e.g., Pomotroid), Pomody combines an immutable deterministic timer FSM with pre-session task framing and guided restorative breaks under 30 MB memory overhead.

## Operating Context

Desktop workstations and development environments (Windows desktop application via Tauri v2 and modern web browsers). Operates adjacent to code editors, terminals, and reference documentation. Daily usage centers on starting focus blocks, working with an uncluttered Zen interface, and following audio cues into physical or mental recovery breaks.

## Capabilities and Constraints

- Capabilities:
  - Deterministic Finite State Machine (FSM) core managing Focus, Short Break, and Long Break cycles.
  - High-precision timing via timestamp deltas (`Date.now()`) backed by Web Worker execution to resist background throttling.
  - Zen Mode: secondary controls and navigation automatically recede during active focus intervals.
  - Decoupled settings drawer for interval configurations.
  - Semantic theme system supporting Rosé Pine palettes (Dark, Dawn, OLED).
  - Non-blocking Web Audio API notifications on block transitions.
  - In-memory domain event emission (`SessionStarted`, `BlockCompleted`) for metrics and progress tracking.
- Technical Constraints:
  - Hexagonal Architecture with pure TypeScript domain logic isolated in `src/lib/domain/`.
  - Local-first unified persistence via IndexedDB behind repository interfaces (`ISessionRepository`, `ITaskRepository`).
  - Strict performance limits: <30 MB RAM usage on desktop.

## Brand Commitments

- Name: Pomody
- Visual Theme: Rosé Pine design tokens (Dark neutral, Dawn light, OLED high-contrast)
- Aesthetic: Clean, calm, distraction-free Zen minimalism
- License: Open Source (MIT)

## Evidence on Hand

- Technical architecture and stack specifications: [docs/architecture.md](file:///C:/Users/Usuario/dev/pomody/docs/architecture.md)
- Product vision, market differentiation, and problem analysis: [docs/vision.md](file:///C:/Users/Usuario/dev/pomody/docs/vision.md)
- Incremental milestone roadmap (v0.1 to v0.3+): [docs/roadmap.md](file:///C:/Users/Usuario/dev/pomody/docs/roadmap.md)
- Team collaboration profiles: [docs/profiles/vortex.md](file:///C:/Users/Usuario/dev/pomody/docs/profiles/vortex.md) and [docs/profiles/fede.md](file:///C:/Users/Usuario/dev/pomody/docs/profiles/fede.md)
- Evaluated feature proposals: [docs/proposals/fede-ideas.md](file:///C:/Users/Usuario/dev/pomody/docs/proposals/fede-ideas.md) and [docs/proposals/vortex-ideas.md](file:///C:/Users/Usuario/dev/pomody/docs/proposals/vortex-ideas.md)

## Product Principles

1. **Focus First, Zero Bloat**: Every feature must justify its existence by protecting concentration or improving break quality. No ads, tracking, or unnecessary dependencies.
2. **Zen Interface**: Controls that are not needed during deep work recede automatically. The interface never competes with the user's task.
3. **Decoupled Foundations**: Domain logic remains strictly independent of presentation frameworks and platform runtimes.
4. **Intentional Transitions**: Framing tasks before working and suggesting physical/mental resets during breaks eliminates decision paralysis and mindless browsing.

## Accessibility & Inclusion

- Multi-theme accessibility including pure black OLED high-contrast mode alongside neutral dark and dawn light modes.
- High-contrast visual timer indicators complemented by distinct audible transition chimes.
- Full keyboard navigation for primary timer operations and configuration panels.
