export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string }

const MAX_URL_LENGTH = 2048
const SLUG_PATTERN = /^[A-Za-z0-9]{1,16}$/

function failure(error: string): { ok: false; error: string } {
  return { ok: false, error }
}

export function normalizeUrl(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') {
    return failure('La URL es obligatoria')
  }

  const trimmed = input.trim()
  if (trimmed.length === 0) {
    return failure('La URL no puede estar vacía')
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return failure('La URL es demasiado larga (máximo 2048 caracteres)')
  }

  // Sin protocolo: asumir https (UX tipo Bitly).
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(withProtocol)
  } catch {
    return failure('La URL no es válida')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return failure('Solo se permiten URLs con protocolo http o https')
  }

  if (!parsed.hostname) {
    return failure('La URL no es válida')
  }

  // Rechaza hostnames sin forma de dominio real (ej: "ht!tp" o "invalida").
  const hostname = parsed.hostname.toLowerCase()
  const looksLikeDomain =
    hostname.includes('.') || hostname === 'localhost' || /^[\d.:[\]]+$/.test(hostname)
  if (!looksLikeDomain) {
    return failure('La URL no es válida')
  }

  return { ok: true, value: parsed.toString() }
}

export function isSlugFormatValid(slug: string): boolean {
  return SLUG_PATTERN.test(slug)
}
