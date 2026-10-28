import { CATEGORIES, categoryLabel, subcategoryLabel, type CategoryId } from './categories'
import { colorLabel } from './colors'
import type { ClothingItem, Season } from './types'

export type WardrobeSort = 'recent' | 'oldest' | 'category' | 'most-worn' | 'least-worn' | 'name'

export interface WardrobeFilters {
  query: string
  categories: CategoryId[]
  colors: string[]
  seasons: Season[]
  styles: string[]
  occasions: string[]
  favoritesOnly: boolean
  sort: WardrobeSort
}

export const EMPTY_FILTERS: WardrobeFilters = {
  query: '',
  categories: [],
  colors: [],
  seasons: [],
  styles: [],
  occasions: [],
  favoritesOnly: false,
  sort: 'recent',
}

export function activeFilterCount(f: WardrobeFilters): number {
  return f.categories.length + f.colors.length + f.seasons.length + f.styles.length + f.occasions.length + (f.favoritesOnly ? 1 : 0)
}

function searchableText(item: ClothingItem): string {
  return [
    item.name,
    item.brand ?? '',
    categoryLabel(item.category),
    subcategoryLabel(item.category, item.subcategory) ?? '',
    ...item.styleTags,
    ...item.colors.map(colorLabel),
    item.notes ?? '',
  ]
    .join(' ')
    .toLowerCase()
}

const intersects = <T,>(a: readonly T[], b: readonly T[]) => b.length === 0 || a.some((v) => b.includes(v))

export function filterItems(items: readonly ClothingItem[], f: WardrobeFilters): ClothingItem[] {
  const terms = f.query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const result = items.filter((item) => {
    if (f.favoritesOnly && !item.favorite) return false
    if (f.categories.length && !f.categories.includes(item.category)) return false
    if (!intersects(item.colors, f.colors)) return false
    // Items without season tags are treated as all-season.
    if (f.seasons.length && item.seasons.length && !intersects(item.seasons, f.seasons)) return false
    if (!intersects(item.styleTags, f.styles)) return false
    if (!intersects(item.occasions, f.occasions)) return false
    if (terms.length) {
      const text = searchableText(item)
      if (!terms.every((t) => text.includes(t))) return false
    }
    return true
  })
  return sortItems(result, f.sort)
}

const categoryIndex = new Map(CATEGORIES.map((c, i) => [c.id, i]))

export function sortItems(items: ClothingItem[], sort: WardrobeSort): ClothingItem[] {
  const sorted = [...items]
  switch (sort) {
    case 'recent':
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    case 'oldest':
      return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    case 'category':
      return sorted.sort((a, b) => (categoryIndex.get(a.category) ?? 99) - (categoryIndex.get(b.category) ?? 99) || a.name.localeCompare(b.name))
    case 'most-worn':
      return sorted.sort((a, b) => b.timesWorn - a.timesWorn || a.name.localeCompare(b.name))
    case 'least-worn':
      return sorted.sort((a, b) => a.timesWorn - b.timesWorn || a.createdAt.localeCompare(b.createdAt))
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
  }
}

export function collectTags(items: readonly ClothingItem[]): string[] {
  return Array.from(new Set(items.flatMap((i) => i.styleTags))).sort()
}
