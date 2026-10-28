import { describe, expect, it } from 'vitest'
import { makeItem } from '@/test/fixtures'
import { addToOutfit, hasBase, validateComposition } from './outfitRules'

describe('outfit composition rules', () => {
  const top = makeItem('shirts', { name: 'Blouse' })
  const jeans = makeItem('jeans', { name: 'Jeans' })
  const dress = makeItem('dresses', { name: 'Dress' })
  const sneakers = makeItem('shoes', { name: 'Sneakers', subcategory: 'sneakers' })
  const loafers = makeItem('shoes', { name: 'Loafers', subcategory: 'loafers' })
  const cardigan = makeItem('knitwear', { name: 'Cardigan', subcategory: 'cardigan' })

  it('a dress replaces a separate top and bottom', () => {
    let items = addToOutfit([], top).items
    items = addToOutfit(items, jeans).items
    const change = addToOutfit(items, dress)
    expect(change.items.map((i) => i.id)).toEqual([dress.id])
    expect(change.removed).toHaveLength(2)
    expect(change.message).toMatch(/covers top and bottom/)
  })

  it('a top replaces a dress', () => {
    const change = addToOutfit([dress, sneakers], top)
    expect(change.items.map((i) => i.name).sort()).toEqual(['Blouse', 'Sneakers'])
  })

  it('swaps shoes instead of stacking them', () => {
    const change = addToOutfit([top, sneakers], loafers)
    expect(change.items.filter((i) => i.category === 'shoes')).toEqual([loafers])
    expect(change.message).toMatch(/Swapped Sneakers/)
  })

  it('treats a cardigan as a layer that can go over a top', () => {
    const change = addToOutfit([top, jeans], cardigan)
    expect(change.items).toHaveLength(3)
    expect(change.removed).toHaveLength(0)
  })

  it('allows several jewelry pieces but only one of each kind', () => {
    const n1 = makeItem('jewelry', { subcategory: 'necklace' })
    const n2 = makeItem('jewelry', { subcategory: 'necklace' })
    const e = makeItem('jewelry', { subcategory: 'earrings' })
    let items = addToOutfit([], n1).items
    items = addToOutfit(items, e).items
    items = addToOutfit(items, n2).items
    expect(items.map((i) => i.id).sort()).toEqual([e.id, n2.id].sort())
  })

  it('ignores adding the same piece twice', () => {
    expect(addToOutfit([top], top).items).toEqual([top])
  })

  it('validates finished outfits', () => {
    expect(validateComposition([top, jeans, sneakers]).valid).toBe(true)
    expect(validateComposition([dress, top]).valid).toBe(false)
    expect(validateComposition([sneakers, loafers]).issues[0]).toMatch(/shoes/i)
    expect(hasBase([top, jeans])).toBe(true)
    expect(hasBase([top, sneakers])).toBe(false)
  })
})

describe('saved outfit matching', () => {
  it('finds an outfit with the same pieces regardless of order', async () => {
    const { findOutfitWithItems } = await import('./outfitRules')
    const outfits = [{ id: 'a', clothingItemIds: ['1', '2', '3'] }]
    expect(findOutfitWithItems(outfits, ['3', '1', '2'])?.id).toBe('a')
    expect(findOutfitWithItems(outfits, ['1', '2'])).toBeUndefined()
  })
})
