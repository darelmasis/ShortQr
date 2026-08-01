import { randomInt } from 'node:crypto'

// Base58 sin caracteres ambiguos (0, O, I, l, 1) para enlaces fáciles de leer
// y tipear manualmente.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

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
