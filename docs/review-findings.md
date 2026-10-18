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

## 9. Tamaño de Iconos Forzado en los Botones de la Vista de Distracciones

- **ID Referencia:** JD-09
- **Ubicación:** `src/lib/components/distraction/distraction-view.svelte:128,137`
- **Descripción:** Los botones de editar y borrar pasan `class="size-3.5"` a los iconos `Pencil` y `Trash2` dentro de un `Button size="icon-xs"`, anulando el contrato de tamaño que el propio componente ya aplica (`[&_svg:not([class*='size-'])]:size-3`) y dejando esos dos iconos en 14px donde el resto de la app usa 12px. Contradice la regla del skill de shadcn-svelte ("no sizing classes on icons inside components"). Confirmado por los dos jueces como INFO (Judgment Day ronda 1, fila F4).

## 10. Borrar la Regla en Edición No Limpia el Formulario

- **ID Referencia:** JD-10
- **Ubicación:** `src/lib/components/distraction/distraction-view.svelte:66-82`
- **Descripción:** Al confirmar el borrado de la regla que se está editando, la vista limpia `editingRule` pero no los campos del formulario, que queda mostrando `exe` y `titlePattern` de la regla eliminada con la etiqueta de alta; enviarlo crea una regla nueva con esos valores. ~~Sospechoso: lo reportó un solo juez~~ **Confirmado en la app real** (pasada manual del 2026-10-18, ver `odd/tasks/distraction-detector.md` L18): el fix de F2 agregó `reset()` al formulario, pero nada lo dispara cuando `editingRule` se vacía por un borrado, así que el formulario conserva los valores y enviarlo crea la regla fantasma. Pasos: editar una regla → borrarla con su botón → el formulario queda prellenado → enviar.

## 11. Rechazo No Manejado al Enumerar Ventanas

- **ID Referencia:** JD-11
- **Ubicación:** `src/lib/components/distraction/distraction-view.svelte:31-37`
- **Descripción:** `onMount(() => { void loadView(); })` no captura errores: si `monitor.listOpenWindows()` rechaza (por ejemplo un fallo del comando IPC `open_windows` en escritorio), la promesa queda sin manejar. La degradación al estado de escape manual ocurre por accidente de que `windows` conserva su valor inicial vacío, no por diseño. Sospechoso: un solo juez (Judgment Day ronda 1, fila F6).

## 12. El Plan de Pruebas del Spec Nombra un Archivo Inexistente

- **ID Referencia:** JD-12
- **Ubicación:** `docs/features/distraction-detector/spec.md:298`
- **Descripción:** La tabla de pruebas del §10 refiere a `src/lib/state/distraction.test.ts`, pero el archivo real es `src/lib/state/distractionState.test.ts`. Desajuste preexistente, no introducido por la vista de distracciones. Sospechoso: un solo juez (Judgment Day ronda 1, fila F7).

## 13. La Vista de Distracciones No Está Centrada Como sus Hermanas

- **ID Referencia:** UI-01
- **Ubicación:** `src/lib/components/distraction/distraction-view.svelte:88`
- **Descripción:** La raíz es `flex w-full max-w-2xl flex-col gap-6`, **sin `mx-auto`**. La vista del timer (`timer.svelte:49`) usa `mx-auto ... max-w-sm` y la de planning (`planning-view.svelte:87`) usa `mx-auto w-full max-w-5xl`: las dos quedan centradas en el panel, esta queda pegada a la izquierda. Como el panel de `+page.svelte` es `w-full`, en ventanas anchas el contenido tope de 672px se estira a la izquierda y deja un vacío grande a la derecha que aparenta ser un layout de dos columnas. No hay ninguna decisión documentada que lo justifique: es una omisión. Arreglo: una clase. Reportado por el maintainer en la pasada manual del 2026-10-18.
