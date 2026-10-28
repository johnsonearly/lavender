import type { CategoryId } from '@/domain/categories'
import type { ClothingItem, Pattern } from '@/domain/types'

/**
 * Builds a throwaway ClothingItem for illustration-only previews (onboarding hero, moodboards).
 * These are never persisted and never shown as wardrobe items.
 */
export function displayItem(id: string, category: CategoryId, subcategory: string | null, colors: string[], pattern: Pattern = 'solid'): ClothingItem {
  return {
    id: `display-${id}`, userId: 'display', name: id, category, subcategory, imageUrl: null, imagePath: null, colors, pattern,
    styleTags: [], seasons: [], occasions: [], fit: null, favorite: false, timesWorn: 0, lastWornAt: null, brand: null,
    notes: null, purchase: null, isSample: false, createdAt: '', updatedAt: '',
  }
}

export const HERO_LOOK: ClothingItem[] = [
  displayItem('blouse', 'shirts', 'blouse', ['white']),
  displayItem('skirt', 'skirts', 'midi', ['lavender']),
  displayItem('flats', 'shoes', 'flats', ['blush']),
  displayItem('bag', 'bags', 'handbag', ['purple']),
  displayItem('bow', 'accessories', 'hair', ['lilac']),
  displayItem('necklace', 'jewelry', 'necklace', ['gold']),
]
