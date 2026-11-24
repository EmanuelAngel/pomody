# Logotipo de Pomody

La marca es una **P dibujada como el anillo del timer**, con un **brote** en el hombro del arco:
la letra es el ciclo de foco y el brote es lo que crece cuando el bloque se completa. Sin degradados,
sin sombras y sin píxeles: dos formas y dos tokens.

## Archivos

| Archivo                          | Para qué                                                               |
| :------------------------------- | :--------------------------------------------------------------------- |
| `pomody-mark.svg`                | La marca sola, sobre fondo oscuro. Cabecera, pie, watermarks.          |
| `pomody-mark-dawn.svg`           | La misma marca para fondo claro (Dawn): `#d7827e` y `#56949f`.         |
| `pomody-mark-mono.svg`           | La marca en una sola tinta (`#e0def4`). Sellos, grabados, fax.         |
| `pomody-app-icon.svg`            | La marca sobre el cuadrado base `#191724` con radio 22%. Ícono de app. |
| `pomody-app-icon-1024.png`       | Derivado del anterior. Entrada de `pnpm tauri icon`.                   |
| `pomody-lockup-horizontal.svg`   | Marca + palabra, una línea. Cabecera de documentos y presentaciones.   |
| `pomody-lockup-vertical.svg`     | Marca sobre palabra. Espacios angostos y perfiles.                     |
| `pomody-lockup-square.svg`       | Marca + palabra en cuadrado. Avatares y tarjetas sociales.             |
| `pomody-banner-{dark,light}.png` | Cabecera del README, elegida por `prefers-color-scheme`.               |
| `pomody-sizes.png`               | Evidencia de revisión a 16/32/48/64 px. No se publica.                 |

Los SVG son la fuente de verdad; los PNG se derivan con `pnpm brand:render`. El set de iconos de
escritorio se regenera aparte, desde el PNG de 1024:

```bash
pnpm brand:render
pnpm tauri icon docs/brand/pomody-app-icon-1024.png
```

## Color

| Rol   | Token         | Oscuro    | Dawn      |
| :---- | :------------ | :-------- | :-------- |
| Letra | `accent-rose` | `#ebbcba` | `#d7827e` |
| Brote | `accent-foam` | `#9ccfd8` | `#56949f` |
| Fondo | `bg-base`     | `#191724` | `#faf4ed` |

La marca usa el rose y el foam **juntos**: en una sola tinta pierde el brote. Para usos de una
tinta existe `pomody-mark-mono.svg`, que la reduce a silueta. Sobre fondos claros usá
`pomody-mark-dawn.svg`: el rose de Dark (`#ebbcba`) sobre Dawn (`#faf4ed`) casi no contrasta.

## Área de reserva

Dejá libre, como mínimo, **la mitad del ancho de la marca** en los cuatro lados. Nada de texto,
bordes ni otras marcas dentro de ese margen.

## Tamaños mínimos

- **Digital:** 24 px de alto. Por debajo de eso, la hoja deja de leerse y conviene el ícono de app
  (que tiene fondo) antes que la marca suelta.
- **Impresión:** 8 mm de alto.
- **Favicon:** usá `src/lib/assets/favicon.svg`, que es el ícono con fondo, no la marca suelta.

## Usos incorrectos

- No estirar, rotar ni inclinar la marca.
- No cambiar el rose ni el foam por otros colores de la paleta.
- No separar el brote del arco ni recolocarlo en otro lado de la letra.
- No agregar sombras, degradados, contornos ni brillos.
- No poner la marca suelta sobre fondos claros: usá el ícono con fondo o el lockup.

## En la aplicación

- La cabecera usa `src/lib/components/brand/pomody-mark.svelte` (marca en línea, hereda el tamaño
  por prop) junto a la palabra.
- El favicon vive en `src/lib/assets/favicon.svg` y se enlaza desde `src/routes/+layout.svelte`.
- Los iconos de escritorio están en `src-tauri/icons/` y los declara `src-tauri/tauri.conf.json`.
