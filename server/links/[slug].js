import { getSessionUser } from '../lib/auth.js'
import { deleteOwnedLink, serializeLink, updateOwnedLink } from '../lib/links.js'
import { errorResponse, jsonResponse } from '../lib/response.js'
import { isSlugFormatValid, normalizeExpiresAt } from '../lib/validation.js'

export const config = { runtime: 'nodejs' }

function getSlug(request) {
  return new URL(request.url).pathname.split('/').filter(Boolean).pop() ?? ''
}

function parseBody(body) {
  if (!body || typeof body !== 'object') return {}
  return { active: body.active, expiresAt: body.expiresAt }
}

function requireUser(request) {
  return getSessionUser(request)
}

export async function PATCH(request) {
  const user = requireUser(request)
  if (!user) {
    return errorResponse('Debes iniciar sesión.', 401)
  }

  const slug = getSlug(request)
  if (!isSlugFormatValid(slug)) {
    return errorResponse('Enlace no encontrado', 404)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return errorResponse('El cuerpo de la petición debe ser JSON válido')
  }

  const { active, expiresAt } = parseBody(body)

  const patch = {}

  if (active !== undefined) {
    if (typeof active !== 'boolean') {
      return errorResponse('El campo "active" debe ser un booleano')
    }
    patch.active = active
  }

  if (expiresAt !== undefined) {
    const normalized = normalizeExpiresAt(expiresAt)
    if (!normalized.ok) {
      return errorResponse(normalized.error)
    }
    patch.expiresAt = normalized.value
  }

  if (Object.keys(patch).length === 0) {
    return errorResponse('No hay campos para actualizar')
  }

  try {
    const link = await updateOwnedLink(slug, user.sub, patch)
    if (!link) {
      return errorResponse('Enlace no encontrado', 404)
    }
    return jsonResponse({ success: true, link: serializeLink(link) })
  } catch (error) {
    console.error('Error actualizando enlace:', error)
    return errorResponse('Error interno al actualizar el enlace', 500)
  }
}

export async function DELETE(request) {
  const user = requireUser(request)
  if (!user) {
    return errorResponse('Debes iniciar sesión.', 401)
  }

  const slug = getSlug(request)
  if (!isSlugFormatValid(slug)) {
    return errorResponse('Enlace no encontrado', 404)
  }

  try {
    const deleted = await deleteOwnedLink(slug, user.sub)
    if (!deleted) {
      return errorResponse('Enlace no encontrado', 404)
    }
    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Error eliminando enlace:', error)
    return errorResponse('Error interno al eliminar el enlace', 500)
  }
}
