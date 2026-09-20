# Propuestas de Features — Ideas de Vortex

> Especificación de funcionalidades orientadas a la reducción de fricción, planificación previa y blindaje de la concentración planteadas por Vortex (Tech Lead).

---

## 1. Mini To-Do con Asignación por Bloque de Focus

### 💡 Propuesta Funcional
* **Descripción:** Mini gestor de tareas integrado para crear y marcar tareas básicas, permitiendo asignar uno o más objetivos concretos a cada bloque de focus antes de arrancar (solo una tarea activa a la vez, pero pudiendo completar varias en un solo bloque).
* **Justificación (Qué valor aporta):** Elimina la fatiga de decisión y la dispersión en las transiciones entre bloques. Al iniciar el temporizador, la aplicación muestra directamente el objetivo asignado sin tener que consultar listas o notas externas.
* **¿Depende de otra funcionalidad?:** App Base (v0.1).
* **Complejidad estimada:** Baja.

### 🏛️ Resolución Técnica y Arquitectura
* **Modelo de datos:** Entidad simple e inmutable por eventos: `{ id: string, title: string, completed: boolean, sessionId?: string, createdAt: timestamp }`. Se evita deliberadamente convertir Pomody en un gestor complejo estilo Jira o Trello.
* **Persistencia:** Almacenamiento local desacoplado (IndexedDB en Web / SQLite o JSON local en Windows) a través de un repositorio abstracto (`ITaskRepository`).
* **Versión asignada:** **v0.2**

---

## 2. Auto-Asignación de Actividades para Breaks (Revitalización Automática)

### 💡 Propuesta Funcional
* **Descripción:** Sistema de catálogo de actividades de descanso (con sugerencias predefinidas y personalización del usuario) que se auto-asignan automáticamente mediante un botón *"Revitalización automática"* o se seleccionan manualmente al iniciar un break. Sugiere actividades saludables (caminar, hidratarse, estirar, mirar a lo lejos) en lugar de dispersión pasiva (scroll o redes).
* **Justificación (Qué valor aporta):** Elimina la fricción y la duda al llegar al descanso (*"¿qué hago ahora?"*), promoviendo pausas efectivas que realmente recarguen energía para el siguiente bloque.
* **¿Depende de otra funcionalidad?:** App Base (v0.1).
* **Complejidad estimada:** Baja.

### 🏛️ Resolución Técnica y Arquitectura
* **Diseño del motor de sugerencias:** Selección determinista o pseudo-aleatoria ponderada basada en la duración del descanso (`ShortBreak` vs `LongBreak`) y frecuencia de uso reciente para evitar repeticiones inmediatas.
* **Desacoplamiento:** Módulo de dominio puro sin dependencias externas: `interface BreakActivity { id: string, title: string, durationMinutes: number, category: 'physical' | 'mindful' | 'hydration' }`.
* **Versión asignada:** **v0.2**

---

## 3. Meta o Presupuesto de Sesión

### 💡 Propuesta Funcional
* **Descripción:** Permite definir un objetivo de sesión antes de arrancar, ya sea especificando una cantidad fija de pomodoros (proyectando el horario estimado de fin considerando descansos) o fijando una hora límite (calculando automáticamente cuántos bloques de foco y pausas caben en ese período).
* **Justificación (Qué valor aporta):** Aporta previsibilidad y control temporal. Evita cálculos mentales de intervalos y descansos, ayudando a estructurar la jornada de trabajo o estudio con un inicio y fin claros.
* **¿Depende de otra funcionalidad?:** App Base (v0.1).
* **Complejidad estimada:** Baja.

### 🏛️ Resolución Técnica y Arquitectura
* **Lógica de dominio:** Función pura de proyección matemática sobre los parámetros de la FSM:
  $$\text{Tiempo Total} = (N \times \text{Focus}) + ((N - 1) \times \text{ShortBreak}) + (\lfloor(N - 1) / \text{Ciclo}\rfloor \times \text{LongBreakDelta})$$
* **Riesgo técnico:** Cero dependencias de SO y nulo impacto en rendimiento.
* **Versión asignada:** **v0.2**

---

## 4. Integración de Presencia y Blindaje de Foco (Discord RPC + No Molestar)

### 💡 Propuesta Funcional
* **Descripción:** Integración opcional para comunicar el estado de concentración y blindar al usuario contra interrupciones:
  1. *Discord Rich Presence*: Muestra en el perfil de Discord el bloque activo, tiempo restante y la tarea en curso (con opción de privacidad para mostrar solo "Modo Foco").
  2. *Modo No Molestar del SO*: Activa automáticamente el modo de concentración o "No molestar" del sistema operativo mientras corre un bloque de focus para silenciar notificaciones.
* **Justificación (Qué valor aporta):** Comunica pasivamente a colegas y amigos que estás ocupado, y elimina distracciones directas bloqueando notificaciones del sistema durante los bloques de trabajo.
* **¿Depende de otra funcionalidad?:** App Base (v0.1). Opcionalmente Mini To-Do (v0.2) para sincronizar el título de la tarea.
* **Complejidad estimada:** Alta (requiere IPC local con Discord y llamadas a APIs nativas del sistema operativo en Windows).

### 🏛️ Resolución Técnica y Arquitectura
* **Límites de plataforma:**
  * En **Web**: No es posible acceder a named pipes locales ni alterar el estado de notificaciones del SO (funcionalidad no soportada o Noop).
  * En **Windows**: Integración mediante named pipe `\\.\pipe\discord-ipc-0` y APIs de Focus Assist / Quiet Hours de Windows.
* **Aislamiento:** Encapsulado detrás de interfaces `IPresenceProvider` y `IFocusShieldProvider`, asegurando que el temporizador principal funcione de manera 100% independiente si Discord no está instalado o si las llamadas al SO fallan.
* **Versión asignada:** **+v0.3**

---

## Documentación Relacionada

* Hoja de ruta y versiones: [`../roadmap.md`](../roadmap.md)
* Propuestas de Fede: [`fede-ideas.md`](./fede-ideas.md)
* Visión general del producto: [`../vision.md`](../vision.md)
