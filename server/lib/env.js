export function readEnv(name) {
  return process.env[name]
}

export function getMongoUri() {
  const uri = readEnv('MONGODB_URI')
  if (!uri) {
    throw new Error(
      'MONGODB_URI no está definida. Revisa tu archivo .env o las variables de entorno de Vercel.',
    )
  }
  return uri
}

export function getDatabaseName() {
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

export function getSlugLength() {
  const raw = readEnv('SLUG_LENGTH')
  if (!raw) return DEFAULT_SLUG_LENGTH

  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed)) return DEFAULT_SLUG_LENGTH
  return Math.min(Math.max(parsed, MIN_SLUG_LENGTH), MAX_SLUG_LENGTH)
}

export function resolveBaseUrl(request) {
  const configured = process.env.BASE_URL
  if (configured) return configured.replace(/\/+$/, '')
  if (request) {
    const url = new URL(request.url)
    const host = request.headers.get('host')
    if (host) return `${url.protocol}//${host}`
    return url.origin
  }
  return 'http://localhost:5173'
}
