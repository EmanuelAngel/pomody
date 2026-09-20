# Propuestas de Features — Ideas de Fede

> Registro colaborativo de ideas planteadas por Fede (Trainee Vibe Coder / Manual Tester), complementado con la resolución técnica, riesgos y decisiones de arquitectura tomadas por Vortex (Tech Lead).

Este documento preserva la **intención original** del colaborador y fundamenta técnicamente las adaptaciones realizadas para garantizar un producto ligero, performante y mantenible.

---

## 1. Analizador de Pantalla y Detección de Distracciones

### 💡 Propuesta Original de Fede
* **Descripción:** Analizador/monitor de pantalla que registra y monitorea la actividad durante los bloques de focus. Detecta cuando el usuario se está distrayendo (es decir, cuando no está realizando las tareas previstas o viendo lo que tenía previsto en la sesión) y muestra notificaciones pop-up tipo advertencia para alertar al usuario.
* **Justificación (Qué valor aporta):** Para usuarios que les cuesta prestar atención, actúa como un recordatorio activo de que estaban en una sesión de focus. Ayuda a reconducir la concentración inmediatamente cuando se detecta dispersión, sin necesidad de autoevaluación constante.
* **¿Depende de otra funcionalidad?:** App Base. Opcionalmente Idea 1 (Mini To-Do) para sincronizar y validar contra la tarea asignada.
* **Complejidad estimada por Fede:** Alta (requiere captura/monitoreo de pantalla, análisis de contenido, APIs nativas del sistema operativo, y sistema de notificaciones inteligentes).
* **Estado inicial:** En definición.

### 🏛️ Resolución Técnica y Arquitectura (Vortex & Sparring)
* **Alcance acordado:** Recordatorio suave de distracción mediante sondeo ligero de metadatos de ventana activa (título del proceso / ventana activa) acompañado de un diálogo interactivo con dos opciones: *"Gracias por recordarme"* (vuelve al foco) o *"Esto no es una distracción"* (agrega la ventana/proceso a una lista blanca por sesión o día).
* **Justificación técnica:** Se descarta la captura continua de pantalla, OCR e inteligencia artificial por tres riesgos críticos:
  1. *Barreras de permisos en el SO*: Los sistemas modernos bloquean capturas no autorizadas o las marcan como spyware/keylogger.
  2. *Drenaje masivo de recursos*: El procesamiento continuo de imágenes satura CPU, RAM y agota la batería.
  3. *Tasa inaceptable de falsos positivos*: Un programador o estudiante consultando documentación o tutoriales en YouTube sería penalizado erróneamente.
* **Patrón arquitectónico:** Puerto desacoplado (`IDistractionMonitor`) bajo Arquitectura Hexagonal. Implementación nativa para Windows (`Win32ActiveWindowMonitor`) y fallback inocuo (`NoopDistractionMonitor`) para Web.
* **Versión asignada:** **v0.2** (colaboración técnica para Fede).

---

## 2. UI Amena con Animaciones (Catálogo de Temas)

### 💡 Propuesta Original de Fede
* **Descripción:** Interfaz visual no sobria ni sólida, sino amena y atractiva con animaciones que acompañen el ciclo Pomodoro. Implementar un catálogo de temas animados (no una sola UI) que el usuario pueda elegir según su preferencia. Por ejemplo: un árbol que va creciendo progresivamente a medida que avanzan los ciclos de focus y descansos, llegando a su estado completamente desarrollado al finalizar la sesión. La UI busca hacer la experiencia visual más entretenida e inmersiva durante los bloques de focus.
* **Justificación (Qué valor aporta):** Mejora el confort y la experiencia del usuario dentro de la aplicación, permitiendo personalización según preferencias individuales. Evita que sea una app sin personalidad, agregando detalles visuales que hacen la diferencia a la hora de estudiar. El catálogo de temas aumenta el engagement al dejar que cada usuario encuentre una estética que resuene con él. Transforma la parte aburrida del focus en algo más entretenido, generando mayor retención y haciendo la sesión más agradable.
* **¿Depende de otra funcionalidad?:** App Base.
* **Complejidad estimada por Fede:** Media (requiere animaciones fluidas, renderizado progresivo de múltiples temas, sistema de selección de temas, y sincronización con los ciclos Pomodoro).
* **Estado inicial:** En definición.

### 🏛️ Resolución Técnica y Arquitectura (Vortex & Sparring)
* **Alcance acordado:** 
  * En **v0.1**: Sistema de diseño con tres paletas basadas en la estética Rosé Pine: *Dark* (colores Rosé Pine con fondos oscuros neutrales), *High-Contrast* (colores Rosé Pine con fondos negros profundos OLED) y *Light* (Rosé Pine Dawn).
  * En **v0.2**: Componente visual de progreso mediante ilustraciones estáticas en SVG que evolucionan en 4 o 5 fases discretas por bloque de focus (ej. semilla -> brote -> planta -> flor -> árbol).
* **Justificación técnica:** Se prohíben bucles de animación continuos a 60 FPS (Canvas/Lottie/CSS loops) durante el foco: consumen ciclos de GPU/batería innecesariamente y compiten con la atención visual periférica del usuario (anti-foco). Las ilustraciones por hitos estáticos transmiten progreso sin sobrecarga cognitiva ni consumo de recursos.
* **Patrón arquitectónico:** Separación estricta entre Contenedor y Presentación (Container/Presentational Pattern). Tokens de diseño desacoplados de la lógica del temporizador. El motor del timer desconoce el tema activo; la vista solo reacciona al porcentaje de progreso (`progressPercentage`).
* **Versión asignada:** **v0.1** (tokens y temas de color) / **v0.2** (ilustraciones estáticas por hitos).

---

## 3. Sistema de Métricas y Estadísticas de Sesiones

### 💡 Propuesta Original de Fede
* **Descripción:** Sistema de análisis y reporte de estadísticas que se genera cada tiempo X (configurable por el usuario) para proporcionar feedback detallado sobre la efectividad de las sesiones de estudio. Incluye: qué temas se trataron con éxito, qué temas se completaron, qué temas no se alcanzaron y el tiempo invertido en cada uno; tiempo total de focus vs tiempo de distracción; y calidad general de la sesión de estudio. Toda la información se presenta mediante gráficos atractivos y visualmente agradables (no sobrios) para facilitar la visualización del progreso.
* **Justificación (Qué valor aporta):** Proporciona feedback útil y actionable para mejorar en los aspectos de estudio. Permite al usuario entender patrones de productividad, identificar qué temas requieren más tiempo o mejor estrategia, y cuantificar el impacto de las distracciones. Los gráficos atractivos hacen que revisar las métricas sea una experiencia agradable, incentivando la reflexión sobre el desempeño y facilitando ajustes en futuras sesiones.
* **¿Depende de otra funcionalidad?:** App Base. Opcionalmente Idea 1 (Mini To-Do) para categorizar y asociar sesiones a temas específicos. Opcionalmente Analizador de Pantalla para detectar distracciones automáticamente.
* **Complejidad estimada por Fede:** Media-Alta (requiere tracking de datos, análisis de sesiones, generación de gráficos dinámicos, y almacenamiento persistente de estadísticas).
* **Estado inicial:** En definición.

### 🏛️ Resolución Técnica y Arquitectura (Vortex & Sparring)
* **Alcance acordado:** 
  * En **v0.1**: El núcleo del temporizador emite *Domain Events* en memoria (`SessionStarted`, `BlockCompleted`, etc.) y la pantalla muestra un contador diario elemental de bloques y minutos.
  * En **v0.2**: Persistencia local del historial de sesiones y visualización de barras semanales renderizadas con CSS/SVG nativo (sin dependencias pesadas de terceros).
  * En **+v0.3**: Cálculo de calidad de sesión/bloque y correlación analítica avanzada.
* **Justificación técnica:** No se puede construir una capa analítica antes de que existan los emisores de datos (Mini To-Do y detector). Además, incorporar librerías pesadas de gráficos (Chart.js, Recharts, D3) agregaría bloatware innecesario al bundle para mostrar datos elementales de frecuencia.
* **Patrón arquitectónico:** Arquitectura dirigida por eventos (Domain Events). El temporizador emite eventos desacoplados y el módulo de métricas actúa como suscriptor/consumidor pasivo.
* **Versión asignada:** **v0.1** (Domain Events y contador diario) / **v0.2** (persistencia y gráficos nativos) / **+v0.3** (analítica de calidad).

---

## 4. Pantalla Principal Minimalista

### 💡 Propuesta Original de Fede
* **Descripción:** Diseño de la pantalla principal lo más sencillo posible con la menor cantidad de información visible. Mostrar solo la información esencial y crítica para la interacción inmediata (por ejemplo: timer del Pomodoro, tarea actual, botón de inicio). Las opciones adicionales, configuraciones, métricas y funcionalidades se acceden mediante pestañas, botones o menús desplegables, manteniendo siempre la simplicidad visual en cada sección.
* **Justificación (Qué valor aporta):** Reduce la fatiga visual y cognitiva del usuario en su primera interacción y durante el uso regular. Una pantalla saturada de información genera distracciones y ansiedad innecesaria, especialmente durante sesiones de focus. El acceso a más opciones mediante navegación clara permite que usuarios avanzados encuentren lo que necesitan sin comprometer la experiencia minimalista de quienes prefieren la simplicidad.
* **¿Depende de otra funcionalidad?:** App Base. Se complementa con todas las demás ideas (Catálogo de Temas, Mini To-Do, Métricas, etc.) al proporcionar el contenedor visual para ellas.
* **Complejidad estimada por Fede:** Media (requiere arquitectura de navegación clara, diseño responsive, y jerarquía visual bien pensada).
* **Estado inicial:** En definición.

### 🏛️ Resolución Técnica y Arquitectura (Vortex & Sparring)
* **Alcance acordado:** 
  * Vista única gobernada por la Máquina de Estados Finita (FSM): en estado `Running` (foco activo) se ocultan configuraciones secundarias (modo Zen).
  * Ajustes y personalización aislados en un Drawer/Modal lateral desacoplado.
  * Shell de navegación con barra de pestañas superior central que estructura la aplicación desde el día 1, dejando placeholders visibles para las vistas futuras (*Planning* y *Métricas*) rotuladas como `(en v0.X)`.
* **Justificación técnica:** Evita el antipatrón de permitir modificar configuraciones o tiempos en pleno bloque de foco y previene la proliferación caótica de estados booleanos (`isModalOpen`) en un solo componente monolítico.
* **Patrón arquitectónico:** FSM como fuente única de verdad para el estado de la vista; navegación declarativa en el Shell superior.
* **Versión asignada:** **v0.1** (MVP base a cargo de Vortex).

---

## 5. Widget Flotante Global Minimalista

### 💡 Propuesta Original de Fede
* **Descripción:** Pop-up flotante global que persiste en pantalla incluso después de cerrar la instancia de la aplicación. El widget muestra información mínima indispensable: minutos transcurridos de la sesión actual, número de sesión/ciclo Pomodoro, y objetivo (estos dos últimos en un desplegable para no saturar visualmente). El widget es minimalista y no invasivo, completamente movible a cualquier parte de la pantalla y con opción de fijarlo en una posición específica. Permite al usuario seguir trabajando en otras aplicaciones mientras monitorea su sesión.
* **Justificación (Qué valor aporta):** Elimina la necesidad de mantener la app abierta en todo momento. El usuario accede a la información mínima y necesaria sin sacrificar espacio ni recursos. Al poder fijar el widget, crea un punto de referencia visual que ayuda a no perder el track de la sesión de estudio, mejorando la continuidad mental sin distracciones. Permite trabajar en otras aplicaciones (editor de código, navegador, etc.) mientras mantiene el Pomodoro visible.
* **¿Depende de otra funcionalidad?:** App Base. Opcionalmente Idea 1 (Mini To-Do) para mostrar la tarea en el desplegable.
* **Complejidad estimada por Fede:** Media-Alta (requiere implementación de ventana flotante a nivel del sistema operativo, persistencia fuera del ciclo de vida de la app, y manejo de eventos globales).
* **Estado inicial:** En definición.

### 🏛️ Resolución Técnica y Arquitectura (Vortex & Sparring)
* **Alcance acordado:** Rediseñado como **Modo Compacto / Mini-Player** dentro de la misma ventana de la aplicación. Al activarse, la ventana se redimensiona a un formato compacto (~220x80px) y activa el atributo nativo de ventana *Always on Top* (fijar al frente en Windows).
* **Justificación técnica:** Se descartan de raíz los daemons en segundo plano y las ventanas secundarias desacopladas: a nivel del SO, si un proceso se destruye, sus ventanas mueren. Manejar una segunda ventana flotante exigiría sincronización compleja por IPC (riesgo de desfase de segundos y colisión de eventos). Reutilizar la misma ventana en modo compacto resuelve el 100% de la necesidad de usuario con 0% de sobrecarga de procesos.
* **Patrón arquitectónico:** Viewport State Pattern (la ventana principal conmuta entre vista completa y vista compacta con banderas nativas del shell del SO).
* **Versión asignada:** **v0.3** (Roadmap avanzado).

---

## Documentación Relacionada

* Hoja de ruta y versiones: [`../roadmap.md`](../roadmap.md)
* Propuestas de Vortex: [`vortex-ideas.md`](./vortex-ideas.md)
* Visión general del producto: [`../vision.md`](../vision.md)
