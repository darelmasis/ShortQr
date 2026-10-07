import { clearCookie, createSessionCookie, exchangeOAuthCode, readCookie } from '../lib/auth.js'
import { redirectResponse } from '../lib/response.js'
import { upsertUserByGoogle } from '../lib/users.js'

export const config = { runtime: 'nodejs' }

const OAUTH_COOKIE = 'shortqr_oauth'
const FAILURE_URL = '/?auth=error'

export async function GET(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state')
  const errorParam = url.searchParams.get('error')
  const oauthState = readCookie(request, OAUTH_COOKIE)

  if (errorParam) {
    console.error(`Google devolvió error: ${errorParam} (${url.searchParams.get('error_description') ?? ''})`)
    return redirectResponse(FAILURE_URL)
  }

  if (!code || !stateParam || !oauthState) {
    console.error(`Callback incompleto: code=${Boolean(code)} state=${Boolean(stateParam)} cookie=${Boolean(oauthState)}`)
    return redirectResponse(FAILURE_URL)
  }

  const [state, verifier] = oauthState.split('.')
  if (!verifier || state !== stateParam) {
    console.error(`Estado OAuth no coincide: cookie=${state} query=${stateParam}`)
    return redirectResponse(FAILURE_URL)
  }

  try {
    const user = await exchangeOAuthCode(request, code, verifier)
    console.info(`Sesión iniciada para ${user.email} (sub=${user.sub})`)

    try {
      await upsertUserByGoogle(user)
    } catch (error) {
      console.error('Error guardando el usuario en la BD:', error)
    }

    const headers = new Headers({ Location: '/', 'Cache-Control': 'no-store' })
    headers.append('Set-Cookie', createSessionCookie(user, request))
    headers.append('Set-Cookie', clearCookie(OAUTH_COOKIE))
    return new Response(null, { status: 302, headers })
  } catch (error) {
    console.error('Error intercambiando el código por el token:', error)
    return redirectResponse(FAILURE_URL)
  }
}
