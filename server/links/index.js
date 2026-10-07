import { getSessionUser } from '../lib/auth.js'
import { listUserLinks, serializeLink } from '../lib/links.js'
import { errorResponse, jsonResponse } from '../lib/response.js'

export const config = { runtime: 'nodejs' }

export async function GET(request) {
  const user = getSessionUser(request)
  if (!user) {
    return errorResponse('Debes iniciar sesión.', 401)
  }

  try {
    const links = await listUserLinks(user.sub)
    return jsonResponse({ success: true, links: links.map(serializeLink) })
  } catch (error) {
    console.error('Error listando enlaces:', error)
    return errorResponse('Error interno al listar los enlaces', 500)
  }
}
