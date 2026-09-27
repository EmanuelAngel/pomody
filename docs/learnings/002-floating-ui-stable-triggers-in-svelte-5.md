# 002 — Identidad de triggers en componentes flotantes (bits-ui) y efectos inertes en Svelte 5

- **Fecha:** 2026-09-27
- **Contexto:** Desconexión del popover en `src/lib/components/timer/task-pill.svelte` al alternar entre tarea activa y "Free focus", arrojando advertencias `derived_inert`.

---

## 1. ¿Qué pasaba? (El síntoma)

Al seleccionar una tarea distinta de "Free focus" en el popover de la píldora de tareas (`TaskPill`), el menú emergente se cerraba correctamente pero no volvía a abrirse en clics subsiguientes.

Al cambiar de vista (de Timer a Planning y volver), el popover volvía a funcionar temporalmente porque el componente `Timer` se desmontaba y montaba de cero. Sin embargo, al desasignar la tarea seleccionando "Free focus", el problema se invertía: ahora "Free focus" no abría el popover (a pesar de que el icono chevron sí rotaba al hacer clic).

En los tests de navegador y la consola aparecía la advertencia de Svelte 5:

```log
[svelte] derived_inert
Reading a derived belonging to a now-destroyed effect may result in stale values
```

---

## 2. ¿Por qué pasaba? (El fundamento técnico)

1. **Destrucción condicional de nodos Trigger dentro de un Root persistente:**
   El componente estructuraba el marcado con un bloque `{#if activeTask}` / `{:else}` que creaba dos instancias separadas de `<Popover.Trigger>`:
   - Una rama contenía un `<div>` con el botón de checkbox y un `<Popover.Trigger>` para el título de la tarea.
   - La rama `{:else}` renderizaba directamente un `<Popover.Trigger>` para "Free focus".

2. **Pérdida de la referencia del ancla (Floating UI):**
   Las primitivas de `bits-ui` utilizan un contexto raíz (`FloatingRootContext`) donde el primer trigger en montarse registra su referencia de nodo del DOM (`FloatingAnchorState`). Al cambiar el estado de `activeTask`, Svelte destruía el trigger inicial y montaba uno nuevo. La capa de posicionamiento flotante quedaba desincronizada, apuntando a un ancla inexistente o con dimensiones nulas (`--bits-floating-anchor-width: 0px`), forzando el contenedor flotante a `visibility: hidden`.

3. **Efectos destruidos y `derived_inert` en Svelte 5:**
   El trigger destruido arrastraba derivaciones creadas dentro de su contexto de efecto. Al desmontarse el componente hijo mientras el contenedor padre seguía leyendo o alternando reactividad, Svelte detectó accesos a derivados huérfanos pertenecientes a un efecto ya destruido.

---

## 3. ¿Cómo se resuelve y qué aprendí? (La lección)

### La solución

- **Contenedor unificado e incondicional:**
  Se envuelve la píldora en un único contenedor estructural `<div data-slot="task-pill">` que existe siempre.
- **Un único `<Popover.Trigger>` persistente:**
  Se extrae `<Popover.Trigger>` fuera de la bifurcación condicional. El componente trigger **nunca se desmonta**. Solo conmuta condicionalmente el texto que muestra en su interior (`activeTask.title` o `"Free focus"`), mientras que el checkbox lateral se renderiza como elemento hermano solo cuando existe una tarea activa.

```svelte
<Popover.Root bind:open onOpenChange={handleOpenChange}>
	<div data-slot="task-pill" class={cn(...)>
		{#if activeTask}
			<button type="checkbox" onclick={handleToggleCompleted}>...</button>
		{/if}

		<Popover.Trigger aria-label={activeTask ? `Change active task: ${activeTask.title}` : 'Select focus task'}>
			{#if activeTask}
				<span>{activeTask.title}</span>
			{:else}
				<span>Free focus</span>
			{/if}
			<ChevronDown ... />
		</Popover.Trigger>
	</div>
</Popover.Root>
```

### Regla mental

> _Los componentes trigger de primitivas flotantes (popovers, tooltips, dropdowns, diálogos) deben mantener una identidad de nodo estable dentro de su Root. Nunca alternes ni destruyas condicionalmente un trigger dentro del mismo contenedor raíz; variá su contenido interno o el de sus hermanos, preservando siempre intacta la referencia del ancla para el motor de posicionamiento._
