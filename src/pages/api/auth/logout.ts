import type { APIRoute } from 'astro'
import { clearCookie } from '@/lib/auth'

export const POST: APIRoute = async () => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': clearCookie('shortqr_session'),
      'Cache-Control': 'no-store',
    },
  })
}
