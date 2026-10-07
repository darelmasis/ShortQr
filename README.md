# ShortQR

Acortador de URLs con generación automática de códigos QR. SPA construida
con **React + Vite**, UI con **quickit-ui**, backend en **Vercel Serverless
Functions** con **MongoDB Atlas** y login con **Google**.

## Stack

- **React 19 + Vite** (SPA con React Router) en JavaScript
- **quickit-ui** — componentes, tema claro/oscuro, toasts y formularios
- **MongoDB Atlas** — driver oficial (`mongodb`), sin Mongoose
- **Vercel Serverless Functions** — las rutas API viven en `api/`
- **Tailwind CSS v4** — vía `@tailwindcss/vite`
- **QR en el cliente** — librería `qrcode` (renderizado a canvas: SVG y PNG)

## Estructura

```
server/       → lógica de servidor y handlers de rutas API
  lib/        → mongodb, auth, links, validación
api/          → una única función serverless catch-all para todas las rutas
src/          → SPA React
  pages/      → Home, Mis enlaces, 404
  components/ → header, footer, workspace, filas de enlaces
vercel.json   → rewrites: SPA fallback + redirección de slugs a `/api/redirect?slug=…`
```

## Características

- Acortado de URLs con slugs criptográficos sin colisiones
- **Inicio de sesión con Google** (OAuth 2.0 + PKCE); crear enlaces requiere sesión
- El usuario se guarda en la colección **`users`** (id de Google, email, nombre, foto, fechas)
- Cada enlace corto guarda el **`ownerId`** de quien lo creó
- **Mis enlaces** (`/enlaces`): listado con visitas, estado y fecha; copiar, desactivar/activar, configurar expiración y eliminar
- **QR directo**: generar el código QR con la URL tal cual, sin acortar
- **Copiar el QR** como **PNG** (1024 px) o **SVG** desde el portapapeles
- Redirección 302 con registro de visitas y última visita (`api/redirect.js`)
- Estadísticas básicas por enlace (`/api/stats?slug=…`)

## Requisitos

- Node.js >= 20.19
- Un cluster en MongoDB Atlas
- CLI de Vercel (`npm i -g vercel`) para desarrollo local del backend

## Configuración

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Crear el archivo `.env` a partir de la plantilla:

   ```bash
   cp .env.example .env
   ```

3. Completar las variables (las mismas que usa Vercel):

   ```env
   MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/shortqr
   MONGODB_DATABASE=shortqr
   BASE_URL=https://dominio.com
   SLUG_LENGTH=6
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
   SESSION_SECRET=cadena-aleatoria-de-al-menos-32-caracteres
   ```

### Inicio de sesión con Google

Crear enlaces cortos requiere sesión (Google OAuth 2.0 + PKCE, sesión en
cookie firmada con JWT). Para configurarlo:

1. En [Google Cloud Console → Credenciales](https://console.cloud.google.com/apis/credentials)
   crea una app OAuth y añade estas **URIs de redirección autorizadas**:
   - Desarrollo: `http://localhost:5173/api/auth/callback`
   - Producción: `https://dominio.com/api/auth/callback`
2. Copia el **Client ID** y **Client Secret** a `.env` (o a las variables de
   entorno de Vercel).
3. Genera un `SESSION_SECRET` largo: `openssl rand -hex 32`.

Flujo: `/api/auth/login` → consentimiento de Google → `/api/auth/callback`
firma la cookie y redirige a `/`. La SPA consulta `/api/auth/me` para saber
si hay sesión; `/api/create` devuelve `401` sin sesión.

## Desarrollo

Un solo comando, un solo puerto. Vite sirve la SPA **y** ejecuta las
funciones de `api/` en el mismo proceso (middleware de desarrollo en
`scripts/api-dev.js`):

```bash
npm run dev   # http://localhost:5173 (SPA + API + redirección de slugs)
```

Producción:

```bash
npm run build    # compila la SPA a dist/
npm run lint
```

El deploy en Vercel compila la SPA y empaqueta una única función serverless
catch-all desde `api/[...path].js`, que delega las rutas API en `server/`.
Esto mantiene el despliegue dentro del límite de 12 funciones del plan Hobby.
`vercel.json` conserva el fallback SPA y la redirección de slugs.
