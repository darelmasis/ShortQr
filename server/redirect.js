import { findLinkBySlug, isLinkExpired, recordVisit } from './lib/links.js'
import { redirectResponse } from './lib/response.js'
import { isSlugFormatValid } from './lib/validation.js'

export const config = { runtime: 'nodejs' }

export async function GET(request) {
  const url = new URL(request.url)
  const slug =
    url.searchParams.get('slug') ?? url.pathname.split('/').filter(Boolean).pop() ?? ''

  if (!isSlugFormatValid(slug)) {
    return new Response('Not Found', { status: 404 })
  }

  try {
    const link = await findLinkBySlug(slug)

    if (!link || !link.active || isLinkExpired(link)) {
      return new Response('Not Found', { status: 404 })
    }

    await recordVisit(slug)
    return redirectResponse(link.url)
  } catch (error) {
    console.error('Error redirigiendo:', error)
    return new Response('Error interno', { status: 500 })
  }
}
