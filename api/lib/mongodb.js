import { MongoClient } from 'mongodb'
import { getDatabaseName, getMongoUri } from './env.js'

const globalForMongo = globalThis

const LINK_COLLECTION = 'links'
const USER_COLLECTION = 'users'

function createClient() {
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

export function getMongoClient() {
  return globalForMongo._shortqrMongoClient ?? createClient()
}

export async function getDb() {
  const client = getMongoClient()
  // Idempotente: no abre una nueva conexión si ya existe.
  await client.connect()
  return client.db(getDatabaseName())
}

export async function getLinksCollection() {
  const db = await getDb()
  return db.collection(LINK_COLLECTION)
}

export async function getUsersCollection() {
  const db = await getDb()
  return db.collection(USER_COLLECTION)
}

const LINK_INDEXES = [
  { key: { slug: 1 }, unique: true },
  { key: { createdAt: 1 } },
  { key: { expiresAt: 1 } },
]

const USER_INDEXES = [{ key: { googleSub: 1 }, unique: true }]

export async function ensureIndexes() {
  if (globalForMongo._shortqrIndexesEnsured) return

  const [links, users] = await Promise.all([getLinksCollection(), getUsersCollection()])
  await links.createIndexes(LINK_INDEXES)
  await users.createIndexes(USER_INDEXES)
  globalForMongo._shortqrIndexesEnsured = true
}
