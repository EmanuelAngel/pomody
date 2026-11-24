# Feature: Custom Window Controls (frameless main window with own title bar strip)

- **Branch**: `feat/custom-window-controls`
- **Status**: In progress
- **TDD Mode**: Test-first for everything unit-testable (port, adapter, state, component in browser mode). Native shell behaviors (drag, resize, Win shortcuts, tray after close) are **not** Vitest-testable: they go through a manual checklist on Windows and `desktop-ci.yml` as the compile gate. Exception stated, not silently skipped.
- **Decisions**: captured in the grilling session of 2026-02; written into `docs/features/custom-window-controls/decisions.md` by T1.

## Specs

- **S1**: «Llegó el día de considerar si es viable en costo y tiempo hacer que Pomody tenga unos controles de ventana propios en lugar de los nativos de Windows.» — Viability assessed; user confirmed implementation.
- **S2**: «El botón de cerrar actualmente manda a la bandeja, tray. ¿no?» — Verified fact (`src-tauri/src/lib.rs`: `prevent_close()` + `hide()`, tray Open/Exit menu, single-instance). The custom ✕ must preserve this exactly: `close()` → hidden to tray, zero Rust changes.
- **S3**: «con los atajos de windows seguiría funcionando, ¿no?» — Win+↑/←/↓, drag-to-edge snapping, Alt+F4, Win+D must keep working (OS-level). The Snap Layouts flyout is accepted as a formal loss (grilling Q1).
- **S4**: «El mini-player no tiene decorations actualmente» — Verified fact: the mini-player is the same main window resized to 320×48 with `setDecorations(false)` (`tauri-window-shell.ts`). Mini-player needs **no changes**; custom controls apply only to the main window at normal size.
- **S5**: Title bar strip (grilling Q3=separate strip, Q4=own style, Q8=title+buttons, Q9=unified visually, Q10=always visible, Q11=default shadow/corners):
  - A **separate strip above the existing header** (not merged into the header): drag region + app icon and small "Pomody" title on the left, ─ ▢ ✕ buttons on the right.
  - Visually unified with the app background (no distinct tone, no separator line), fine glyphs styled with Rosé Pine tokens, subtle hover — not a native look imitation.
  - Double-click on the strip maximizes/restores; ▢ toggles maximize/restore.
  - During a running block (Zen), the header fades but **the strip stays visible**: it is the only remaining drag/close surface.
  - Shadow and rounded corners: whatever Tauri gives by default in the first iteration.
- **S6**: Verification strategy (grilling Q7): unit tests for the testable (state, adapter via fake, component in browser mode); manual verification on Windows for native behavior (drag, resize, Win shortcuts, double-click, tray-after-close, exit-mini has no native bar); `desktop-ci.yml` as the compile gate. Playwright cannot test the native shell.

## Tasks

| ID  | Specs              | Route                                                               | Commit  |
| --- | ------------------ | ------------------------------------------------------------------- | ------- |
| T1  | S2, S3, S4, S5, S6 | Port + adapter + fake + state + config/capabilities + decisions doc | 4197f2b |
| T2  | S1, S5, S6         | Title bar strip component + layout wiring + spec doc                | 3afab01 |
| T3  | S6                 | Manual verification checklist on Windows + desktop-ci run           | pending |

## Log

- **L1**: User request (verbatim): «Llegó el día de considerar si es viable en costo y tiempo hacer que Pomody tenga unos controles de ventana propios en lugar de los nativos de Windows.»
- **L2**: Grilling session decisions (all confirmed): Snap Layouts flyout loss accepted; mini-player untouched (already decorationless); strip is separate from the header with title+buttons, visually unified, always visible in Zen; double-click maximizes; close keeps tray behavior (verified existing); shadow/corners default; verification = unit + manual on Windows + desktop-ci.
- **L3**: User correction adopted: "El mini-player no tiene decorations actualmente" — verified true; removed mini-player from decision surface.
- **L4**: User correction adopted: "El botón de cerrar actualmente manda a la bandeja, tray. ¿no?" — verified true; close behavior is preserved, not redefined.
- **L5**: User chose **B · Franja separada** over integrating controls into the header (the header itself stays untouched except by T2's layout wiring).
- **L6**: Independent verification of T1 (risk item 3) completed: all S# verdicts met (S2 code path, S3 code level, S4, S5-shell-share, S6-unit-tier); 1696 server + 39 client tests, `pnpm check`/`pnpm lint` exit 0, no repo mutation. Advisories adopted: durable share-regression test to add; decisions.md capability claim to correct; two stale mini-player docs to annotate as superseded; T1 must not ship alone (T2 lands on the same branch — planned).
- **L7**: User ordered verification redone in situ after the first verifier copied node_modules to /tmp (broke on MAX_PATH symlinks; cancelled and cleaned up). Verification must always run on the repo, never on a sandbox copy.
