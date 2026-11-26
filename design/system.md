# Pomody Design System

Source of truth: `src/app.css` (Tailwind v4 + shadcn-svelte mappings, three themes via `[data-theme]`). Illustration palette: `src/lib/components/illustration/forest-palette.css` (scoped to forest illustrations only).

Themes: `dark` (Rosé Pine, default), `dawn` (Rosé Pine Dawn, light), `oled` (pure black + botanical tones). Token names are identical across themes; values below are the dark theme, with the overrides noted per row when they differ.

## Colors — shadcn-svelte mapping (`src/app.css`)

| Token                    | Dark      | Dawn      | OLED      |
| ------------------------ | --------- | --------- | --------- |
| `--background`           | `#191724` | `#faf4ed` | `#000000` |
| `--foreground`           | `#e0def4` | `#575279` | `#eceaf6` |
| `--card`                 | `#1f1d2e` | `#fffaf3` | `#0e0d15` |
| `--card-foreground`      | `#e0def4` | `#575279` | `#eceaf6` |
| `--popover`              | `#1f1d2e` | `#fffaf3` | `#0e0d15` |
| `--popover-foreground`   | `#e0def4` | `#575279` | `#eceaf6` |
| `--primary`              | `#ebbcba` | `#d7827e` | `#ebbcba` |
| `--primary-foreground`   | `#191724` | `#faf4ed` | `#000000` |
| `--secondary`            | `#26233a` | `#f2e9e1` | `#171523` |
| `--secondary-foreground` | `#e0def4` | `#575279` | `#eceaf6` |
| `--muted`                | `#26233a` | `#f2e9e1` | `#171523` |
| `--muted-foreground`     | `#908caa` | `#797593` | `#a39ec4` |
| `--accent`               | `#26233a` | `#f2e9e1` | `#171523` |
| `--accent-foreground`    | `#ebbcba` | `#d7827e` | `#ebbcba` |
| `--destructive`          | `#eb6f92` | `#b4637a` | `#eb6f92` |
| `--border`               | `#26233a` | `#f2e9e1` | `#232038` |
| `--input`                | `#26233a` | `#f2e9e1` | `#232038` |
| `--ring`                 | `#ebbcba` | `#d7827e` | `#ebbcba` |

## Colors — Rosé Pine base (`src/app.css`)

| Token            | Dark      | Dawn      | OLED      |
| ---------------- | --------- | --------- | --------- |
| `--bg-base`      | `#191724` | `#faf4ed` | `#000000` |
| `--bg-surface`   | `#1f1d2e` | `#fffaf3` | `#0e0d15` |
| `--bg-overlay`   | `#26233a` | `#f2e9e1` | `#171523` |
| `--text-muted`   | `#6e6a86` | `#9893a5` | `#7d789c` |
| `--text-subtle`  | `#908caa` | `#797593` | `#a39ec4` |
| `--text-primary` | `#e0def4` | `#575279` | `#eceaf6` |
| `--accent-love`  | `#eb6f92` | `#b4637a` | `#eb6f92` |
| `--accent-rose`  | `#ebbcba` | `#d7827e` | `#ebbcba` |
| `--accent-pine`  | `#31748f` | `#286983` | `#3e8fb0` |
| `--accent-foam`  | `#9ccfd8` | `#56949f` | `#9ccfd8` |
| `--accent-iris`  | `#c4a7e7` | `#907aa9` | `#c4a7e7` |
| `--accent-gold`  | `#f6c177` | `#ea9d34` | `#f6c177` |

Mode label text (WCAG AA ≥ 4.5:1 on `--bg-base`): `--mode-focus-text`, `--mode-short-break-text`, `--mode-long-break-text` per theme, see `src/app.css`.

## Typography (`src/app.css`, `@theme inline`)

| Token         | Value                                      |
| ------------- | ------------------------------------------ |
| `--font-sans` | `'Plus Jakarta Sans Variable', sans-serif` |
| `--font-mono` | `'Commit Mono', monospace`                 |

Brand/nav micro-labels use `text-xs` uppercase `tracking-wider`; nav tabs use `text-xs` `tracking-tight`; the timer face uses the mono family with the `clock-figures` utility, which sets the dotted zero (`cv07`) and `tabular-nums` together. The small numeric stats stay on plain `font-mono` + `tabular-nums`: at 10-12px the dot collapses into noise.

## Radius (`src/app.css`)

| Token          | Value                       |
| -------------- | --------------------------- |
| `--radius`     | `0.625rem`                  |
| `--radius-sm`  | `calc(var(--radius) * 0.6)` |
| `--radius-md`  | `calc(var(--radius) * 0.8)` |
| `--radius-lg`  | `var(--radius)`             |
| `--radius-xl`  | `calc(var(--radius) * 1.4)` |
| `--radius-2xl` | `calc(var(--radius) * 1.8)` |
| `--radius-3xl` | `calc(var(--radius) * 2.2)` |
| `--radius-4xl` | `calc(var(--radius) * 2.6)` |

## Component rules (project conventions)

- UI primitives: shadcn-svelte only (`src/lib/components/ui/` is the sole barrel-file exception). Icons: `@lucide/svelte` per-icon imports.
- Tailwind utility classes with semantic CSS variables; Rosé Pine tokens, never hard-coded hex in components.
- Focus: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`.
- Scrollbars: thin (6px), thumb `--text-muted`.
- Header: fixed, `h-14`, optional `border-b border-border/40 bg-background/50 backdrop-blur-2xl` when a surface is behind it.
- Active nav indicator today: 4px × 16px rounded pill under the tab, `bg-accent-rose`.
- Illustration-only greens/browns from `forest-palette.css` must not leak into UI chrome.
