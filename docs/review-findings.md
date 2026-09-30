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

## 3. Sobrescritura de Tamaños y Dimensionamiento de Iconos en Botones

- **ID Referencia:** JD-13
- **Ubicación:** `src/lib/components/timer/timer-controls.svelte`
- **Descripción:** Se utilizan clases utilitarias (`class="size-12"`, `class="size-16"`) combinadas con variantes de tamaño de shadcn-svelte (`size="icon"`, `size="icon-lg"`), así como tamaños fijos en iconos Lucide (`size-5`, `size-7`).

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

## 13. Presets de Cadencia (25/5, 50/10, 90/20) y Revelación Progresiva en Reemplazo de Steppers

- **ID Referencia:** UX-05
- **Ubicación:** `src/lib/components/planning/planning-timeline.svelte`
- **Descripción:** La cabecera expone cinco selectores numéricos con diez botones `+`/`-`, forzando cálculos aritméticos antes de trabajar y saturando la carga cognitiva (Heurísticas #7 y #8). Se deben reemplazar los steppers rígidos por chips de presets de cadencia estándar (`25/5 Clásico`, `50/10 Foco Profundo`, `90/20 Ritmo Ultradiano`), comprobados y soportados por el dominio (`timer-fsm.ts` y `session-plan.entity.ts`), manteniendo visible solo el parámetro principal (bloques u hora de fin) y dejando la configuración manual bajo un panel de revelación progresiva colapsable.

---

## 14. Depuración de Boilerplate y Redundancia Visual en Tarjetas de Descanso

- **ID Referencia:** UX-06
- **Ubicación:** `src/lib/components/planning/planning-timeline.svelte`
- **Descripción:** Las tarjetas de descanso repiten texto genérico de marketing (_"Smart Revitalization: Guided pause: physical reset, mindful breath, or hydration"_) acompañado de íconos `Sparkles` y badges de estado redundantes, generando saturación visual contraria al minimalismo Zen de Pomody (Heurística #8: _Aesthetic and Minimalist Design_). Se debe remover el microcopy repetitivo y simplificar las tarjetas a indicadores sutiles y limpios (_"Short Break · 5m"_).

---

## 15. Consistencia de Tokens Rosé Pine en Indicadores y Badges del Timeline

- **ID Referencia:** UX-07
- **Ubicación:** `src/lib/components/planning/planning-timeline.svelte`
- **Descripción:** El componente utiliza utilidades directas de Tailwind (`emerald-500`, `emerald-600`, `amber-500`, `amber-600`) para bloques completados, banners y advertencias de margen, violando el sistema de diseño semántico de Rosé Pine (Heurística #4: _Consistency and Standards_). En los temas `dawn` (claro) y `oled` (negro puro), estos colores desentonan con saturación inapropiada. Se deben migrar a tokens semánticos del proyecto (`text-accent-pine`, `bg-accent-pine/10`, `text-accent-gold`, `bg-accent-gold/10` o equivalentes del tema).

---

## 16. Accesibilidad, Marcado Semántico y Desborde de Medianoche en Timeline

- **ID Referencia:** UX-08
- **Ubicación:** `src/lib/components/planning/planning-timeline.svelte`
- **Descripción:** El contenedor del timeline se implementa mediante elementos genéricos `<div>` sin estructura de lista secuencial para tecnologías asistivas, y carece de atributos `aria-current="step"` para indicar el bloque activo (Heurística #1 y WCAG 1.3.1). Además, en el modo "Por Hora Final", seleccionar un horario anterior a la hora actual calcula el término al día siguiente (+24h) de forma transparente pero sin advertencia visual explícita (insignia `+1 día` o `"Mañana, HH:mm"`). Se debe reestructurar el contenedor a `<ol>` y `<li>`, marcar el paso activo y mostrar feedback claro ante cruces de medianoche.

---

## 17. Desacople de Jerga Arquitectónica y Documentación Contextual

- **ID Referencia:** UX-09
- **Ubicación:** `src/lib/components/planning/planning-timeline.svelte`
- **Descripción:** La pantalla expone notas explicativas sobre el funcionamiento interno del software (_"Forward-only sync: Editing durations or adding blocks applies starting from your next cycle..."_) y términos de ingeniería (_"Free Margin"_, _"Smart Revitalization"_), saturando al usuario con detalles de arquitectura en lugar de documentación sutil bajo demanda (Heurísticas #2 y #10). Se debe reemplazar la terminología por lenguaje natural (_"Tiempo extra / Margen disponible"_, _"Descanso corto/largo"_) y trasladar la explicación técnica a un tooltip de ayuda contextual discreto.

---

## 18. Indicador de Estado y Progreso en Bloque Activo del Timeline

- **ID Referencia:** UX-10
- **Ubicación:** `src/lib/components/planning/planning-timeline.svelte`
- **Descripción:** Los bloques del timeline muestran etiquetas pasivas de estado ("Active block", "Upcoming"), pero no reflejan el progreso dinámico ni la cuenta regresiva del intervalo en curso (Heurística #1: _Visibility of System Status_). Para conocer el avance del bloque activo, el usuario se ve forzado a cambiar de pestaña al temporizador principal. Conviene integrar una barra sutil de avance o tiempo restante en la tarjeta del bloque activo sincronizada con el timer.
