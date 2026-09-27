# Design Brief: Automatic Mindful Break Revitalization (Issue #25)

## 1. Job and Audience

- **Target Audience**: Knowledge workers, developers, and students completing an intensive focus block and entering `shortBreak` or `longBreak`.
- **User Context & Mindset**: Mental fatigue, transition anxiety, vulnerability to cheap dopamine distractions (social media, algorithmic feeds, smartphones).
- **Visitor Mode**: `Operate` — minimalist, unobtrusive, calm, and guidance-oriented.

## 2. Outcome and Proof

- **Primary Objective**: Present an immediate, actionable, and restorative micro-habit (physical stretching, hydration, breathwork, or eye relaxation) as soon as the timer transitions into a break.
- **Micro-Guides without Friction**: Provide concise, self-contained textual instructions (`guide` field) directly in the UI to prevent users from leaving the app or consulting video platforms (zero distraction, zero algorithm traps).
- **Success Criteria**: Zero mandatory interaction or forms to continue resting; single-click rotation (_shuffle_) when a user wants an alternate activity; automatic contextual reveal upon FSM transition.

## 3. Selected Direction & Architecture

- **Contextual Morphing Slot**: In [src/lib/components/timer/timer.svelte](file:///C:/Users/Usuario/dev/pomody/src/lib/components/timer/timer.svelte), the slot below the timer controls occupied by [task-pill.svelte](file:///C:/Users/Usuario/dev/pomody/src/lib/components/timer/task-pill.svelte) during `focus` mode smoothly transitions into `break-revitalization.svelte` during break modes. Focus tasks disappear completely from view to protect mental recovery.
- **Separation of Concerns**:
  - **Timer View (Runtime Execution)**: Displays only the active suggestion, quick shuffle action, and an optional expandable inline guide.
  - **Planning View (Issue #28)**: Dedicated hub for full catalog management (creating custom break activities, editing presets, and assigning specific activities to session blocks).
  - **Settings Drawer**: Global toggle to enable or disable automatic revitalization suggestions for users who prefer blank breaks.

## 4. Domain Contract & Enhancements

Enriching `BreakActivity` domain model in `src/lib/domain/` to support step-by-step guidance offline:

```typescript
export type BreakCategory = 'physical' | 'mindful' | 'hydration';

export interface BreakActivity {
	readonly id: string;
	readonly title: string;
	readonly category: BreakCategory;
	readonly durationMinutes: number;
	readonly isPreset: boolean;
	readonly guide?: string; // Step-by-step textual instruction (e.g. "1. Look 20ft away... 2. Blink slowly...")
}
```

## 5. Scope and Boundaries

- **In Scope**:
  - `break-revitalization.svelte` component under `src/lib/components/timer/`.
  - Iconography categorized by `BreakCategory` (`physical`, `mindful`, `hydration`) using `@lucide/svelte`.
  - Smooth 150ms cross-fade transition on FSM mode change and on _shuffle_.
  - Initial seed of 10 curated preset activities with crisp micro-guides.
  - Non-repeating selection logic (avoids picking the immediately preceding activity).
  - Settings toggle in `settings-drawer.svelte` to enable/disable revitalization.
- **Explicit Anti-Goals**:
  - No embedded video players (`<iframe>`, YouTube, etc.): strictly prohibited to preserve the offline-first guarantee and maintain desktop memory usage under the <30 MB RAM target.
  - No static navigation tabs or backlog inspection on the timer canvas during breaks.
  - No complex management forms or CRUD modals in the timer view.

## 6. States and Interaction

- **Active State**: Shows category badge/icon, activity title, an inline trigger to expand/collapse the guide, and a subtle shuffle button.
- **Expanded Guide State**: Unfolds 2–3 concise numbered steps smoothly without shifting the overall timer layout.
- **Shuffle State**: Subtle fade/slide animation providing tactile feedback when requesting an alternative.
- **Disabled State**: When toggled off in settings, the slot renders clean whitespace (blank break).

## 7. Design Tokens & Accessibility

- **Theme Tokens**: Rosé Pine semantic CSS variables (`bg-muted/40`, `text-foreground`, `border-border/40`).
- **Contrast & Legibility**: Strict WCAG 2.1 AA conformance in Dark, Dawn, and OLED modes.
- **Accessibility**: Clear `aria-label` attributes on shuffle and guide toggles (`aria-expanded`), full keyboard navigation support, and reduced-motion respect.
