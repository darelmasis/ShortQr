import type { APIRoute } from 'astro'
import { clearCookie, createSessionCookie, exchangeOAuthCode, readCookie } from '@/lib/auth'
import { redirectResponse } from '@/lib/response'

const OAUTH_COOKIE = 'shortqr_oauth'
const FAILURE_URL = '/?auth=error'

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state')
  const oauthState = readCookie(request, OAUTH_COOKIE)

  if (!code || !stateParam || !oauthState) {
    return redirectResponse(FAILURE_URL)
  }

  const [state, verifier] = oauthState.split('.')
  if (!verifier || state !== stateParam) {
    return redirectResponse(FAILURE_URL)
  }

  try {
    const user = await exchangeOAuthCode(request, code, verifier)
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/',
        'Set-Cookie': [createSessionCookie(user, request), clearCookie(OAUTH_COOKIE)].join(', '),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error en el callback de Google OAuth:', error)
    return redirectResponse(FAILURE_URL)
  }
}
