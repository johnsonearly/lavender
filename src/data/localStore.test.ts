import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { newPlan, newProfile, recordWear } from '@/domain/records'
import { sampleWardrobe } from '@/test/fixtures'
import { LocalStore, resetLocalDbForTests } from './localStore'

describe('local persistence', () => {
  beforeEach(async () => {
    await resetLocalDbForTests()
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('lavender')
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
  })

  it('saves and reloads items, outfits and plans', async () => {
    const store = new LocalStore('user-a')
    const { items, outfits } = sampleWardrobe('user-a')
    await store.saveProfile(newProfile('user-a', 'Maya'))
    await store.saveItems(items)
    await store.saveOutfits(outfits)
    await store.savePlans([newPlan('user-a', { outfitId: outfits[0].id, date: '2026-10-27', occasion: null, notes: null })])

    await resetLocalDbForTests()
    const reopened = new LocalStore('user-a')
    expect((await reopened.getProfile())?.displayName).toBe('Maya')
    expect(await reopened.listItems()).toHaveLength(items.length)
    expect((await reopened.listOutfits()).map((o) => o.name).sort()).toEqual(outfits.map((o) => o.name).sort())
    expect(await reopened.listPlans()).toHaveLength(1)
  })

  it('keeps users isolated from each other', async () => {
    const a = new LocalStore('user-a')
    const b = new LocalStore('user-b')
    const wardrobeA = sampleWardrobe('user-a')
    await a.saveItems(wardrobeA.items)

    expect(await b.listItems()).toEqual([])
    await expect(b.saveItems([wardrobeA.items[0]])).rejects.toThrow(/another user/)
    await expect(b.saveItems([{ ...wardrobeA.items[0], userId: 'user-b' }])).rejects.toThrow(/another user/)
    await b.deleteItem(wardrobeA.items[0].id)
    expect(await a.listItems()).toHaveLength(wardrobeA.items.length)
    await b.deleteAllData()
    expect(await a.listItems()).toHaveLength(wardrobeA.items.length)
  })

  it('removes deleted items from outfits and deleted outfits from the calendar', async () => {
    const store = new LocalStore('user-a')
    const { items, outfits } = sampleWardrobe('user-a')
    await store.saveItems(items)
    await store.saveOutfits(outfits)
    const target = outfits[0]
    await store.savePlans([newPlan('user-a', { outfitId: target.id, date: '2026-11-02', occasion: null, notes: null })])

    await store.deleteItem(target.clothingItemIds[0])
    const updated = (await store.listOutfits()).find((o) => o.id === target.id)
    expect(updated?.clothingItemIds).not.toContain(target.clothingItemIds[0])

    await store.deleteOutfit(target.id)
    expect(await store.listPlans()).toEqual([])
  })

  it('refuses to plan an outfit that does not exist', async () => {
    const store = new LocalStore('user-a')
    await expect(store.savePlans([newPlan('user-a', { outfitId: 'nope', date: '2026-11-02', occasion: null, notes: null })])).rejects.toThrow()
  })

  it('records wears on the outfit and every piece', () => {
    const { items, outfits } = sampleWardrobe('user-a')
    const result = recordWear(outfits[1], items, '2026-10-27T10:00:00.000Z')
    expect(result.outfit.timesWorn).toBe(1)
    expect(result.items).toHaveLength(outfits[1].clothingItemIds.length)
    for (const i of result.items) expect(i.lastWornAt).toBe('2026-10-27T10:00:00.000Z')
  })
})
