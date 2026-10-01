# Hallazgos de Revisión (Review Findings)

> Buffer efímero para registrar hallazgos menores, detalles cosméticos y micro-mejoras (<1h de resolución) identificadas durante revisiones de código.

### Reglas Operativas

1. **Sin burocracia de estados**: No se gestionan estados complejos (`en progreso`, `archivado`). El ítem se resuelve en una rama corta y se **elimina** de este archivo.
2. **Capacidad máxima (WIP Limit = 20)**: Máximo 20 ítems registrados simultáneamente. Al alcanzar el tope, se debe resolver o descartar deuda técnica acumulada antes de ingresar nuevos hallazgos.
3. **Alcance seguro**: Tareas estrictamente visuales o cosméticas que no tocan el core (`domain/` ni FSM), aptas para resolución rápida o delegación a [Fede](profiles/fede.md).

---

## 2. Artefacto de Trazado SVG a 0% de Progreso (Punto Fantasma)

- **ID Referencia:** JD-02
- **Ubicación:** `src/lib/components/timer/timer-arc.svelte`
- **Descripción:** Cuando el temporizador se encuentra detenido o restablecido (`progress === 0`), `strokeDashoffset` iguala la longitud total de la circunferencia (`CIRCUMFERENCE`). La especificación SVG establece que un trazo con longitud nula y `stroke-linecap="round"` se dibuja como un punto con diámetro igual al `stroke-width` (2.5px) en la posición de inicio (12 en punto).

---

## 5. Clases Utilitarias Redundantes en SVG de Arco

- **ID Referencia:** JD-16
- **Ubicación:** `src/lib/components/timer/timer-arc.svelte`
- **Descripción:** El elemento `<svg>` incluye las clases `-rotate-0 transform`, las cuales son remanentes innecesarios bajo el motor de Tailwind CSS v4.

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

## 11. Contexto y Creación Rápida en Popover de Asignación de Tareas

- **ID Referencia:** UX-03
- **Ubicación:** `src/lib/components/planning/planning-timeline.svelte`
- **Descripción:** El popover para asociar tareas a bloques de foco muestra la lista de tareas pendientes pero carece de contexto de reconocimiento inmediato (Heurística #6: _Recognition Rather Than Recall_): no informa el estado actual de la tarea asignada ni qué ocurre si se completa a mitad de bloque. Además, si el backlog está vacío, deja un mensaje pasivo sin ofrecer un input inline para crear una tarea rápidamente desde el mismo popover.

---

## 12. Atajos de Teclado y Drag-and-Drop en Timeline de Planificación

- **ID Referencia:** UX-04
- **Ubicación:** `src/lib/components/planning/planning-timeline.svelte`
- **Descripción:** La interacción con el timeline es exclusivamente mediante clics en botones diminutos, sin aceleradores para usuarios avanzados (Heurística #7: _Flexibility and Efficiency of Use_). Se debe dar soporte a navegación por teclado/atajos (e.g. iniciar sesión, saltar bloque) y permitir asignar tareas al timeline arrastrándolas directamente desde la lista de backlog (drag-and-drop).

---
