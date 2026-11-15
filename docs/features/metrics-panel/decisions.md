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

## Consistencia estructural con Planning y Distracciones (slice 1)

**Decisión.** La vista deja de usar `Card` y adopta las mismas convenciones estructurales que `planning-view` y `distraction-view`:

- **Paneles, no `Card`.** Cada bloque es un `div` o `section` con `rounded-2xl border border-border/50 bg-card/40 p-5 shadow-xs`.
- **Cabecera real.** `<header class="flex flex-col gap-4 border-b border-border/40 pb-5">` con el `h2` de la página y un subtítulo (`metrics_subtitle`).
- **Secciones con heading.** Cada gráfico vive en `<section aria-labelledby="…">` con un `h3` (`text-sm font-semibold tracking-tight … sm:text-base`), su descripción como `p` y el chip de icono (`flex size-7 … rounded-lg bg-primary/10 text-primary`). La navegación de semana queda como acción final del panel semanal.
- **Metric strip.** Las cifras comparten un único `rounded-xl border border-border/40 bg-muted/20 p-3` en rejilla (`grid-cols-2 gap-2.5 sm:grid-cols-3`), con etiqueta, valor y detalle; los textos existentes no cambian. La invitación a definir meta sigue siendo un panel aparte con su botón, nunca una celda del strip ni un diálogo.
- **Dos estados distintos.** La carga (`role="status"`, `aria-live="polite"`) se resuelve antes que el vacío, así el panel de «sin datos» nunca parpadea en la primera visita. `FocusHistoryState` expone `isLoaded` para poder distinguirlos.
- **Sin estado de error, a propósito.** `LocalFocusHistoryRepository.getAll()` es total: se traga los errores de `getItem`/`JSON.parse`/forma y `getStorage()` cae a `InMemoryStorage`. Un estado de error con reintento sería UI inalcanzable, así que no existe; un historial ilegible se muestra como vacío, que es lo que la capa de almacenamiento ya decidió.

**Fuera de este cambio.** `weekly-bars-chart.svelte` y `hourly-pattern-chart.svelte` conservan su SVG, sus tokens, su `role="img"` con lista `sr-only` y sus hooks `data-chart-bar` / `data-today`. La consistencia interna de los dos gráficos (contraste, tooltips, accesibilidad) es otra rebanada.

## Consistencia interna de los gráficos (slice 2)

**Decisión.** Los dos SVG comparten una sola gramática visual, sin abandonar el SVG a mano:

- **Mismo lienzo.** Ambos usan `viewBox="0 0 320 160"` con la misma área de trazado (`18`–`138`), así que rinden a la misma altura en cualquier ancho y los dos paneles quedan parejos en la rejilla de dos columnas.
- **Un solo token para el dato.** Las barras ordinarias de ambos gráficos son `fill-accent-iris/70`; el semanal marca el día de hoy con `fill-primary` a plena opacidad. El `fill-primary/40` anterior daba ~1.45:1 en Dawn y ~1.14:1 contra la barra de hoy en OLED.
- **Misma forma de barra.** `barPath()` redondea solo la parte superior; las dos usan el mismo helper y el mismo radio, en vez de `rx="1.5"` contra path redondeado.
- **Tooltips simétricos.** Los dos envuelven cada banda en `Tooltip.Root` con una banda de impacto transparente a toda altura, así el hover funciona también sobre las horas en cero.
- **Contrato de accesibilidad.** El `role="img"` con `aria-label` y lista `sr-only` se mantiene: el SVG es una imagen con alternativa textual, no un widget. Las barras llevan `tabindex="-1"` para no entrar al orden de tabulación siendo inertes, y la lista del semanal es `aria-live="polite"` para anunciar el cambio de semana.
- **Tipografía del eje.** `text-[10px]` en ambos; se fue el `9px` que quedaba fuera de escala.
