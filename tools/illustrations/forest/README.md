# Generador de la ilustración forest

Las 5 fases de `forest` (`src/lib/components/illustration/forest-phase-N.svelte`) y su paleta (`forest-palette.css`) **no se escriben a mano**: salen de estos scripts de Node. Dibujan formas (troncos, copas, colinas, suelo) sobre una grilla de 320×180 con ruido con semilla y emiten un `<path>` por color. Es una herramienta de desarrollo: no entra al bundle y no tiene dependencias.

Si vas a cambiar la geometría de una escena o agregar fases o ilustraciones, leé esto primero. Para cambiar solo un color alcanza con `forest-palette.css` (ver [Colores](#colores)).

## Comandos

```bash
pnpm illustrations:forest                  # regenera todas las fases + forest-palette.css
pnpm illustrations:forest 3                # solo la fase 3
pnpm illustrations:forest:preview dark 3   # PNG de la fase 3 en Dark (dawn | dark | oled, fase 1-5)
pnpm illustrations:forest:preview all 3 out.png --ref ruta/a/referencia.png
                                           # hoja 2x2: referencia, Dawn, Dark y OLED
pnpm format                                # el generador escribe sin formato; formatealo antes de commitear
```

Después de regenerar corré Prettier sobre `src/lib/components/illustration/forest-*` (o `pnpm format`) para que el diff quede igual al que espera el repo. El preview es un cuadro estático con los tokens reales de `src/app.css`: sirve para ver el dibujo y el color, no el layout de la app (para eso, `pnpm dev`). La referencia de `--ref` se lee del disco al generar el PNG; no la copies al repo.

## Una sola escena

Las 5 fases son el mismo lugar visto cinco veces mientras revive. `scene.mjs` tiene un único `build(P)` (`P = 1..5`) y cada elemento decide qué dibujar según `P`:

- **Nada retrocede.** Cada fase conserva lo de la anterior y le agrega o hace crecer algo (`if (P >= 3) …`).
- **Lugares fijos.** Cada árbol tiene una `x` fija en todas las fases: el retoño principal en 93, los de la derecha en 229 y 258, el chico de la izquierda en 48, y los gigantes en 24 y 296 (aparecen en la fase 2).
- **Una semilla por elemento** (`rng(<semilla>)` local). Agregar o quitar un elemento no mueve el azar de los demás, así el fondo es idéntico píxel a píxel entre fases.
- **Una receta por forma.** Toda hoja sale de `leafShape` (copas con `canopy` y `crown`, retoños con `sprig`, arbustos con `twigShrub`) y los troncos de `slimTrunk` (árboles jóvenes) o `stroke` (gigantes: cada tronco, rama y raíz es una Bézier sombreada desde el claro, con vetas en espiral; la forma de cada gigante está en `GIANTS` y no es un espejo de la otra); no dibujes follaje ni corteza por otro camino o el estilo vuelve a divergir.
- **Pasadas de luz.** `fog` (velo sobre el bosque lejano y las colinas), `relief` (montículos y pozos del suelo) y `vignette` (bordes y esquinas más oscuros) no pintan colores nuevos: mueven cada píxel por su rampa de tonos (`RAMPS`), así funcionan igual en los tres temas.
- **Inclinación.** Todo lo que está de pie se dibuja dentro de `lean(cv, xBase, …)`: se inclina hacia afuera según qué tan lejos del centro está su base, como un gran angular. Se corre la fila entera (`cv.shear` en `lib.mjs`), así el elemento nunca se rompe.

El cielo, las colinas, el valle y la bruma no dependen de `P`. El bosque lejano pasa de árboles muertos (fases 1-2) a siluetas con hojas (fase 3 en adelante).

## Flujo para modificar una escena

1. Editá el elemento en `scene.mjs`. Si cambia por fase, usá `P >= n` para que lo nuevo se mantenga en las fases siguientes.
2. `pnpm illustrations:forest <fase>` y `pnpm illustrations:forest:preview all <fase> <png> [--ref <imagen>]`; mirá el PNG.
3. Repetí hasta que se vea bien en los tres temas y en las fases vecinas. Nunca edites los `forest-phase-N.svelte` a mano: se pisan al regenerar.
4. `pnpm format`, `pnpm check`, y los tests de `src/lib/components/illustration`.

La salida es determinista. Regenerar sin tocar el código deja `git status` limpio.

## Mapa de archivos

| Archivo           | Qué hace                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `lib.mjs`         | Lienzo de 320×180 (`Canvas`), primitivas de dibujo, ruido y el fusionador de rectángulos a `<path>`.          |
| `scene.mjs`       | La escena de las 5 fases (`build(P)`): cielo, bosque lejano, colinas, suelo, árboles, arbustos, flora, fauna. |
| `live.mjs`        | Elige qué píxeles "viven" y arma los grupos `from` / `to` del movimiento.                                     |
| `palette.mjs`     | Paleta: colores de Dawn y su derivación a Dark y OLED; genera `forest-palette.css`.                           |
| `build-phase.mjs` | Escribe los componentes `.svelte` (CSS del movimiento incluido) y la paleta.                                  |
| `preview.mjs`     | PNG de una fase en un tema, o la hoja de comparación con los tres temas y una referencia.                     |

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

Ayudas de `scene.mjs`: `leafShape(cv, x, y, ángulo, largo, tono)` hoja con punta sombreada sobre su propio borde, `crown(cx, cy, rx, ry, semilla, r)` reparte racimos en una copa con lóbulos, `canopy(cv, clumps, seed, { shade, fruit })` cubre esos racimos con abanicos de hojas con luz arriba a la izquierda, `slimTrunk` y `giantTrunk` troncos, `limb(cv, pts, w0, w1)` rama con borde iluminado, `sprig` ramita con hojas de los retoños, `twigShrub` y `bush` arbustos (este con flores o bayas), `tuft` pasto, `sprout` brote, `moss`, `rock`, `flower`, `mushroom`, `drawFruit`, `blob` siluetas de bruma y follaje lejano, y `crest` arbustos sobre la línea de una colina.

## Colores

Cada color tiene un nombre (`l3`, `g2`, `fR`, `b4`…) y se pinta con `fill="var(--forest-<nombre>)"`. Los valores viven en `forest-palette.css`, generado desde `palette.mjs`:

- **Dawn**: la escena de día, con hex elegidos a mano a partir de las referencias (verde, marrón, crema).
- **Dark**: la misma escena al atardecer, con el cielo explícito (de los tonos de Rosé Pine al dorado del horizonte) y el resto derivado de Dawn en OKLab.
- **OLED**: la misma escena de noche, con el cielo negro, estrellas y luz de luna, también derivada de Dawn.

Los colores tienen un rol que decide cómo se derivan: `sky` (explícito por tema), `haze` (capas lejanas, entre el cielo y el follaje), `pop` (flores, frutas y fauna, que conservan su color), `star` (solo brillan en OLED; en Dawn y Dark valen el color de la parte alta del cielo, por eso `stars()` las dibuja al final y solo sobre ese color) y `base` (todo lo demás).

Para **retocar** un color, cambiá su hex de Dawn en `palette.mjs` y regenerá: Dark y OLED lo siguen solos. Para cambiar la luz de un tema entero, tocá `SKY` y `CURVES`. Para **agregar** uno, sumá `[nombre, hex, rol]` a `COLOURS` y usalo en la escena como `id.nombre`.

## Movimiento: píxeles vivos

La escena nunca se mueve entera. Lo que se mueve son píxeles sueltos:

- Todo lo que dibujes con `cv.group = 1` (follaje) o `cv.group = 2` (pasto, brotes) es candidato; `cv.group = 0` lo vuelve a dejar estático. Siempre volvé a `0` al terminar.
- `live.mjs` elige ~10% de esos píxeles que tengan un vecino libre (`SHARE`), y los reparte en `HOP_GROUPS = 10`. Cada uno salta a esa celda vecina y vuelve. El grupo estático conserva el color que había debajo (`cv.u`), así no queda un agujero cuando salta.
- Los tiempos (`periods`, `delays`) y los keyframes están en `build-phase.mjs`. Todo es CSS con `steps(1)`, pausado salvo con `animated`, y apagado con `prefers-reduced-motion`.
- Si cambiás `HOP_GROUPS`, actualizá el test `forest-phase-1.svelte.test.ts`, que cuenta los 10 grupos.

## Agregar una fase intermedia

Hoy `build-phase.mjs` tiene las fases fijas en 1-5 y `scene.mjs` compara `P` contra esos números (`P >= 3`, tablas indexadas por fase). Para sumar una:

1. En `scene.mjs` renumerá los umbrales y las tablas por fase (`cover`, `tufts`, la cantidad de flores) para hacerle lugar, y decidí qué crece en ella.
2. En `build-phase.mjs` ampliá la lista de fases y `TITLES`.
3. En `forest-illustration.svelte` importá el componente nuevo y agregá su rama.
4. En `src/lib/domain/illustration/illustration-catalog.ts`, `phaseCount` debe dividir 15 (1, 3, 5 o 15): con otro valor el test del catálogo falla.
5. Cada fase suma 150-250 KB al bundle (ver el issue #205 sobre la carga bajo demanda).

## Agregar otra ilustración

El generador está pensado para forest, pero las piezas se reutilizan. En una carpeta hermana (`tools/illustrations/<nombre>/`):

1. Copiá `lib.mjs` y `live.mjs` tal cual y creá tus propios `scene.mjs`, `palette.mjs` y `build-phase.mjs` con tu paleta.
2. Cambiá el prefijo de las variables (`--forest-` → `--<nombre>-`), el selector `[data-illustration='forest']`, la carpeta de salida y los títulos.
3. Registrala como cualquier ilustración (catálogo, i18n, renderer): ver `docs/features/compania-viva/adding-an-illustration.md`.
4. Agregá su script a `package.json` (`illustrations:<nombre>`).

## Reglas del arte

- Centro libre: entre `x 116..204` y por encima de `y ~120` no va arte alto (ahí están los dígitos y los controles). El arte crece hacia los lados.
- Sin `<canvas>`, sin dependencias y sin bucles de JS en la app: el generador corre solo en desarrollo.
- No copies ni incrustes una imagen de referencia: se dibuja con código usándola solo como guía visual.
- Un comentario CSS generado no puede contener `*/` en el medio: rompe toda la hoja de estilos y la ilustración se ve negra.
