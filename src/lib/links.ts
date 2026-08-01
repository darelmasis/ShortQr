import { ObjectId } from 'mongodb'
import { MongoServerError } from 'mongodb'
import { getSlugLength } from './env'
import { ensureIndexes, getLinksCollection } from './mongodb'
import { generateSlug } from './slug'
import type { CreateLinkInput, LinkDocument, LinkStats } from './types'

const MAX_SLUG_ATTEMPTS = 5

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000
}

export async function createLink(input: CreateLinkInput): Promise<LinkDocument> {
  await ensureIndexes()

  const collection = await getLinksCollection()

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const now = new Date()
    const slug = generateSlug(getSlugLength())
    const doc: LinkDocument = {
      _id: new ObjectId(),
      slug,
      url: input.url,
      active: true,
      visits: 0,
      createdAt: now,
      updatedAt: now,
      expiresAt: null,
      ...(input.title ? { title: input.title } : {}),
      ...(input.description ? { description: input.description } : {}),
    }

    try {
      await collection.insertOne(doc)
      return doc
    } catch (error) {
      // Colisión de slug: el índice único la detecta de forma atómica.
      if (isDuplicateKeyError(error)) continue
      throw error
    }
  }

  throw new Error('No se pudo generar un slug único después de varios intentos')
}

export async function findLinkBySlug(slug: string): Promise<LinkDocument | null> {
  const collection = await getLinksCollection()
  return collection.findOne({ slug })
}

export function isLinkExpired(link: LinkDocument, now: Date = new Date()): boolean {
  if (!link.expiresAt) return false
  return link.expiresAt.getTime() <= now.getTime()
}

export async function recordVisit(slug: string): Promise<boolean> {
  const collection = await getLinksCollection()
  const result = await collection.updateOne(
    { slug },
    {
      $inc: { visits: 1 },
      $set: { lastVisit: new Date() },
    },
  )
  return result.matchedCount > 0
}

export async function getLinkStats(slug: string): Promise<LinkStats | null> {
  const link = await findLinkBySlug(slug)
  if (!link) return null

  return {
    slug: link.slug,
    url: link.url,
    active: link.active,
    visits: link.visits,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
    lastVisit: link.lastVisit ?? null,
    expiresAt: link.expiresAt ?? null,
  }
}

export function buildShortUrl(baseUrl: string, slug: string): string {
  return `${baseUrl}/${slug}`
}
