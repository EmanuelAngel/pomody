# Feature: Settings Drawer & Language Selector Localization (Slice 2.2)

- **Issue**: #97 (Parent: #92)
- **Specification**: `docs/features/i18n.md` (Slice 2.2)
- **Branch**: `feat/i18n-settings-slice`
- **Delivery Strategy**: `single-pr` (Forecasted changed lines: ~320 LOC, budget: 400 LOC)
- **TDD Mode**: Enabled (`pnpm vitest run <test-file> --project client`)
- **Route**: Delegated direct (bounded writer delegation for multi-file edits)

## Objective & Why

Implement an accessible `LanguageSelector` component in the settings drawer and localize all settings configuration (sliders, intervals, theme, sound, and break revitalization options) using Paraglide-JS and the reactive proxy `t` from `$lib/state/locale.svelte`. This guarantees immediate reactive updates across the entire settings UI with zero page reloads, maintaining pure Hexagonal Architecture isolation.

## Scope & Constraints

- Create accessible `LanguageSelector` component in `src/lib/components/settings/language-selector.svelte` (strictly direct imports, no barrel files).
- Integrate `LanguageSelector` into `SettingsDrawer` in `src/lib/components/settings/settings-drawer.svelte`.
- Localize `SettingsTrigger` and all copy in `SettingsDrawer`.
- Retain exact English translations so that existing tests pass without regressions.
- Add reactive locale switching tests verifying DOM reactivity when switching `en` <-> `es`.
- Respect strict 400 LOC PR budget.

## Tasks

- [x] **TASK-1: Define message keys in catalogs**
  - Path: `messages/en.json`, `messages/es.json`
  - Action: Add translation keys for settings trigger, drawer title/description, intervals (focus, short break, long break, rounds, units, reset button), theme, language, sound alerts, and break revitalization.
  - Route: inline
  - Checks: `pnpm check` (passed)
  - Commit evidence: `1804390`

- [x] **TASK-2: Create accessible LanguageSelector component and tests**
  - Path: `src/lib/components/settings/language-selector.svelte`, `src/lib/components/settings/language-selector.svelte.test.ts`
  - Action: Build accessible language toggle group selector leveraging shadcn-svelte toggle-group primitives, supporting 'en' and 'es' with reactive `localeState`. Add comprehensive browser test suite.
  - Route: delegated direct
  - Checks: `pnpm vitest run src/lib/components/settings/language-selector.svelte.test.ts --project client` (passed), `pnpm check` (passed)
  - Commit evidence: `946a14a`

- [x] **TASK-3: Localize SettingsTrigger and SettingsDrawer**
  - Path: `src/lib/components/settings/settings-trigger.svelte`, `src/lib/components/settings/settings-drawer.svelte`, `src/lib/components/settings/settings-test-host.svelte`
  - Action: Replace hardcoded strings with `t.*()` calls and mount `LanguageSelector` in the settings drawer.
  - Route: delegated direct
  - Checks: `pnpm check` (passed), `pnpm vitest run src/lib/components/settings/settings.svelte.test.ts --project client` (passed)
  - Commit evidence: `4e6da50`

- [x] **TASK-4: Comprehensive browser tests for Settings drawer i18n**
  - Path: `src/lib/components/settings/settings.svelte.test.ts`
  - Action: Add reactive locale tests to verify all drawer sections, sliders, reset button, and switches update dynamically on locale change.
  - Route: delegated direct
  - Checks: `pnpm vitest run src/lib/components/settings/settings.svelte.test.ts --project client` (passed - 24/24 tests)
  - Commit evidence: `1d9068a`

- [x] **TASK-5: Verification Gate & Final Checks**
  - Action: Execute full test and lint suite (`pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:browser`).
  - Route: inline
  - Checks: 0 errors in `pnpm check`, 0 issues in `pnpm lint`, 650/650 passed in `pnpm test:unit`, 165/165 passed in `pnpm test:browser`.
  - Commit evidence: `1804390`, `946a14a`, `4e6da50`, `1d9068a`, `fc208a3`
