import { describe, expect, it } from 'vitest'
import { validateComposition } from '@/domain/outfitRules'
import { slotFor } from '@/domain/categories'
import { byName, sampleWardrobe } from '@/test/fixtures'
import { composeLocalResponse, localStylist, parseRequest } from './localStylist'
import { recommendOutfits } from './recommendationEngine'
import type { StylistContext } from './types'
import { StylistValidationError, validateStylistResponse } from './validateResponse'

const { items, outfits } = sampleWardrobe()
const ctx: StylistContext = { items, outfits, profile: null, weather: null, today: new Date(2026, 9, 27) }
const ids = new Set(items.map((i) => i.id))

describe('recommendation engine', () => {
  it('only uses real inventory items and produces wearable outfits', () => {
    const recs = recommendOutfits(items, null, { count: 5 })
    expect(recs.length).toBeGreaterThan(2)
    for (const r of recs) {
      expect(r.items.every((i) => ids.has(i.id))).toBe(true)
      expect(validateComposition(r.items).valid).toBe(true)
      expect(r.reasons.length).toBeGreaterThan(0)
    }
  })

  it('builds every outfit around an anchor piece', () => {
    const trousers = byName(items, 'Black tailored trousers')
    const recs = recommendOutfits(items, null, { anchorIds: [trousers.id], count: 3 })
    expect(recs).toHaveLength(3)
    for (const r of recs) expect(r.items.map((i) => i.id)).toContain(trousers.id)
  })

  it('respects shoe constraints', () => {
    const recs = recommendOutfits(items, null, { requireShoeTypes: ['sneakers'], count: 3 })
    for (const r of recs) expect(r.items.find((i) => slotFor(i) === 'shoes')?.subcategory).toBe('sneakers')
  })

  it('adds a layer when it is cold', () => {
    const recs = recommendOutfits(items, null, { condition: 'cold', count: 2 })
    for (const r of recs) expect(r.items.some((i) => slotFor(i) === 'layer')).toBe(true)
  })

  it('returns nothing rather than inventing items for an empty wardrobe', () => {
    expect(recommendOutfits([], null, {})).toEqual([])
  })
})

describe('request parsing', () => {
  it('detects occasions, aesthetics and formality', () => {
    const p = parseRequest('I want something feminine but not too dressy for a dinner date', items)
    expect(p.occasion).toBe('date')
    expect(p.aesthetics).toContain('feminine')
    expect(p.formalityRange?.[1]).toBeLessThan(3)
  })
  it('finds anchor items and counts', () => {
    const p = parseRequest('Give me three outfits using these black trousers', items)
    expect(p.count).toBe(3)
    expect(p.anchors.map((a) => a.name)).toEqual(['Black tailored trousers'])
  })
  it('understands "sneakers instead of heels"', () => {
    const p = parseRequest('Suggest an outfit with sneakers instead of heels', items)
    expect(p.requireShoes).toEqual(['sneakers'])
    expect(p.avoidShoes).toEqual(['heels'])
  })
  it('recognises weather words and special intents', () => {
    const p = parseRequest('What can I wear when it is cold and rainy?', items)
    expect(p.condition).toBe('cool')
    expect(p.rain).toBe(true)
    expect(parseRequest('Help me create a small capsule wardrobe', items).intent).toBe('capsule')
    expect(parseRequest('How can I wear my clothes in more combinations?', items).intent).toBe('versatility')
    expect(parseRequest('What is the capital of France?', items).intent).toBe('unsupported')
  })
})

describe('local stylist', () => {
  it('answers sample prompts with validated outfits', async () => {
    const reply = await localStylist.respond({ message: 'Create an outfit for church on Sunday', history: [], selectedItemIds: [] }, ctx)
    expect(reply.response.outfits.length).toBeGreaterThan(0)
    expect(reply.droppedIds).toEqual([])
    expect(reply.response.outfits.every((o) => o.itemIds.every((id) => ids.has(id)))).toBe(true)
  })
  it('gives helpful feedback instead of outfits for unsupported requests', () => {
    const r = composeLocalResponse({ message: 'Tell me a joke about taxes', history: [], selectedItemIds: [] }, ctx)
    expect(r.outfits).toEqual([])
    expect(r.followUp).toBeTruthy()
  })
  it('explains an empty wardrobe', () => {
    const r = composeLocalResponse({ message: 'What should I wear to work?', history: [], selectedItemIds: [] }, { ...ctx, items: [] })
    expect(r.outfits).toEqual([])
    expect(r.message).toMatch(/empty/)
  })
  it('builds a capsule from owned pieces', () => {
    const r = composeLocalResponse({ message: 'capsule wardrobe please', history: [], selectedItemIds: [] }, ctx)
    expect(r.capsule?.itemIds.every((id) => ids.has(id))).toBe(true)
  })
})

describe('AI response validation', () => {
  const blouse = byName(items, 'White silk blouse')
  const jeans = byName(items, 'Straight blue jeans')
  const dress = byName(items, 'Navy midi dress')

  it('drops item ids that are not in the inventory (e.g. hallucinated or another user’s)', () => {
    const { response, droppedIds } = validateStylistResponse(
      {
        message: 'Here you go',
        outfits: [
          { name: 'Look', itemIds: [blouse.id, 'made-up-id', jeans.id], explanation: 'Nice', alternatives: [{ itemId: 'other-user-item', note: 'x' }] },
          { name: 'Ghost look', itemIds: ['ghost-1', 'ghost-2'], explanation: 'Imaginary' },
        ],
      },
      items,
    )
    expect(response.outfits).toHaveLength(1)
    expect(response.outfits[0].itemIds).toEqual([blouse.id, jeans.id])
    expect(response.outfits[0].alternatives).toEqual([])
    expect(droppedIds.sort()).toEqual(['ghost-1', 'ghost-2', 'made-up-id', 'other-user-item'].sort())
  })

  it('resolves incompatible combinations with the studio rules', () => {
    const { response } = validateStylistResponse({ message: 'x', outfits: [{ name: 'Clash', itemIds: [blouse.id, jeans.id, dress.id], explanation: 'x' }] }, items)
    expect(validateComposition(response.outfits[0].itemIds.map((id) => items.find((i) => i.id === id)!)).valid).toBe(true)
  })

  it('rejects malformed output', () => {
    expect(() => validateStylistResponse({ outfits: 'nope' }, items)).toThrow(StylistValidationError)
    expect(() => validateStylistResponse(null, items)).toThrow(StylistValidationError)
  })
})
