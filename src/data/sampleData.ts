import type { CategoryId } from '@/domain/categories'
import type { ClothingItem, Fit, Outfit, Pattern, Season } from '@/domain/types'
import { createId } from '@/lib/utils'

interface SampleSpec {
  key: string
  name: string
  category: CategoryId
  subcategory: string
  colors: string[]
  pattern?: Pattern
  styleTags: string[]
  seasons?: Season[]
  occasions: string[]
  fit?: Fit
  favorite?: boolean
  brand?: string
}

/** Sample pieces are drawn as illustrations from their metadata — no remote images needed. */
const SAMPLE_ITEMS: SampleSpec[] = [
  { key: 'white-blouse', name: 'White silk blouse', category: 'shirts', subcategory: 'blouse', colors: ['white'], styleTags: ['feminine', 'elegant', 'minimalist'], seasons: ['spring', 'summer', 'autumn'], occasions: ['work', 'church', 'brunch', 'date', 'dinner', 'school', 'interview'], fit: 'regular', favorite: true },
  { key: 'purple-top', name: 'Purple fitted top', category: 'tops', subcategory: 'top', colors: ['purple'], styleTags: ['feminine', 'chic', 'casual'], occasions: ['casual', 'school', 'brunch', 'date', 'party', 'dinner'], fit: 'fitted' },
  { key: 'striped-tee', name: 'Breton striped tee', category: 'tshirts', subcategory: 'crew', colors: ['white', 'navy'], pattern: 'striped', styleTags: ['casual', 'preppy', 'minimalist'], seasons: ['spring', 'summer', 'autumn'], occasions: ['casual', 'school', 'brunch', 'travel'], fit: 'regular' },
  { key: 'black-trousers', name: 'Black tailored trousers', category: 'trousers', subcategory: 'tailored', colors: ['black'], styleTags: ['minimalist', 'business-casual', 'chic', 'elegant'], occasions: ['work', 'interview', 'church', 'dinner', 'date', 'school'], fit: 'regular', favorite: true },
  { key: 'blue-jeans', name: 'Straight blue jeans', category: 'jeans', subcategory: 'straight', colors: ['denim'], styleTags: ['casual', 'streetwear', 'vintage'], occasions: ['casual', 'school', 'brunch', 'travel', 'party'], fit: 'relaxed' },
  { key: 'floral-skirt', name: 'Floral midi skirt', category: 'skirts', subcategory: 'midi', colors: ['blush', 'sage'], pattern: 'floral', styleTags: ['romantic', 'feminine', 'coquette'], seasons: ['spring', 'summer'], occasions: ['brunch', 'church', 'date', 'casual', 'wedding'] },
  { key: 'navy-dress', name: 'Navy midi dress', category: 'dresses', subcategory: 'midi-dress', colors: ['navy'], styleTags: ['elegant', 'minimalist', 'old-money'], occasions: ['dinner', 'wedding', 'church', 'work', 'date', 'formal'] },
  { key: 'cardigan', name: 'Cream knit cardigan', category: 'knitwear', subcategory: 'cardigan', colors: ['cream'], pattern: 'textured', styleTags: ['feminine', 'preppy', 'casual', 'vintage'], seasons: ['spring', 'autumn', 'winter'], occasions: ['casual', 'school', 'work', 'church', 'brunch', 'travel'], fit: 'relaxed' },
  { key: 'trench', name: 'Camel trench coat', category: 'outerwear', subcategory: 'trench', colors: ['camel'], styleTags: ['chic', 'old-money', 'minimalist', 'elegant'], seasons: ['spring', 'autumn'], occasions: ['work', 'dinner', 'church', 'travel', 'date', 'casual'], fit: 'regular' },
  { key: 'sneakers', name: 'White leather sneakers', category: 'shoes', subcategory: 'sneakers', colors: ['white'], styleTags: ['casual', 'sporty', 'streetwear', 'minimalist'], occasions: ['casual', 'school', 'travel', 'active', 'brunch'], favorite: true },
  { key: 'loafers', name: 'Black leather loafers', category: 'shoes', subcategory: 'loafers', colors: ['black'], styleTags: ['preppy', 'old-money', 'business-casual', 'minimalist'], occasions: ['work', 'school', 'church', 'interview', 'dinner'] },
  { key: 'flats', name: 'Blush ballet flats', category: 'shoes', subcategory: 'flats', colors: ['blush'], styleTags: ['feminine', 'coquette', 'romantic'], seasons: ['spring', 'summer'], occasions: ['brunch', 'church', 'date', 'wedding', 'dinner'] },
  { key: 'handbag', name: 'Tan leather handbag', category: 'bags', subcategory: 'handbag', colors: ['camel'], styleTags: ['chic', 'elegant', 'old-money'], occasions: ['work', 'dinner', 'date', 'church', 'brunch', 'wedding'] },
  { key: 'necklace', name: 'Gold pendant necklace', category: 'jewelry', subcategory: 'necklace', colors: ['gold'], styleTags: ['minimalist', 'elegant', 'feminine'], occasions: ['work', 'dinner', 'date', 'church', 'brunch', 'wedding', 'party'] },
  { key: 'hair-bow', name: 'Lilac satin hair bow', category: 'accessories', subcategory: 'hair', colors: ['lilac'], styleTags: ['coquette', 'feminine', 'romantic'], occasions: ['brunch', 'date', 'casual', 'school'] },
]

const SAMPLE_OUTFITS: { name: string; keys: string[]; occasion: string; styleTags: string[]; notes: string; favorite?: boolean }[] = [
  { name: 'Lavender at the office', keys: ['purple-top', 'black-trousers', 'cardigan', 'loafers', 'handbag', 'necklace'], occasion: 'work', styleTags: ['business-casual', 'feminine'], notes: 'Swap the cardigan for the trench when it rains.', favorite: true },
  { name: 'Campus classic', keys: ['striped-tee', 'blue-jeans', 'sneakers', 'cardigan'], occasion: 'school', styleTags: ['casual', 'preppy'], notes: 'Half-tuck the tee for shape.' },
  { name: 'Sunday garden', keys: ['white-blouse', 'floral-skirt', 'flats', 'necklace', 'hair-bow'], occasion: 'church', styleTags: ['romantic', 'feminine'], notes: 'Add the cardigan on a cool morning.', favorite: true },
  { name: 'Navy dinner date', keys: ['navy-dress', 'trench', 'handbag', 'necklace', 'flats'], occasion: 'date', styleTags: ['elegant'], notes: '' },
]

export function createSampleWardrobe(userId: string): { items: ClothingItem[]; outfits: Outfit[] } {
  const now = Date.now()
  const ids = new Map<string, string>()
  const items: ClothingItem[] = SAMPLE_ITEMS.map((spec, index) => {
    const id = createId()
    ids.set(spec.key, id)
    // Stagger timestamps so "recently added" ordering is meaningful.
    const created = new Date(now - (SAMPLE_ITEMS.length - index) * 3_600_000).toISOString()
    return {
      id,
      userId,
      name: spec.name,
      category: spec.category,
      subcategory: spec.subcategory,
      imageUrl: null,
      imagePath: null,
      colors: spec.colors,
      pattern: spec.pattern ?? 'solid',
      styleTags: spec.styleTags,
      seasons: spec.seasons ?? [],
      occasions: spec.occasions,
      fit: spec.fit ?? null,
      favorite: spec.favorite ?? false,
      // No invented wear history: counts start at zero and grow when outfits are marked as worn.
      timesWorn: 0,
      lastWornAt: null,
      brand: null,
      notes: null,
      purchase: null,
      isSample: true,
      createdAt: created,
      updatedAt: created,
    }
  })
  const outfits: Outfit[] = SAMPLE_OUTFITS.map((spec, index) => {
    const created = new Date(now - (SAMPLE_OUTFITS.length - index) * 600_000).toISOString()
    return {
      id: createId(),
      userId,
      name: spec.name,
      clothingItemIds: spec.keys.map((k) => ids.get(k) as string),
      styleTags: spec.styleTags,
      occasion: spec.occasion,
      notes: spec.notes || null,
      favorite: spec.favorite ?? false,
      timesWorn: 0,
      lastWornAt: null,
      parentOutfitId: null,
      source: 'sample',
      isSample: true,
      createdAt: created,
      updatedAt: created,
    }
  })
  return { items, outfits }
}
