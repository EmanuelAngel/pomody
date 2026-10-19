# Decisiones: Compañía Viva

Registro de las decisiones cerradas durante el grill previo al sign-off del issue #114.

## D1 — Progreso por minutos diarios, no por ciclo

**Contexto.** La propuesta original avanzaba por bloques completados dentro del ciclo.

**Decisión.** El progreso son los minutos de foco acumulados en el día. Da igual cómo se repartan: 4 bloques de 25, 2 de 50 o 1 de 90 valen lo mismo.

**Motivo.** Con 4 rondas por ciclo la última fase nunca se alcanzaba, y un bloque de 90 minutos daba la misma recompensa que uno de 25. Además, perder el progreso al reiniciar el ciclo resultaba frustrante.

## D2 — 15 pasos de 25 minutos

**Decisión.** `step = min(15, floor(minutos / 25))`, `phase = min(fases - 1, floor(step * fases / 15))`.

**Motivo.** 15 pasos cubren ~6 h, el techo razonable de foco diario. El clamp es obligatorio por el off-by-one del paso 15. Las fases deben dividir 15 para que todas duren lo mismo.

## D3 — Reset perezoso, no scheduler

**Decisión.** La ilustración se resetea cuando se resetean las stats: al cargar o al completar el próximo bloque.

**Motivo.** No agrega dependencia de reloj ni un scheduler nuevo, y nunca se desincroniza del contador diario. Coste aceptado: una app abierta toda la noche muestra la escena de ayer hasta el próximo bloque.

## D4 — Fondo de pantalla, no planta junto al timer

**Decisión.** La escena ocupa la pestaña Timer como una capa de fondo fija, visible solo en `md` o superior.

**Motivo.** Da libertad compositiva y evita competir por espacio con los dígitos. La planta junto al timer ataba el arte a un layout rígido.

## D5 — Solo en la pestaña Timer

**Decisión.** La capa se monta únicamente cuando la pestaña activa es Timer.

**Motivo.** En tareas y distracciones el contenido necesita foco y contraste. Además, el Mini-Player reemplaza el shell completo, así que queda excluido por construcción.

## D6 — Minimalismo pixel art de 3 acentos

**Decisión.** Escenas de 320 × 180 con tres tokens de acento por ilustración; el `--bg-base` del tema hace de cielo.

**Motivo.** Menos arte por fase, contraste controlado en Dark/Dawn/OLED y una lectura tranquila. El sistema queda abierto a nuevas ilustraciones.

## D7 — Escala entera con ResizeObserver

**Decisión.** El lienzo se dibuja en múltiplos enteros del espacio disponible, medidos con `ResizeObserver`.

**Motivo.** Una escala fraccionaria rompe la grilla del pixel art. El observer solo corre al redimensionar: no es un bucle por frame.

## D8 — Catálogo partido y test parametrizado

**Decisión.** La metadata (`id`, `labelKey`, `phaseCount`) vive en el dominio; los renderers en componentes. Un único test parametrizado itera el catálogo.

**Motivo.** Agregar una ilustración cuesta una entrada y un renderer, sin tests nuevos. El requisito no depende de la disciplina de quien agregue la próxima.

## D9 — Movimiento intra-bloque sin progreso

**Decisión.** El motor admite movimiento ambiental mientras corre el foco, con CSS puro y un booleano `shouldAnimate`. La fase solo cambia al completar un bloque.

**Motivo.** Mantiene la escena viva sin atar la animación al reloj ni sugerir progreso continuo. En pausa y en descansos no corre ninguna animación.

## D10 — Tres preferencias explícitas

**Decisión.** `enabled` (apagada por defecto), `motionEnabled` (dejar estática) y `hideWhileFocusing` (ocultar en Zen).

**Motivo.** El DoD original pedía un switch para dejar la ilustración estática; se conserva como preferencia propia, independiente del `prefers-reduced-motion` del sistema. "Zen" se interpreta como el bloque de foco corriendo, que es el único estado de concentración que ya existe.

## D11 — Sin franja de entorno

**Decisión.** La franja de 4 etapas queda fuera del alcance.

**Motivo.** Repite la información de los indicadores de ronda, funciona como métrica y compite visualmente con el arco del timer.

## D12 — Entrega encadenada

**Decisión.** Cuatro commits/PRs revisables sobre la rama de feature y un PR final a `main`.

**Motivo.** El forecast supera las 400 líneas autoradas y el propio informe técnico pide PRs chicos.
