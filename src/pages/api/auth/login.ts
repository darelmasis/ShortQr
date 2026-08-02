import type { APIRoute } from 'astro'
import { createOAuthLogin } from '@/lib/auth'
import { redirectResponse } from '@/lib/response'

export const GET: APIRoute = async ({ request }) => {
  try {
    const { url, state } = createOAuthLogin(request)
    const secure = new URL(request.url).protocol === 'https:' || import.meta.env.PROD

    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        'Set-Cookie': `shortqr_oauth=${encodeURIComponent(state)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${
          secure ? '; Secure' : ''
        }`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error configurando el login de Google:', error)
    return redirectResponse('/?auth=error')
  }
}
