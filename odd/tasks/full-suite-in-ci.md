# Run the full test suite in CI (issue #180)

- **Branch**: `chore/180-full-test-suite-in-ci`
- **Delivery**: single PR, under the 400-line guard
- **Runner**: `pnpm test:unit`, `pnpm test:browser`, `pnpm test:e2e`, `pnpm check`, `pnpm lint`

## Specs

- **S1** — CI runs the whole suite, not only the domain slice. `.github/workflows/ci.yml` keeps `pnpm lint`, `pnpm check`, `pnpm test:unit` and `pnpm build`, and adds `pnpm test:browser` and `pnpm test:e2e`.
- **S2** — One source of truth for the browser channel. CI must launch the Playwright-managed Chromium (`channel: undefined`); local Windows must keep working without Chromium installed: "en local no tengo chromium, solo edge". `PLAYWRIGHT_CHANNEL` overrides both configs.
- **S3** — E2E ports never leak across worktrees: "en local trabajo con worktrees, creo que eso influye en `reuseExistingWebServer`". A worktree gets its own stable port derived from its path, the run never attaches to a server started by another worktree or by a previous run, and `POMODY_E2E_PORT` pins an explicit port.
- **S4** — A cold browser run must not report a false red. Learning 004: the first `pnpm test:browser` after new imports fails with `Failed to fetch dynamically imported module`. CI is always cold, so the step needs one bounded retry, documented.
- **S5** — Docs state the real CI surface where they currently claim `lint`, `check`, `test:unit` and `build` only: `CONTRIBUTING.md`, `docs/git-workflow.md`, `docs/development-workflow.md`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`.
- **S6** — Verification: `pnpm lint`, `pnpm check`, `pnpm test:unit`, `pnpm test:browser`, `pnpm test:e2e` green locally. The `ubuntu-latest` path (bundled Chromium, no Edge) cannot run on this machine because only Edge is installed, so that half is proven by the pull request run and recorded as such.

## Tasks

- [x] **T1** — `src/testing/browser-channel.ts` with unit tests covering S2 and S3 (RED first).
- [x] **T2** — `vite.config.ts` uses the shared channel resolver and a CI-only retry (S1, S2, S4).
- [x] **T3** — `playwright.config.ts` uses the resolver, the per-worktree port, and never reuses a foreign server (S3).
- [x] **T4** — `.github/workflows/ci.yml`: install Chromium, cache it, run `pnpm test:browser` and `pnpm test:e2e` (S1, S4).
- [x] **T5** — Docs align with the new CI surface (S5).
- [x] **T6** — Local verification plus work-unit commit (S6).

## Log

- **L1** — "Crea un issue para correr toda la suite de tests en CI. Actualmente corre en local solamente, no recuerdo por qué, pero en local no tengo chromium, solo edge. Además en local trabajo con worktrees, creo que eso influye en `reuseExistingWebServer`. Investigá y vemos cómo hacemos."
- **L2** — "En un worktree" → implementation happens in `pomody-worktrees/full-suite-ci` on `chore/180-full-test-suite-in-ci`.
- **Investigation** — `vite.config.ts:33-36` hardcodes `channel: 'msedge'`, which cannot work on `ubuntu-latest`. Playwright browsers are not downloaded by `pnpm install` (pnpm 10 blocks dependency build scripts, no `pnpm.onlyBuiltDependencies`). `playwright.config.ts` uses fixed port 4173 with `reuseExistingServer: !process.env.CI`, so a sibling worktree's preview server can be adopted and `pnpm build` skipped.
- **RED** — `pnpm vitest run src/testing/browser-channel.test.ts --project server` failed on the missing module, then passed 10/10 after `src/testing/browser-channel.ts`.
- **Evidence** — `pnpm test:unit` 64 files / 1102 tests; `pnpm test:browser` 24 files / 224 tests (Edge); `pnpm test:e2e` 12 tests on the derived port; `pnpm check` and `pnpm lint` clean. `CI=true pnpm vitest run --project client src/lib/components/layout/header.svelte.test.ts` fails with `Executable doesn't exist at ...chromium_headless_shell-1243...`, which is the missing piece `ci.yml` now installs.
- **Verifier blocker, fixed** — the extensionless import in `vite.config.ts` made Vite's native config loader print `unsupported by configLoader: 'native' ... without a file extension` on every command. Both configs now import `./src/testing/browser-channel.ts`. Re-ran the split commands: no warning, all green.
- **Verifier advisories, fixed** — port span 100 → 1000 (two sibling names collided at 4248), `CI=false` no longer counts as CI, cache `restore-keys` added, README/AGENTS wording says "default", not "fallback".
- **CI proven** — run 39680460449 on `ubuntu-latest` passed all steps: browser 24 files / 224 tests, E2E 12 tests, domain 1102 tests, no retry needed. This machine still has Edge only.
