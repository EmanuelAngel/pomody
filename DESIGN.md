---
name: Pomody
description: Distraction-free Pomodoro timer designed for sustained deep work and intentional recovery
colors:
  bg-base: '#191724'
  bg-surface: '#1f1d2e'
  bg-overlay: '#26233a'
  text-primary: '#e0def4'
  text-subtle: '#908caa'
  text-muted: '#6e6a86'
  accent-rose: '#ebbcba'
  accent-foam: '#9ccfd8'
  accent-pine: '#31748f'
  accent-iris: '#c4a7e7'
  accent-love: '#eb6f92'
  accent-gold: '#f6c177'
typography:
  display:
    fontFamily: 'JetBrains Mono Variable, monospace'
    fontSize: 'clamp(4.25rem, 14vw, 7.5rem)'
    fontWeight: 400
    lineHeight: 1
    letterSpacing: '-0.025em'
  headline:
    fontFamily: 'Inter Variable, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: '-0.015em'
  title:
    fontFamily: 'Inter Variable, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '-0.01em'
  body:
    fontFamily: 'Inter Variable, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 'normal'
  label:
    fontFamily: 'Inter Variable, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 600
    lineHeight: 1
    letterSpacing: '0.25em'
rounded:
  sm: '6px'
  md: '8px'
  lg: '10px'
  xl: '14px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '24px'
  xl: '32px'
components:
  button-primary:
    backgroundColor: '{colors.accent-rose}'
    textColor: '{colors.bg-base}'
    rounded: '{rounded.full}'
    size: '64px'
  button-primary-hover:
    backgroundColor: '{colors.accent-rose}'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.text-muted}'
    rounded: '{rounded.full}'
    size: '48px'
  button-ghost-hover:
    backgroundColor: '{colors.bg-overlay}'
    textColor: '{colors.text-primary}'
---

# Design System: Pomody

## Overview

**Creative North Star: "The Focused Atelier"**

Pomody is structured around the disciplined, tactile feel of a high-craft artisan workshop. Every element—from the slender progress arc to the tactile status dots and restorative break cards—is deliberate, quiet, and grounded. The interface exists in service of sustained cognitive flow: during active work intervals, navigation and extraneous secondary controls quietly recede into the canvas ("Zen Mode"), leaving only what protects concentration.

The visual language rejects loud gradients, aggressive gamification badges, skeuomorphic noise, and high-frequency visual alarms. Instead, depth is conveyed through subtle tonal layering of natural pigments inspired by Rosé Pine. Restorative pauses and focus blocks communicate state through clear, calming chromatic assignments: fresh maritime foam for focus, deep cool pine for short breaks, and lavender iris for deep rejuvenation.

**Key Characteristics:**

- **Receding Surface Architecture**: Non-essential tools vanish during active focus, leaving an uncluttered digital canvas.
- **Organic Tonal Layering**: Zero heavy drop shadows; depth is structured strictly through step-wise surface luminescence (Base, Surface, Overlay).
- **Sub-Second Monospace Typography**: High-legibility tabular figures for time counting paired with balanced humanistic typography for guidance.
- **Intentional Restorative Accents**: Palette cues tied directly to physiological and cognitive states (Focus, Short Break, Long Break).

## Colors

The color palette is built upon Rosé Pine's natural botanical and mineral pigments, adapted across three distinct modes: Dark neutral (`base: #191724`), Dawn light (`base: #faf4ed`), and OLED pure black (`base: #000000`).

### Primary

- **Rosé Quartz Accent** (`#ebbcba` in Dark, `#d7827e` in Dawn, `#ebbcba` in OLED): The signature energetic accent and default primary button tint. Represents deliberate initiation and primary action without evoking alarming urgency.

### Secondary

- **Foam Aquamarine** (`#9ccfd8` in Dark, `#56949f` in Dawn, `#9ccfd8` in OLED): Dedicated focus-state color. Applied to the circular progress ring, active timer headers, and task pill tags.
- **Pine Sea-Teal** (`#31748f` in Dark, `#286983` in Dawn, `#3e8fb0` in OLED, with `#56a8c7` for OLED mode text): Dedicated short break color. Eases eye fatigue and invites cognitive decompression.
- **Iris Lavender** (`#c4a7e7` in Dark, `#907aa9` in Dawn, `#c4a7e7` in OLED): Dedicated long break and restorative mindfulness color.

### Tertiary

- **Warm Gold** (`#f6c177` in Dark, `#ea9d34` in Dawn, `#f6c177` in OLED): Physical break indicators, daily progress highlights, and warm encouragement indicators.
- **Love Crimson** (`#eb6f92` in Dark, `#b4637a` in Dawn, `#eb6f92` in OLED): Destructive actions and reset/discard confirmation states.

### Neutral

- **Base Canvas** (`#191724` Dark / `#faf4ed` Dawn / `#000000` OLED): The foundational application viewport canvas.
- **Surface Layer** (`#1f1d2e` Dark / `#fffaf3` Dawn / `#0e0d15` OLED): Elevated cards, drawers, and modal backdrops.
- **Overlay Layer** (`#26233a` Dark / `#f2e9e1` Dawn / `#171523` OLED): Interactive pills, secondary buttons, borders, and input fields.
- **Primary Text** (`#e0def4` Dark / `#575279` Dawn / `#eceaf6` OLED): High-contrast text content and timer figures.
- **Subtle Text** (`#908caa` Dark / `#797593` Dawn / `#a39ec4` OLED): Secondary descriptions, active metadata, and input labels.
- **Muted Text** (`#6e6a86` Dark / `#9893a5` Dawn / `#7d789c` OLED): Inactive tabs, placeholder copy, and disabled actions.

### Named Rules

**The Chromatic State Rule.** Accent colors are never decorative flourishes. Foam, Pine, and Iris are strictly reserved for state signification (Focus, Short Break, Long Break respectively). Never swap mode accents across states.

**The WCAG AA Contrast Rule.** Text colors displayed over Base or Surface canvases must maintain at least 4.5:1 contrast ratio across Dark, Dawn, and OLED modes.

## Typography

**Display Font:** JetBrains Mono Variable (tabular-nums, monospace)
**Body Font:** Inter Variable (with sans-serif system fallback)
**Label/Mono Font:** Inter Variable (wide tracking for labels) / JetBrains Mono Variable (for numeric stats)

**Character:** Balanced mechanical precision meets humanistic readability. The timer display reads with stopwatch clarity, while conversational copy, guides, and forms feel warm, thoughtful, and unobtrusive.

### Hierarchy

- **Display** (Regular 400, `clamp(4.25rem, 14vw, 7.5rem)`, line-height 1): Monospace tabular countdown numbers at the core of the timer arc.
- **Headline** (SemiBold 600, `1.25rem` / 20px, line-height 1.3): Dialog headers, sheet drawer titles, and planning board section headings.
- **Title** (SemiBold 600, `0.875rem` / 14px, line-height 1.25): Break card titles, task items, and setting group headings.
- **Body** (Regular 400, `0.875rem` / 14px, line-height 1.5): Micro-guides, break instructions, settings descriptions, and input values. Max line length 60ch.
- **Label** (SemiBold 600, `0.75rem` / 12px, tracking 0.25em, uppercase): Current timer mode status ("FOCUS", "SHORT BREAK", "LONG BREAK") above the clock.

### Named Rules

**The Tabular Clock Rule.** Timer numbers must always render with tabular numerals (`tabular-nums`) and JetBrains Mono Variable to prevent jitter and layout shifts as seconds elapse.

**The Quiet Label Rule.** State labels above the clock must always be uppercase with wide letter spacing (`tracking-[0.25em]`) at 12px/14px, maintaining immediate peripheral comprehension.

## Layout

Pomody employs a centered, vertical focal layout engineered to keep user attention anchored to the center of the display while giving ample breathing room.

- **Viewport Geometry**: Max width container constrained to `max-w-sm` (384px) on mobile and `max-w-md` (448px) on desktop viewports, centered horizontally and vertically.
- **Zen Mode Transition**: When the timer starts, the top navigation header and secondary timer controls smoothly transition to `opacity-0` with `pointer-events-none` over 300ms, eliminating peripheral distraction.
- **Spatial Rhythm**: Multiples of 4px and 8px: `gap-1.5` (6px) between chips, `gap-2` (8px) between status dots, `gap-6` to `gap-8` (24px - 32px) for control pads, and `p-3.5` (14px) internal card padding.
- **Drawer Panels**: Deep configuration parameters reside in a right-sliding sheet drawer (`w-[380px]` max), preserving a lean primary canvas.

## Elevation & Depth

Pomody is flat by default with planar tonal stepping. It deliberately avoids artificial drop shadows, blurred glows, and heavy skeuomorphic bevels.

- **Tonal Stepping**: Depth is communicated strictly by ascending background luminescence: Base (`#191724`) → Surface (`#1f1d2e`) → Overlay (`#26233a`).
- **Border Definition**: Cards, badges, and segmented tab containers utilize delicate borders (`border-border/40` or `border-border/50`) to separate adjacent tonal planes without visual weight.
- **Floating Controls**: The primary play/pause circular button utilizes a gentle tactile shadow (`shadow-md`) to denote actionable prominence.

### Named Rules

**The Tonal-Not-Shadow Rule.** Never introduce elevation using dark, diffuse drop shadows on cards or containers. Surfaces distinguish themselves through explicit surface token hierarchy and subtle hairline borders.

## Shapes

- **Concentric Circles**: The focal center is anchored by an SVG circle (`radius: 148px`, stroke width `2.5px`) with rounded stroke caps (`stroke-linecap: round`).
- **Pill Silhouettes**: Primary controls, navigation tab lists, task pills, and status tags favor full capsules (`rounded-full`).
- **Cards and Dialogs**: Structured containers and break cards use generous rounded corners (`rounded-xl` / 12px - 14px) with subtle internal padding (`p-3.5`).
- **Inputs and Buttons**: Standard form controls and buttons adopt `rounded-md` (`0.625rem` / 10px scaled to `8px` or `6px` via `--radius-md` and `--radius-sm`).

## Components

### Buttons

- **Primary Action (Play/Pause)**:
  - **Shape:** Full circle (`rounded-full`, size `64px` / `size-16`).
  - **Color:** Background `{colors.accent-rose}`, text `{colors.bg-base}`.
  - **Interactions:** Subtle scale effect on hover (`hover:scale-105`) and active press (`active:scale-95`).
- **Secondary Actions (Reset, Skip)**:
  - **Shape:** Full circle (`rounded-full`, size `48px` / `size-12`).
  - **Color:** Ghost variant; transparent background with `{colors.text-muted}` icon, transitioning to `{colors.text-primary}` on hover.
  - **Behavior:** Fades to 0 opacity during active focus running state.
- **Standard Button (shadcn-svelte)**:
  - **Shape:** `rounded-md` (8px). Height `36px` (`h-9`), padding `10px 16px`.

### Navigation Pill Tablist

- **Container:** Segmented floating pill container (`rounded-full`, `bg-muted/60`, `border border-border/40`, `backdrop-blur-xs`).
- **Tabs:** Individual capsule buttons (`rounded-full`, `px-3 py-1`). Active tab takes `bg-background text-foreground shadow-xs`.

### Break Cards

- **Container:** Card container (`rounded-xl`, `border border-border/50`, `bg-card`, `p-3.5`).
- **Header:** Category badge with inline category icon + duration pill (`10px` uppercase text).
- **Expandable Micro-Guide:** Smooth slide transition reveal containing bite-sized recovery instructions in `{colors.text-muted}` (`text-xs/relaxed`).

### Timer Arc & Display

- **Arc:** Responsive SVG viewport (`320x320`), background track `stroke-border/70`, dynamic stroke `2.5px` animated with `ease-linear`.
- **Round Dots:** 4-dot indicator row (`size-2 sm:size-2.5 rounded-full`) indicating completed rounds, active round (halo border), and upcoming rounds.

## Do's and Don'ts

### Do:

- **Do** preserve Zen Mode discipline: all peripheral controls must fade out when a focus session is active.
- **Do** format timer digits with JetBrains Mono Variable and `tabular-nums` to eliminate jitter.
- **Do** use Rosé Pine semantic mode tokens (`--accent-foam` for focus, `--accent-pine` for short break, `--accent-iris` for long break).
- **Do** maintain clear tonal hierarchy (`bg-base` → `bg-surface` → `bg-overlay`).
- **Do** keep cards and dialogs flat with subtle hairline borders (`border-border/40`).

### Don't:

- **Don't** add loud skeuomorphic gradients, heavy box-shadows, or artificial neon glows.
- **Don't** use standard sans-serif variable figures for the timer digits.
- **Don't** display persistent clutter or distracting metric charts on the main timer screen during focus.
- **Don't** use arbitrary hex codes inline; always consume semantic tokens or Rosé Pine palette variables.
- **Don't** introduce barrel files (`index.ts`) outside vendor shadcn-svelte directories.
