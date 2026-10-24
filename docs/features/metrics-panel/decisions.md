# Panel de Métricas — Decisiones de implementación

> Milestone 6, P4 del [`roadmap.md`](../../roadmap.md). Issue #214. Aquí vive solo lo que el código no explica por sí mismo.

---

## Gráficos en SVG propio: excepción a la regla 3 de `AGENTS.md`

**Decisión.** Las barras semanales y el patrón por hora son SVG escrito a mano (`weekly-bars-chart.svelte`, `hourly-pattern-chart.svelte`), con el aspecto de los charts de shadcn-svelte sobre los tokens Rosé Pine. No se usa el componente `Chart` de shadcn-svelte.

**Por qué.** `Chart` es un envoltorio de LayerChart sin capa propia. `layerchart@2.0.0-next.66` es un prerelease con 29 dependencias de runtime y 4,1 MB descomprimido; el costo real tras tree-shaking no se midió. Para dos gráficos de barras, esa dependencia pesa más que el código que ahorra, y el objetivo de memoria es <30 MB.

**Qué sigue siendo shadcn-svelte.** Todo lo que rodea al gráfico: `Card`, `Tooltip`, `Button`, `Empty`.

**Cómo mantener la excepción acotada.**

- Colores solo con clases de tokens (`fill-primary`, `stroke-border`, `fill-accent-iris`); nada de hex.
- Cada gráfico es `role="img"` con `aria-label` y una lista `sr-only` con los mismos números.
- Cada barra lleva `data-chart-bar` para los tests; `data-today` marca el día actual.
- Si el panel crece a gráficos con ejes, zoom o series múltiples, revisar esta decisión antes de seguir a mano.

**Costo de la carga.** La pestaña se importa dinámicamente desde `src/routes/+page.svelte`, así que el timer no paga ni los gráficos ni las agregaciones.

## Abrir Settings desde la vista

La vista de Métricas no puede abrir el diálogo de Settings: lo posee `+layout.svelte`. Pide la apertura con `navigationState.requestSettings('metrics')` y el layout la atiende en un `$effect`. Cada pedido lleva un `id` propio, así que volver a pedir la misma pestaña reabre el diálogo después de cerrarlo.
