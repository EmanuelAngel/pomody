# Learnings & TIL (Today I Learned)

Bitácora permanente de lecciones arquitectónicas, fundamentos técnicos y descubrimientos de plataforma acumulados durante el desarrollo de Pomody.

A diferencia de `docs/review-findings.md` (que es un buffer efímero para bugs y detalles cosméticos que se eliminan al resolverse), este espacio conserva el **conocimiento técnico y las decisiones de fondo**.

---

## Estructura de un Learning

Cada entrada se numera de forma secuencial (`001-nombre-del-tema.md`) y responde a tres preguntas fundamentales:

1. **¿Qué pasaba? (El síntoma):** Descripción concisa del comportamiento anómalo o fricción observada.
2. **¿Por qué pasaba? (El fundamento técnico):** La causa raíz a nivel runtime, compilador o arquitectura (el _por qué_ real, sin quedarse en la superficie).
3. **¿Cómo se resuelve y qué aprendí? (La lección):** La solución arquitectónica y el modelo mental para decisiones futuras.

---

## Índice de Aprendizajes

| #                                             | Título                                                                               | Fecha      | Categoría              |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | ---------- | ---------------------- |
| [001](001-vitest-ssr-node-vs-browser-mode.md) | Cuellos de botella al testear componentes interactivos en Node (SSR) vs Browser Mode | 2026-09-25 | Testing / Arquitectura |
