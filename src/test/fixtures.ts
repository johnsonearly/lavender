import { createSampleWardrobe } from '@/data/sampleData'
import type { CategoryId } from '@/domain/categories'
import type { ClothingItem } from '@/domain/types'

let n = 0
export function makeItem(category: CategoryId, overrides: Partial<ClothingItem> = {}): ClothingItem {
  n++
  const now = new Date(2026, 0, 1, 0, n).toISOString()
  return {
    id: `item-${n}`, userId: 'user-a', name: `${category} ${n}`, category, subcategory: null, imageUrl: null, imagePath: null,
    colors: ['black'], pattern: 'solid', styleTags: [], seasons: [], occasions: [], fit: null, favorite: false, timesWorn: 0,
    lastWornAt: null, brand: null, notes: null, purchase: null, isSample: false, createdAt: now, updatedAt: now, ...overrides,
  }
}

export function sampleWardrobe(userId = 'user-a') {
  return createSampleWardrobe(userId)
}

export function byName(items: ClothingItem[], name: string): ClothingItem {
  const item = items.find((i) => i.name === name)
  if (!item) throw new Error(`fixture missing ${name}`)
  return item
}
