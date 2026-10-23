# desktop-auto-update — Actualización automática de la app de escritorio

Objetivo: que la app de Windows (Tauri v2) detecte, descargue e instale versiones nuevas sin que el usuario pase por la página del release, el instalador y su wizard.
Rama: `feat/desktop-auto-update` (worktree `../pomody-worktrees/auto-update`). Estrategia de entrega: PR sobre `main` en slices de ~400 líneas. Runner: `pnpm vitest run <file>` (server) y `pnpm vitest run <file> --project client` (browser). Rust: solo CI verifica el build (regla 9).

## Specs

S1 — La actualización deja de requerir el recorrido manual. Pedido original: «Yo y mis usuarios de Pomody nos estamos empezando a cansar de actualizar la app llendo al release de github, luego al instalador, el wizard de instalación, etc...»
S2 — Camino elegido: `tauri-plugin-updater` con `latest.json` servido desde GitHub Releases (`https://github.com/EmanuelAngel/pomody/releases/latest/download/latest.json`). Se descartan botón que solo abre el release, Microsoft Store (MSIX), Velopack/Squirrel y servidor propio.
S3 — La app instala solo cuando el usuario toca «Actualizar», y nunca durante una sesión de foco activa. Chequea en segundo plano y avisa sin interrumpir. «Sesión activa» = el timer está en `running` o `paused` (cubre foco y pausas); en `idle` o `completed` se puede instalar.
S4 — Se chequea al abrir la app y además cada 6 horas (la app vive en la bandeja y puede quedar abierta días).
S5 — Aviso: indicador discreto en el header; el detalle (versión, notas, botón «Actualizar») vive en Settings.
S6 — El detalle muestra las notas del release (el body que genera release-please, campo `notes` de `latest.json`).
S7 — CI: `tauri-apps/tauri-action` reemplaza `pnpm tauri:build` + `softprops/action-gh-release` en `desktop-ci.yml`; genera y sube `latest.json` y los `.sig` al release que crea release-please. Las corridas sin `release_tag` (PR, `workflow_dispatch`) siguen construyendo sin publicar y sin necesitar la clave privada.
S8 — Firma: la clave privada vive como secret de Actions `TAURI_SIGNING_PRIVATE_KEY` (+ `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` si lleva password), con respaldo del dueño en su gestor de contraseñas; la pública va en `tauri.conf.json` (`plugins.updater.pubkey`). La clave perdida impide publicar updates a instalaciones existentes.
S9 — En la build web (SPA) el updater es un no-op sin UI: el indicador y la sección de Settings no se renderizan.
S10 — Fuera de alcance: winget/Scoop y firma Authenticode (SmartScreen). Authenticode depende de definir antes una licencia OSI; no hay `LICENSE` en la raíz y `Cargo.toml` tiene `license = ""`. Se evalúan como issues aparte.
S11 — Rust/dependencias: `tauri-plugin-updater = "=2.14.0"`, pineado exacto con comentario (mismo criterio que `single-instance`). Medido en copia descartable: 47 paquetes nuevos y cero entradas existentes del `Cargo.lock` modificadas; la familia Tauri queda byte-idéntica. Prohibido `cargo update` (regla 8). Nada de `@tauri-apps/plugin-process`: en Windows el instalador cierra y relanza la app.
S12 — `bundle.createUpdaterArtifacts: true` y `plugins.updater.windows.installMode: "passive"` (ventana mínima con progreso, sin UAC gracias a `currentUser`). Permiso `updater:default` en `capabilities/default.json`.
S13 — Convenciones: el updater se aísla tras un puerto en `domain/ports` (cero Tauri en el dominio) con adapter Tauri y adapter no-op; import dinámico del plugin como `tauri-window-shell.ts`; sin barrel files; UI con shadcn-svelte; copy en ES y EN (`messages/`); tests sin dobles locales de `Storage`.
S14 — Bootstrap: quienes tengan una versión sin updater (≤ la última publicada antes de este cambio) necesitan **una última** instalación manual de la primera versión con updater. Debe quedar documentado, junto con el procedimiento de generación y respaldo de las claves.
S15 — `pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:browser` y `pnpm test:e2e` pasan.

## Tasks

- [x] T1 — S3 S13 — inline — Puerto `IUpdateChecker` + tipos (`UpdateInfo`) y `NoopUpdateChecker` — commit: T1_SHA
- [ ] T2 — S2 S11 S13 — inline — `@tauri-apps/plugin-updater` (pnpm, pin `~` familia) + `TauriUpdateChecker` con cliente inyectable — commit: pendiente
- [ ] T3 — S3 S4 S9 — inline — `UpdateState` (`state/update.svelte.ts`): estados, chequeo al abrir + cada 6 h, `canInstall` bloqueado con timer `running`/`paused`; cableado en `AppBootstrap`/layout — commit: pendiente
- [ ] T4 — S5 S6 S9 S13 — inline — UI: indicador en header + sección de actualización en Settings (shadcn-svelte), i18n ES/EN, tests de componente — commit: pendiente
- [ ] T5 — S8 S11 S12 — inline — Rust y config: `tauri-plugin-updater =2.14.0`, registro en `lib.rs`, `tauri.conf.json` (pubkey, endpoint, `createUpdaterArtifacts`, `installMode`), capability, `Cargo.lock` mínimo — commit: pendiente — Risk: item 2 (confianza del updater, firma) → commit propio — BLOQUEADO: requiere la clave pública real (acción del dueño)
- [ ] T6 — S7 S8 — inline — CI: `tauri-action` en `desktop-ci.yml`, secrets, `latest.json`, build sin publicar en PR — commit: pendiente — Risk: item 5 (release/CI) → commit propio
- [ ] T7 — S14 S10 — inline — Docs: `docs/features/auto-update/decisions.md`, procedimiento de claves, nota de bootstrap, roadmap — commit: pendiente
- [ ] T8 — S15 — inline — Verificación final: `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, diferencial de comportamiento previo — commit: n/a

## Log

L1 — (2026-10-23) Pedido original, verbatim: «Yo y mis usuarios de Pomody nos estamos empezando a cansar de actualizar la app llendo al release de github, luego al instalador, el wizard de instalación, etc... Investiga qué opciones tenemos para solventar esto.»
L2 — (2026-10-23) Sesión de grilling: el usuario confirmó opción A (updater integrado + `latest.json` en GitHub Releases), instalación solo por acción del usuario y nunca durante una sesión de foco activa, clave privada como secret con respaldo propio, indicador en header + detalle en Settings, chequeo al abrir + cada 6 horas, `tauri-action` oficial y notas del release en el aviso.
L3 — (2026-10-23) Sobre Authenticode/SmartScreen el usuario preguntó «¿Qué es eso de authenticode? ¿Es eso que te avisa windows que puede ser una instalación peligrosa?» y luego «Explicame cómo es y vemos si lo incluímos o no». Tras la explicación eligió «Solo el updater». winget/Scoop y Authenticode quedan fuera.
L4 — (2026-10-23) Orden de arranque: «Sí, arrancá con ODD y en un worktree.»
