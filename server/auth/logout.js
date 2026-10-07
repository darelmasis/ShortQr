import { clearCookie } from '../lib/auth.js'

export const config = { runtime: 'nodejs' }

export function POST(_request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Set-Cookie': clearCookie('shortqr_session'),
      'Cache-Control': 'no-store',
    },
  })
}
