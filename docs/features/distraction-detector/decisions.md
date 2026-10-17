# Detector de Dispersión Ligero — Decisiones de Diseño

> Registro de las decisiones del detector: las tomadas **antes** de escribir la primera línea, y las que se cerraron **durante** la implementación (§3.1), marcadas como tales.
> Este documento explica **por qué** cada cosa es como es, y qué se descartó en el camino.
>
> Milestone 5, P3 del [`roadmap.md`](../../roadmap.md). El **qué** está en [`spec.md`](./spec.md). Precedentes documentales: [`tray/decisions.md`](../tray/decisions.md) y [`mini-player/decisions.md`](../mini-player/decisions.md).
>
> Origen del ítem: propuesta 1 de [`proposals/fede-ideas.md`](../../proposals/fede-ideas.md) §1.

---

## 1. Objetivo

Una sola cosa: **devolverte al foco cuando vos ya declaraste que algo te saca**, sin que la app opine sobre qué es una distracción.

No es un analizador de productividad. No es telemetría. No es un espía de títulos de ventana. Todo lo que no sirva a ese objetivo quedó explícitamente afuera (§2).

---

## 2. Alcance

**Incluye**: puerto puro + adaptador nativo Windows + adaptador Noop para Web, reglas declaradas por el usuario, dos listas de silencio, notificación del SO con tres acciones, y una vista para administrar reglas.

**Excluye, a propósito**:

- Web funcional del detector (sólo arriba `NoopDistractionMonitor` y la UI se oculta por completo).
- Detección en descansos y fuera de un bloque de foco.
- Analítica de distracciones (es territorio del Milestone 6).
- Captura de pantalla, OCR, clasificación por IA (descartado en `fede-ideas.md` §1 y reafirmado acá).
- Pausa/reanudar del timer desde la notificación o desde la bandeja.

---

## 3. Decisiones

| Decisión                        | Valor                                                                                                       | Por qué                                                                                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Naturaleza de la feature        | **Interruptor por declaración**, no inferencia                                                              | Una app offline-first sin telemetría no puede medir su propia tasa de falsos positivos. Si juzga y se equivoca, no te enterás nunca.                                                       |
| Semilla de procesos por defecto | **Ninguna** (se retractó la idea inicial de defaults pre-marcados)                                          | Cualquier lista pre-cargada reintroduce la inferencia por la puerta de atrás. El usuario marca lo que le interesa, y sólo eso.                                                             |
| Unidad de matcheo               | **Ejecutable obligatorio + patrón de título opcional**, substring case-insensitive, autorado por el usuario | Es la única forma de cubrir el navegador sin adivinar: los sumideros de tiempo viven en pestañas, y ahí el ejecutable es siempre `chrome`.                                                 |
| Declaración de reglas           | **Picker de ventanas abiertas** (`EnumWindows`) + campos manuales como escape                               | Escribir el ejecutable a mano es incómodo; y el picker no puede ver ventanas sin título ni procesos elevados, así que el escape manual es obligatorio.                                     |
| Qué se persiste                 | **Reglas, nunca observaciones**                                                                             | Los títulos de ventana son efímeros: se muestran en el picker y en el aviso, y se descartan. Nunca hay historial de lo que el usuario miró.                                                |
| Momento de armado               | **Sólo con un bloque de foco en `Running`**                                                                 | Los descansos son del usuario y ya los cubre Revitalización con una _sugerencia_, que es un instrumento mejor que un aviso. Fuera del foco, nadie debería estar mirando ventanas.          |
| Jerarquía del aviso             | **Tres acciones explícitas, sin default**: "Gracias" / "Hoy no" / "Nunca"                                   | Con etiquetas explícitas desaparece la ambigüedad, y desaparece el riesgo de que un default cómodo recree la fricción diaria.                                                              |
| Cadencia                        | **Sin tope por bloque + intervalo parametrizable** (default: 5 min por regla)                               | El tope le quita la presión justo al que la necesita: 3 avisos y después 40 minutos de silencio. La presión _es_ la feature; las válvulas son los otros dos botones.                       |
| Guarda de inactividad           | **Sí**, default 300 s, parametrizable                                                                       | Sin ella, una silla vacía con la ventana declarada en primer plano recibe una avalancha. El umbral es generoso a propósito: leer no genera input, y leer es la dispersión que perseguimos. |
| Canal del aviso                 | **Notificación del SO con las tres acciones**, degradable a faro                                            | Es el único canal que llega donde el usuario está. Y el diálogo _es_ el toast: no existe un estado "pendiente de clasificar".                                                              |
| Superficie in-app               | **Ninguna**                                                                                                 | Si Pomody tiene el foco, la ventana observada es Pomody, que no puede ser una regla. Nunca hay un aviso que dibujar adentro; no hace falta ni layout compacto ni banderín.                 |
| Homes de la UI                  | **Switch en el drawer de Settings** (apagado por defecto) + **lista de reglas en el tercer tab**            | Replica el precedente del catálogo de descansos: el booleano global en Settings, el CRUD en la vista. El drawer ya tiene cuatro secciones.                                                 |
| Nombre del tercer tab           | **"Distracciones"**, con identidad propia                                                                   | Habilitar la pestaña "Métricas" con contenido ajeno le roba identidad al Milestone 6, que tiene su propio ítem de desbloqueo.                                                              |
| Silencio "Hoy no"               | Silencia **esa regla** hasta el cambio de día local, con purga perezosa                                     | Silenciar la ventana puntual crea un estado invisible: la regla sigue disparando en el resto de la app y el usuario no puede predecirlo.                                                   |
| Silencio "Nunca"                | Da de baja la regla del catálogo — ver §3.1                                                                 | Es el gesto frecuente y el que libera de fricción para siempre. Un silencio sólo-por-día obliga a re-clasificar la misma app cada día, y así es como una feature se apaga.                 |
| Dónde corre el sondeo           | **Son-`invoke` desde el frontend**; un comando, sin hilo ni eventos Rust→frontend                           | Es el mínimo nativo posible y todo el juicio queda en TypeScript puro, testeable en Node. Rust hace dos cosas auditables de un vistazo.                                                    |
| Agregar `windows-sys`           | **Sí, medida antes con `cargo add`** sobre copia desechable                                                 | El lock es la única defensa contra una re-resolución que mueve la familia Tauri en silencio, y el build de desktop sólo se verifica en CI.                                                 |

---

### 3.1. Decisiones cerradas durante la implementación

Dos huecos que el diseño dejó abiertos y que la implementación del slice 5.2 hizo visibles. Se cierran acá para que el contrato y el código no diverjan.

| Decisión                     | Valor                                                                      | Por qué                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Levantar un silencio puntual | **Sí: el puerto gana `unsilence(ruleId, dateKey)`**                        | El §6.4 del spec promete la acción y el §3.2 no la tenía: sin ella, un click equivocado en "Hoy no" deja esa regla muda hasta la medianoche, sin vuelta atrás. El contrato se completa en el slice que la necesita (§5.4), que es donde nace el botón. Liberar reescribiendo la lista (`clearAll` + re-`silence`) funciona con las primitivas actuales, pero **no es atómico**: entre el `clearAll` y las re-escrituras la lista queda vacía, y el sondeo puede disparar el aviso de una regla que se acaba de silenciar. |
| Silencio "Nunca"             | **Da de baja la regla del catálogo (`IDistractionRuleRepository.delete`)** | El §7 del spec define sólo tres claves y ninguna es permanente: la whitelist existente es **por día** y se purga sola al cambiar la fecha, así que "permanente" no tiene dónde vivir sin inventar una cuarta clave o un flag nuevo en la entidad. Dejar de existir es lo que la vuelve permanentemente silenciada. Consecuencia aceptada a propósito: tras "Nunca" la regla desaparece de la vista, porque la lista de reglas es la única fuente de verdad de lo que puede disparar.                                      |

## 4. Alternativas descartadas

| Alternativa                                                                             | Por qué se descartó                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Semilla de procesos pre-marcada** (idea original del usuario, retractada)             | Es inferencia con otro nombre. Con whitelist temporal habría sido una fábrica de falsos positivos; el usuario prefirió no conceder el punto.                                                                                                                                                                                    |
| **Detección heurística / inferida** (lista de apps "distractivas" que traemos nosotros) | No se puede medir la tasa de falsos positivos sin telemetría. Misma clase de error que hizo descartar el OCR, sólo más barata.                                                                                                                                                                                                  |
| **Captura de pantalla / OCR / IA**                                                      | Tres riesgos críticos ya documentados en `fede-ideas.md` §1: permisos que marcan la app como spyware, drenaje de recursos, y falsos positivos inaceptables (un dev leyendo documentación penalizado).                                                                                                                           |
| **Diálogo modal invasivo que no te deja hacer nada** (idea original del usuario)        | Windows impide robar el foco de forma confiable: `SetForegroundWindow` sólo funciona con derechos de primer plano y si no, degrada a un destello en la barra de tareas. Además exigiría una ventana secundaria — ya rechazadas por escrito en `fede-ideas.md` §5 — y un Pomodoro que secuestra la pantalla _es_ la distracción. |
| **Whitelist por sesión** (texto original del roadmap)                                   | Obliga a re-clasificar la misma app en cada sesión. La fricción acumulada es la manera más predecible de que el usuario apague la feature para siempre. Se enmienda en el roadmap.                                                                                                                                              |
| **Banderín / diálogo in-app al volver**                                                 | El aviso llega cuando el usuario ya volvió, que es cuando menos sirve. Y Pomody nunca es la ventana observada, así que ese caso no existe.                                                                                                                                                                                      |
| **Segundo toast con acciones + diálogo in-app de respaldo**                             | Dos superficies para la misma decisión. El toast con acciones _es_ el diálogo, y su degradación ya está cubierta por la vista.                                                                                                                                                                                                  |
| **Ventana secundaria always-on-top**                                                    | Sincronización IPC entre ventanas, acoplamiento de ciclo de vida (si el proceso muere, sus ventanas mueren). Descartado en `fede-ideas.md` §5.                                                                                                                                                                                  |
| **Marcar distracciones desde el menú de la bandeja**                                    | El menú vive en Rust y las reglas viven en TypeScript: sería plumbing bidireccional para ahorrar un clic, exactamente lo que el tray rechazó en `tray/decisions.md` §4.                                                                                                                                                         |
| **Loop en Rust con eventos hacia el frontend**                                          | Inmune al estrangulamiento del webview, pero crea el primer canal Rust→frontend del repo y un hilo propio. Se deja como escape documentado si la medición muestra que el sondeo se estrangula demasiado.                                                                                                                        |
| **Sección nueva en el drawer de Settings**                                              | El usuario lo detectó primero: el drawer ya tiene cuatro secciones, y una lista con alta/baja no es un ajuste, es un catálogo.                                                                                                                                                                                                  |
| **Refactorizar el drawer a diálogo con tabs**                                           | Es un refactor de una superficie que ya funciona y ya tiene tests, y no aporta nada a esta feature. Queda con disparador explícito (§6).                                                                                                                                                                                        |
| **Habilitar la pestaña "Métricas" con una tab interna "Detector"**                      | Un tab que dice una cosa y contiene otra. El desbloqueo de "Métricas" es un ítem del Milestone 6 y quedaría ambiguo.                                                                                                                                                                                                            |
| **Segmento dentro de la vista Planning** (como el catálogo de descansos)                | Reusa el patrón correcto en el lugar semánticamente equivocado: la lista de distracciones no tiene nada que ver con planificar la jornada.                                                                                                                                                                                      |
| **Tope de N avisos por bloque**                                                         | Convierte el peor caso en una decisión, sí, pero le quita la presión al que realmente se distrae. La guarda de inactividad resuelve el caso patológico sin ese costo.                                                                                                                                                           |

---

## 5. Riesgos y verificaciones pendientes

Ninguna de estas se puede resolver con Vitest. Todas van a la tabla del §13 del [`spec.md`](./spec.md).

| Riesgo                                              | Por qué importa                                                                                                                                                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`Cargo.lock`**                                    | `tauri-plugin-notification` y `windows-sys` tocan la zona protegida por la regla 8. Se mide con `cargo add` sobre copia desechable, antes de escribir código.                                              |
| **Renderizado de los botones del toast en Windows** | La tabla de cobertura del propio plugin lista _Action types_ como no cubierto. Si no se renderizan, la degradación está documentada pero se pierde la clasificación en el momento.                         |
| **AppUserModelID en el build portable**             | El plugin setea el `AppUserModelID` sólo cuando la app no corre desde `target/debug` ni `target/release`. El portable `.exe` es un entregable del proyecto.                                                |
| **Estrangulamiento del webview oculto**             | Con la ventana minimizada u oculta en la bandeja, el navegador puede bajar los timers a ~1/min. Es un supuesto declarado, no un hecho: se mide, y si falla se migra al loop en Rust sin cambiar el puerto. |
| **Procesos elevados**                               | Si la app observada corre como administrador y Pomody no, el nombre del ejecutable puede no ser legible. Se omite del picker.                                                                              |
| **Datos en el Centro de actividades**               | Cada aviso deja una entrada. Con la guarda de inactividad y la cadencia por defecto el peor caso queda acotado, pero conviene mirarlo en dogfooding.                                                       |

---

## 6. Deuda registrada

Registrada a propósito, no olvidada.

| Deuda                                                                  | Por qué no se hizo ahora y cuál es el disparador                                                                                                                                       |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Revisión de ventanas al final del bloque** (descubrir sin acordarse) | Agregaría una pantalla más y una fase de calibración antes de saber si el disparo funciona. Disparador: después del primer dogfooding real.                                            |
| **Etiquetas del toast en el idioma del usuario**                       | Depende de si el plugin expone el registro de tipos de acción desde JS. Disparador: verificarlo en el slice 5; si existe, pasan a Paraglide y esta deuda se borra.                     |
| **Intervalo configurable por regla desde la UI**                       | Es un parámetro puro (`DEFAULT_NOTIFY_POLICY`), no una arquitectura. Hoy el default alcanza. Disparador: pedido concreto de dogfooding.                                                |
| **Contadores de dispersión para el Milestone 6**                       | Es analítica y le corresponde a M6. El diseño no lo impide: la evaluación de cadencia ya vive en el dominio y se puede emitir un evento después.                                       |
| **Refactor del drawer a diálogo con tabs**                             | Refactor de una superficie sana. Disparador: que el drawer pase de cinco secciones o que alguna necesite sub-tabs.                                                                     |
| **Navegadores con títulos renombrados o modos app**                    | Chrome 91+ permite renombrar la ventana, y los modos PWA cambian el formato del título. Los patrones son editables, así que tiene arreglo manual. Disparador: fricción real reportada. |

---

## 7. Notas de proceso

- El diseño salió de una sesión de interrogatorio estructurado (grilling) sobre el ítem del roadmap, antes de escribir código. Varias decisiones revierten el texto original del roadmap y la enmienda va en el mismo PR que esta documentación.
- Se sigue el flujo **spec-first** de [`development-workflow.md`](../../development-workflow.md) §3.B: primero el puerto y el contrato (slice 5.1), después los adaptadores.
- El corte en cinco work units (§11 del spec) busca que el slice que toca `Cargo.lock` y el que exige verificación manual queden aislados y sean revisables solos.
