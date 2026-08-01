export function readEnv(name: string): string | undefined {
  return process.env[name] ?? import.meta.env[name]
}

export function getMongoUri(): string {
  const uri = readEnv('MONGODB_URI')
  if (!uri) {
    throw new Error(
      'MONGODB_URI no está definida. Revisa tu archivo .env o las variables de entorno de Vercel.',
    )
  }
  return uri
}

export function getDatabaseName(): string {
  const fromEnv = readEnv('MONGODB_DATABASE')
  if (fromEnv) return fromEnv

  const uri = readEnv('MONGODB_URI')
  const path = uri?.split('?')[0].split('/').pop()
  if (path) return path

  throw new Error(
    'MONGODB_DATABASE no está definida. Revisa tu archivo .env o las variables de entorno de Vercel.',
  )
}

const DEFAULT_SLUG_LENGTH = 6
const MIN_SLUG_LENGTH = 4
const MAX_SLUG_LENGTH = 12

export function getSlugLength(): number {
  const raw = readEnv('SLUG_LENGTH')
  if (!raw) return DEFAULT_SLUG_LENGTH

  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed)) return DEFAULT_SLUG_LENGTH
  return Math.min(Math.max(parsed, MIN_SLUG_LENGTH), MAX_SLUG_LENGTH)
}

export function resolveBaseUrl(request?: Request): string {
  // Solo process.env: import.meta.env.BASE_URL es una variable reservada de
  // Vite/Astro (el path base del proyecto) y colisionaría con la nuestra.
  const configured = process.env.BASE_URL
  if (configured) return configured.replace(/\/+$/, '')
  if (request) return new URL(request.url).origin
  return 'http://localhost:4321'
}
