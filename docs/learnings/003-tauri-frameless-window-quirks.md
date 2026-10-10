# 003 — Quirks de ventanas frameless en Tauri v2 (drag region y decorations)

> Verificado contra Tauri `2.11.6` (el lockfile de este repo) y la documentación oficial de Tauri v2 y Windows App SDK.
> Contexto de origen: implementación del mini-player ([#102](https://github.com/Gentleman-Programming/pomody/issues/102)).

---

## 1. ¿Qué pasaba? (El síntoma)

**Síntoma A — la ventana no se arrastra.**
El widget se renderiza como una fila flex con tres columnas que cubren el 100% del contenedor raíz. Se puso `data-tauri-drag-region` **solo en el root**. Resultado: el usuario hacía clic en cualquier parte del widget y la ventana no se movía. No había ni un píxel libre donde el drag funcionara.

**Síntoma B — el mini-player perdió las esquinas redondeadas en Windows 11.**
La hipótesis natural era "en Windows 10 las ventanas no tienen esquinas redondeadas, en Windows 11 sí, así que el efecto llega solo en 11". Es **falsa**. Con `decorations: false` las esquinas desaparecen en **todas** las versiones, Windows 11 incluida, y también desaparece la drop shadow.

---

## 2. ¿Por qué pasaba? (El fundamento técnico)

### A. `data-tauri-drag-region` no se hereda

En HTML/CSS los atributos se heredan al árbol: si el `div` tiene `font-size: 20px`, el `span` de adentro también. **`data-tauri-drag-region` no sigue esa regla.**

Tauri inyecta un listener de `mousedown` y evalúa **el elemento exacto sobre el que se hizo clic**. La documentación de Tauri v2 lo dice textualmente:

> `data-tauri-drag-region` will only work on the element to which it is directly applied. If you want the drag behavior to apply to child elements as well, you'll need to add it to each child individually.

El comportamiento es intencional: preserva la posibilidad de que botones e inputs funcionen aunque estén anidados dentro de una zona draggable.

Esto convierte cualquier layout donde los hijos cubren al padre en un **trampa geométrica**: si el atributo está solo en el root, el área de drag efectiva es el root **menos** la unión de sus hijos, que es cero.

**Variante importante:** Tauri respeta `data-tauri-drag-region="false"` para que un elemento se excluya explícitamente (agregado en `2.5.1`, [tauri#13269](https://github.com/tauri-apps/tauri/pull/13269)). Pero `="deep"` —que haría arrastrar automáticamente a los hijos no interactivos— **no está documentado en v2** y no debe usarse.

### B. El redondeo de esquinas ES parte de las decorations

Windows 11 redondea automáticamente las ventanas _que tienen marco_. La documentación de Microsoft ([Apply rounded corners](https://learn.microsoft.com/en-us/windows/apps/desktop/modernize/ui/apply-rounded-corners)) clasifica las apps en tres categorías, y la tercera dice textualmente que una app **no puede ser redondeada nunca**, ni siquiera llamando a la API de opt-in, si:

- no tiene marco ni bordes, o
- usa _per-pixel alpha layering_, o
- usa window regions.

El mantenedor de Tauri lo confirmó en [tauri#4733](https://github.com/tauri-apps/tauri/issues/4733), cerrado como comportamiento esperado:

> That's expected, radius is part of the decorations and removing decorations will remove radius, border, shadows etc.

Es decir: `decorations: false` no oculta "la barra de título". Oculta **el paquete completo** — marco, sombra y radio.

**Consecuencia práctica:** el `design.md` de un widget frameless que pida `rounded-md` en CSS está pidiendo algo que no se va a ver en ninguna plataforma. El `border-radius` solo redondea lo que se pinta **dentro** del rectángulo de la ventana; sin transparencia debajo, no hay nada que delate el corte.

---

## 3. ¿Cómo se resuelve y qué aprendí? (La lección)

### El permiso que hace falta y nadie te dice

Hay un tercer requisito, y es el que muerde: **`data-tauri-drag-region` no funciona sin `core:window:allow-start-dragging`**.

Tauri lo implementa inyectando el comando `start_dragging`, y ese comando necesita su propio permiso. `core:window:default` **no lo incluye** — solo trae `allow-internal-toggle-maximize`. El ejemplo de titlebar custom de la documentación oficial lo lista aparte, entre otras cuatro líneas de capability.

Sin el permiso, el atributo está perfectamente puesto, el HTML es correcto, los tests de DOM pasan, y la ventana simplemente **no se arrastra de ningún lado**. No hay error, no hay warning, no hay nada en la consola. Es el peor modo de falla que existe.

**Regla**: cada vez que agregues un `data-tauri-drag-region` a la app, verificá que `core:window:allow-start-dragging` esté en `src-tauri/capabilities/default.json`. Y agregá un test que lo afirme — un test que lea el JSON de capabilities y falle si el permiso desaparece. Cuesta cinco líneas y es la única red contra esta clase de bug invisible.

### Para el drag region: opt-out no, opt-in

El patrón correcto es **agregar explícitamente** el atributo a cada elemento que debe arrastrar, y nunca ponerlo en un contenedor queTMS sus hijos interactivos.

La razón es **fail-safe**: con opt-in, un elemento nuevo que se agregue al layout nace _sin_ drag —que es el default seguro—. Con opt-out (`root` + `"false"` en cada hijo), un elemento nuevo nace _arrastrando la ventana_ si alguien olvidó la excepción. **El segundo diseño falla hacia el lado peligroso.**

```
<!-- correcto: cada elemento arrastrable lo pide explícitamente -->
<div data-tauri-drag-region>          <!-- raíz de la columna izquierda -->
  <span data-tauri-drag-region>        <!-- ícono -->
  <span data-tauri-drag-region>        <!-- título, aunque sea largo y variable -->
</div>
<div data-tauri-drag-region>24:18</div>  <!-- columna central -->
<div>                                  <!-- botonera: SIN atributo, nunca -->
  <button>...</button>
</div>
```

### Para las decorations: el radio no es gratis

Si un diseño exige esquinas redondeadas en una ventana frameless, hay exactamente dos caminos, y ambos tienen costo:

1. **`transparent: true` + `border-radius` CSS.** Requiere que `html` **y** `body` sean transparentes, no solo `body`. En Windows implica _per-pixel alpha_, que además es una de las condiciones que Windows clasifica como "nunca redondeable" para ventanas custom. Y en un widget que repinta 1 vez por segundo es la peor combinación posible para el compositor.
2. **Crates Rust nativas** ([`window-shadows`](https://github.com/tauri-apps/window-shadows)). En Win11 aplican `DWM_WINDOW_CORNER_PREFERENCE = DWMWCP_ROUND` **en el compositor**: esquinas realmente cortadas con antialiasing y drop shadow conservada, sin transparencia. Es la opción técnicamente correcta, pero toca `Cargo.lock` —ver [AGENTS.md](../../AGENTS.md) regla 8— y suma un crate al árbol Tauri, así que es un issue propio, no un efecto lateral.

**La lección de fondo:** antes de dibujar `rounded-md` en el diseño de una ventana sin marco, hay que decidir conscientemente si el radio es decorativo o si se va a invertir en hacerlo real. No es un detalle de CSS que se resuelve en el componente.

---

## 4. Checklist para la próxima ventana frameless

- [ ] ¿`core:window:allow-start-dragging` está en `capabilities/default.json`? Sin él el drag no funciona y no hay error
- [ ] ¿Qué elemento exacto tiene el atributo de drag? ¿Hay hijos que lo cubren?
- [ ] ¿El layout nuevo.elements nacen con drag o sin drag? (tiene que ser **sin**)
- [ ] ¿La botonera tiene alguna chance de heredar el drag? (no puede)
- [ ] ¿El diseño pide `border-radius` y la ventana va frameless? → decidir radio real o aceptarlo cuadrado
- [ ] ¿Se transparentó la ventana para el radio? ¿`html` y `body` quedaron transparentes?
