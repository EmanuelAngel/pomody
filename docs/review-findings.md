# Hallazgos de Revisión (Review Findings)

> Buffer efímero para registrar hallazgos menores, detalles cosméticos y micro-mejoras (<1h de resolución) identificadas durante revisiones de código.

### Reglas Operativas

1. **Sin burocracia de estados**: No se gestionan estados complejos (`en progreso`, `archivado`). El ítem se resuelve en una rama corta y se **elimina** de este archivo.
2. **Capacidad máxima (WIP Limit = 20)**: Máximo 20 ítems registrados simultáneamente. Al alcanzar el tope, se debe resolver o descartar deuda técnica acumulada antes de ingresar nuevos hallazgos.
3. **Alcance seguro**: Tareas estrictamente visuales o cosméticas que no tocan el core (`domain/` ni FSM), aptas para resolución rápida o delegación a [Fede](profiles/fede.md).

---

## 6. Cierre Automático del Panel de Configuración al Iniciar Temporizador

- **ID Referencia:** JD-08
- **Ubicación:** `src/lib/components/settings/settings-drawer.svelte`
- **Descripción:** El panel lateral de configuración no reacciona ante transiciones a `timerState.isRunning` para cerrarse automáticamente si el temporizador se inicia en segundo plano o mediante atajos globales futuros, pudiendo solaparse sobre una sesión activa y romper el modo Zen.

---

## 7. Modularización y Separación de Responsabilidades en Drawer de Configuración

- **ID Referencia:** MOD-01
- **Ubicación:** `src/lib/components/settings/settings-drawer.svelte`
- **Descripción:** El componente acumula múltiples responsabilidades (orquestación del `Sheet`, lógica y duplicación de sliders de intervalos del temporizador, y selector de paletas Rosé Pine). Conviene descomponerlo extrayendo subcomponentes (`interval-settings.svelte` o `interval-slider.svelte`, y `theme-selector.svelte`), preservando el drawer exclusivamente como contenedor de UI.

## 8. Internacionalización con Paraglide (Inglés / Español)

- **ID Referencia:** I18N-01
- **Ubicación:** `src/lib/components/` (layout, settings, timer) y suites de test (`settings.svelte.test.ts`, `timer.svelte.test.ts`)
- **Descripción:** Evaluar e incorporar soporte bilingüe (EN/ES) usando Paraglide para SvelteKit. Estimación preliminar: riesgo bajo (usando estrategia de estado/storage para no romper SPA estática ni Tauri), dificultad baja (~30 keys), energía baja y tiempo estimado de 3 a 3.5 horas. Requiere especial atención a la actualización y cobertura de tests de UI existentes que asertan copys exactos (`aria-label`, headings, textos de botones).

---
