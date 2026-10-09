# 004 — La primera corrida de `pnpm test:browser` no es evidencia

> Contexto de origen: implementación del mini-player ([#102](https://github.com/Gentleman-Programming/pomody/issues/102)).

---

## 1. ¿Qué pasaba? (El síntoma)

Después de agregar un componente Svelte nuevo con imports nuevos, la **primera** corrida de la suite browser completa falló masivamente:

```
Test Files  3 failed | 18 passed (21)
     Tests  20 failed | 142 passed (162)
```

Veinte tests rojos, tres archivos enteros caídos. La segunda corrida dio `21 passed`. La tercera, `21 archivos, 206 tests, todo verde`. El Tech Lead corrió los tests por su cuenta y también los vio verdes.

Un veinte por ciento de la suite en rojo suena a regresión seria. No lo era.

---

## 2. ¿Por qué pasaba? (El fundamento técnico)

El proyecto `client` de Vitest corre en **Browser Mode** sobre un navegador real controlado por Playwright, y el pipeline de Vite tiene una etapa de **optimización de dependencias** que pre-bundlea los módulos recién importados.

Cuando un archivo nuevo aparece en el grafo de imports, el optimizador necesita:

1. descubrir la dependencia,
2. re-bundlarla,
3. **re-cargar el navegador** para que corra contra el bundle optimizado.

Durante esa recarga el runner puede estar evaluando imports que ya no resuelven, y reporta fallos que **no corresponden al código bajo prueba**. Los errores observados fueron de esa familia: `Failed to fetch dynamically imported module`.

El detalle que lo hace peligroso no es que sea raro, sino que **el mensaje de error es indistinguible de una regresión real**. Un `Failed to fetch` no dice "el optimizador todavía no terminó".

El protocolo del repo separa los proyectos por velocidad: `pnpm test:unit` tarda ~10s y `pnpm test:browser` ~25s. Esa asimetría hace tentador sacar el veredicto con la primera señal, cuando la segunda es la que vale.

---

## 3. ¿Cómo se resuelve y qué aprendí? (La lección)

**Regla: una primera corrida de `pnpm test:browser` que agrega imports nuevos no se interpreta. Se corre de nuevo.**

El costo de repetir es ~23 segundos. El costo de diagnosticar una regresión inexistente es media hora, y el riesgo real es el peor: cambiar código correcto para "arreglar" un fallo que no existe.

**Cómo distinguir un artefacto del optimizador de una regresión real:**

| Señal                                                      | Interpretación                       |
| ---------------------------------------------------------- | ------------------------------------ |
| Los fallos son de **import** / módulo no encontrado        | Sospecha de optimizador. Re-correr.  |
| Los fallos tocan **un archivo** y describen comportamiento | Probable regresión real. Investigar. |
| La segunda corrida pasa entero verde                       | Era el optimizador. Cerrar el tema.  |

**Corolario para TDD.** El primer RED de un test nuevo puede ser un `Failed to fetch dynamically imported module`, que prueba únicamente que el archivo todavía no existe. Ese RED no dice nada sobre el comportamiento. El RED que vale es el que se observa **con el componente ya presente**, fallando por la razón correcta — en el caso de #102 fueron 3 tests de 16, fallando por aserciones del estado de reposo y no por un fallo de import.

**No aceptar como evidencia un RED que venga de un error de módulo.** Hay que llegar a un RED que falle por la aserción.
