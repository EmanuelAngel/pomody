# System Tray — Decisiones de Implementación

> Registro de las decisiones tomadas **antes** de escribir la primera línea de la integración de bandeja del sistema.
> Este documento explica **por qué** cada cosa es como es.
>
> Milestone 3, P1 del [`roadmap.md`](../../roadmap.md). Precedente documental: [`mini-player/decisions.md`](../mini-player/decisions.md).

---

## 1. Objetivo

Una sola cosa: **evitar que un clic perdido mate un bloque de foco en curso**, y dejar la app sin nada suelto en el escritorio ni en el taskbar.

No es una feature de "control remoto del timer". No es un launcher. No sincroniza estado. Todo lo que no sirva a ese objetivo quedó explícitamente afuera.

---

## 2. Alcance

**Rust únicamente.** `src-tauri/src/lib.rs` y `src-tauri/Cargo.toml`. **Cero cambios en `src/lib/`.** El frontend no se entera de que la bandeja existe: no hay `ITrayShell`, no hay event plumbing, no hay comandos Tauri.

---

## 3. Decisiones

### Comportamiento

| Decisión                       | Valor                                     | Por qué                                                                                                                                                                                                                                                                                                 |
| ------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Botón cerrar (X)               | Oculta a la bandeja, **no** cierra        | Es el objetivo completo de la feature. `prevent_close()` + `hide()`. Sin `prevent_close`, la app terminaría y el ícono de bandeja moriría con ella.                                                                                                                                                     |
| Botón minimizar                | **Sigue yendo al taskbar**                | Mandar minimize a la bandeja rompe la convención de Windows, duplica el Mini-Player y confunde el modelo mental: bandeja = "cerré la app", taskbar = "la minimicé". La bandeja es exclusivamente para cerrar.                                                                                           |
| Botones del Mini-Player        | **No aplica — no existen**                | Con `decorations: false` no hay barra de título, así que en 320x48 no hay forma de minimizar ni cerrar. Solo hay `Restaurar`. La bandeja no agrega nada ahí.                                                                                                                                            |
| Click izquierdo en el ícono    | **Restaura la ventana**                   | Ver §5. Es un evento confiable en Windows.                                                                                                                                                                                                                                                              |
| Click derecho                  | Abre el menú contextual                   | Convención de Windows, no se negocia.                                                                                                                                                                                                                                                                   |
| Menú                           | `Open` / `Exit`                           | Ver §4.                                                                                                                                                                                                                                                                                                 |
| `Exit` con un bloque corriendo | **Sin confirmación**, salida inmediata    | `Salir` ya es una acción explícita y deliberada dentro de un menú: quien la apretó sabe lo que hace. Un confirmador en un menú de bandeja es UX de aplicación de escritorio clásica, no de herramienta de foco.                                                                                         |
| Recentrar al restaurar         | **No**                                    | El Mini-Player recentra porque un widget de 320x48 arrastrado queda medio fuera de pantalla muy seguido. Una ventana de 800x650 no tiene ese problema, y recentrar cada vez que emerge de la bandeja la saca de donde el usuario la puso. El caso del monitor desconectado es más raro y menos molesto. |
| Al restaurar                   | `unminimize()` → `show()` → `set_focus()` | Las tres hacen falta y ninguna es redundante. `unminimize` porque la ventana pudo quedar minimizada al taskbar _antes_ de cerrarse, y Windows conserva ese estado a través de `hide()`. `show` porque se usó `hide`, no `close`. `set_focus` porque mostrar nonecessarily trae la ventana al frente.    |

### Timer y audio con la ventana oculta

El temporizador **sigue corriendo** y **el sonido de transición sigue sonando**. No es una decisión de código: es la consecuencia de no hacer nada, y no hacer nada es correcto.

Técnicamente no requiere trabajo porque el reloj vive en un Web Worker (`src/lib/adapters/worker/timer.worker.ts`), no en un `setInterval` del DOM, así que la visibilidad de la ventana no lo estrangula. La app en bandeja **no está pausada**.

### Ubicación del código

| Decisión              | Valor                                  | Porqué                                                                                                                                                                                                                                                                                |
| --------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Construcción del tray | **Programática en Rust**               | Declararla en `tauri.conf.json` (`app.trayIcon`) auto-activa el feature y es una línea, pero no da control sobre `on_menu_event` / `on_tray_icon_event`, que es literalmente de lo que vive esta feature. `lib.rs` tenía 16 líneas y cero comandos: era un punto de inserción limpio. |
| Feature flag          | `tauri = { features = ["tray-icon"] }` | No está en los features por defecto de `tauri`; solo se auto-activa si existe `app.trayIcon` en el config, y Pomody no lo tiene.                                                                                                                                                      |
| `Cargo.lock`          | **Sin cambios**                        | `tray-icon 0.24.2` ya está resuelto en el lock (línea 3148) como dependencia opcional de `tauri`. Activar el feature no cambia la resolución, así que la regla 8 de [`AGENTS.md`](../../../AGENTS.md) no aplica a esta feature. Esto se verificó **antes** de escribir código.        |

### Ícono

| Decisión          | Valor             | Por qué                                                                                                                                                                          |
| ----------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Asset             | `icons/32x32.png` | El mismo asset que ya bundlea `tauri.conf.json`. Windows escala a 16px en la bandeja; un downscale del PNG de 32 se ve peor que un 16px generado a ojo. **Deuda anotada** en §6. |
| Forma de cargarlo | `include_bytes!`  | Explícito y compacto en el binario. La alternativa `default_window_icon()` es una línea más corta pero depende de la config de bundle; se descartó por determinismo.             |
| Tooltip           | `"Pomody"`        | Costo cero, y sin él Windows muestra el nombre del ejecutable, que el instalador NSIS puede haber cambiado.                                                                      |

### Labels del menú

| Decisión | Valor           | Por qué                                                                                                                                                                                                                                       |
| -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Idioma   | **Inglés fijo** | Ver §6. El menú lo construye Rust y el idioma elegido vive en `localStorage`, que Rust no puede leer. Hacerlo bilingual exige un command frontend→Rust, que es exactamente el plumbing que esta feature decidió no tener.                     |
| Texto    | `Open` / `Exit` | Elegidos sobre `Show` / `Quit` por ser casi-transparentes para un hispanohablante ("abrir" / "salir"). `Open` es además el verbo que Windows ya usa en sus propios menús de bandeja. `Exit` es la etiqueta estándar de Windows para terminar. |

---

## 4. Por qué el menú no controla el timer

La primera versión del planteo pedía `Pausar` / `Reanudar` en el menú. Se descartó.

El estado del timer vive en un Web Worker detrás del estado Svelte. El menú vive en Rust. **No comparten memoria.** Un menú que mostrara el estado real necesita sincronización en los dos sentidos: Rust emite el click → el frontend pausa → el frontend notifica a Rust el estado real → Rust re-renderiza el menú. Eso es event plumbing bidireccional para controlar un botón.

Dado que el objetivo declarado de esta feature es _evitar el cierre accidental_, ese costo no compra nada: quien quiere pausar tiene el Mini-Player abierto en 320x48 al lado, o Alt+Tab a la ventana.

---

## 5. Por qué click simple y no doble click

La primera hipótesis fue que en Windows el click simple no era confiable y que había que usar doble click.

**Era falsa, y verificada contra el código fuente antes de decidir** (`tray-icon-0.24.2/src/platform_impl/windows/mod.rs:408-468`):

```rust
WM_LBUTTONUP     => Click { button: Left, button_state: Up },
WM_LBUTTONDBLCLK => DoubleClick { button: Left },
```

`tray-icon` reenvía el mensaje crudo de Windows sin deduplicar. El click simple **es** confiable.

Y un doble click real emite `Click{Up}` → `Click{Up}` → `DoubleClick`. O sea: click simple es un match limpio y exacto, mientras que doble click exige un debounce de ~400ms o descartar los `Click` que lo preceden.

Se eligió **click simple**. El único costo real: un doble click sobre el ícono restaura dos veces, lo cual es idempotente e inofensivo.

> **Trampa documentada.** `TrayIconBuilder::show_menu_on_left_click` viene en **`true` por defecto**, y en Windows eso hace que el click izquierdo abra el menú contextual en lugar de restaurar. Sin la llamada explícita a `show_menu_on_left_click(false)`, la decisión anterior se rompe en silencio, sin error ni warning.

---

## 6. Deuda conocida

Registrada a propósito, no olvidada.

| Deuda                                                    | Por qué no se hizo ahora                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aviso al usuario la primera vez que la app se oculta** | Se propuso originalmente un toast dentro de la ventana. Es técnicamente imposible: la ventana se oculta en el mismo instante en que el toast debería renderizarse, así que nunca se ve. Las dos alternativas reales son un balloon nativo (requiere `tauri-plugin-notification` → **toca `Cargo.lock`**, regla 8) o un diálogo modal (requiere plumbing Rust→frontend→Rust). Ambas desproporcionadas para un aviso informativo. |
| **Menú de bandeja en el idioma elegido por el usuario**  | Requiere command frontend→Rust. Ver §3.                                                                                                                                                                                                                                                                                                                                                                                         |
| **`16x16.png` dedicado para la bandeja**                 | `32x32.png` se ve aceptable. Un asset optimizado real es trabajo de diseño gráfico, no de feature.                                                                                                                                                                                                                                                                                                                              |

---

## 7. Verificación

`desktop-ci.yml` valida que el código **compile** y que los permisos sean válidos. **No valida comportamiento de bandeja.** Vitest tampoco: no hay forma de abrir un ícono de bandeja desde Node, y por eso esta feature **no tiene tests unitarios**.

La verificación es manual, sobre el `.exe` en Windows:

| #   | Paso                                                                         | Resultado esperado                                                                   |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | Click simple izquierdo sobre el ícono de bandeja                             | La ventana aparece al frente                                                         |
| 2   | Click derecho sobre el ícono                                                 | Abre el menú con `Open` y `Exit`                                                     |
| 3   | `Open` del menú                                                              | Restaura la ventana                                                                  |
| 4   | Doble click sobre el ícono                                                   | Restaura (inocuo: se dispara dos veces)                                              |
| 5   | Botón cerrar (X)                                                             | La ventana desaparece de la pantalla **y del taskbar**; el ícono sigue en la bandeja |
| 6   | Con un bloque de foco corriendo: cerrar (X), esperar a que termine el bloque | Suena la alerta de transición y el contador avanza. **El timer no se pausa.**        |
| 7   | Cerrar (X) y después minimizar el reloj del sistema                          | El proceso sigue vivo                                                                |
| 8   | `Exit` del menú                                                              | El proceso termina y el ícono desaparece de la bandeja                               |
