# Visión del Producto: Pomody

> Temporizador Pomodoro diseñado para el foco real: planificación sin fricción, protección de la concentración y pausas con propósito, sin bloatware ni suscripciones abusivas.

---

## 1. Propósito y Público Objetivo

### ¿Por qué existe Pomody?

La mayoría de las aplicaciones de productividad caen en dos extremos viciosos:

1. **Temporizadores excesivamente básicos**: no permiten organizar qué se va a hacer en cada intervalo, generando pérdida de foco y fatiga de decisión al iniciar cada bloque.
2. **Herramientas sobrecargadas y abusivas**: saturadas de funcionalidades innecesarias, con interfaces pesadas, suscripciones costosas o limitadas a un solo sistema operativo.

### Público objetivo

Estudiantes, desarrolladores y profesionales a los que no les alcanza un temporizador tradicional y buscan:

- Planificar sesiones asignando tareas concretas antes de arrancar.
- Evitar la dispersión pasiva durante los descansos mediante pausas guiadas.
- Visualizar métricas simples y claras de su progreso.
- Disfrutar de una interfaz limpia, sin elementos distractivos ni sobrecarga cognitiva.

---

## 2. Diferencia de Mercado y Referencias

| Aplicación        | Aspecto Valioso                                      | Problema / Limitación detectada                                                                   |
| :---------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------------------------ |
| **Pomotroid**     | Sencilla, minimalista y funcional.                   | No permite planificar sesiones ni asignar tareas previas. Se pierde foco en las transiciones.     |
| **Rize**          | Completa, con detección de actividad no relacionada. | Solo disponible en Windows, cerrada a suscripciones de precio elevado y con excesiva complejidad. |
| **Habit Tracker** | Vista de calendario y seguimiento de hábitos.        | Interfaz visual deficiente y limitada exclusivamente al ecosistema Android.                       |

### La promesa diferencial de Pomody

- **Multiplataforma ágil**: experiencia consistente y rápida en la Web y en el escritorio de Windows.
- **Cero bloatware**: cada feature responde estrictamente a la protección de la concentración o al descanso efectivo.
- **Respeto total al usuario**: software libre (MIT), sin barreras de pago artificiales ni consumo abusivo de recursos.

---

## 3. Plataformas Objetivo

- **Web**: Aplicación accesible instantáneamente desde cualquier navegador moderno, liviana y sin instalación requerida.
- **Windows**: Aplicación de escritorio nativa/empaquetada con soporte para atajos de sistema, modo Always-on-Top y bajo consumo de CPU/memoria.

---

## 4. Núcleo Base de la Experiencia (FSM)

El flujo fundamental del temporizador está gobernado por una **Máquina de Estados Finita (FSM)** predecible y desacoplada:

```text
Configurar Tiempos ──▶ Iniciar Bloque ──▶ Foco Activo ──▶ Alerta Sonora ──▶ Descanso Guiado ──▶ Repetir Ciclo
```

1. **Definición**: Se configuran tiempos de trabajo y descansos (cortos/largos).
2. **Foco protegido**: Modo Zen visual que oculta distracciones y controles secundarios.
3. **Pausa revitalizante**: Sugerencias saludables para evitar el scroll pasivo y recargar energía.

---

## Próximos Pasos

- Consultar la planificación temporal y distribución de versiones en [`roadmap.md`](./roadmap.md).
- Revisar las propuestas funcionales de Fede en [`proposals/fede-ideas.md`](./proposals/fede-ideas.md).
- Revisar las propuestas de planificación y blindaje en [`proposals/vortex-ideas.md`](./proposals/vortex-ideas.md).
