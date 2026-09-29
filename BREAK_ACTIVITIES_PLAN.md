# Implementation Plan: Break Activities Catalog & Custom Habits

> Context: [Issue #36](https://github.com/EmanuelAngel/pomody/issues/36) | Design Brief: [`BREAK_ACTIVITIES_DESIGN.md`](./BREAK_ACTIVITIES_DESIGN.md) | Spec: [`docs/features/tasks-and-planning.md`](./docs/features/tasks-and-planning.md)

Implementation blueprint and architecture decisions agreed via design interview for the Break Activities Catalog, micro-guide exploration, and custom habits CRUD in Pomody.

---

## 1. Architectural Decisions

| Area                    | Decision                                                                             | Rationale                                                                                                                                        |
| :---------------------- | :----------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Surface Placement**   | Segment switch (`Tasks` \| `Break Habits`) in the **right column** of Planning view. | Preserves the macro/micro layout: the session timeline stays visible on the left while the user alternates between tasks and restorative habits. |
| **Habit Form (CRUD)**   | Accessible centered modal (`Dialog`) using `bits-ui` / `shadcn-svelte`.              | Traps focus, handles ESC, keeps the lateral panel uncluttered, and provides clean focus transitions on desktop and mobile.                       |
| **Destructive Actions** | Dedicated confirmation modal (`Dialog`) for habit deletion and "Reset to defaults".  | Prevents accidental loss of user-created habits or unintentional catalog resets.                                                                 |
| **Card Presentation**   | Compact card with expandable micro-guide (chevron toggle).                           | Ensures dense, readable scanning in the lateral column while keeping detailed 2-3 step guides available on demand.                               |
| **Component Structure** | Dedicated module directory under `src/lib/components/breaks/`.                       | Maximizes cohesion and decoupling; allows reusing break cards or catalog in other surfaces (e.g. settings or break overlay) if needed.           |
| **State Layer**         | Extend `BreaksState` in `src/lib/state/breaks.svelte.ts`.                            | Bridges reactive Svelte 5 Runes with existing `IBreakActivityRepository` operations (`save`, `delete`, `resetToDefaults`).                       |

---

## 2. Component Architecture

```text
src/lib/components/breaks/
├── break-catalog.svelte          # Main container: category filter chips, search/counter, actions bar, list/grid
├── break-card.svelte             # Card item: category badge, duration pill, expandable guide, contextual menu
├── break-form-dialog.svelte      # Centered dialog: validated form for creating & editing custom habits
└── break-confirm-dialog.svelte   # Accessible confirmation modal for delete & reset to defaults
```

### Integration in Planning View

In [`src/lib/components/planning/planning-view.svelte`](src/lib/components/planning/planning-view.svelte):

- Right column introduces a segment switch:
  - `Tasks`: renders existing [`TaskBacklog`](src/lib/components/planning/task-backlog.svelte)
  - `Break Habits`: renders `BreakCatalog`

---

## 3. Implementation Steps

### Step 1: Reactive State (`BreaksState`)

- Extend `BreaksState` in [`src/lib/state/breaks.svelte.ts`](src/lib/state/breaks.svelte.ts):
  - `saveActivity(activity: BreakActivity): Promise<void>`: persists via repository, updates reactive state.
  - `deleteActivity(activityId: string): Promise<void>`: guards presets, deletes custom habit, resets active state if targeted.
  - `resetToDefaults(): Promise<void>`: restores original 10 presets via repository.
- Unit tests in [`src/lib/state/breaks.test.ts`](src/lib/state/breaks.test.ts) covering all mutations and edge cases.

### Step 2: Dialog Primitives Setup

- Ensure accessible `Dialog` primitives exist in `src/lib/components/ui/dialog/` using `bits-ui`.

### Step 3: Break Components Implementation

- **`break-card.svelte`**:
  - Rosé Pine category accents (`Activity` in Gold, `Sparkles` in Iris, `Droplet` in Foam).
  - Duration pill (`2m`, `5m`).
  - Expandable micro-guide container with pre-line formatting.
  - Action menu (Edit / Delete) strictly enabled for custom habits (`isPreset: false`).
- **`break-form-dialog.svelte`**:
  - Live validation against domain limits: title (1–120 chars), category (`physical` | `mindful` | `hydration`), duration (integer ≥ 1), guide (0–500 chars).
- **`break-confirm-dialog.svelte`**:
  - Destructive action confirmation with clear copy and focus trap.
- **`break-catalog.svelte`**:
  - Filter chips (`All`, `Physical`, `Mindful`, `Hydration`) with counts.
  - Action triggers: `+ New Habit` and `Reset to defaults`.
  - Empty states for filtered queries.

### Step 4: Planning View Integration

- Add segment switch in the right column of [`src/lib/components/planning/planning-view.svelte`](src/lib/components/planning/planning-view.svelte).
- Connect `breaksState` initialization on mount.

### Step 5: Verification & Quality Gate

- Component tests with Vitest Browser Mode (`pnpm test:browser`).
- Full unit tests pass (`pnpm test:unit`).
- Type check: `pnpm check` (0 errors, 0 warnings).
- Lint check: `pnpm lint`.

---

## 4. Definition of Done Checklist

- [ ] `BreaksState` supports full CRUD operations with 100% test coverage.
- [ ] Accessible catalog exploration with category filters and counts.
- [ ] Custom habit creation and editing with domain validations.
- [ ] Custom habit deletion and "Reset to defaults" guarded by confirmation modal.
- [ ] Presets protected against editing or deletion.
- [ ] Responsive integration inside Planning view lateral panel.
- [ ] Browser and unit tests pass cleanly (`pnpm test`).
