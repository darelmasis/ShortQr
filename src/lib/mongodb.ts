import { MongoClient } from 'mongodb'
import type { Collection, Db, IndexDescription } from 'mongodb'
import { getDatabaseName, getMongoUri } from './env'
import type { LinkDocument } from './types'

const globalForMongo = globalThis as unknown as {
  _shortqrMongoClient?: MongoClient
  _shortqrIndexesEnsured?: boolean
}

const LINK_COLLECTION = 'links'

function createClient(): MongoClient {
  const client = new MongoClient(getMongoUri(), {
    // Límite conservador: cada instancia serverless reutiliza su pool entre
    // requests calientes y no debe agotar el límite de conexiones de Atlas.
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10_000,
  })
  globalForMongo._shortqrMongoClient = client
  return client
}

export function getMongoClient(): MongoClient {
  return globalForMongo._shortqrMongoClient ?? createClient()
}

export async function getDb(): Promise<Db> {
  const client = getMongoClient()
  // Idempotente: no abre una nueva conexión si ya existe.
  await client.connect()
  return client.db(getDatabaseName())
}

export async function getLinksCollection(): Promise<Collection<LinkDocument>> {
  const db = await getDb()
  return db.collection<LinkDocument>(LINK_COLLECTION)
}

const LINK_INDEXES: IndexDescription[] = [
  { key: { slug: 1 }, unique: true },
  { key: { createdAt: 1 } },
  { key: { expiresAt: 1 } },
]

export async function ensureIndexes(): Promise<void> {
  if (globalForMongo._shortqrIndexesEnsured) return

  const collection = await getLinksCollection()
  await collection.createIndexes(LINK_INDEXES)
  globalForMongo._shortqrIndexesEnsured = true
}
