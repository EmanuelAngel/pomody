---
name: 🎯 Tarea / Feature
about: Especificación de funcionalidad o tarea técnica con criterios de aceptación claros.
title: 'feat: '
labels: ['enhancement']
assignees: ''
---

## 🎯 Objetivo

<!-- Explicá en una o dos oraciones qué funcionalidad se agrega y qué valor aporta. -->

## 📂 Capa y Archivos Afectados

<!-- Delimitar dónde vive el cambio para guiar al desarrollador y al agente de IA. -->

- [ ] `src/lib/components/...` (UI / Presentación)
- [ ] `src/lib/state/...` (Estado reactivo / Runes)
- [ ] `src/lib/domain/...` (Dominio / TypeScript puro)
- [ ] `src/lib/adapters/...` (Infraestructura / Servicios externos)

## ✅ Criterios de Aceptación (Definition of Done)

<!-- Lista de verificación objetiva para dar por completada la tarea. -->

- [ ] [Criterio 1: Comportamiento visible o funcional]
- [ ] [Criterio 2: Manejo de caso borde o estado interactivo]
- [ ] `pnpm check` pasa sin errores ni advertencias
- [ ] `pnpm test:unit` pasa todas las pruebas

## 🚫 Restricciones y Fuera de Alcance

<!-- Indicar qué cosas NO deben tocarse ni modificarse para evitar desvíos o alucinaciones de IA. -->

- NO introducir dependencias externas sin validación previa.
- NO importar APIs de Tauri o DOM dentro de `src/lib/domain/`.
