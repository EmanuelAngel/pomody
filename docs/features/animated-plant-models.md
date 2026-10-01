# Especificación Técnica: Modelos Animados de Progreso (Focus Plant)

> Guía de contexto para diseñar e implementar nuevos modelos animados en pixel art que acompañan el ciclo Pomodoro (issue #24). El modelo de referencia es **Seed to fruit tree** (`seed-to-tree`). Todo modelo nuevo debe respetar este documento: cambia la temática, no las reglas.

---

## 1. Propósito y Principios

La escena es una **recompensa periférica**: muestra en qué punto del ciclo Pomodoro está el usuario sin competir con su atención.

- **Progreso = posición en el ciclo**, no logros acumulados. Empieza en cero al comenzar un ciclo y llega a su estado final justo en el descanso largo.
- **Solo crece**: ningún frame puede verse más chico o más vacío que el anterior.
- **Viva pero calma**: animación a pocos cuadros por segundo, nunca un bucle a 60 FPS.
- **Cero bloat**: un `<svg>` inline (XML) con un `<path>` por tinta, sin assets externos ni dependencias nuevas. Meta global de la app: < 30 MB de RAM.
- **Tema visual único**: todos los colores salen de tokens Rosé Pine y se adaptan a los temas Dark, Dawn y OLED.

---

## 2. Arquitectura

```text
src/lib/domain/botanical/cycle-growth.ts         # Regla pura: ciclo → crecimiento 0..1
src/lib/components/timer/botanical-progress.svelte # Host: tamaño, posición, reloj, render SVG
src/lib/components/timer/plant-models/
├── types.ts          # Contrato PlantModel, SceneActor, SceneState
├── pixel-canvas.ts   # PixelCanvas (primitivas), composeScene (pura), toInkPaths (grilla → SVG), selectFrameIndex
├── fauna.ts          # Actores reutilizables (mariposas, abejas, pájaros, etc.)
├── island.ts         # Silueta compartida de la isla flotante (islandShape)
├── seed-to-tree.ts   # Modelo de referencia orgánico (protagonista en los frames)
├── gym-gains.ts      # Modelo de referencia con personaje animado (protagonista en `hero`)
└── index.ts          # Registro PLANT_MODELS (el primero es el fallback)
```

### Flujo de datos

```text
TimerState (mode, currentRound, progress, roundsBeforeLongBreak)
  → getCycleGrowth()            → growth 0..1
  → selectFrameIndex()          → índice de frame
  → composeScene(model, state)  → grilla de caracteres (frame + píxeles idle + actores)
  → toInkPaths(rows, palette)  → un <path> por tinta (tiras horizontales de 1 px)
  → <svg viewBox="0 0 ancho alto" shape-rendering="crispEdges">, fill con tokens del tema
```

### Regla de crecimiento (dominio, no modificar por modelo)

- `scale = max(4, roundsBeforeLongBreak)` (el ciclo es configurable de 4 a 12 rounds).
- En **foco**: `growth = (roundsCompletados + progresoDelBloque) / scale` → crece minuto a minuto.
- En **descansos**: `growth = roundActual / scale` → se mantiene.
- `growth = 1` exactamente en el descanso largo. Al volver al round 1 hay **cosecha** (`isHarvest`) y se reinicia en 0.
- Con 1–3 rounds configurados el ciclo nunca llega a la madurez completa (decisión aceptada).

### Cómo agregar un modelo

1. Crear `plant-models/<id>.ts` que exporte un `PlantModel` congelado (`Object.freeze`).
2. Registrarlo en `PLANT_MODELS` (`index.ts`). Aparece automáticamente en el desplegable **Settings → Focus Plant → Model**.
3. Agregar sus casos a los tests existentes (ver §9). No hace falta tocar el host, los settings ni el dominio.

---

## 3. Contrato `PlantModel`

| Campo             | Descripción                                                                                            |
| :---------------- | :----------------------------------------------------------------------------------------------------- |
| `id`              | Kebab-case, `^[a-z0-9-]{1,64}$` (se valida al leer settings).                                          |
| `label`           | Nombre en inglés que se muestra en el desplegable y en el `aria-label`.                                |
| `width`, `height` | Tamaño del lienzo en píxeles de arte. Referencia: **60 × 126**.                                        |
| `groundY`         | Fila de la línea de suelo. El host la alinea con los controles del timer. Referencia: **96**.          |
| `palette`         | Carácter → color CSS (tokens). `.` siempre es transparente.                                            |
| `idle`            | Caracteres animados: `sway-a` / `sway-b` (alternan visibilidad) y `glint` (cambia a `alt` brevemente). |
| `frames`          | Frames ordenados; el primero es el inicio del ciclo y el último la madurez. Referencia: **17**.        |
| `hero`            | Opcional. Protagonista animado que **siempre** se dibuja, también en modo estático (con `tick = 0`).   |
| `actors`          | Fauna y momentos únicos dibujados en cada tick, solo con animación activa. Cada actor declara `layer`. |

### Capas de dibujo

`composeScene` dibuja en este orden: frame → actores `layer: 'back'` → `hero` → actores `layer: 'front'` (por defecto).

- **`back`**: todo el **entorno animado** (ventiladores, toallas, burbujas, cronómetros, luces, partículas ambientales). Nunca puede pintar sobre el protagonista.
- **`front`**: solo lo que debe verse **delante** (fauna que pasa, sudor, destellos sobre el personaje, la cosecha).
- Regla: si un objeto del entorno se anima y el personaje puede pasar por delante, va en `back`. Hay un test que verifica que la escena de fondo nunca cambia los píxeles del héroe.

### Dos formas de modelar al protagonista

- **En los frames** (`seed-to-tree`): el protagonista es estático y crece paso a paso. La vida viene de los píxeles `idle` y de los `actors`.
- **Como `hero`** (`gym-gains`): el protagonista se mueve (repeticiones, poses). Los frames guardan solo el entorno y el equipo. El héroe se dibuja de forma **procedural** a partir de medidas que dependen del frame (`buildOf(frame)`: altura, masa, grosor de extremidades) y de una pose que depende de `tick` y de `activity`.
  - **Modo estático obligatorio**: con `animated === false`, el héroe dibuja su **pose de reposo** (de pie). Así nunca desaparece y los tests de monotonía miden una silueta estable.
  - Las poses se describen como articulaciones (hombro, codo, mano, cadera, rodilla, pie) unidas con trazos gruesos (`limb`), con la última columna en tono de sombra.

Los tests de crecimiento miden la **escena compuesta en modo estático** (frame + héroe), no solo el frame, así valen para ambos enfoques. El host también calcula la altura madura sobre esa escena.

Los frames son `string[]`: cada carácter es un píxel. Se construyen con primitivas de `PixelCanvas` (`put`, `hline`, `vline`, `line`) y funciones de dibujo propias (hojas, grupos, troncos). **No escribir las filas a mano** salvo sprites diminutos.

---

## 4. Estilo de Arte

- **Pixel art puro**: píxeles cuadrados y nítidos (`shape-rendering="crispEdges"`, una unidad del `viewBox` = un píxel de arte), sin antialiasing, degradados ni desenfoques dentro de la escena.
- **Detalle orgánico determinista**: los bordes irregulares, las hojas sueltas y la textura usan `pixelHash(x, y)`. Nunca `Math.random()`: la imagen debe ser idéntica en cada render.
- **Volumen con 3 tonos** por material (sombra, medio, luz). Ejemplo del follaje: `G` sombra, `g` medio, `l`/`f` luz. La luz viene de arriba a la izquierda.
- **Masas en grupos**: follajes y arbustos se arman con muchos grupos elípticos superpuestos (`drawCluster`), dibujados de atrás hacia adelante, con bordes rotos y hojas sueltas en el contorno.
- **Contorno sin línea negra**: los bordes se definen por el contraste de tono (`k` para el borde de la isla, `B` para el lado en sombra del tronco).

### Paleta de referencia (tokens)

| Carácter           | Uso                                        | Token                                                                     |
| :----------------- | :----------------------------------------- | :------------------------------------------------------------------------ |
| `g` / `G` / `l`    | Follaje medio / sombra / luz               | `--accent-pine` / pine 72 % + negro / `--accent-foam`                     |
| `i`, `o`, `y`, `r` | Flores y frutos                            | `--accent-iris`, `--accent-rose`, `--accent-gold`, `--accent-love`        |
| `b` / `B` / `k`    | Madera, raíces / sombra / grietas y bordes | `--text-subtle` / `--text-muted` / muted 60 %                             |
| `d`, `e`, `E`, `D` | Capas de tierra y piedras                  | `color-mix` de `--text-muted` con `--background` (30 %, 42 %, 54 %, 78 %) |
| `m`, `n`, `p`      | Alas de mariposa, polen                    | rose, gold, gold 85 %                                                     |

**Reglas de color:**

- **Solo tokens de tema** o `color-mix(in oklab, var(--token) N%, var(--background) | black)`.
- **Las sombras se mezclan con `black`**, no con el fondo: mezclarlas con el fondo las lava en el tema Dawn (claro).
- **Revisar los 3 temas.** OLED usa acentos más saturados y es aceptable que la escena se vea más vívida ahí.

---

## 5. Tamaño, Posición y Composición

- **Ubicación**: flanco izquierdo de la pestaña Timer, solo en pantallas de 1024 px o más (`hidden lg:block`).
- **Ancho**: el máximo que cumpla simultáneamente con:
  1. el espacio libre a la izquierda del timer, menos `2rem` de margen;
  2. que el árbol maduro no toque el header (`4rem` de margen superior);
  3. que la parte inferior del lienzo no toque el borde de la pantalla (`1.5rem`).
- **Centrado horizontal** dentro del espacio libre (no pegado a la esquina).
- **Vertical**: la línea de suelo (`groundY`) se alinea con los controles del timer (`50vh + 11.75rem`). El estado maduro llega hasta la altura del círculo del timer.
- **Composición horizontal**: el protagonista va centrado (columna central `CX = 29` en 60 px). El espacio lateral se llena con **paisaje** (flora, rocas, arbustos), nunca estirando al protagonista.
- **Base flotante**: el suelo es una **isla suspendida** que se afina hacia abajo en punta irregular, con capas de tierra, piedritas, raíces que cuelgan (≤ 6 px) y terrones sueltos debajo. No toca los bordes del lienzo.
- El host calcula todo de forma genérica a partir de `width`, `height`, `groundY` y la altura del último frame; un modelo nuevo no necesita tocar el CSS.

---

## 6. Fases y Crecimiento

La narrativa se divide en **4 capítulos**, uno por round del ciclo por defecto. Con más rounds el mismo relato se estira; ningún modelo debe asumir exactamente 4 rounds.

| Capítulo | Referencia (`seed-to-tree`)                                  | Frames | Altura objetivo |
| :------- | :----------------------------------------------------------- | :----- | :-------------- |
| 1        | Semilla echando raíces → florcita                            | 0–4    | ≈ 35 %          |
| 2        | Florcita → planta tupida con tallo verde y varias flores     | 5–8    | ≈ 60 %          |
| 3        | Plantín → árbol joven con tronco (más grande que el plantín) | 9–12   | ≈ 80 %          |
| 4        | Árbol joven → árbol frondoso con frutos                      | 13–16  | 100 %           |

**Reglas obligatorias:**

1. **Monotonía**: cada frame es igual o más alto **y** más lleno que el anterior. Las transiciones de forma (tallo → tronco) ocurren dentro del volumen existente y lo superan en el mismo paso.
2. **Curva de alturas**: los finales de capítulo quedan cerca de 35 %, 60 %, 80 % y 100 % de la altura final. Las primeras fases no deben verse vacías.
3. **Cambio visible en cada paso**: todo frame agrega algo perceptible (hoja nueva, capullo que abre, color nuevo, rama, visitante, flor → fruto).
4. **Vida en todas las fases**, no solo al final: frondosidad, puntos de color y visitantes propios de cada capítulo.
5. **Raíces o base que crecen** con la fase: finas y largas al inicio, anchas y profundas al final, contenidas en la isla.
6. **Entorno progresivo**: la flora alrededor aparece y crece con el ciclo (pasto → pasto alto, flores, hongos, arbustos, rocas).
7. **Cosecha**: al reiniciar el ciclo ocurre un momento único (en la referencia, un fruto cae a la tierra donde aparece la nueva semilla).

Referencia de alturas en `seed-to-tree` (filas sobre el suelo, frames 0–16):
`0 · 5 · 11 · 19 · 24 · 28 · 32 · 36 · 41 · 44 · 46 · 50 · 54 · 58 · 61 · 64 · 68`

---

### Referencia con personaje: `gym-gains` ("Skinny to giant")

| Capítulo | Cuerpo                   | Ejercicio (foco o calma)       | Equipo que se suma                                        |
| :------- | :----------------------- | :----------------------------- | :-------------------------------------------------------- |
| 1        | flaco → con algo de tono | curl de bíceps con mancuernas  | colchoneta, botella, rack de mancuernas, parlante, planta |
| 2        | tonificado → atlético    | jalón al pecho sentado (polea) | torre de polea con viga y asiento, toalla                 |
| 3        | atlético → musculoso     | press de banca (vista lateral) | banco, discos en el piso                                  |
| 4        | musculoso → gigante      | sentadilla con barra           | rack, trofeo                                              |

- **Doble resolución (120 × 252)**: un personaje necesita más píxeles que una planta para leerse como cuerpo. El host escala por proporción, así que en pantalla ocupa el mismo lugar. Un modelo puede elegir su resolución, siempre con la misma relación de aspecto (≈ 0,476).
- **Estatura fija, crece la musculatura**: el cuerpo mide 80 filas en todas las fases; solo aumentan hombros, pecho, brazos, piernas, cuello y el peso de los discos. Para este modelo la monotonía se cumple con altura constante y masa creciente.
- **Escala humana**: el personaje (~1,80 m = 80 filas, 1 fila ≈ 2,25 cm) es la referencia de todo el entorno: banco a la altura de la rodilla, rack de mancuernas a la cadera, ventilador ~1,3 m, torre de polea ~2,2 m (más alta que él). El cuerpo nunca ocupa más de la mitad del ancho de la isla. **No hacer al protagonista más grande que el entorno**: tapa la escena y rompe la proporción.
- **Distribución por zonas**: izquierda (rack de mancuernas, ventilador), centro (la estación del capítulo), derecha (torre de polea, parlante, planta). Cada estación deja el cuerpo dentro de su zona en todas las poses.
- **Anatomía sombreada**: cada parte es una cápsula o elipse con 3 tonos más contorno (`W` luz, `S` medio, `Z` sombra, `O` contorno). Las luces de piel y ropa se mezclan con blanco. Pectorales y abdominales se marcan a partir del capítulo 2; la cara tiene cejas, ojos, nariz y boca.
- El entrenamiento se hace en **series**: 7 repeticiones de 2 s y un descanso de pie de 3 s.
- **Rotación de ejercicios** (`PLAYLISTS`): cada capítulo alterna su ejercicio estrella (el de su máquina) con accesorios de peso libre, **3 series por ejercicio** (`SETS_PER_EXERCISE`, ~30 s) y una pausa de transición de 5 s. Solo se usan máquinas presentes en ese capítulo.

  | Capítulo | Rotación                                                              |
  | :------- | :-------------------------------------------------------------------- |
  | 1        | curl → elevaciones laterales → curl → press de hombros con mancuernas |
  | 2        | jalón al pecho → curl → jalón al pecho → press de hombros             |
  | 3        | press de banca → curl → press de banca → elevaciones laterales        |
  | 4        | sentadilla → peso muerto → sentadilla → press militar con barra       |

  La rotación depende solo de `tick` (`exerciseAt`, `repPhaseAt`): es determinista y testeable. Durante las pausas el personaje sostiene el equipo del ejercicio en curso.

- **Rutina de descanso** (`BREAK_ROUTINE`, ~4 s por acción, orden fijo sin repetir dos seguidas): tomar agua, doble bíceps, secarse la cara con la toalla, dorsales de frente, estirar, abdominales y piernas, sacudir brazos con magnesio, más muscular, toalla al cuello (respirando) y victoria. "Más muscular" y "victoria" se desbloquean en el capítulo 3, cuando hay masa para lucirlas. Las poses se logran con brazos y con `TorsoStyle` (`flare` para abrir dorsales, `traps`, `abs`). Mientras usa la toalla del gimnasio, desaparece del brazo de la polea.
- La isla lleva piso de goma con LEDs (`glint`) y, en lugar de raíces, **cables con focos** colgando.
- **Vida propia por capítulo, con la misma intensidad** (tres elementos cada uno):

  | Capítulo | Vida propia                                                              |
  | :------- | :----------------------------------------------------------------------- |
  | 1        | notas del parlante, ventilador girando, gotas de sudor                   |
  | 2        | gato (duerme o se despierta), toalla que se mece, burbujas en la botella |
  | 3        | pájaro en la polea, cronómetro que cuenta, brillo sobre los discos       |
  | 4        | perro que mueve la cola, luces de escenario, destellos de esfuerzo       |

  Cada elemento tiene niveles: ausente, de fondo (capítulos posteriores), propio y propio en descanso (`level()`). Siempre están el magnesio, los LEDs y los focos, y la medalla dorada es la cosecha.

- **Test de equilibrio**: el movimiento (píxeles que cambian entre ticks, sin el personaje) de cada capítulo debe superar el 50 % del capítulo más activo.

## 7. Animación y Fauna

- **Reloj**: `tick` avanza cada **250 ms (4 FPS)** y solo mientras la escena es visible y animada. Se detiene con la pestaña oculta, en Zen oculto, con **Static plant** activado o con `prefers-reduced-motion`.
- **Movimiento a saltos**, de a 1 píxel, estilo retro. Nada de interpolaciones suaves.
- **Actividad de la escena** (`SceneActivity`):
  - `calm` (timer detenido, en pausa **o en foco**): viento suave, visitantes ocasionales.
  - `break` (descanso corriendo): viento más rápido, más fauna, más movimiento.
  - **El foco se ve igual que la calma**: mismo color (sin atenuar) y mismo ritmo. Es preferencia explícita del desarrollador.
- **Idle en el frame**: pasto que alterna de lado (`sway-a`/`sway-b`) y destellos de luz en las hojas (`glint`).
- **Visitantes por capítulo** (en la referencia):
  1. mariquita que sube por el tallo y abejita en la flor;
  2. mariposa posada en una flor y oruga en el tallo;
  3. pajarito en una rama joven y nido;
  4. pájaro en la copa.

  **Siempre presentes**: polen, vaquita que cruza el suelo y mariposas en los descansos.

- **Actores reutilizables** en `fauna.ts`: `butterfly`, `ladybug`, `pollen`, `climber`, `bee`, `perchedButterfly`, `bird`, `harvestDrop`. Aceptan `fromFrame`/`toFrame` y se posan leyendo el frame actual (`topOf`), así funcionan con cualquier forma.
- Los actores son **funciones puras de `tick`**: nada de estado interno ni timers propios.

---

## 8. Settings y Accesibilidad

**Settings → Focus Plant**, todo persistido en `localStorage` con validación defensiva:

| Setting             | Default        | Efecto                                                      |
| :------------------ | :------------- | :---------------------------------------------------------- |
| Show plant          | on             | Muestra u oculta la escena.                                 |
| Hide while focusing | on             | Oculta la escena **solo** mientras corre un bloque de foco. |
| Model               | `seed-to-tree` | Desplegable del registro; ids desconocidos → primer modelo. |
| Static plant        | off            | Congela la animación y la fauna.                            |

- `role="img"` en el `<svg>` con `aria-label` = `"<label>: N% grown this Pomodoro cycle"`.
- **Render en SVG**: los `fill` usan los tokens (`var(--accent-pine)`, `color-mix(...)`) directamente, así que el cambio de tema es instantáneo sin resolver colores en JS. El DOM se mantiene chico (≈ 15–30 `<path>` por escena) aunque el lienzo tenga miles de píxeles.
- El reloj de animación es un `SceneClock` con `createSubscriber` (`svelte/reactivity`): solo corre mientras la escena visible lo lee; `prefers-reduced-motion` se lee con `MediaQuery`.
- `prefers-reduced-motion` equivale a Static plant.

---

## 9. Tests Obligatorios para un Modelo Nuevo

Ubicación: `src/lib/components/timer/botanical-progress.svelte.test.ts` (proyecto `client`).

- Los frames respetan `width` × `height` y solo usan tintas de `palette` o `idle`.
- **Monotonía** de altura y de relleno entre frames consecutivos.
- Curva de alturas cercana a 35/60/80 % en los finales de capítulo.
- La transición del capítulo 3 es más grande que la fase anterior (ancho ≥ 1,3×).
- La isla o base se afina hacia abajo, no toca el borde inferior y tiene aire a los costados.
- Hay visitantes en todos los capítulos; el modo estático no dibuja fauna y da una imagen fija.
- `composeScene` no deja caracteres `idle` sin resolver en la salida.
- Los tests genéricos (lienzo, monotonía, isla, idle, visitantes, estático fijo) ya recorren `PLANT_MODELS` con `it.each`: al registrar un modelo, lo cubren automáticamente. Agregar además los tests propios de su narrativa (ver el bloque `gym-gains model`).
- Con `hero`: el personaje está presente en todos los frames en modo estático, crece en masa y cambia de pose al entrenar.

---

## 10. Preferencias del Desarrollador (Feedback Validado)

Recogidas en las iteraciones de diseño con Fede. Tratarlas como requisitos:

1. **Pixel art** como estilo base; se valoraron los colores en los 3 temas y el dibujo detallado.
2. **Grande**: la escena debe ocupar la mayor parte del lateral izquierdo; el lado izquierdo no debe verse vacío ni la escena pegada a la esquina.
3. **Centrada en su espacio** y a la altura del timer.
4. **Sin maceta**: la planta está sembrada; hoy, en una isla flotante.
5. **Animaciones vivas permanentes** por defecto, con opción de modo estático.
6. **Crecimiento creíble**: nunca se achica; cada fase se ve más grande y más viva que la anterior.
7. **Frondosidad**: follaje denso con muchas hojas, no siluetas finas.
8. **Raíces visibles y largas**, que crecen con cada fase.
9. **Entorno vivo** con flora y fauna que reaccionan al timer (más activos en descansos).
10. **Foco igual a calma**: sin atenuar ni cambiar el ritmo mientras el timer corre.
11. **Sistema extensible**: los modelos futuros se eligen desde un desplegable.
12. **Proceso**: cada iteración se planifica primero con `/impeccable shape` (brief confirmado) antes de implementar, y se verifica en la app real en los 3 temas y en varios tamaños de pantalla.

---

## 11. Puntos Críticos Conocidos

- **Progreso en memoria**: al recargar la página, el ciclo y la escena vuelven al inicio.
- **Skip** avanza el round: la escena salta al final del tramo omitido.
- **Offset de los controles** (`11.75rem`): depende del layout actual del timer. Si el timer cambia de tamaño, hay que reajustarlo.
- **Pantallas bajas o angostas** (≈ 1024 × 700): la escena queda más compacta por los límites de alto y ancho.
- **Rendimiento**: `composeScene` recorre toda la grilla en cada tick. Mantener lienzos en el orden de 60 × 126; lienzos mucho mayores exigen cachear el frame base.
