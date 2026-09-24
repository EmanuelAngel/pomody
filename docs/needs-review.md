# Hallazgos y Mejoras Pendientes (Needs Review)

> Registro de descubrimientos menores, consideraciones de diseño y optimizaciones diferidas identificadas durante las revisiones de código.

---

## 1. Contraste de Color en Etiquetas de Modo (Paleta Rosé Pine)

- **ID Referencia:** JD-05
- **Ubicación:** `src/lib/components/timer/timer-display.svelte`
- **Descripción:** Las etiquetas superiores de modo (`FOCUS`, `SHORT BREAK`, `LONG BREAK`) emplean colores de acento directos de Rosé Pine (`--accent-foam` `#56949f`, `--accent-iris` `#907aa9` y `--accent-pine` `#31748f`). En temas claros como _Dawn_ (`#faf4ed`) y oscuros como _Dark_ (`#191724`), el ratio de contraste contra el fondo base ronda entre 3.08:1 y 3.47:1, por debajo del estándar formal WCAG 2.1 AA (4.5:1 para texto menor a 18pt).
- **Estado:** Diferido por fidelidad a la paleta oficial y estética minimalista. A evaluar en futuras iteraciones de accesibilidad temática.

---

## 2. Artefacto de Trazado SVG a 0% de Progreso (Punto Fantasma)

- **ID Referencia:** JD-02
- **Ubicación:** `src/lib/components/timer/timer-arc.svelte`
- **Descripción:** Cuando el temporizador se encuentra detenido o restablecido (`progress === 0`), `strokeDashoffset` iguala la longitud total de la circunferencia (`CIRCUMFERENCE`). La especificación SVG establece que un trazo con longitud nula y `stroke-linecap="round"` se dibuja como un punto con diámetro igual al `stroke-width` (2.5px) en la posición de inicio (12 en punto).
- **Estado:** Clasificado como detalle cosmético menor. Para resolver a futuro ocultando el trazo o alternando `stroke-linecap` condicionalmente solo cuando `progress > 0`.

---

## 3. Sobrescritura de Tamaños y Dimensionamiento de Iconos en Botones

- **ID Referencia:** JD-13
- **Ubicación:** `src/lib/components/timer/timer-controls.svelte`
- **Descripción:** Se utilizan clases utilitarias (`class="size-12"`, `class="size-16"`) combinadas con variantes de tamaño de shadcn-svelte (`size="icon"`, `size="icon-lg"`), así como tamaños fijos en iconos Lucide (`size-5`, `size-7`).
- **Estado:** Pendiente de normalización dentro del sistema de variantes del componente `Button` o mediante utilidades de diseño atómicas.

---

## 4. Título Dinámico del Documento durante la Cuenta Regresiva

- **ID Referencia:** JD-15
- **Ubicación:** `src/routes/+page.svelte`
- **Descripción:** El elemento `<title>` en `<svelte:head>` permanece estático (`Pomody — Minimalist Focus Timer`) y no refleja el tiempo restante ni el modo en ejecución, impidiendo monitorear el temporizador desde la pestaña del navegador.
- **Estado:** Planificado para la etapa de integración de ciclo de vida y experiencia de usuario extendida.

---

## 5. Clases Utilitarias Redundantes en SVG de Arco

- **ID Referencia:** JD-16
- **Ubicación:** `src/lib/components/timer/timer-arc.svelte`
- **Descripción:** El elemento `<svg>` incluye las clases `-rotate-0 transform`, las cuales son remanentes innecesarios bajo el motor de Tailwind CSS v4.
- **Estado:** Limpieza cosmética menor para el próximo ciclo de refactorización de estilos.
