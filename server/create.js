import { getSessionUser } from './lib/auth.js'
import { resolveBaseUrl } from './lib/env.js'
import { buildShortUrl, createLink, findLinkByUrl, serializeLink } from './lib/links.js'
import { jsonResponse } from './lib/response.js'
import { normalizeExpiresAt, normalizeUrl } from './lib/validation.js'

export const config = { runtime: 'nodejs' }

export async function POST(request) {
  const user = getSessionUser(request)
  if (!user) {
    return jsonResponse({ success: false, error: 'Debes iniciar sesión para crear enlaces.' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ success: false, error: 'El cuerpo de la petición debe ser JSON válido' }, { status: 400 })
  }

  const { url, expiresAt } = body ?? {}

  const validated = normalizeUrl(url)
  if (!validated.ok) {
    return jsonResponse({ success: false, error: validated.error }, { status: 400 })
  }

  const normalizedUrl = validated.value

  const validatedExpiry = normalizeExpiresAt(expiresAt)
  if (!validatedExpiry.ok) {
    return jsonResponse({ success: false, error: validatedExpiry.error }, { status: 400 })
  }

  try {
    const existing = await findLinkByUrl(user.sub, normalizedUrl)
    if (existing) {
      return jsonResponse(
        {
          success: false,
          exists: true,
          existing: {
            ...serializeLink(existing),
            shortUrl: buildShortUrl(resolveBaseUrl(request), existing.slug),
          },
        },
        { status: 409 },
      )
    }

    const link = await createLink({ url: normalizedUrl, ownerId: user.sub, expiresAt: validatedExpiry.value })
    const result = {
      success: true,
      shortUrl: buildShortUrl(resolveBaseUrl(request), link.slug),
      slug: link.slug,
    }
    return jsonResponse(result)
  } catch (error) {
    console.error('Error creando enlace:', error)
    return jsonResponse({ success: false, error: 'Error interno al crear el enlace' }, { status: 500 })
  }
}
