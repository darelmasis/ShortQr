# ShortQR

Acortador de URLs con generación automática de códigos QR. Construido con
Astro, TypeScript, MongoDB Atlas y desplegado como Serverless Functions de
Vercel.

## Stack

- **Astro 7** (SSR con `@astrojs/vercel`)
- **TypeScript strict**
- **MongoDB Atlas** — driver oficial (`mongodb`), sin Mongoose
- **Vercel Serverless Functions**
- **QR en el cliente** — librería `qrcode` (renderizado a canvas: SVG y PNG)
- **CSS moderno** — sin frameworks de UI, solo variables CSS y componentes Astro

## Características

- Acortado de URLs con slugs criptográficos sin colisiones
- **QR directo**: generar el código QR con la URL tal cual, sin acortar
- QR en **negro** con módulos cuadrados (clásico)
- **Copiar el QR** como **PNG** (1024 px) o **SVG** desde el portapapeles
- Redirección 302 con registro de visitas y última visita
- Estadísticas básicas por enlace (`/api/stats?slug=…`)
- Diseño de una sola pantalla, sin scroll, con formulario y resultado lado a lado en escritorio

## Requisitos

- Node.js >= 18.17
- Un cluster en MongoDB Atlas

## Configuración

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Crear el archivo `.env` a partir de la plantilla:

   ```bash
   cp .env.example .env
   ```

3. Completar las variables:

   ```env
   MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/shortqr
   MONGODB_DATABASE=shortqr
   BASE_URL=https://dominio.com
   SLUG_LENGTH=6
   ```

   | Variable            | Descripción                                                       | Requerida |
   | ------------------- | ----------------------------------------------------------------- | --------- |
   | `MONGODB_URI`       | Cadena de conexión de MongoDB Atlas.                              | Sí        |
   | `MONGODB_DATABASE`  | Nombre de la base de datos. Si se omite, se toma de la URI.       | No        |
   | `BASE_URL`          | Dominio público del sitio (usado en la URL corta generada).       | No*       |
   | `SLUG_LENGTH`       | Longitud de los slugs (entre 4 y 12, por defecto 6).              | No        |

   \* Si `BASE_URL` se omite, se usa el origin de cada request — útil en
   previews de Vercel, pero en producción se recomienda fijarla.

4. Ejecutar:

   ```bash
   npm run dev      # desarrollo (expuesto en la red local, ej: http://192.168.x.x:4321)
   npm run build    # producción (genera .vercel/output)
   npm run preview  # previsualizar el build localmente
   ```

   El CSS se sirve minificado tanto en desarrollo como en producción
   (cssnano vía PostCSS + LightningCSS de Vite en el build).

> **Nota**: con el adaptador `@astrojs/vercel`, `astro preview` no está
> soportado. Para probar el build de producción localmente usa
> `npx vercel dev` (instala el CLI de Vercel y ejecuta
> `npx vercel login` primero).

## Scripts

```bash
npm run dev          # servidor de desarrollo
npm run build        # build de producción con adaptador Vercel
npm run preview      # previsualización local del build
npm run typecheck    # comprobación de tipos (astro check)
npm run lint         # ESLint
npm run lint:fix     # ESLint con corrección automática
npm run format       # Prettier (escribe)
npm run format:check # Prettier (solo verifica)
```

## Arquitectura

```
src/
├── components/
│   ├── Button.astro        # Botón reutilizable (variants primary/secondary)
│   ├── UrlForm.astro       # Formulario: valida en cliente y llama a /api/create
│   ├── ResultCard.astro    # Enlace corto + botón copiar (Clipboard API)
│   └── QRCodeCard.astro    # QR SVG en cliente + descarga PNG
├── layouts/
│   └── BaseLayout.astro    # Layout base (HTML semántico, meta, favicon)
├── lib/
│   ├── env.ts              # Lectura y validación de variables de entorno
│   ├── mongodb.ts          # Conexión singleton (globalThis) + índices
│   ├── types.ts            # Tipos del dominio (LinkDocument, respuestas…)
│   ├── links.ts            # Persistencia: crear, buscar, visitas, stats
│   ├── slug.ts             # Generador criptográfico de slugs (base58)
│   ├── validation.ts       # Normalización y validación de URLs
│   └── response.ts         # Helpers HTTP (JSON, error, redirect 302)
├── pages/
│   ├── index.astro         # Página principal (prerenderizada)
│   ├── [slug].ts           # Redirección 302 + registro de visitas
│   ├── 404.astro           # Página de no encontrado
│   └── api/
│       ├── create.ts       # POST /api/create
│       └── stats.ts        # GET /api/stats?slug=…
└── styles/
    └── global.css          # Tokens de diseño y estilos globales
```

### Decisiones de diseño

- **Lógica desacoplada de las rutas**: los endpoints orquestan; toda la lógica
  vive en `src/lib/`. Las funciones de datos aceptan entradas ya validadas.
- **Conexión singleton**: el `MongoClient` se cachea en `globalThis` con
  `maxPoolSize: 10`, reutilizándose entre requests calientes de la misma
  instancia serverless (evita agotar el límite de conexiones de Atlas).
- **Índices automáticos**: al primer `createLink` se garantizan los índices
  `slug` (unique), `createdAt` y `expiresAt`.
- **Anti-colisión de slugs**: el índice único detecta colisiones de forma
  atómica; el slug se regenera automáticamente (hasta 5 intentos).
- **Slugs base58**: sin caracteres ambiguos (0, O, I, l, 1), con
  `crypto.randomInt` (aleatoriedad criptográfica sin sesgo).
- **QR solo en cliente**: el servidor nunca genera imágenes; el navegador
  renderiza el SVG y exporta el PNG de 1024px.
- **`BASE_URL` vs `import.meta.env.BASE_URL`**: se lee solo de `process.env`
  porque `import.meta.env.BASE_URL` es una variable reservada de Vite.

## API

### `POST /api/create`

Crea un enlace corto. Si la URL no trae protocolo, se añade `https://`
automáticamente.

```bash
curl -X POST https://dominio.com/api/create \
  -H "Content-Type: application/json" \
  -d '{"url":"https://google.com"}'
```

Respuesta `200`:

```json
{
  "success": true,
  "shortUrl": "https://dominio.com/Ab91X",
  "slug": "Ab91X"
}
```

Errores: `400` (validación), `500` (error interno), con cuerpo
`{ "success": false, "error": "mensaje" }`.

### `GET /api/stats?slug=Ab91X`

```json
{
  "success": true,
  "slug": "Ab91X",
  "url": "https://google.com/",
  "active": true,
  "visits": 12,
  "createdAt": "2026-08-01T19:07:44.835Z",
  "updatedAt": "2026-08-01T19:07:44.835Z",
  "lastVisit": "2026-08-01T19:08:02.950Z",
  "expiresAt": null
}
```

### `GET /:slug`

Redirección `302` a la URL destino. Si el slug no existe, está inactivo o
expiró, responde con la página 404. Cada visita incrementa `visits` y
actualiza `lastVisit` de forma atómica.

## Despliegue en Vercel

1. **Red de Atlas**: Vercel usa IPs cambiantes. En MongoDB Atlas →
   *Network Access* → *Add IP Address* → permitir `0.0.0.0/0`
   (o usar *Private Endpoint* si tu plan lo permite).

2. **Importar el repositorio** en Vercel. El framework (Astro) se detecta
   automáticamente; el build usa el adaptador `@astrojs/vercel`.

3. **Variables de entorno** en Vercel (Production/Preview/Development):

   ```env
   MONGODB_URI=mongodb+srv://...
   MONGODB_DATABASE=shortqr
   BASE_URL=https://tu-dominio.com
   SLUG_LENGTH=6
   ```

4. Desplegar. Los índices se crean solos en el primer enlace creado.

## Preparado para crecer

La arquitectura está preparada para añadir, sin reescribir las rutas:

- Usuarios, autenticación y límites por usuario (`LinkDocument.ownerId`)
- Panel administrativo con edición, borrado y enlaces personalizados
- QR con logotipo y colores (la generación ya vive en cliente)
- Expiración automática (`expiresAt` ya soportada) y protección con contraseña
- API pública y dominios personalizados (`BASE_URL` por tenant)
- Estadísticas avanzadas: país, navegador, dispositivo, sistema operativo,
  IP anonimizada y referer (nueva colección de eventos sin tocar `links.ts`)
- `recordVisit` y la capa de stats ya están aisladas para agregar eventos

## Licencia

Privado — uso interno.
