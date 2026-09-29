# Design Brief: Break Activities & Custom Habits Catalog

> Context: Issue [#36](https://github.com/EmanuelAngel/pomody/issues/36) — Break activities catalog and custom management UI.

## 1. Job and Audience

- **Audience:** Knowledge workers, software developers, and students performing deep work focus sessions.
- **Visitor Mode:** **Operate**.
- **Context:** Users access this surface during session preparation (inside the Planning view) to configure, discover, or personalize restorative break activities. This eliminates decision fatigue and mindless screen browsing when a break chime sounds.

## 2. Outcome and Proof

- **Catalog Exploration:** Fluid browsing of 10 curated preset activities and user-created custom habits, organized across three distinct categories: `Physical`, `Mindful`, and `Hydration`.
- **Micro-Guides:** Immediate visibility of concise, 2-3 step guided instructions without navigation friction or heavyweight Markdown rendering overhead.
- **Custom Habit Management (CRUD):** Clear, validated creation and editing workflows, alongside safe deletion with confirmation dialogues.
- **Catalog Integrity:** Core system presets are protected against accidental mutation or deletion. A single-click "Reset to defaults" (`resetToDefaults()`) action allows restoring the original 10 presets at any time.

## 3. Selected Direction & Layout Topology

- **Surface Location:** Integrated within the **Planning** view as a top-level segment switch (`Tasks` | `Break Habits`), maintaining single-pane session planning without cluttering the primary application header or hiding features inside Settings.
- **Control Bar:**
  - Category filter chips: `All`, `Physical`, `Mindful`, `Hydration` with dynamic count badges.
  - Primary Action: `+ New Habit` button to trigger the creation drawer/dialog.
  - Secondary Action: `Reset to defaults` button with confirmation prompt.
- **Activity Grid / Cards:** Minimalist, card-based layout utilizing Rosé Pine semantic design tokens:
  - Category badge with Lucide icon (`Activity` in Gold, `Sparkles` in Iris, `Droplet` in Foam).
  - Title and estimated duration pill (e.g. `2m`, `5m`).
  - Subtle status indicator distinguishing system presets from custom habits.
  - Micro-guide step container formatted with clean, pre-line typography.
  - Contextual action menu (Edit / Delete) rendered strictly on user-created custom habits.
- **Form Modal / Drawer:** An accessible, keyboard-navigable dialog or drawer enforcing domain constraints:
  - `title`: 1–120 characters, required.
  - `category`: `physical` | `mindful` | `hydration`, required.
  - `durationMinutes`: integer ≥ 1, defaults to 5.
  - `guide`: multiline plain text, 0–500 characters.

## 4. Scope and Boundaries

- **In Scope:**
  - Accessible catalog browser component.
  - Micro-guide viewer and expandable steps.
  - Custom habit creation, editing, and deletion modal/drawer.
  - Reset catalog to defaults action.
  - Reactive state connection to `BreaksState` in `src/lib/state/breaks.svelte.ts`.
  - Comprehensive unit and Vitest Browser Mode (Chromium) component tests.
- **Out of Scope (Anti-Goals):**
  - Rich text or WYSIWYG editors (strictly lightweight multiline plain text).
  - Drag-and-drop manual reordering.
  - Cloud synchronisation or user authentication (strictly local-first / offline-first).
  - Altering the core timer finite state machine during active focus.

## 5. States and Ranges

- **Data Ranges:**
  - Presets: Exactly 10 immutable entries.
  - Custom habits: 0 to 50 typical range.
- **UI States:**
  - Loading: Skeleton / subtle loader while IndexedDB/LocalStorage initializes.
  - Populated: Responsive grid (1-column on mobile, 2-to-3 columns on wider screens).
  - Filtered Empty: Clean empty state when a selected category has no activities.
  - Form Open: Trapped focus, ESC key handling, accessible ARIA attributes.
  - Deletion Confirmation: Inline or alert dialog before deleting a custom habit.

## 6. Architecture & Implementation Mapping

- **Domain Layer (`src/lib/domain/breaks/`):** Utilizes `BreakActivity`, `createBreakActivity`, and category validators (already 100% covered).
- **Port & Repository (`src/lib/domain/ports/` & `src/lib/adapters/storage/`):** Connects to `IBreakActivityRepository` and `LocalStorageBreakActivityRepository`.
- **State Management (`src/lib/state/breaks.svelte.ts`):** Expose reactive mutating methods (`saveActivity`, `deleteActivity`, `resetDefaults`) using Svelte 5 Runes.
- **Presentation Layer (`src/lib/components/planning/` or `src/lib/components/breaks/`):** Modular Svelte 5 components composed cleanly.
