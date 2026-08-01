import type { APIRoute } from 'astro'
import { resolveBaseUrl } from '@/lib/env'
import { buildShortUrl, createLink } from '@/lib/links'
import { errorResponse, jsonResponse } from '@/lib/response'
import type { CreateLinkResult } from '@/lib/types'
import { normalizeUrl } from '@/lib/validation'

export const POST: APIRoute = async ({ request }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('El cuerpo de la petición debe ser JSON válido')
  }

  const { url } = (body ?? {}) as { url?: unknown }

  const validated = normalizeUrl(url)
  if (!validated.ok) {
    return errorResponse(validated.error)
  }

  try {
    const link = await createLink({ url: validated.value })
    const result: CreateLinkResult = {
      success: true,
      shortUrl: buildShortUrl(resolveBaseUrl(request), link.slug),
      slug: link.slug,
    }
    return jsonResponse(result)
  } catch (error) {
    console.error('Error creando enlace:', error)
    return errorResponse('Error interno al crear el enlace', 500)
  }
}
