# Guía: cómo funcionan las ilustraciones

> Documento corto para agentes y contribuidores. El **qué** está en [`spec.md`](./spec.md), el **cómo técnico** en [`design.md`](./design.md) y el **por qué** en [`decisions.md`](./decisions.md).

## Arquitectura en una pasada

```text
domain/illustration/illustration-catalog.ts   metadata pura: id, labelKey, phaseCount
domain/illustration/illustration-progress.ts  step y phase (funciones puras)
state/illustration.svelte.ts                  deriva fase, visibilidad y movimiento
components/illustration/renderers.ts          id -> componente Svelte
components/illustration/*-illustration.svelte escenas (SVG)
components/illustration/illustration-background.svelte  capa de fondo, escala cover
components/settings/settings-drawer.svelte    switches + selector
```

El progreso sale de `dailyStats.accumulatedMinutes`. La ilustración **no persiste nada propio**: solo lee minutos, preferencias y estado del timer.

## Contrato de una escena

Un renderer es un componente Svelte con:

- Props `phase: number` y `animated: boolean`.
- `data-illustration={id}` y `data-phase={fase clampeada}` en el `<svg>` raíz.
- Clamp defensivo: `min(phaseCount - 1, max(0, floor(phase)))`.
- `aria-hidden="true"`, `role="presentation"`, `shape-rendering="crispEdges"`.
- `viewBox="0 0 320 180"` y `preserveAspectRatio="xMidYMax slice"`.
- Movimiento solo CSS: animación declarada y `animation-play-state: paused`; `svg.animated .clase { animation-play-state: running; }`; `prefers-reduced-motion: reduce` la elimina.
- IDs únicos con `const uid = $props.id()` si usa `<defs>`/`<use>`. La escena se renderiza dos veces (fondo y miniatura de Settings).

## Agregar una ilustración

1. **Catálogo** — `src/lib/domain/illustration/illustration-catalog.ts`:

   ```ts
   { id: 'meadow', labelKey: 'settings_illustration_meadow', phaseCount: 5 }
   ```

   `phaseCount` debe dividir 15: `1`, `3`, `5` o `15`.

2. **i18n** — agregar `settings_illustration_meadow` en `messages/en.json` y `messages/es.json`.

3. **Componente** — crear `src/lib/components/illustration/meadow-illustration.svelte`:

   ```svelte
   <script lang="ts">
   	import { findIllustration } from '$lib/domain/illustration/illustration-catalog';

   	let { phase = 0, animated = false }: { phase?: number; animated?: boolean } = $props();

   	const uid = $props.id();
   	const phaseCount = findIllustration('meadow')?.phaseCount ?? 5;
   	const currentPhase = $derived(Math.min(phaseCount - 1, Math.max(0, Math.floor(phase))));
   </script>

   <svg
   	viewBox="0 0 320 180"
   	width="100%"
   	height="100%"
   	preserveAspectRatio="xMidYMax slice"
   	class="block h-full w-full"
   	class:animated
   	data-illustration="meadow"
   	data-phase={currentPhase}
   	shape-rendering="crispEdges"
   	aria-hidden="true"
   	role="presentation"
   >
   	<!-- capas: cielo, planos lejanos, suelo, vegetación, detalles -->
   </svg>
   ```

4. **Registro** — `src/lib/components/illustration/renderers.ts`:

   ```ts
   meadow: MeadowIllustration;
   ```

   El `Record<IllustrationId, ...>` se deriva del catálogo: si falta, `pnpm check` falla.

5. **Verificar**:

   ```bash
   pnpm check
   pnpm test:unit
   pnpm test:browser
   pnpm lint
   ```

No hace falta escribir tests nuevos. El test parametrizado del catálogo monta todas las fases de la entrada nueva y el test de contrato valida el clamp y la clase `animated`.

## Ilustraciones generadas (forest)

`forest` no está escrita a mano: cada fase (`forest-phase-N.svelte`) es salida de un generador en `tools/illustrations/forest/`. Dibuja formas con código (troncos, copas, colinas, suelo), ruido con semilla y una paleta compartida, y emite un `<path>` por color. Es una herramienta de desarrollo: no entra al bundle de la app y no tiene dependencias, solo Node.

```bash
pnpm illustrations:forest        # todas las fases + forest-palette.css
pnpm illustrations:forest 3      # solo la fase 3
```

| Quiero cambiar…              | Dónde                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| Un color (cualquier tema)    | `forest-palette.css` a mano, o `fpal.mjs` y regenerar. Es lo único que se edita directo |
| Un árbol, la copa, el suelo  | `scene.mjs` (fase 1) o `scene2.mjs` (fases 2-5), y regenerar                            |
| El movimiento de los píxeles | `live.mjs` (qué píxeles saltan) y `build-phase.mjs` (tiempos y keyframes)               |

- Los `forest-phase-N.svelte` son **salida**: no se editan a mano, se regeneran. El ruido usa semilla, así que regenerar sin tocar el código no cambia el `git diff`. Si tocás una escena, detalles chicos de los elementos posteriores pueden moverse porque comparten la secuencia aleatoria.
- Una fase intermedia o una ilustración nueva reusa `lib.mjs` (lienzo, trazo, ruido), `live.mjs` y el emisor de `build-phase.mjs`. Una fase nueva suma unos 150-200 KB al bundle: con varias ilustraciones conviene cargar las fases bajo demanda.
- Cada fase pinta con `fill="var(--forest-<nombre>)"`. Los nombres de color los define `fpal.mjs`.

## Qué tener en cuenta

- **Centro libre**: entre `x 116..204` y por encima de `y ~120` no va arte alto. Ahí viven los dígitos y los controles. El arte crece hacia los laterales.
- **Paleta**: Dawn usa tokens Rosé Pine (`pine`, `foam`, `gold`, `love`, `rose`, `iris`, `text-*`) mezclados con `color-mix`. Una ilustración puede tener su propia paleta para Dark y OLED, pero la define en un único CSS (como `forest-palette.css`) y nunca hex sueltos dentro de los componentes.
- **Grilla**: 320×180, coordenadas múltiplos de 2 o 4. La capa escala en múltiplos enteros en modo cover y recorta el sobrante.
- **Sin dependencias nuevas**, sin `<canvas>`, sin WebGL, sin librerías de animación y sin bucles JS.
- **No tocar** el FSM del timer, los eventos, `daily-stats` ni la fórmula de fase.
- **No agregar campos de persistencia**: `selectedId` se valida contra el catálogo automáticamente.

## Errores típicos

| Síntoma                                 | Causa                                                  |
| --------------------------------------- | ------------------------------------------------------ |
| `pnpm check` falla en `renderers.ts`    | Falta la entrada del renderer                          |
| Test del catálogo falla                 | `phaseCount` no divide 15                              |
| La UI muestra `settings_illustration_x` | Falta la clave i18n en `en` o `es`                     |
| Colores raros en un tema                | Hex hardcodeado en vez de token                        |
| Dígitos ilegibles en fase alta          | Arte alto dentro del centro                            |
| La escena se ve mal en la miniatura     | IDs de `<defs>` repetidos entre instancias             |
| El movimiento sigue en pausa            | Falta la clase `.animated` o el `animation-play-state` |
