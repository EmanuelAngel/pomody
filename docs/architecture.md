# Arquitectura y Stack Tecnológico: Pomody

> Especificación técnica del stack tecnológico, decisiones de arquitectura y cobertura de requerimientos para el desarrollo de Pomody en Web y Windows.

---

## 1. Resumen Ejecutivo: Stack Seleccionado

| Capa                   | Tecnología Seleccionada                    | Justificación Técnica Clave                                                                             |
| :--------------------- | :----------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| **Runtime Desktop**    | **Tauri v2** (WebView2)                    | Bajo consumo de RAM (<30 MB), instalador ultra liviano (~5–10 MB), cero bloatware.                      |
| **Runtime Web**        | **SvelteKit** (`@sveltejs/adapter-static`) | Generación SPA 100% estática (`ssr = false`), file-based routing nativo, cero dependencias de servidor. |
| **Lenguaje**           | **TypeScript** (Modo estricto)             | Tipado riguroso de contratos de dominio, compartido al 100% entre Web y Desktop.                        |
| **UI & Componentes**   | **shadcn-svelte** (Svelte 5 Runes)         | Componentes accesibles y testeados; acelera prototipado e ideación asistida por IA.                     |
| **Estilos & Diseño**   | **Tailwind CSS v4** + CSS Variables        | Tokens semánticos (`data-theme`) para paletas Rosé Pine (Dark, Dawn y OLED) sin sobrecarga en runtime.  |
| **Núcleo de Dominio**  | **TypeScript Puro (Hexagonal)**            | FSM desacoplada del framework visual; precisión por deltas de tiempo (`Date.now()`) + Web Worker.       |
| **Persistencia Local** | **IndexedDB** (`SessionRepository`)        | Almacenamiento idéntico en Web y WebView2 sin requerir SQLite nativo; interfaz abstracta extensible.    |
| **Testing**            | **Vitest**                                 | Ejecución de tests unitarios de dominio y FSM en milisegundos sin emuladores de navegador.              |
| **Distribución**       | **NSIS + Portable (`.exe`)**               | Binarios portables e instaladores para Windows vía GitHub Actions, más build estático para Web.         |

---

## 2. Matriz de Requerimientos Técnicos por Idea

Mapeo de requerimientos funcionales hacia la arquitectura técnica y sus respectivos puertos de desacoplamiento:

| Idea / Feature                        | Versión | Requerimientos Técnicos                                                                                     | Puerto / Abstracción (Hexagonal)                            |
| :------------------------------------ | :------ | :---------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------- |
| **Núcleo FSM del Timer**              | `v0.1`  | Estados deterministas, protección contra background-throttling, eventos de dominio en memoria.              | `TimerEngine` (Dominio puro en `src/lib/domain/`)           |
| **Alertas Sonoras**                   | `v0.1`  | Reproducción de audio en transiciones; desbloqueo de `AudioContext` tras interacción inicial del usuario.   | `IAudioNotifier` (Web Audio API nativa)                     |
| **Pantalla Zen & Rosé Pine**          | `v0.1`  | Vista reactiva a la FSM, Drawer desacoplado, shell con tabs superiores y cambio dinámico de tema.           | Contenedor Svelte + Tokens CSS (`data-theme`)               |
| **Mini To-Do Integrado**              | `v0.2`  | Operaciones CRUD locales, modelo inmutable por eventos, validación de esquemas.                             | `ITaskRepository` (IndexedDB / Web Storage)                 |
| **Pausas Guiadas & Presupuesto**      | `v0.2`  | Selección pseudoaleatoria ponderada de actividades y proyección matemática de horarios.                     | `BreakService` y `ProjectionEngine` (Funciones puras)       |
| **Detector de Dispersión Ligero**     | `v0.2`  | Sondeo en segundo plano (cada 2–3s) de proceso y título de ventana activa en Windows; lista blanca local.   | `IDistractionMonitor` (`Win32ActiveWindowMonitor` / `Noop`) |
| **Persistencia Histórica & Métricas** | `v0.2`  | Registro histórico de bloques; gráficos de barras semanales renderizados con CSS/SVG nativo (sin Chart.js). | `ISessionRepository` (IndexedDB / Web Storage)              |
| **Modo Compacto (Always on Top)**     | `v0.3`  | Redimensionamiento a ~220x80px y fijación al frente en el gestor de ventanas del SO.                        | `IWindowService` (Tauri Window API / `NoopWindowService`)   |
| **Discord RPC & Modo No Molestar**    | `v0.3`  | IPC vía named pipes (`\\.\pipe\discord-ipc-0`) y llamada a APIs de Quiet Hours de Windows.                  | `IPresenceProvider` e `IFocusShieldProvider` (Rust / Noop)  |

---

## 3. Evaluación de Alternativas

```text
                     ┌───────────────────┐
                     │ Opciones de Stack │
                     └─────────┬─────────┘
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   [ Alternativa 1 ]    [ Alternativa 2 ]    [ Alternativa 3 ]
   Tauri 2 + SvelteKit   Electron + React     PWA Web-First Pura
   ✅ <30 MB RAM         ❌ 120-180 MB RAM    ✅ <30 MB RAM
   ✅ Binario ~8 MB      ❌ Binario ~85 MB    ✅ 0 MB instalación
   ✅ Soporta Win32      ✅ Soporta Win32     ❌ Bloqueada por SO
   (SELECCIONADA)        (DESCARTADA)         (DESCARTADA)
```

### Alternativa 1 (Seleccionada): SvelteKit (SPA) + Tauri v2 + Tailwind v4 / shadcn-svelte

- **Cobertura funcional:** 100%. Genera una SPA estática para Web y empaqueta para Windows con WebView2, canalizando llamadas nativas (Win32, named pipes) mediante comandos puntuales en Rust.
- **Curva de aprendizaje:** Balance perfecto. Vortex capitaliza su experiencia en TypeScript y SvelteKit; Fede aprovecha componentes estándar de shadcn-svelte para iterar UI asistido por IA. La curva de Rust se difiere a v0.2/v0.3 y se aísla en puertos específicos.
- **Build y distribución:** Trivial para Web (`adapter-static`) y automatizado para Windows vía Tauri Action (instaladores NSIS y portables livianos).

### Alternativa 2 (Descartada): Electron + React + Tailwind + SQLite

- **Cobertura funcional:** 100% mediante librerías de Node.js.
- **Razón de descarte:** **Consumo excesivo de memoria (120–180 MB) y peso de binario (+80 MB)**. Introducir Chromium y Node.js completos para un temporizador Pomodoro contradice frontalmente la premisa fundacional de Pomody ("cero bloatware y bajo consumo").

### Alternativa 3 (Descartada): PWA Web-First Pura (sin wrapper nativo)

- **Cobertura funcional:** Parcial (~60%). Viable para v0.1, pero técnicamente inviable para v0.2 y v0.3.
- **Razón de descarte:** El sandbox de seguridad del navegador **impide acceder a títulos de otras ventanas del SO, conectarse a named pipes locales de Discord y activar banderas de Always-on-Top**. Postergar el wrapper nativo generaría refactorizaciones costosas.

---

## 4. Decisiones de Arquitectura Clave

### 4.1. Desacoplamiento Hexagonal del Dominio

La lógica de temporización, la máquina de estados finita (FSM) y los eventos de dominio residen en TypeScript puro (`src/lib/domain/`), sin referencias a Svelte, Tauri o APIs del navegador:

- **Testabilidad aislada:** Se ejecutan tests unitarios al 100% con Vitest en cuestión de milisegundos.
- **Adaptadores de presentación:** Svelte consume el dominio mediante adaptadores reactivos (Runes/Stores) que escuchan los eventos emitidos.

### 4.2. Precisión Temporal y Protección contra Throttling en Background

Los navegadores y webviews reducen drásticamente la frecuencia de ejecución de `setInterval` (hasta 1 ejecución por minuto) al minimizar la ventana o cambiar de pestaña:

- **Cálculo por delta de timestamps:** El temporizador no resta unidades segundo a segundo, sino que calcula:
  $$\Delta t = \text{targetEndTime} - \text{Date.now()}$$
- **Soporte de Web Worker:** Un Web Worker mínimo maneja los ticks de temporización en segundo plano para que las transiciones sonoras y el despacho de eventos ocurran con precisión en el segundo exacto.

### 4.3. Persistencia Unificada mediante el Patrón Repositorio

Para evitar mantener bases de datos disjuntas entre Web y Escritorio:

- **Motor unificado:** Se emplea **IndexedDB** (vía Dexie.js o `idb`) tanto en navegadores modernos como en el WebView2 de Tauri.
- **Aislamiento por Repositorio:** El dominio interactúa exclusivamente a través de interfaces (`ISessionRepository`, `ITaskRepository`), permitiendo en el futuro conectar un backend remoto o sincronización en la nube sin alterar la lógica de negocio ni la UI.

### 4.4. Sistema de Diseño Rosé Pine con Tokens Semánticos

Para dar soporte a los tres modos requeridos (Dark, Dawn y OLED High-Contrast) sin duplicar clases de estilos:

- **Tokens CSS centralizados:** Variables CSS (`--bg-surface`, `--text-primary`, `--accent-rose`, etc.) mapeadas bajo el atributo `data-theme`.
- **Utilidades Tailwind v4:** La UI utiliza clases utilitarias referenciando los tokens semánticos definidos con la directiva `@theme`.

---

## 5. Riesgos Identificados y Mitigaciones

| Riesgo Técnico                         | Impacto | Estrategia de Mitigación                                                                                                                                                               |
| :------------------------------------- | :------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Curva de Rust en v0.2/v0.3**         | Medio   | Aislar llamadas nativas tras interfaces TS (`IDistractionMonitor`). En desarrollo diario se utilizan adaptadores Noop; Rust solo se compila para probar integración nativa en Windows. |
| **Políticas de Autoplay en Audio Web** | Medio   | Los navegadores bloquean audio no iniciado por el usuario. El clic en "Iniciar Bloque" inicializa el `AudioContext` de la Web Audio API, habilitando alertas sin fricción.             |
| **Fricción en Testing para Fede**      | Bajo    | Generación automatizada de ejecutables portables (`.exe`) en GitHub Actions tras cada PR, permitiendo pruebas manuales inmediatas sin requerir entorno de desarrollo local.            |

---

## 6. Próximos Pasos (Arranque de v0.1)

- [ ] Inicializar proyecto SvelteKit en modo SPA con `@sveltejs/adapter-static` y TypeScript estricto.
- [ ] Configurar Tailwind CSS v4 y componentes base con `pnpm dlx shadcn-svelte@latest init`.
- [ ] Incorporar variables CSS para los 3 temas Rosé Pine (`dark`, `dawn`, `oled`).
- [ ] Modelar la FSM pura en `src/lib/domain/timer/` con cobertura de pruebas en Vitest.
- [ ] Configurar el contenedor Tauri v2 apuntando al directorio estático (`build/`).
