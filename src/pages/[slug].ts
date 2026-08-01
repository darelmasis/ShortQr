import type { APIRoute } from 'astro'
import { findLinkBySlug, isLinkExpired, recordVisit } from '@/lib/links'
import { redirectResponse } from '@/lib/response'
import { isSlugFormatValid } from '@/lib/validation'

export const GET: APIRoute = async ({ params, rewrite }) => {
  const slug = params.slug ?? ''

  if (!isSlugFormatValid(slug)) {
    return rewrite('/404')
  }

  try {
    const link = await findLinkBySlug(slug)

    if (!link || !link.active || isLinkExpired(link)) {
      return rewrite('/404')
    }

    await recordVisit(slug)
    return redirectResponse(link.url)
  } catch (error) {
    console.error('Error redirigiendo:', error)
    return new Response('Error interno', { status: 500 })
  }
}
