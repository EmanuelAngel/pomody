# Guía de Puesta en Marcha (Onboarding & Setup)

> Machete rápido para configurar el entorno de desarrollo de Pomody desde cero en una máquina limpia.

---

## 1. Herramientas Base

Instalá estas herramientas en tu sistema antes de clonar el proyecto:

| Herramienta           | Versión mínima                   | Comando de verificación | Dónde descargar / Instalar                                              |
| :-------------------- | :------------------------------- | :---------------------- | :---------------------------------------------------------------------- |
| **Git**               | `>= 2.40`                        | `git --version`         | [git-scm.com](https://git-scm.com/)                                     |
| **GitHub CLI (`gh`)** | `>= 2.50`                        | `gh --version`          | `winget install GitHub.cli` o [cli.github.com](https://cli.github.com/) |
| **Node.js**           | `>= 20.18 LTS` (Recomendado v22) | `node -v`               | [nodejs.org](https://nodejs.org/) (o vía `fnm` / `nvm`)                 |
| **pnpm**              | `>= 9.0`                         | `pnpm -v`               | Se activa vía Corepack o npm (ver abajo)                                |
| **Gentle AI**         | `>= 3.0`                         | `gentle-ai version`     | Se instala vía npm global (ver abajo)                                   |

---

## 2. Configuración Paso a Paso

### Paso 1: Configurar Git y autenticar GitHub CLI

Si acabás de instalar Git, asegurate de tener tu usuario configurado:

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

Iniciá sesión en GitHub para que tu terminal y tus agentes puedan operar:

```bash
gh auth login
```

_(Elegí `GitHub.com`, protocolo `HTTPS`, autenticar con navegador y seguí los pasos en pantalla)._

---

### Paso 2: Activar pnpm

En Pomody **es obligatorio usar `pnpm`** (nunca `npm` ni `yarn`). En Node moderno ya viene incluido, solo hay que activarlo:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

> [!TIP]
> Si PowerShell te tira un error de permisos o scripts deshabilitados, ejecutá una vez:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

---

### Paso 3: Instalar Gentle AI

Gentle AI provee las skills y flujos de trabajo para tus agentes de IA:

```bash
npm install -g gentle-ai
```

---

### Paso 4: Clonar el proyecto e instalar dependencias

Descargá el repositorio y ejecutá la instalación:

```bash
git clone https://github.com/EmanuelAngel/pomody.git
cd pomody
pnpm install
```

> [!NOTE]
> `pnpm install` descarga los paquetes y configura automáticamente los hooks de **Husky** para validar commits y formatear código.

---

### Paso 5: Restaurar las skills del proyecto (`skills-lock.json`)

Para instalar y restaurar exactamente las skills bloqueadas en `skills-lock.json` (como `impeccable` de Vercel/Agentic):

```bash
pnpm dlx skills experimental_install
```

_(Opcional: Si además querés sincronizar las configuraciones globales del ecosistema de agentes Gentle AI en la máquina, podés correr `gentle-ai sync`)._

---

## 3. Verificación de Funcionamiento

Ejecutá estos dos comandos para validar que todo quedó perfecto:

1. **Chequeo de tipos estricto:**

   ```bash
   pnpm check
   ```

   _(Debe responder `svelte-check found 0 errors and 0 warnings`)._

2. **Levantar el servidor local de desarrollo:**
   ```bash
   pnpm dev
   ```
   _(Abrí tu navegador en `http://localhost:5173` para ver el temporizador funcionando)._

---

## 4. Machete de Comandos Frecuentes

| Comando               | Para qué sirve                                                 |
| :-------------------- | :------------------------------------------------------------- |
| `pnpm dev`            | Inicia el servidor local de desarrollo con recarga en vivo.    |
| `pnpm check`          | Verifica que no haya errores de TypeScript ni de Svelte.       |
| `pnpm test:unit`      | Corre las pruebas unitarias del dominio en menos de 1 segundo. |
| `pnpm format`         | Formatea automáticamente todos los archivos con Prettier.      |
| `gh pr create --fill` | Abre un Pull Request asociando los commits de tu rama.         |
