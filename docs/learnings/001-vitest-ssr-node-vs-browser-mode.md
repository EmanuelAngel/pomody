# 001 — Cuellos de botella al testear componentes interactivos en Node (SSR) vs Browser Mode

- **Fecha:** 2026-09-25
- **Contexto:** Pruebas unitarias de componentes de configuración en `src/lib/components/settings/settings.test.ts` quedando en estado _queued_ / lentas en Vitest.

---

## 1. ¿Qué pasaba? (El síntoma)

Al ejecutar la suite de pruebas unitarias (`pnpm test` o `pnpm test:unit`), el archivo `src/lib/components/settings/settings.test.ts` tardaba considerablemente más que el resto de los tests en comenzar o quedaba bloqueado en cola (_queued_) durante varios segundos, a pesar de contener pocas aserciones.

---

## 2. ¿Por qué pasaba? (El fundamento técnico)

El problema radicaba en mezclar responsabilidades de ejecución y entornos de ejecución en la configuración de Vitest:

1. **Transformación masiva en Node sin bundling previo:**
   `settings.test.ts` utilizaba `render()` de `svelte/server` (renderizado SSR en Node.js puro). Al importar `settings-drawer.svelte`, Node debió resolver y transformar en tiempo real un árbol de dependencias extenso:
   - Componentes primitivos de accesibilidad (`bits-ui`: Dialog, Slider, Switch).
   - Iconografía completa (`@lucide/svelte`).
   - Múltiples capas de estilos y runes de Svelte 5.
     A diferencia del código puro de dominio (`src/lib/domain/`), transformar este árbol en el hilo de Node para renderizar un HTML estático es computacionalmente costoso.

2. **Asignación incorrecta de proyectos en Vitest:**
   En `vite.config.ts`, el proyecto `server` (con entorno `node`) estaba configurado con:

   ```ts
   include: ['src/**/*.{test,spec}.{js,ts}'],
   exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
   ```

   Como `settings.test.ts` no contenía `.svelte.` en su extensión, el runner lo derivó al worker de Node (`server`) en lugar del runner de navegador (`client`).

3. **Incompatibilidad de modelo arquitectónico:**
   Pomody es una SPA estática y aplicación de escritorio (Tauri v2). No utiliza SvelteKit SSR en producción. Probar componentes interactivos mediante SSR en Node no solo es lento, sino que genera **falsa confianza**: no valida eventos del DOM real, comportamiento del foco, APIs de accesibilidad en el navegador ni animaciones.

---

## 3. ¿Cómo se resuelve y qué aprendí? (La lección)

### La solución (Issue #13)

- **Eliminar tests SSR de componentes:** Retirar `settings.test.ts` y consolidar las aserciones en `settings.svelte.test.ts`.
- **Especializar entornos:**
  - **Proyecto `server` (Node):** Reservado estrictamente para lógica pura de TypeScript (FSM, puertos, adaptadores sin DOM, estado). Corre en sub-segundos sin tocar transformaciones de UI.
  - **Proyecto `client` (Vitest Browser Mode / Chromium):** Dedicado a probar los componentes interactivos con el DOM real.

### Regla mental

> _Si un componente depende de APIs de interfaz, interactividad o primitivas de UI, pertenece al navegador (Browser Mode). Si un módulo procesa reglas de negocio y estructuras de datos, pertenece a Node puro. Forzar a Node a renderizar árboles complejos de UI solo para simular strings HTML degrada el feedback loop del desarrollador._
