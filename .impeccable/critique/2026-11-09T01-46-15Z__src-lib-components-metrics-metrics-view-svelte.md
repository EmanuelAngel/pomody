---
target: metrics view
total_score: 23
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\Usuario\\dev\\pomody\\src\\lib\\components\\metrics\\metrics-view.svelte"
target_fingerprint: 'sha256:cf340955664a32672c8c7ff5fb8c0dedd1ea79a8315d4954d2eeda31b03e99a4'
target_path: "C:\\Users\\Usuario\\dev\\pomody\\src\\lib\\components\\metrics\\metrics-view.svelte"
timestamp: 2026-11-09T01-46-15Z
slug: src-lib-components-metrics-metrics-view-svelte
---

Method: dual-agent (A: gentle-ai-explore · B: detector run inline, verifier not admitted)

Score 23/40 (58%, Acceptable). Specificity 5/10: competent shadcn Card stack, little Pomody voice (rose/iris charts, no foam state semantics).

Priority issues

- [P1] Non-today bars fail non-text contrast (fill-primary/40: ~1.45:1 Dawn, ~2.7:1 Dark). Fix: /70 + stroke for today. harden, polish.
- [P1] Chart a11y contradiction: role=img with interactive Tooltip.Trigger bars, no tabindex/focus ring, unlabeled sr-only list, no live announce on week change. harden.
- [P1] No loading/error/honest empty state: routes/+page.svelte await import without catch; entries.length===0 conflates loading/empty/failure; empty hides goal CTA. harden, clarify.
- [P2] Hierarchy drift vs planning (h2 size, no subtitle, container, padding); SVG scaled ~1.9x on desktop, 9/10px axis text on mobile; ragged 5-card grid. layout, typeset.
- [P2] Hourly chart has no tooltips while weekly does; jargon ("Compliance", "Goal days"); h/m hardcoded, {hour}:00 assumes 24h. clarify, polish.

Detector: 3 advisory design-system-font-size (hourly:69 10px, weekly:91 9px, weekly:125 10px). Agrees with A (axis text off ramp). No false positives.
