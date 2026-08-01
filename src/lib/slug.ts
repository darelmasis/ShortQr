import { randomInt } from 'node:crypto'

// Base32 sin caracteres ambiguos (0, O, I, l, 1) y solo mayúsculas:
// permite que el QR codifique la URL en modo alfanumérico (mayúsculas)
// y baje de versión con dominios cortos.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateSlug(length: number): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error(`Longitud de slug inválida: ${length}`)
  }

  let slug = ''
  for (let i = 0; i < length; i++) {
    slug += ALPHABET[randomInt(ALPHABET.length)]
  }
  return slug
}
