# Generador de la ilustración forest

Las 5 fases de `forest` (`src/lib/components/illustration/forest-phase-N.svelte`) y su paleta (`forest-palette.css`) **no se escriben a mano**: salen de estos scripts de Node. Dibujan formas (troncos, copas, colinas, suelo) sobre una grilla de 320×180 con ruido con semilla y emiten un `<path>` por color. Es una herramienta de desarrollo: no entra al bundle y no tiene dependencias.

Si vas a cambiar la geometría de una escena o agregar fases o ilustraciones, leé esto primero. Para cambiar solo un color alcanza con `forest-palette.css` (ver [Colores](#colores)).

## Comandos

```bash
pnpm illustrations:forest                  # regenera todas las fases + forest-palette.css
pnpm illustrations:forest 3                # solo la fase 3
pnpm illustrations:forest:preview dark 3   # PNG de la fase 3 en Dark (dawn | dark | oled, fase 1-5)
pnpm format                                # el generador escribe sin formato; formatealo antes de commitear
```

Después de regenerar corré Prettier sobre `src/lib/components/illustration/forest-*` (o `pnpm format`) para que el diff quede igual al que espera el repo. El preview es un cuadro estático con los tokens reales de `src/app.css`: sirve para ver el dibujo y el color, no el layout de la app (para eso, `pnpm dev`).

## Flujo para modificar una escena

1. Editá la función de la fase (`scene.mjs` para la 1, `scene2.mjs` para la 2-5, bloque `if (P === n)`).
2. `pnpm illustrations:forest <fase>` y `pnpm illustrations:forest:preview <tema> <fase>`; mirá el PNG.
3. Repetí hasta que se vea bien en los tres temas. Nunca edites los `forest-phase-N.svelte` a mano: se pisan al regenerar.
4. `pnpm format`, `pnpm check`, y los tests de `src/lib/components/illustration`.

La salida es determinista. Regenerar sin tocar el código deja `git status` limpio. Pero todos los elementos de una escena comparten una misma secuencia aleatoria (`R()` en `scene2.mjs`): si agregás o quitás un elemento, el azar de los posteriores cambia y pequeños detalles se mueven. Es esperable.

## Mapa de archivos

| Archivo                           | Qué hace                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `lib.mjs`                         | Lienzo de 320×180 (`Canvas`), primitivas de dibujo, ruido y el fusionador de rectángulos a `<path>`.      |
| `scene.mjs`                       | Escena de la fase 1 y los colores originales (`RECIPES`).                                                 |
| `scene2.mjs`                      | Escenas de las fases 2-5 (`build(P)`, `P = 1..4`): cielo, bruma, colinas, suelo, árboles, flores y fauna. |
| `live.mjs`                        | Elige qué píxeles "viven" y arma los grupos `from` / `to` del movimiento.                                 |
| `fpal.mjs`, `forest-palettes.mjs` | Paleta: lista ordenada de colores y sus valores para Dawn, Dark y OLED; genera `forest-palette.css`.      |
| `build-phase.mjs`                 | Escribe los componentes `.svelte` (CSS del movimiento incluido) y la paleta.                              |
| `preview.mjs`                     | PNG de una fase en un tema.                                                                               |

## Lienzo y primitivas (`lib.mjs`)

Coordenadas enteras en una grilla de 320×180 (`x` hacia la derecha, `y` hacia abajo). Cada celda guarda un id de color; dibujar encima pisa lo anterior, así que el orden de las capas es el orden del código (cielo → bruma → colinas → suelo → árboles → arbustos → detalles).

| Primitiva                                         | Para qué                                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `set(x, y, c)`, `get`, `rect(x, y, w, h, c)`      | Píxeles y rectángulos.                                                            |
| `line`, `path(pts, c, grosor)`                    | Líneas de 1 px y poligonales.                                                     |
| `poly(pts, c)`                                    | Polígono relleno.                                                                 |
| `ridge(pts, base, c, amp, escala, semilla)`       | Silueta rellena desde una línea superior (colinas) con ondulación suave.          |
| `trunk(centro, anchos, [claro, medio, oscuro])`   | Tronco que cambia de ancho, con borde claro a la izquierda y oscuro a la derecha. |
| `taper(pts, w0, w1, c)`, `leaf(x, y, ang, largo)` | Rama que se afina y hoja puntiaguda.                                              |
| `sprite(x, y, filas, mapa)`                       | Sprite chico desde filas de caracteres (`.` es transparente).                     |
| `rng(semilla)`, `vnoise`, `vnoise2`, `interp`     | Azar con semilla, ruido 1D/2D e interpolación por tramos.                         |

Ayudas de `scene2.mjs` (cuerpo de `build`): `canopy(cx, cy, rx, ry, { lobes, gap, fruit })` copa de lóbulos con luz arriba a la izquierda, `bark` y `slim` troncos grueso y fino, `limb(pts, w0, w1)` rama gruesa con sombra, `vine` enredadera, `shrub` y `bush` arbustos (este con flores o bayas), `bloom` y `petals` flores, `tuft` pasto, `moss`, `rock`, `fog` y `blob` siluetas de bruma, `hill` colinas, `fruit` frutas sobre las copas y `sprite` para hongos, pájaros, mariposas y abejas.

## Colores

Cada color tiene un nombre (`lh`, `gr3`, `fR`, `bk`…) y se pinta con `fill="var(--forest-<nombre>)"`. Los valores viven en `forest-palette.css`, generado desde `fpal.mjs`:

- **Dawn**: mezcla de tokens Rosé Pine con `color-mix` sobre `--bg-base`, así sigue al tema.
- **Dark y OLED**: hex propios, elegidos a mano para que combinen con Rosé Pine.

Para **retocar** un color: editá `forest-palette.css` (cambia sin regenerar), y pasá el mismo valor a `fpal.mjs` o `forest-palettes.mjs` para que el generador no lo pise. Para **agregar** uno, sumá una entrada al final de `NEW` en `fpal.mjs`: `nombre: [receta Dawn, hex Dark, hex OLED]`, donde la receta es `[['foam', 0.4], ['gold', 0.3]]` (token y porcentaje; el resto es `--bg-base`) o un valor CSS. Después usalo en la escena como `id.nombre`. Los colores originales de la fase 1 están en `RECIPES` (`scene.mjs`) y `forest-palettes.mjs`.

## Movimiento: píxeles vivos

La escena nunca se mueve entera. Lo que se mueve son píxeles sueltos:

- Todo lo que dibujes con `cv.group = 1` (follaje) o `cv.group = 2` (pasto, brotes) es candidato; `cv.group = 0` lo vuelve a dejar estático. Siempre volvé a `0` al terminar.
- `live.mjs` elige ~10% de esos píxeles que tengan un vecino libre (`SHARE`), y los reparte en `HOP_GROUPS = 10`. Cada uno salta a esa celda vecina y vuelve. El grupo estático conserva el color que había debajo (`cv.u`), así no queda un agujero cuando salta.
- Los tiempos (`periods`, `delays`) y los keyframes están en `build-phase.mjs`. Todo es CSS con `steps(1)`, pausado salvo con `animated`, y apagado con `prefers-reduced-motion`.
- Si cambiás `HOP_GROUPS`, actualizá el test `forest-phase-1.svelte.test.ts`, que cuenta los 10 grupos.

## Agregar una fase intermedia

Hoy `build-phase.mjs` tiene las fases fijas en 1-5 y `scene2.mjs` usa un bloque `if (P === n)` por fase. Para sumar una:

1. En `scene2.mjs` agregá el bloque de la fase (y una entrada en la lista `FOG` y en `tones` / `WA` / `WB` / `WC` si cambia el suelo), usando como punto de partida la fase vecina.
2. En `build-phase.mjs` ampliá la lista de fases y `TITLES`.
3. En `forest-illustration.svelte` importá el componente nuevo y agregá su rama.
4. En `src/lib/domain/illustration/illustration-catalog.ts`, `phaseCount` debe dividir 15 (1, 3, 5 o 15): con otro valor el test del catálogo falla.
5. Cada fase suma 150-200 KB al bundle (ver el issue #205 sobre la carga bajo demanda).

## Agregar otra ilustración

El generador está pensado para forest, pero las piezas se reutilizan. En una carpeta hermana (`tools/illustrations/<nombre>/`):

1. Copiá `lib.mjs` y `live.mjs` tal cual y creá tus propios `scene.mjs`, `fpal.mjs` y `build-phase.mjs` con tu paleta.
2. Cambiá el prefijo de las variables (`--forest-` → `--<nombre>-`), el selector `[data-illustration='forest']`, la carpeta de salida y los títulos.
3. Registrala como cualquier ilustración (catálogo, i18n, renderer): ver `docs/features/compania-viva/adding-an-illustration.md`.
4. Agregá su script a `package.json` (`illustrations:<nombre>`).

## Reglas del arte

- Centro libre: entre `x 116..204` y por encima de `y ~120` no va arte alto (ahí están los dígitos y los controles). El arte crece hacia los lados.
- Sin `<canvas>`, sin dependencias y sin bucles de JS en la app: el generador corre solo en desarrollo.
- No copies ni incrustes una imagen de referencia: se dibuja con código usándola solo como guía visual.
- Un comentario CSS generado no puede contener `*/` en el medio: rompe toda la hoja de estilos y la ilustración se ve negra.
