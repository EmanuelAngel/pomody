# Contributing to Pomody

Thank you for your interest in contributing to Pomody! We are building a minimalist, bloat-free Pomodoro timer designed for deep focus (Web SPA & Windows via Tauri v2).

To keep the codebase maintainable and maintain our strict performance boundaries (<30 MB RAM target), all contributors (human or AI-assisted) follow this workflow.

---

## Quick Start

1. **Prerequisites**: Node.js `>= 20.18.0` and **pnpm** `>= 9.0.0` (mandatory; do not use `npm` or `yarn`).
2. **Install dependencies**:
   ```bash
   pnpm install
   ```
3. **Start local dev server**:
   ```bash
   pnpm dev
   ```
4. **Run local verification**:
   ```bash
   pnpm check       # Strict TypeScript / Svelte check
   pnpm test:unit   # Pure domain tests
   ```

---

## Architectural Boundaries

Pomody adheres to a **Pragmatic Hexagonal Architecture**. When writing code, respect these boundaries strictly:

- **`src/lib/domain/` (Pure TypeScript)**: Zero external dependencies. Never import Svelte runes (`$state`, `$derived`), DOM APIs (`window`, `document`), or Tauri APIs.
- **`src/lib/adapters/` (Platform Implementations)**: Native system integrations (`@tauri-apps/*`) live exclusively in `src/lib/adapters/tauri/`. The Web SPA must build and run completely decoupled from desktop APIs.
- **`src/lib/state/` & `src/lib/components/` (UI Layer)**: Built with Svelte 5 Runes. Never use legacy Svelte 4 stores (`writable`, `derived`).

---

## Contribution Workflow

### 1. Issues & Branches

- **Check existing issues**: Before starting work, check the open issues or roadmap. If you are proposing a significant change, open an issue first for discussion.
- **Create a focused branch**:
  ```bash
  # For features
  git checkout -b feat/your-feature-name

  # For bugfixes
  git checkout -b fix/issue-description
  ```

### 2. Commit Conventions

We enforce [Conventional Commits](https://www.conventionalcommits.org/) via local hooks (`commitlint` + `husky`).

Format:

```text
<type>(<optional scope>): <description in imperative or present tense>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

> [!IMPORTANT]
> **No AI Trailers**: Never include `Co-Authored-By` or AI attribution trailers in commit messages.

### 3. Pull Request Guidelines

1. **Keep diffs focused**: Keep PRs under ~400 lines of change to protect review focus. If a feature exceeds this size, consider breaking it into smaller chained PRs.
2. **Ensure CI passes**: Pull requests trigger automated checks (`pnpm lint`, `pnpm check`, `pnpm test:unit`, `pnpm build`). Green CI is required before review.
3. **Describe intent & testing**: State clearly what problem is solved and list reproduction/testing steps.

---

## Need More Context?

For in-depth architectural notes and detailed role workflows, consult the project documentation:

- [Git Workflow](docs/git-workflow.md)
- [Development Methodology](docs/development-workflow.md)
- [Agent & Tooling Instructions](AGENTS.md)
