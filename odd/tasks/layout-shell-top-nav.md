# Feature: Layout Shell & Top Navigation Tabs

- **Issue**: #6
- **Branch**: `feat/layout-top-nav`
- **Status**: Completed
- **TDD Mode**: client-first / web-first (Vitest Browser Mode via `vitest-browser-svelte`)
- **Delivery Strategy**: `single-pr` (Authored changed lines: ~180 lines)

## Objective

Implement the global layout shell (`src/lib/components/layout/header.svelte` and `src/routes/+layout.svelte`) with a centralized tripartite top navigation bar featuring the active "Temporizador" tab, deactivated placeholders for "Planning (en v0.2)" and "Métricas (en v0.2)", integrated settings trigger, and seamless Zen mode transition (`opacity-0 pointer-events-none`) when the timer is running.

## Problem & Motivation

Previously, `+page.svelte` hosted a detached floating settings trigger button and lacked a cohesive app shell. Pomody needed a clean, minimalist header that anchors the application across Desktop (Tauri v2) and Web SPA, clarifies the current active view, and soberly communicates the future roadmap (v0.2 Planning & Metrics) without cognitive clutter, layout shift (CLS = 0), or broken Zen focus.

## Scope & Boundaries

- **UI Components**:
  - `src/lib/components/layout/header.svelte`: Tripartite unified Zen header (Brand left, segmented navigation tabs center, Settings trigger right).
  - `src/lib/components/layout/index.ts`: Barrel export.
- **Routing & Shell**:
  - `src/routes/+layout.svelte`: Persistent layout orchestration with `<Header bind:settingsOpen />` and `<SettingsDrawer bind:open={settingsOpen} />`.
  - `src/routes/+page.svelte`: Cleaned up to solely focus on `<main><Timer /></main>`.
- **Testing**:
  - `src/lib/components/layout/header.svelte.test.ts`: Vitest Browser Mode tests using strictly web-first assertions (`await expect.element(...)`), testing idle visibility, tab states, disabled roadmap badges, settings trigger click, and Zen mode fading.
  - No SSR tests (client-only web-first tests per user specification).
- **Out of Scope**:
  - Routing logic or views for Planning / Metrics (reserved for v0.2).
  - Heavy routing libraries.

## Implementation Tasks

### [x] TASK-1: Write web-first client browser tests for Header component

- **Route**: Direct inline
- **Target Files**:
  - `src/lib/components/layout/header.svelte.test.ts`
- **Acceptance Criteria**:
  - Verify Pomody brand text is visible and accessible.
  - Verify "Temporizador" tab has `aria-selected="true"`.
  - Verify "Planning" and "Métricas" tabs have `aria-disabled="true"` and are disabled.
  - Verify `(en v0.2)` badge is rendered.
  - Verify settings trigger button calls callback or binds open state.
  - Verify Zen mode: when `timerState.isRunning` is true, header has `opacity-0` and `pointer-events-none`.
  - Strictly use web-first assertions (`await expect.element(...)`).
- **Evidence / Status**: Tested and passing in Vitest Browser Mode (Chromium).

### [x] TASK-2: Implement Header component & barrel export

- **Route**: Direct inline
- **Target Files**:
  - `src/lib/components/layout/header.svelte`
  - `src/lib/components/layout/index.ts`
- **Acceptance Criteria**:
  - Tripartite layout (`fixed top-0 inset-x-0 z-30`).
  - Brand on left: "Pomody" (`text-sm font-semibold tracking-tight text-foreground/90`).
  - Navigation capsule centered: segmented pill with active "Temporizador" tab and disabled "Planning" & "Métricas" tabs with responsive `(en v0.2)` badge (`hidden sm:inline`).
  - Settings trigger on right: ghost icon button cleanly integrated into header flow.
  - Zen mode transition: `transition-opacity duration-300 ease-in-out`, `opacity-0 pointer-events-none` when running.
  - Fully accessible (ARIA tablist/tab semantics, keyboard focus rings matching Rosé Pine).
- **Evidence / Status**: Validated with `svelte-autofixer` (0 issues) and browser test suite.

### [x] TASK-3: Integrate Header and SettingsDrawer into +layout.svelte & clean up +page.svelte

- **Route**: Direct inline
- **Target Files**:
  - `src/routes/+layout.svelte`
  - `src/routes/+page.svelte`
- **Acceptance Criteria**:
  - `+layout.svelte` manages `settingsOpen` and renders `<Header bind:settingsOpen />` and `<SettingsDrawer bind:open={settingsOpen} />`.
  - `+page.svelte` removes redundant floating `<SettingsTrigger />` and `<SettingsDrawer />`.
  - Main container retains vertical centering with 0 CLS.
- **Evidence / Status**: Verified with `svelte-check` and production build (`pnpm build`).

### [x] TASK-4: Verification and Quality Gates

- **Route**: Direct inline
- **Acceptance Criteria**:
  - `pnpm check` passes with 0 errors/warnings.
  - `pnpm test:browser` passes all client tests (27/27 passed).
  - `pnpm test:unit` passes all server unit tests (105/105 passed).
  - `pnpm build` passes static build generation.
- **Evidence / Status**: All quality gates passed with 0 errors.
