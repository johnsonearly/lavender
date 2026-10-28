import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ClothingItem, Outfit, PlannedOutfit, UserProfile } from '@/domain/types'
import { nowIso } from '@/lib/utils'
import { DataAccessError, type DataStore } from './store'

interface LavenderDB extends DBSchema {
  profiles: { key: string; value: UserProfile }
  items: { key: string; value: ClothingItem; indexes: { byUser: string } }
  outfits: { key: string; value: Outfit; indexes: { byUser: string } }
  plans: { key: string; value: PlannedOutfit; indexes: { byUser: string } }
}

const DB_NAME = 'lavender'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<LavenderDB>> | null = null

function getDb(): Promise<IDBPDatabase<LavenderDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LavenderDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('profiles', { keyPath: 'id' })
        db.createObjectStore('items', { keyPath: 'id' }).createIndex('byUser', 'userId')
        db.createObjectStore('outfits', { keyPath: 'id' }).createIndex('byUser', 'userId')
        db.createObjectStore('plans', { keyPath: 'id' }).createIndex('byUser', 'userId')
      },
    }).catch((err: unknown) => {
      dbPromise = null
      throw new DataAccessError('Your browser blocked local storage. Private browsing can cause this.', err)
    })
  }
  return dbPromise
}

/** Test hook: forget the cached connection (used with fake-indexeddb). */
export async function resetLocalDbForTests(): Promise<void> {
  const pending = dbPromise
  dbPromise = null
  if (pending) (await pending.catch(() => null))?.close()
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Browser-only demo persistence. Records are keyed by a per-browser user id. */
export class LocalStore implements DataStore {
  readonly mode = 'local' as const

  constructor(readonly userId: string) {}

  private assertOwner<T extends { userId: string }>(records: T[]): void {
    if (records.some((r) => r.userId !== this.userId)) throw new DataAccessError('Refusing to write a record owned by another user.')
  }

  async getProfile(): Promise<UserProfile | null> {
    return (await (await getDb()).get('profiles', this.userId)) ?? null
  }

  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    if (profile.id !== this.userId) throw new DataAccessError('Refusing to write another user’s profile.')
    await (await getDb()).put('profiles', profile)
    return profile
  }

  async listItems(): Promise<ClothingItem[]> {
    return (await getDb()).getAllFromIndex('items', 'byUser', this.userId)
  }

  async saveItems(items: ClothingItem[]): Promise<void> {
    this.assertOwner(items)
    const tx = (await getDb()).transaction('items', 'readwrite')
    for (const item of items) {
      const existing = await tx.store.get(item.id)
      if (existing && existing.userId !== this.userId) throw new DataAccessError('Item id belongs to another user.')
      await tx.store.put(item)
    }
    await tx.done
  }

  async deleteItem(id: string): Promise<void> {
    const db = await getDb()
    const tx = db.transaction(['items', 'outfits'], 'readwrite')
    const item = await tx.objectStore('items').get(id)
    if (!item || item.userId !== this.userId) {
      await tx.done
      return
    }
    await tx.objectStore('items').delete(id)
    const outfits = await tx.objectStore('outfits').index('byUser').getAll(this.userId)
    for (const outfit of outfits) {
      if (!outfit.clothingItemIds.includes(id)) continue
      await tx.objectStore('outfits').put({ ...outfit, clothingItemIds: outfit.clothingItemIds.filter((x) => x !== id), updatedAt: nowIso() })
    }
    await tx.done
  }

  async listOutfits(): Promise<Outfit[]> {
    return (await getDb()).getAllFromIndex('outfits', 'byUser', this.userId)
  }

  async saveOutfits(outfits: Outfit[]): Promise<void> {
    this.assertOwner(outfits)
    const tx = (await getDb()).transaction('outfits', 'readwrite')
    for (const outfit of outfits) {
      const existing = await tx.store.get(outfit.id)
      if (existing && existing.userId !== this.userId) throw new DataAccessError('Outfit id belongs to another user.')
      await tx.store.put(outfit)
    }
    await tx.done
  }

  async deleteOutfit(id: string): Promise<void> {
    const tx = (await getDb()).transaction(['outfits', 'plans'], 'readwrite')
    const outfit = await tx.objectStore('outfits').get(id)
    if (!outfit || outfit.userId !== this.userId) {
      await tx.done
      return
    }
    await tx.objectStore('outfits').delete(id)
    const plans = await tx.objectStore('plans').index('byUser').getAll(this.userId)
    for (const plan of plans) if (plan.outfitId === id) await tx.objectStore('plans').delete(plan.id)
    await tx.done
  }

  async listPlans(): Promise<PlannedOutfit[]> {
    return (await getDb()).getAllFromIndex('plans', 'byUser', this.userId)
  }

  async savePlans(plans: PlannedOutfit[]): Promise<void> {
    this.assertOwner(plans)
    const tx = (await getDb()).transaction(['plans', 'outfits'], 'readwrite')
    for (const plan of plans) {
      const outfit = await tx.objectStore('outfits').get(plan.outfitId)
      if (!outfit || outfit.userId !== this.userId) throw new DataAccessError('Cannot plan an outfit that does not exist.')
      const existing = await tx.objectStore('plans').get(plan.id)
      if (existing && existing.userId !== this.userId) throw new DataAccessError('Plan id belongs to another user.')
      await tx.objectStore('plans').put(plan)
    }
    await tx.done
  }

  async deletePlan(id: string): Promise<void> {
    const db = await getDb()
    const plan = await db.get('plans', id)
    if (plan && plan.userId === this.userId) await db.delete('plans', id)
  }

  async storeImage(blob: Blob): Promise<{ imageUrl: string; imagePath: string | null }> {
    return { imageUrl: await blobToDataUrl(blob), imagePath: null }
  }

  async removeImage(): Promise<void> {
    // Images live inside the item record locally; nothing else to clean up.
  }

  async deleteAllData(): Promise<void> {
    const db = await getDb()
    const tx = db.transaction(['profiles', 'items', 'outfits', 'plans'], 'readwrite')
    for (const name of ['items', 'outfits', 'plans'] as const) {
      const keys = await tx.objectStore(name).index('byUser').getAllKeys(this.userId)
      for (const key of keys) await tx.objectStore(name).delete(key)
    }
    await tx.objectStore('profiles').delete(this.userId)
    await tx.done
  }
}

const LOCAL_USER_KEY = 'lavender.localUserId'

export function getLocalUserId(): string {
  try {
    const existing = localStorage.getItem(LOCAL_USER_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(LOCAL_USER_KEY, id)
    return id
  } catch {
    return 'local-user'
  }
}
