# Especificación Técnica: Avisos de Fin de Bloque (#138)

> Documento de diseño técnico, contratos de arquitectura hexagonal y especificación de interfaz para los avisos de fin de bloque de Pomody.
>
> El **por qué** de cada decisión está en [`decisions.md`](./decisions.md). Este documento define **qué** se construye y **cómo** se integra.
>
> Origen: issue [#138](https://github.com/EmanuelAngel/pomody/issues/138).

---

## 1. Problema

Al terminar un bloque, Pomody solo reproduce una campanada (`WebAudioNotifier`). Si el usuario está en otra ventana —el caso normal de un Pomodoro— el cambio de fase es invisible: la campanada avisa, pero no dice **qué** terminó ni **qué** sigue, y no queda registro en pantalla cuando vuelve.

## 2. Alcance

**Incluye**:

- Aviso del sistema operativo en desktop cuando un bloque termina y la ventana de Pomody no está a la vista.
- Aviso in-app (toast) que sobrevive a la vuelta del usuario, en web y desktop.
- Un switch propio en la pestaña Behavior, independiente del sonido.
- El flujo de permiso del SO y su degradación explícita.

**Excluye, a propósito**:

- Botones de acción en el aviso del SO («Iniciar descanso», «Saltar»): en Windows los botones pueden no renderizarse (`distraction-detector/decisions.md` §5.2), y el toast no los ofrece por decisión de producto.
- La Notification API del navegador: la web no pide permiso de notificaciones.
- Avisos de `skip` o `reset`: el usuario ya está ahí eligiendo la fase siguiente.
- Cambios en el timer, el FSM o la persistencia de ejecución: el evento `block-completed` ya existía.

## 3. Regla de disparo

| Condición                            | Avisa |
| ------------------------------------ | ----- |
| `block-completed` natural            | Sí    |
| `block-skipped`                      | No    |
| `reset()` / `start()` / `pause()`    | No    |
| Switch apagado                       | No    |
| Ventana enfocada y visible           | No    |
| Ventana oculta, minimizada o tapada  | Sí    |
| Ventana siempre-arriba (Mini-Player) | No    |

El predicado de «no está mirando» es `document.visibilityState === 'hidden' || !document.hasFocus()`, con la excepción `windowState.isAlwaysOnTop`: el Mini-Player flota siempre visible, así que el cambio de fase ya está en pantalla y un aviso sería ruido.

## 4. Canales

| Canal               | Plataforma | Implementación                                                        |
| ------------------- | ---------- | --------------------------------------------------------------------- |
| Notificación del SO | Desktop    | `IBlockNotifier` → `TauriBlockNotifier` (`tauri-plugin-notification`) |
| Toast in-app        | Todas      | `sonner` de shadcn-svelte, montado en `+layout.svelte` (PR 2)         |
| Web sin SO          | Web        | `NoopBlockNotifier`; el toast es el único canal                       |

El aviso del SO lleva título por fase completada y cuerpo con la fase siguiente. Un click sobre el aviso enfoca la ventana (`onAction`, `actionId === 'tap'` → `getCurrentWindow().setFocus()`).

## 5. Ajuste y permiso

- Clave: `blockNotificationsEnabled: boolean` en `pomody:settings`, default `true`.
- Hogar: pestaña **Behavior**, sección «Notifications», junto a Sound Alerts.
- Independiente de `soundEnabled`: el chime y el aviso visual se apagan por separado.
- Al encenderlo, el estado pide el permiso del SO. Si el SO lo niega, el switch vuelve a off y aparece una línea explicativa (`role="status"`); el estado nunca reporta un aviso que no puede entregar.
- El permiso se pide una sola vez por intento del usuario; un aviso perdido nunca rompe el bloque.

## 6. Copy (i18n)

Claves nuevas en `messages/en.json` y `messages/es.json`:

- Switch: `settings_section_notifications`, `settings_section_notifications_description`, `settings_block_notifications`, `settings_block_notifications_description`, `settings_block_notifications_aria`, `settings_block_notifications_permission_denied`.
- Aviso: `block_notice_title_focus`, `block_notice_title_short_break`, `block_notice_title_long_break`, `block_notice_body_short_break`, `block_notice_body_long_break`, `block_notice_body_focus`.

El título nombra lo que terminó; el cuerpo, lo que el timer va a empezar. `calculateNextCycleStep` es la única autoridad sobre la fase siguiente: el aviso no reimplementa el ciclo.

## 7. Arquitectura

```text
src/lib/
├── domain/ports/block-notifier.port.ts          # IBlockNotifier + BlockNotice (puro)
├── adapters/notification/
│   ├── tauri-block-notifier.ts                  # plugin del SO, tap → foco
│   └── noop-block-notifier.ts                   # web
├── state/block-notice.svelte.ts                 # ajuste, permiso, predicado, copy
├── components/settings/panels/behavior-panel.svelte   # switch + línea de permiso
└── testing/fakes/platform/fake-block-notifier.ts
```

- `BlockNoticeState` se suscribe a `timerState.onEvent` y posee su ajuste con `LocalSettingsStorage`, igual que `DistractionState`. `timer.svelte.ts` no gana lógica de notificación.
- Los predicados (`isWindowUnattended`, `isAlwaysOnTop`) se inyectan: los tests de estado corren en Node sin DOM.
- Todos los archivos nuevos en kebab-case.

## 8. Testing

| Capa          | Archivo                                                            | Proyecto Vitest |
| ------------- | ------------------------------------------------------------------ | --------------- |
| Puerto        | `src/lib/domain/ports/block-notifier.port.test.ts`                 | `server`        |
| Adaptador SO  | `src/lib/adapters/notification/tauri-block-notifier.test.ts`       | `server`        |
| Adaptador web | `src/lib/adapters/notification/noop-block-notifier.test.ts`        | `server`        |
| Estado        | `src/lib/state/block-notice.test.ts`                               | `server`        |
| Panel         | `src/lib/components/settings/panels/behavior-panel.svelte.test.ts` | `client`        |
| Ajuste        | `src/lib/adapters/storage/local-settings-storage.test.ts`          | `server`        |

El aviso del SO no se puede verificar en E2E: la cobertura real es el doble del cliente nativo en el adaptador, más el estado que decide si se llama.
