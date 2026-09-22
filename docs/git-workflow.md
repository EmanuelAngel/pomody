# Flujo de Trabajo y Estándares de Git en Pomody

> Guía práctica de colaboración para el equipo (Vortex & Fede).
> Diseñada para proteger la calidad del código mediante arneses automáticos sin frenar el ritmo de desarrollo.

---

## 1. Arneses de Calidad Automáticos

Pomody cuenta con herramientas que verifican la calidad en dos niveles:

| Nivel               | Herramienta                 | Momento                           | Qué hace                                                                                                   |
| :------------------ | :-------------------------- | :-------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| **Local (rápido)**  | **Husky** + **lint-staged** | Al hacer `git commit`             | Formatea automáticamente con **Prettier** y repara problemas con **ESLint** sobre los archivos preparados. |
| **Local (mensaje)** | **Husky** + **commitlint**  | Al confirmar el commit            | Valida que el mensaje de commit siga el estándar de Conventional Commits.                                  |
| **Remoto (CI)**     | **GitHub Actions**          | Al abrir un PR o mergear a `main` | Ejecuta `pnpm lint`, `pnpm check` (tipado estricto), `pnpm test:unit` y `pnpm build`.                      |

---

## 2. Convención de Commits (Conventional Commits)

Cada commit debe iniciar con un tipo en minúscula seguido de dos puntos y un espacio:

```text
<tipo>(<alcance opcional>): <descripción breve en imperativo o presente>
```

### Tipos más comunes

| Tipo       | Cuándo usarlo                                                    | Ejemplo                                                  |
| :--------- | :--------------------------------------------------------------- | :------------------------------------------------------- |
| `feat`     | Una nueva característica o funcionalidad visible                 | `feat(timer): agregar botón de pausa`                    |
| `fix`      | Corrección de un bug o comportamiento no deseado                 | `fix(ui): corregir desalineación en el arco de progreso` |
| `docs`     | Cambios exclusivos en documentación o notas                      | `docs: agregar guía de git workflow`                     |
| `style`    | Formato, espacios, comas (sin cambios en lógica)                 | `style: ordenar imports en app.css`                      |
| `refactor` | Reestructuración de código sin agregar features ni corregir bugs | `refactor(domain): simplificar cálculo de deltas`        |
| `test`     | Agregar o corregir pruebas unitarias o de integración            | `test(domain): agregar pruebas para transición a pausa`  |
| `chore`    | Mantenimiento, dependencias, tooling o configs de Git            | `chore: configurar husky y commitlint`                   |

> [!TIP]
> Si el commit falla con un mensaje como `type may not be empty` o `subject may not be empty`, revisá que el mensaje no esté vacío y empiece con uno de los tipos anteriores (`feat:`, `fix:`, `chore:`, etc.).

---

## 3. Flujo Diario Paso a Paso

### Paso 1: Crear una rama de trabajo

Siempre trabajamos en ramas separadas de `main`:

```bash
# Para una nueva funcionalidad
git checkout -b feat/nombre-funcionalidad

# Para corrección de un bug
git checkout -b fix/nombre-bug
```

### Paso 2: Desarrollar y verificar en local

Probá la app en tu navegador mientras desarrollás:

```bash
pnpm dev
```

Para verificar que no haya errores de TypeScript antes de subir:

```bash
pnpm check
```

### Paso 3: Hacer commit

Agregá los archivos modificados y confirmá el commit:

```bash
git add .
git commit -m "feat(timer): agregar selector de modo zen"
```

El hook correrá automáticamente `lint-staged` (formateando tus archivos) y `commitlint` (validando el formato del mensaje).

### Paso 4: Subir la rama y abrir Pull Request

```bash
git push -u origin feat/nombre-funcionalidad
```

Luego entrá a GitHub y abrí el **Pull Request** hacia `main`:

1. Completá la plantilla con la descripción del cambio y cómo lo probaste.
2. Esperá a que el chequeo de **GitHub Actions (CI)** pase en verde.
3. Vortex revisará y aprobará el PR para hacer el merge a `main`.
