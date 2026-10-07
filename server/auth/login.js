import { createOAuthLogin } from '../lib/auth.js'
import { redirectResponse } from '../lib/response.js'

export const config = { runtime: 'nodejs' }

export function GET(request) {
  try {
    const { url, state } = createOAuthLogin(request)
    const secure = new URL(request.url).protocol === 'https:'

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
