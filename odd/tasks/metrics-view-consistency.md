# Metrics view consistency — slice 1 (structural)

Feature branch: `chore/metrics-view-consistency`. Scope: make `metrics-view.svelte` speak the same
visual/structural language as `planning-view` and `distraction-view`. Chart internals (colour contrast,
tooltips, a11y of the two SVG files) are **slice 2, not this feature**.

## Specs

S1 — **No `Card.*`.** `metrics-view.svelte` is the only non-`ui/` component importing
`$lib/components/ui/card`. Panels become hand-rolled:
`rounded-2xl border border-border/50 bg-card/40 p-5 shadow-xs`.
Evidence: `planning-timeline.svelte:90`, `distraction-view.svelte:107-109`, `planning-timeline.svelte:145`.

S2 — **Real page header.** Replace the bare `<h2>` with a `<header>` block:
`flex flex-col gap-4 border-b border-border/40 pb-5` wrapping
`h2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl` and a subtitle
`p text-xs text-muted-foreground sm:text-sm`.
Evidence: `planning-view.svelte:89-97`. The subtitle needs a new key `metrics_subtitle`.

S3 — **Sections are `<section>` with a real heading.** Each chart panel becomes
`<section aria-labelledby="…">` whose heading is an `h3 text-sm font-semibold tracking-tight text-foreground sm:text-base`
beside an icon chip `flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary`,
with the existing description as `p text-xs text-muted-foreground`, and the week navigation kept as the
panel's trailing action.
Evidence: `planning-timeline.svelte:86-99`, `distraction-view.svelte:100-105`, `task-backlog.svelte:85-91`.
Today `Card.Title` renders a `<div>` (`ui/card/card-title.svelte:14`), so the page has no heading below `h2`.

S4 — **Stat block follows the metric-strip convention.** One `rounded-xl border border-border/40 bg-muted/20 p-3`
grid (same shell as `planning-timeline.svelte:144-153`), adapting columns to the cell count
(`grid-cols-2 gap-2.5 sm:grid-cols-3`). Each cell: label `text-[11px] font-medium text-muted-foreground`,
value `text-sm font-semibold tracking-tight text-foreground sm:text-base tabular-nums`, and the existing
detail line as `text-[11px] text-muted-foreground`. **Every value and detail string the view shows today
must survive verbatim** — `Week focus` + `Completed blocks: {n}`, `Compliance` + `{completed} of {started}
focus blocks finished`, `Today's goal` (`{m} / {g} min · {p}%` or `Rest day` + `Nothing to reach today.
Enjoy it.`), `Goal days`, `Streak`.

S5 — **The goal invite stays a plain action, not a strip cell and not a dialog.** It keeps its own
`rounded-2xl border` panel (S1) and its `Button variant="outline" size="sm"` calling
`navigationState.requestSettings('metrics')`.
Evidence: `docs/features/metrics-panel/decisions.md` (the dialog is owned by `+layout.svelte:39-46`).

S6 — **Loading and empty are two distinct states.** `FocusHistoryState` gains `isLoaded` (observability
only). Gate order: loading → empty → content, mirroring `distraction-view.svelte:144` and
`break-catalog.svelte:235-240`. Loading renders with `role="status" aria-live="polite"` and the new
`metrics_loading` key. **No error state exists, and none is added**: `LocalFocusHistoryRepository.getAll()`
is total (it swallows `getItem`/`JSON.parse`/shape errors and `getStorage()` falls back to
`InMemoryStorage`), so an error-plus-retry panel would be unreachable UI. The empty state keeps its current
`Empty.Root class="border border-dashed border-border/60"` markup **and keeps hiding the goal invite**:
that is existing behaviour with a passing test (`metrics-view.svelte.test.ts`, "shows only the empty state
and no chart") and is not redefined here.

S7 — **Charts are not touched in this slice.** `weekly-bars-chart.svelte` and
`hourly-pattern-chart.svelte` keep their SVG, tokens, `role="img"` + `sr-only` list and
`data-chart-bar` / `data-today` hooks. Do not add tooltips, change fills or change axis type sizes here.

S8 — **Root container.** Drop the redundant `self-center` (the shell already centres) and keep
`flex w-full max-w-2xl flex-col gap-6`, matching `distraction-view.svelte:88`.

Out of scope, deliberately: a back-to-timer affordance and a footer summary band (no content exists for
either; adding them would invent UI), and any change to copy semantics (`Compliance`, `Goal days`, the
hard-coded `h`/`m`, the 24h `{hour}:00` label).

## Tasks

| ID  | Specs     | Route                                                                            | Commit           |
| --- | --------- | -------------------------------------------------------------------------------- | ---------------- |
| T1  | S6        | `FocusHistoryState`: `isLoaded` + tests in `focus-history.test.ts`               | one slice commit |
| T2  | S1-S4, S8 | Restructure `metrics-view.svelte` + `metrics_subtitle` key in both message files | same commit      |
| T3  | S6        | Wire the loading gate into the view + browser test                               | same commit      |
| T4  | —         | Record the layout conventions in `docs/features/metrics-panel/decisions.md`      | same commit      |

Tests must observe RED before GREEN for each rule, and the existing `metrics-view.svelte.test.ts`
assertions must keep passing unchanged (`pnpm vitest run src/lib/components/metrics/metrics-view.svelte.test.ts --project client`).

## Log

L1 (verbatim, user): "Hay que mejorar la vista de métricas. Los gráficos en sí están bien pero debería ser
más consistente con el resto de la app. Creo que teníamos un critique report de esta vista, analizalo y
analizá la vista actual para entender a qué me refieres."

L2 (decision, user): chose "Estructura primero, P1 de charts después" — structural consistency ships first,
the chart P1s (contrast, tooltips, a11y) ship as a separate change.

L3 (evidence): `.impeccable/critique/2026-11-09T01-46-15Z__src-lib-components-metrics-metrics-view-svelte.md`
and `…03-56-45Z…`: "Specificity 5/10: competent shadcn Card stack, little Pomody voice";
"[P2] Hierarchy drift vs planning (h2 size, no subtitle, container, padding)"; "ragged 5-card grid".

L4 (evidence): conventions map produced read-only from `planning-view.svelte:87-107`,
`planning-timeline.svelte:86-99,144-153,241`, `distraction-view.svelte:88-165`,
`break-catalog.svelte:235-240`, `src/routes/+page.svelte:29-55`, `src/app.css:139-180`.

L5 (correction, verifier finding F1): the error state S6 originally asked for is unreachable in
production — `LocalFocusHistoryRepository.getAll()` cannot reject (`local-focus-history-repository.ts`
swallows read errors and falls back to `InMemoryStorage`), so `metrics_error_*` copy, `loadError` and
`retry()` were removed from S6, the store, the view, both message files and their tests. `isLoaded` and the
loading gate stay: they are observable and prevent the empty panel from flashing on first paint.
