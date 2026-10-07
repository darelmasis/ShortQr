import { getSessionUser } from '../lib/auth.js'
import { jsonResponse } from '../lib/response.js'

export const config = { runtime: 'nodejs' }

export function GET(request) {
  const user = getSessionUser(request)
  return jsonResponse({ success: true, user })
}
