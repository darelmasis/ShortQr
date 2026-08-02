import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { readEnv, resolveBaseUrl } from '@/lib/env'

export interface SessionUser {
  sub: string
  email: string
  name: string
  picture?: string
}

interface SessionPayload extends SessionUser {
  iat: number
  exp: number
}

const SESSION_COOKIE = 'shortqr_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

function b64u(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url')
}

function getGoogleClientId(): string {
  const value = readEnv('GOOGLE_CLIENT_ID')
  if (!value) {
    throw new Error('GOOGLE_CLIENT_ID no está definida. Revisa tu archivo .env o Vercel.')
  }
  return value
}

function getGoogleClientSecret(): string {
  const value = readEnv('GOOGLE_CLIENT_SECRET')
  if (!value) {
    throw new Error('GOOGLE_CLIENT_SECRET no está definida. Revisa tu archivo .env o Vercel.')
  }
  return value
}

function getSessionSecret(): string {
  const value = readEnv('SESSION_SECRET')
  if (!value || value.length < 32) {
    throw new Error('SESSION_SECRET debe tener al menos 32 caracteres. Revisa tu .env o Vercel.')
  }
  return value
}

// ---------- JWT (HS256) ----------

export function signSession(user: SessionUser, ttlSeconds = SESSION_TTL_SECONDS): string {
  const now = Math.floor(Date.now() / 1000)
  const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = b64u(JSON.stringify({ ...user, iat: now, exp: now + ttlSeconds }))
  const signature = createHmac('sha256', getSessionSecret())
    .update(`${header}.${payload}`)
    .digest('base64url')
  return `${header}.${payload}.${signature}`
}

export function verifySession(token: string): SessionUser | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const expected = createHmac('sha256', getSessionSecret())
    .update(`${parts[0]}.${parts[1]}`)
    .digest('base64url')
  const actual = Buffer.from(parts[2])
  if (actual.length !== Buffer.from(expected).length || !timingSafeEqual(actual, Buffer.from(expected))) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as SessionPayload
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null
    return { sub: payload.sub, email: payload.email, name: payload.name, picture: payload.picture }
  } catch {
    return null
  }
}

// ---------- Cookies ----------

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

export function buildCookie(name: string, value: string, options: { maxAge: number; secure: boolean }): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${options.maxAge}`,
  ]
  if (options.secure) parts.push('Secure')
  return parts.join('; ')
}

export function clearCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

function isSecureRequest(request: Request): boolean {
  return import.meta.env.PROD || new URL(request.url).protocol === 'https:'
}

export function getSessionUser(request: Request): SessionUser | null {
  const token = readCookie(request, SESSION_COOKIE)
  if (!token) return null
  return verifySession(token)
}

export function createSessionCookie(user: SessionUser, request: Request): string {
  const token = signSession(user)
  return buildCookie(SESSION_COOKIE, token, {
    maxAge: SESSION_TTL_SECONDS,
    secure: isSecureRequest(request),
  })
}

// ---------- OAuth con Google (Authorization Code + PKCE) ----------

function oauthRedirectUri(request: Request): string {
  return `${resolveBaseUrl(request)}/api/auth/callback`
}

export function createOAuthLogin(request: Request): { url: string; state: string } {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const state = randomBytes(16).toString('base64url')

  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: oauthRedirectUri(request),
    response_type: 'code',
    scope: 'openid email profile',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    prompt: 'select_account',
  })

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    state: `${state}.${verifier}`,
  }
}

export async function exchangeOAuthCode(request: Request, code: string, verifier: string): Promise<SessionUser> {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      code,
      code_verifier: verifier,
      redirect_uri: oauthRedirectUri(request),
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenResponse.ok) {
    throw new Error(`Google token exchange falló (${tokenResponse.status})`)
  }

  const token = (await tokenResponse.json()) as { access_token?: string }
  if (!token.access_token) {
    throw new Error('Google no devolvió access_token')
  }

  const infoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  })

  if (!infoResponse.ok) {
    throw new Error(`Google userinfo falló (${infoResponse.status})`)
  }

  const info = (await infoResponse.json()) as {
    sub: string
    email: string
    name: string
    picture?: string
  }

  return {
    sub: info.sub,
    email: info.email,
    name: info.name || info.email.split('@')[0] || 'Usuario',
    picture: info.picture,
  }
}
