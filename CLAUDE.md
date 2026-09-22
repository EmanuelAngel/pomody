# AGENTS.md

> Guidance and instructions for AI coding agents working on Pomody.
> Complements README.md and docs/ with agent-specific technical conventions, architecture boundaries, and execution commands.

## Project Overview

**Pomody** is a minimalist, bloat-free Pomodoro timer designed for deep focus, targeting Web (SPA) and Windows (Tauri v2).

- **Core Principle**: Zero bloatware, low memory consumption (<30 MB RAM target), offline-first.
- **Architecture**: Pragmatic Hexagonal Architecture (Ports and Adapters).
- **Domain Layer**: 100% pure TypeScript. Zero dependencies on Svelte, DOM, or Tauri.

## Package Manager & Tooling Rules

> [!IMPORTANT]
> **Always use `pnpm` as the package manager.** Never use `npm`, `npx`, or `yarn`.
> Every command must run via `pnpm` (e.g., `pnpm dev`, `pnpm exec playwright`).

### Essential Commands

| Task                     | Command                | Notes                                                  |
| :----------------------- | :--------------------- | :----------------------------------------------------- |
| **Install dependencies** | `pnpm install`         | Uses frozen lockfile in CI                             |
| **Start dev server**     | `pnpm dev`             | Starts Vite at `http://localhost:5173`                 |
| **Unit tests (Domain)**  | `pnpm test:unit`       | Runs pure Node tests in <500ms (`--project server`)    |
| **Unit tests (Watch)**   | `pnpm test:unit:watch` | Watch mode for domain FSM development                  |
| **Browser tests (UI)**   | `pnpm test:browser`    | Vitest Browser Mode with Chromium (`--project client`) |
| **All tests**            | `pnpm test`            | Runs complete Vitest suite                             |
| **E2E tests**            | `pnpm test:e2e`        | Playwright E2E runner (`playwright test`)              |
| **Type check**           | `pnpm check`           | Runs `svelte-check` with TS strict mode                |
| **Lint check**           | `pnpm lint`            | Runs Prettier check and ESLint                         |
| **Auto-format**          | `pnpm format`          | Runs Prettier write                                    |
| **Build SPA**            | `pnpm build`           | Static build output to `build/index.html`              |

## Environment & Minimum Versions

| Tool                    | Minimum Version     | Recommended        | Notes                                                  |
| :---------------------- | :------------------ | :----------------- | :----------------------------------------------------- |
| **Node.js**             | `>= 20.18.0 LTS`    | `v22 LTS` or `v24` | JavaScript runtime for Vite, SvelteKit, and Vitest     |
| **pnpm**                | `>= 9.0.0`          | `v10.x`            | Mandatory package manager (`corepack enable`)          |
| **Playwright Chromium** | `v1.60.0+`          | Latest             | Optional for domain; required for `test:browser` / E2E |
| **Rust & Cargo**        | `Stable >= 1.77.2`  | Latest stable      | Only required when compiling desktop app (Tauri v2)    |
| **C++ Build Tools**     | VS Build Tools 2022 | Latest             | Required MSVC toolchain dependency for Rust on Windows |

## Architecture & Code Boundaries

```text
src/lib/
├── domain/       # Pure TypeScript: FSM, time deltas, domain events. NO Svelte/DOM/Tauri.
│   ├── timer/    # FSM contracts, state transitions, durations.
│   ├── events/   # Domain event definitions (SessionStarted, BlockCompleted).
│   └── ports/    # Abstract interfaces (IAudioNotifier, ISessionRepository).
├── adapters/     # Technical implementations of domain ports (Web Audio, Worker, Storage).
├── state/        # Reactive Composition Root: timer.svelte.ts wires domain to Svelte 5 Runes.
└── components/   # UI components consuming state/.
    ├── ui/       # Accessible shadcn-svelte primitives (vendor code; do not modify manually).
    ├── timer/    # Circular progress arc, time display, controls, task pill.
    ├── settings/ # Drawer and configuration panels.
    └── layout/   # Main shell and header.
```

### Critical Development Rules

1. **Domain Isolation**: Code in `src/lib/domain/` must remain pure TypeScript. Never import `$app/*`, Svelte runes, DOM APIs (`document`, `window`), or Tauri APIs inside `domain/`.
2. **State Management**: Use Svelte 5 Runes (`$state`, `$derived`, `$props`, `$bindable`) inside `src/lib/state/` and `.svelte` components. Do not use legacy Svelte 4 store patterns (`writable`, `derived`).
3. **UI Styling**: Tailwind CSS v4 with semantic CSS variables mapped to Rosé Pine tokens (`[data-theme='dark']`, `[data-theme='dawn']`, `[data-theme='oled']`).
4. **Git Commits**: Use Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`). Never add AI attribution or "Co-Authored-By" trailers.

---

## Svelte MCP Tools Integration

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
