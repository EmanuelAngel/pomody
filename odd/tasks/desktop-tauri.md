# Feature: Tauri v2 Desktop Scaffold & Windows CI Workflow

- **Issue**: #18
- **Branch**: `feat/desktop-tauri`
- **Status**: In Progress
- **Delivery Strategy**: `single-pr` (Forecast: ~250 lines across 4 atomic work-unit commits)
- **TDD Mode**: Standard Unit & Quality Harness (`pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`)

## Objective

Scaffold Tauri v2 with Rust to provide the desktop container for Pomody on Windows, linked to the SvelteKit SPA static build, and set up a dedicated GitHub Actions CI workflow targeting `windows-latest` to compile and package the Windows executable installer (.exe / NSIS) as a downloadable workflow artifact.

## Problem & Motivation

Pomody is designed as a minimalist focus timer for both Web (Cloudflare Pages) and Windows Desktop (Tauri v2). Milestone v0.1 requires delivering the native Windows desktop container with low memory consumption (<30 MB RAM target) while strictly preserving Hexagonal Architecture boundaries (zero `@tauri-apps/*` imports in `domain/` or shared presentation components).

## Architecture Boundaries

- **Desktop Layer (`src-tauri/`)**:
  - `src-tauri/Cargo.toml`: Tauri v2 Rust dependencies.
  - `src-tauri/tauri.conf.json`: Window dimensions (800x650 default, min 480x500), identifier `com.pomody.app`, frontendDist `../build`, devUrl `http://localhost:5173`.
  - `src-tauri/capabilities/default.json`: Core permissions and window capability.
  - `src-tauri/src/main.rs` & `src-tauri/src/lib.rs`: Minimal entrypoint running Tauri application.
  - `src-tauri/build.rs`: Standard Tauri build script.
- **Root Layer (`package.json`, `.gitignore`)**:
  - Dev script aliases for Tauri (`tauri:dev`, `tauri:build`).
  - Ignore Rust build artifacts (`src-tauri/target/`).
- **CI/CD Layer (`.github/workflows/desktop-ci.yml`)**:
  - Dedicated Windows build runner generating NSIS installer and binary artifacts on `push` to `main`, changes in `src-tauri/**`, or `workflow_dispatch`.
- **Domain & UI Isolation**:
  - 100% decoupling: no direct Tauri dependencies inside `src/lib/domain/` or UI components.

## Implementation Tasks

### [ ] TASK-1: Dependencies, scripts, and gitignore setup

- **Route**: Direct inline (Mechanical config: `package.json`, `.gitignore`)
- **Target Files**:
  - `package.json`
  - `.gitignore`
- **Acceptance Criteria**:
  - `@tauri-apps/cli` added to `devDependencies`.
  - Scripts `tauri`, `tauri:dev`, and `tauri:build` added to `package.json`.
  - `src-tauri/target/` added to `.gitignore`.
  - `pnpm install` succeeds.
- **Commit**: Pending
- **Evidence / Status**: Pending

### [ ] TASK-2: Scaffold Tauri v2 container and window configuration

- **Route**: Delegated direct (Writer trigger: 6+ non-trivial files in `src-tauri/`)
- **Target Files**:
  - `src-tauri/Cargo.toml`
  - `src-tauri/tauri.conf.json`
  - `src-tauri/capabilities/default.json`
  - `src-tauri/build.rs`
  - `src-tauri/src/main.rs`
  - `src-tauri/src/lib.rs`
  - `src-tauri/icons/*`
- **Acceptance Criteria**:
  - App identifier set to `com.pomody.app`.
  - Linked to SPA static build (`../build`) and dev server (`http://localhost:5173`).
  - Standard native OS window configured with default `800x650`, minimum `480x500`, native decorations enabled.
  - Tauri v2 permissions/capabilities configured for core window management.
  - Default application icons provided for bundling.
- **Commit**: Pending
- **Evidence / Status**: Pending

### [ ] TASK-3: Configure Windows Desktop Executable CI Workflow

- **Route**: Delegated direct (CI workflow: `.github/workflows/desktop-ci.yml`)
- **Target Files**:
  - `.github/workflows/desktop-ci.yml`
- **Acceptance Criteria**:
  - Workflow triggers on `push` to `main`, path changes in `src-tauri/**` or `desktop-ci.yml`, and `workflow_dispatch`.
  - Runs on `windows-latest` with Node.js 22 LTS, pnpm, and Rust stable toolchain.
  - Builds the static SPA and compiles the desktop app with NSIS installer.
  - Uploads the resulting `.exe` installer and bundle as a GitHub Actions workflow artifact.
- **Commit**: Pending
- **Evidence / Status**: Pending

### [ ] TASK-4: Update roadmap and verify full project quality harness

- **Route**: Direct inline (1 docs file + verification commands)
- **Target Files**:
  - `docs/roadmap.md`
- **Acceptance Criteria**:
  - `docs/roadmap.md` updated marking Tauri v2 scaffolding complete for v0.1.
  - `pnpm check`, `pnpm lint`, `pnpm test`, and `pnpm build` pass with 0 errors.
- **Commit**: Pending
- **Evidence / Status**: Pending
