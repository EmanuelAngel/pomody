---
target: @src/lib/components/metrics/metrics-view.svelte
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:C:\\Users\\Usuario\\dev\\pomody\\src\\lib\\components\\metrics\\metrics-view.svelte"
target_fingerprint: "sha256:746e90fdae6dbf89e6133eff131bc834fc57cbd2185771c22d3b2e14703df3b9"
target_path: "C:\\Users\\Usuario\\dev\\pomody\\src\\lib\\components\\metrics\\metrics-view.svelte"
timestamp: 2026-11-15T02-34-32Z
slug: src-lib-components-metrics-metrics-view-svelte
---

**Method: dual-agent (A: gentle-ai-explore · B: gentle-ai-verify)** — source-only; no browser automation in this session.

## Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                                                    |
| --------- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| 1         | Visibility of System Status     | 3         | Loading `role="status"` and the week-change live list are real; nothing says the strip mixes two time scopes |
| 2         | Match System / Real World       | 3         | "Compliance" is engineer-speak for a calm app; `1h 0m` vs `1h` elsewhere                                     |
| 3         | User Control and Freedom        | 2         | No "current week" reset, unbounded back-paging, zero keyboard path                                           |
| 4         | Consistency and Standards       | 2         | Panels now match Planning, but the two charts use different scale grammars                                   |
| 5         | Error Prevention                | 3         | No destructive controls; floor on `percent()` is genuinely thoughtful                                        |
| 6         | Recognition Rather Than Recall  | 2         | Every value is hover-only; hour axis labels 4 of 24 ticks                                                    |
| 7         | Flexibility and Efficiency      | 2         | `delayDuration={0}`, `cursor-default`, no comparison or totals                                               |
| 8         | Aesthetic and Minimalist Design | 4         | Restrained, Rosé Pine only, no chart junk — the best thing here                                              |
| 9         | Error Recovery                  | 2         | A blank week/hour panel has no message; migrated entries vanish silently                                     |
| 10        | Help and Documentation          | 2         | Streak semantics, Compliance definition and data retention are undocumented in-UI                            |
| **Total** |                                 | **25/40** | **Acceptable**                                                                                               |

## Design Specificity Verdict

**LLM assessment — half-authored.** The _data_ is Pomody: "Rest day / Nothing to reach today. Enjoy it.", goal-days, compliance derived from started-vs-completed blocks. No generic dashboard says "rest day". The _composition_ is not: KPI strip to two equal cards to chevron pager is the default analytics template, and "Time of day" is the most recycled productivity chart there is. No visual idea ties it to the pomodoro cycle or the break rhythm.

**Deterministic scan** — 5 findings, all one rule: `design-system-font-size`, severity `advisory`. `11px` at `metrics-view.svelte:101,106`; `10px` at `weekly-bars-chart.svelte:91,126` and `hourly-pattern-chart.svelte:90`. Engine 0.1.16 returned exit 0 despite these findings. No false positives claimed: none of `10px`/`11px` is a `typography:` step in `DESIGN.md`, and the only `10px` there is a radius token.

**Visual overlays**: none. No browser automation was available, so no live-server injection ran and no `[Human]` tab exists for this round. Fallback signal: static `detect` only.

## Overall Impression

Calm, honest, restrained — and it stops there. The numbers are plausible and the rest-day copy shows real product judgment, but the screen never tells you what to look at, its values are reachable only with a mouse, and paging back three weeks leaves five equally authoritative cells describing two different periods.

## What's Working

1. **The rest-day honesty** — `metrics_today_rest_day` / "Nothing to reach today. Enjoy it." refuses to shame the user; the one place the Zen commitment reaches the data layer.
2. **Label, value, detail with `tabular-nums`** — digits do not jitter, and two cells carry a "why" line.
3. **Shared chart box and documented contract** — identical `viewBox="0 0 320 160"` and plot band keep the panels level at any width; each is `role="img"` with an `sr-only` mirror; charts are lazily imported.

## Priority Issues

**[P1] The metric strip silently mixes two time scopes, and its control lives 300px away.**
`total`, `compliance`, `attainment` come from `selectedWeekStart`; `today` and `streak` from `todayKey`. The pager that moves the first three sits inside the chart panel, below the strip, and the range label sits next to the arrows, not the numbers. Page back ten weeks and "Week focus 12h 0m" and "Streak 4 days" look equally authoritative while describing different periods.
_Fix:_ lift the pager into the strip's own header row with `weekRange` there, and put scope in the labels.
_Suggested command:_ `$impeccable layout`

**[P1] Every value is hover-only; keyboard and touch users get only a summary label.**
Bars are `<g tabindex="-1">` inside `Tooltip.Trigger` — deliberately inert per `decisions.md`, which makes the tooltip the only channel for numbers. A sighted keyboard user cannot read a day value; the `sr-only` list rescues screen readers only.
_Fix:_ make the hit band focusable and labelled (`tabindex="0"` + `aria-label` + focus-driven tooltip), or add a "Show values" toggle.
_Suggested command:_ `$impeccable audit`

**[P1] In Dawn both bar fills still fall short of 3:1, and the today/other distinction is hue-only.**
`fill-accent-iris/70` over `bg-card/40` blends to approximately 2.3:1; today's `fill-primary` approximately 2.7:1 — both under the 3:1 non-text minimum, about 0.2 luminance apart. This is the fix that landed in the previous slice and it stops short. The numbers are reviewer sRGB blends from `app.css`, not a detector.
_Fix:_ drop the alpha (`fill-accent-iris` approximately 3.5:1 in Dawn) and give today a second channel — a stroke or a dot under the label.
_Suggested command:_ `$impeccable colorize`

**[P1] Zero-data weeks and hours render as a full, blank chart with no explanation.**
`entries.length === 0` is the only empty gate. A week with no sessions shows seven invisible bars under a `60m` axis, looking loaded and empty at once. The hourly side is worse: `peak = Math.max(...hours)` means a 3-minute peak draws a full-height bar, and migrated entries are excluded from the hourly aggregation.
_Fix:_ render a centred `text-[11px]` line when the series sums to zero, and floor the hourly axis the way the weekly chart already does.
_Suggested command:_ `$impeccable harden`

**[P2] Duration and heading inconsistencies make the app feel assembled from parts.**
`formatDailyDuration` emits `1h 0m` here while planning emits `1h` for the same 60 minutes, and the document `h1` is still "Pomody — Focus Timer" on the Metrics tab.
_Fix:_ make planning import `formatDailyDuration`; make the sr-only `h1` track `activeTab`.
_Suggested command:_ `$impeccable clarify`

## Persona Red Flags

**Alex (impatient power user)** — zero `onkeydown` in this view while planning offers `c`/`n`/`b`/`Escape`; the previous-week arrow is unbounded with no "current week" button, so 12 weeks back costs 12 clicks with the label shifting under the cursor; `delayDuration={0}` makes crossing the chart strobe tooltips.

**Sam (screen reader, keyboard, 200% zoom)** — the tablist at `header.svelte:143-153` declares `role="tab"` with no arrow-key handler and no roving tabindex; chart values are unreachable; `text-muted-foreground` on `bg-card/40` in Dawn is about 4.1:1 carrying `text-[11px]` labels and `text-[10px]` ticks; at 200% the strip becomes a 2-column ladder with an orphan cell.

## Minor Observations

- `decisions.md` still describes the strip as one shared `rounded-xl bg-muted/20` container; the code now renders five independent cards.
- Cell titles are `span`s; the strip is neither a landmark nor a list.
- Weekly labels only its top value, hourly labels no value — two scale grammars side by side.
- `cursor-default` on a band that opens a tooltip advertises "not interactive".
- The fixed `DailyCounter` floats over the lower panel and restates the strip.
- `percent()` flooring and the lazy chart import are both correct; keep them.

## Questions to Consider

1. If the visitor's task is "did I do well this week?", why is the answer split across five equal cells and two charts with incompatible scales?
2. Is a 30-day "Time of day" histogram normalized to always look full a focus tool, or the vanity metric Pomody's restraint should have refused?
3. What would this screen look like designed around the pomodoro cycle instead of around a dashboard?
