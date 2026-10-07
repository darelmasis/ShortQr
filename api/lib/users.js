import { ensureIndexes, getUsersCollection } from './mongodb.js'

export async function upsertUserByGoogle(user) {
  await ensureIndexes()

  const collection = await getUsersCollection()
  const now = new Date()

  const doc = await collection.findOneAndUpdate(
    { googleSub: user.sub },
    {
      $set: {
        email: user.email,
        name: user.name,
        ...(user.picture ? { picture: user.picture } : {}),
        updatedAt: now,
        lastLoginAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, returnDocument: 'after' },
  )

  if (!doc) {
    throw new Error('No se pudo crear o actualizar el usuario')
  }
  return doc
}
