import { ObjectId, MongoServerError } from 'mongodb'
import { getSlugLength } from './env.js'
import { ensureIndexes, getLinksCollection } from './mongodb.js'
import { generateSlug } from './slug.js'

const MAX_SLUG_ATTEMPTS = 5

function isDuplicateKeyError(error) {
  return error instanceof MongoServerError && error.code === 11000
}

export async function createLink(input) {
  await ensureIndexes()

  const collection = await getLinksCollection()

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const now = new Date()
    const slug = generateSlug(getSlugLength())
    const doc = {
      _id: new ObjectId(),
      slug,
      url: input.url,
      active: true,
      visits: 0,
      createdAt: now,
      updatedAt: now,
      expiresAt: null,
      ...(input.ownerId ? { ownerId: input.ownerId } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
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

export async function findLinkBySlug(slug) {
  const collection = await getLinksCollection()
  return collection.findOne({ slug })
}

export async function findLinkByUrl(ownerId, url) {
  const collection = await getLinksCollection()
  return collection.findOne({ ownerId, url })
}

export function isLinkExpired(link, now = new Date()) {
  if (!link.expiresAt) return false
  return link.expiresAt.getTime() <= now.getTime()
}

export async function recordVisit(slug) {
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

export async function getLinkStats(slug) {
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

export function buildShortUrl(baseUrl, slug) {
  return `${baseUrl}/${slug}`
}

export function getLinkStatus(link, now = new Date()) {
  if (!link.active) return 'inactive'
  if (isLinkExpired(link, now)) return 'expired'
  return 'active'
}

export async function listUserLinks(ownerId) {
  const collection = await getLinksCollection()
  return collection.find({ ownerId }).sort({ createdAt: -1 }).toArray()
}

export async function updateOwnedLink(slug, ownerId, patch) {
  const collection = await getLinksCollection()
  const set = { updatedAt: new Date() }
  if (patch.active !== undefined) set.active = patch.active
  if (patch.expiresAt !== undefined) set.expiresAt = patch.expiresAt
  return collection.findOneAndUpdate({ slug, ownerId }, { $set: set }, { returnDocument: 'after' })
}

export async function deleteOwnedLink(slug, ownerId) {
  const collection = await getLinksCollection()
  const result = await collection.deleteOne({ slug, ownerId })
  return result.deletedCount > 0
}

export function serializeLink(link) {
  return {
    slug: link.slug,
    url: link.url,
    active: link.active,
    visits: link.visits,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    lastVisit: link.lastVisit?.toISOString() ?? null,
    expiresAt: link.expiresAt?.toISOString() ?? null,
  }
}
