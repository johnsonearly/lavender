import { describe, expect, it } from 'vitest'
import { makeItem } from '@/test/fixtures'
import { EMPTY_FILTERS, filterItems } from './filters'

describe('wardrobe filtering', () => {
  const blouse = makeItem('shirts', { name: 'Silk blouse', colors: ['white'], styleTags: ['elegant'], seasons: ['summer'], occasions: ['work'], favorite: true, timesWorn: 2 })
  const jeans = makeItem('jeans', { name: 'Blue jeans', colors: ['denim'], styleTags: ['casual'], occasions: ['casual'], timesWorn: 9 })
  const coat = makeItem('outerwear', { name: 'Wool coat', colors: ['camel'], seasons: ['winter'], brand: 'Atelier' })
  const all = [blouse, jeans, coat]

  it('searches name, brand, colors and tags', () => {
    expect(filterItems(all, { ...EMPTY_FILTERS, query: 'silk' })).toEqual([blouse])
    expect(filterItems(all, { ...EMPTY_FILTERS, query: 'atelier' })).toEqual([coat])
    expect(filterItems(all, { ...EMPTY_FILTERS, query: 'denim' })).toEqual([jeans])
    expect(filterItems(all, { ...EMPTY_FILTERS, query: 'elegant white' })).toEqual([blouse])
  })

  it('filters by category, color, style, occasion and favorites', () => {
    expect(filterItems(all, { ...EMPTY_FILTERS, categories: ['jeans'] })).toEqual([jeans])
    expect(filterItems(all, { ...EMPTY_FILTERS, colors: ['camel', 'white'] }).length).toBe(2)
    expect(filterItems(all, { ...EMPTY_FILTERS, styles: ['casual'] })).toEqual([jeans])
    expect(filterItems(all, { ...EMPTY_FILTERS, occasions: ['work'] })).toEqual([blouse])
    expect(filterItems(all, { ...EMPTY_FILTERS, favoritesOnly: true })).toEqual([blouse])
  })

  it('treats untagged items as all-season', () => {
    const winter = filterItems(all, { ...EMPTY_FILTERS, seasons: ['winter'] })
    expect(winter).toContain(coat)
    expect(winter).toContain(jeans)
    expect(winter).not.toContain(blouse)
  })

  it('sorts by wear count and recency', () => {
    expect(filterItems(all, { ...EMPTY_FILTERS, sort: 'most-worn' })[0]).toBe(jeans)
    expect(filterItems(all, { ...EMPTY_FILTERS, sort: 'recent' })[0]).toBe(coat)
  })
})
