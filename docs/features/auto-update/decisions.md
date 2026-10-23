# Actualización Automática (Desktop) — Decisiones de Implementación

> Registro de las decisiones tomadas **antes** de escribir la primera línea del updater.
> Este documento explica **por qué** cada cosa es como es, qué se descartó, y **cómo se opera** (claves, secrets, primer release).
>
> Documento de tareas: [`odd/tasks/desktop-auto-update.md`](../../../odd/tasks/desktop-auto-update.md). Precedente de estructura: [`tray/decisions.md`](../tray/decisions.md).

---

## 1. Objetivo

Que quien usa Pomody en Windows **no tenga que ir al release de GitHub, bajar el instalador y pasar por el wizard** cada vez que sale una versión. Nada más: no es un gestor de canales, ni de versiones, ni una tienda.

## 2. Alcance

| Capa          | Qué cambia                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------- |
| Dominio       | Puerto `IUpdateChecker` y política pura (`update-policy.ts`). Cero Tauri.                   |
| Adapters      | `TauriUpdateChecker` (import dinámico del plugin) y `NoopUpdateChecker` (web).              |
| Estado        | `update.svelte.ts`: chequeo al abrir y cada 6 h, `canInstall` con guarda de timer.          |
| UI            | Indicador en el header + sección «Actualizaciones» en Settings → Aplicación.                |
| Rust / config | `tauri-plugin-updater`, clave pública, endpoint, permiso `updater:default`.                 |
| CI            | `tauri-action` firma el instalador y sube `latest.json` al release que crea release-please. |

## 3. Decisiones

| Decisión                   | Valor                                                                      | Por qué                                                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mecanismo                  | **`tauri-plugin-updater` + `latest.json` en GitHub Releases**              | Es el camino oficial de Tauri, no suma servidor ni cuenta, y el repo ya publica ahí. Un botón que abre el release seguiría siendo manual.                         |
| Descartados                | **Microsoft Store (MSIX), Velopack/Squirrel, servidor propio**             | Tauri no empaqueta MSIX de forma nativa; los otros viven fuera del ecosistema y suman piezas sin dar nada que el plugin no dé.                                    |
| Cuándo instala             | **Solo cuando el usuario toca «Actualizar»**                               | En Windows el instalador cierra la app. Una instalación silenciosa podría matar un pomodoro en curso, que es peor que el problema original.                       |
| Qué bloquea la instalación | **Timer en `running` o `paused`** (foco y pausas)                          | Un bloque en progreso, esté corriendo o frenado, no se interrumpe. `idle` y `completed` no tienen nada que perder. Vive en `isUpdateInstallBlocked`.              |
| Frecuencia                 | **Al abrir + cada 6 horas**                                                | Pomody queda residente en la bandeja y puede estar abierto días; solo chequear al abrir dejaría sin aviso a quien nunca cierra la app.                            |
| Aviso                      | **Indicador discreto en el header + detalle en Settings**                  | El header avisa sin interrumpir (y se oculta en modo Zen); Settings muestra versión, notas y el botón. El indicador es un atajo a la pestaña Aplicación.          |
| Notas del release          | **Se muestran, como texto plano**                                          | El usuario ve qué cambia antes de actualizar. Es contenido de un feed externo: nunca se parsea ni se inyecta como HTML.                                           |
| Modo de instalación        | **`passive` (ventana mínima con progreso, sin UAC)**                       | Con `installMode: currentUser` no hace falta admin. `quiet` no da feedback y `basicUi` exige interacción.                                                         |
| Web                        | **No-op, sin UI**                                                          | Una pestaña siempre recibe el último build. Ni el indicador ni la sección se renderizan (`isSupported`).                                                          |
| Puerto, no llamada directa | **`IUpdateChecker` en `domain/ports`**                                     | Mismo patrón que `IBlockNotifier`: el dominio no conoce Tauri y los tests usan un fake.                                                                           |
| Dependencia Rust           | **`tauri-plugin-updater = "=2.14.0"`, pin exacto**                         | Escribe en `Cargo.lock`, así que su versión se elige acá (mismo criterio que `single-instance`). Medido: 47 paquetes nuevos y cero entradas existentes cambiadas. |
| Sin `plugin-process`       | **No se agrega `@tauri-apps/plugin-process`**                              | En Windows el instalador cierra y relanza la app; `relaunch` no hace falta.                                                                                       |
| CI                         | **`tauri-action` reemplaza `pnpm tauri:build`**                            | Genera `latest.json` y los `.sig` solo. El `.exe` portable conserva su paso de `softprops` para no cambiar el nombre del asset.                                   |
| Notas en `latest.json`     | **El workflow lee el body del release con `gh release view` y se lo pasa** | `tauri-action` arma `notes` desde su input `releaseBody`, no desde el release existente; sin esto el panel mostraría notas vacías.                                |
| Builds sin release         | **`tauri.build-only.conf.json` apaga `createUpdaterArtifacts`**            | Un PR (o un fork sin secrets) debe poder construir sin la clave privada.                                                                                          |

## 4. Operación: claves y secrets

El updater **rechaza** cualquier instalador cuya firma no coincida con la clave pública de `tauri.conf.json`. Esa firma no se puede desactivar.

| Pieza         | Dónde vive                                                             | Notas                                                                                              |
| ------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Clave pública | `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`                 | Se versiona; se puede compartir.                                                                   |
| Clave privada | Secret de Actions **`TAURI_SIGNING_PRIVATE_KEY`** + respaldo del dueño | Contenido completo del archivo `.key`. **Nunca** al repo. Sin contraseña (decisión de 2026-10-23). |
| Contraseña    | Secret opcional `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`                   | Hoy no se usa; el workflow ya lo lee por si se rota a una clave con contraseña.                    |

> [!WARNING]
> Si se pierde la clave privada **no se pueden publicar updates** a las instalaciones existentes: habría que pedirles una instalación manual con una clave nueva. Guardá un respaldo en el gestor de contraseñas.

Generar un par nuevo (solo en una rotación; la CLI no pisa un archivo existente sin `--force`):

```bash
pnpm tauri signer generate -w ~/.tauri/pomody.key
```

Cargar el secret desde el archivo, sin pasar por el portapapeles ni por el historial de la terminal:

```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/pomody.key
```

## 5. Primer release con updater

Las versiones publicadas **antes** de este cambio no traen el updater, así que no pueden actualizarse solas. Quien las tenga necesita **una última instalación manual** de la primera versión que lo incluya; de ahí en adelante se actualiza desde la app.

Antes de mergear a `main`, confirmar que el secret `TAURI_SIGNING_PRIVATE_KEY` existe en el repo: sin él, el job de release falla en el build (a propósito, para no publicar un instalador sin firma).

## 6. Deuda y límites aceptados

- **La ruta de release no se puede probar antes de un release real.** El PR ejercita el build sin publicar; la subida de `latest.json`, los `.sig` y las `notes` solo corre cuando release-please crea un release. Tras el primero hay que abrir `latest.json` en el release y comprobar `version`, `notes`, `url` y `signature`.
- **Las notas se ven en Markdown crudo.** Se renderizan como texto plano a propósito (seguridad); es legible pero no tiene formato.
- **Authenticode / SmartScreen quedó fuera.** Es una firma distinta de la del updater y depende de definir antes una licencia OSI (no hay `LICENSE` en la raíz). Posible vía gratuita: SignPath Foundation. Candidato a issue aparte.
- **winget / Scoop quedó fuera.** Es un canal extra para quien usa terminal, no reemplaza al updater integrado.
- **El build de Rust solo se verifica en CI** (`desktop-ci.yml`, regla 9 de `AGENTS.md`); acá solo se resolvió `Cargo.lock`.
- **El `Cargo.lock` sube la versión del propio paquete** (`pomody-desktop` 0.13.0 → 0.19.0): release-please bumpea `Cargo.toml` pero no el lock, y cargo lo corrige en cualquier resolución.
