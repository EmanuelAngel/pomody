---
target: metrics view
total_score: 24
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\Usuario\\dev\\pomody\\src\\lib\\components\\metrics\\metrics-view.svelte"
target_fingerprint: 'sha256:b6125827494fb5072cd54ec9682bc796f5f104b74825e6dc15fd553581c8d9bf'
target_path: "C:\\Users\\Usuario\\dev\\pomody\\src\\lib\\components\\metrics\\metrics-view.svelte"
timestamp: 2026-11-09T03-56-45Z
slug: src-lib-components-metrics-metrics-view-svelte
---

Method: dual-agent (A: gentle-ai-explore · B: detector run inline, verifier not admitted)

Score 24/40 (60%, Acceptable). Specificity 3/5.

Priority issues

- [P1] Colour system fails its own contrast rule: fill-primary 2.74:1 in Dawn; today vs other bars 1.14:1 in OLED; muted bars use a text token, not the chart token (iris). audit.
- [P1] No goal reference line or week-over-week delta; the chart reports but cannot be read against the goal. shape.
- [P2] Loading, error and empty share one visual; double loading gate (page + view). polish.
- [P2] Goal cannot be edited from the view once set; finish rate undefined. clarify.
- [P2] Weekly chart diverges from documented a11y contract (7 tabbable inert bars vs sr-only list). harden.

Detector: clean (0 findings) on metrics/ and routes/.
