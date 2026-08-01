import type { ObjectId } from 'mongodb'

export interface LinkDocument {
  _id: ObjectId
  slug: string
  url: string
  title?: string
  description?: string
  active: boolean
  visits: number
  createdAt: Date
  updatedAt: Date
  lastVisit?: Date
  expiresAt?: Date | null
}

export interface CreateLinkInput {
  url: string
  title?: string
  description?: string
}

export interface CreateLinkResult {
  success: true
  shortUrl: string
  slug: string
}

export interface LinkStats {
  slug: string
  url: string
  active: boolean
  visits: number
  createdAt: Date
  updatedAt: Date
  lastVisit: Date | null
  expiresAt: Date | null
}

export interface ApiErrorBody {
  success: false
  error: string
}
