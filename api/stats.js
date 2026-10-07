import { getLinkStats } from './lib/links.js'
import { errorResponse, jsonResponse } from './lib/response.js'
import { isSlugFormatValid } from './lib/validation.js'

export const config = { runtime: 'nodejs' }

export async function GET(request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug') ?? ''

  if (!isSlugFormatValid(slug)) {
    return errorResponse('Enlace no encontrado', 404)
  }

  try {
    const stats = await getLinkStats(slug)
    if (!stats) {
      return errorResponse('Enlace no encontrado', 404)
    }
    return jsonResponse({ success: true, ...stats })
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error)
    return errorResponse('Error interno al obtener las estadísticas', 500)
  }
}
