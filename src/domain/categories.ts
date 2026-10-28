import type { ArtKind } from '@/rendering/garmentShapes'

/** Where a piece sits in an outfit. Drives composition rules and preview placement. */
export type Slot = 'top' | 'bottom' | 'onePiece' | 'layer' | 'shoes' | 'bag' | 'jewelry' | 'accessory' | 'other'

export interface SubcategoryDef {
  id: string
  label: string
  art: ArtKind
  /** Overrides the category slot, e.g. a cardigan is worn as a layer. */
  slot?: Slot
  /** Relative warmth 0-3, used for weather heuristics. */
  warmth?: number
}

export interface CategoryDef {
  id: CategoryId
  label: string
  singular: string
  slot: Slot
  defaultArt: ArtKind
  warmth: number
  subcategories: readonly SubcategoryDef[]
}

export const CATEGORY_IDS = [
  'tops', 'tshirts', 'shirts', 'knitwear', 'trousers', 'jeans', 'skirts', 'shorts', 'dresses',
  'jumpsuits', 'outerwear', 'shoes', 'bags', 'jewelry', 'accessories', 'other',
] as const

export type CategoryId = (typeof CATEGORY_IDS)[number]

export const CATEGORIES: readonly CategoryDef[] = [
  {
    id: 'tops', label: 'Tops', singular: 'Top', slot: 'top', defaultArt: 'cami', warmth: 1,
    subcategories: [
      { id: 'camisole', label: 'Camisole / tank', art: 'cami', warmth: 0 },
      { id: 'crop-top', label: 'Crop top', art: 'crop' },
      { id: 'bodysuit', label: 'Bodysuit', art: 'longTee' },
      { id: 'top', label: 'Fitted top', art: 'tee' },
    ],
  },
  {
    id: 'tshirts', label: 'T-shirts', singular: 'T-shirt', slot: 'top', defaultArt: 'tee', warmth: 1,
    subcategories: [
      { id: 'crew', label: 'Crew neck', art: 'tee' },
      { id: 'v-neck', label: 'V-neck', art: 'tee' },
      { id: 'long-sleeve', label: 'Long sleeve', art: 'longTee', warmth: 1.5 },
      { id: 'graphic-tee', label: 'Graphic tee', art: 'tee' },
    ],
  },
  {
    id: 'shirts', label: 'Shirts & blouses', singular: 'Shirt / blouse', slot: 'top', defaultArt: 'blouse', warmth: 1.5,
    subcategories: [
      { id: 'blouse', label: 'Blouse', art: 'blouse' },
      { id: 'button-up', label: 'Button-up shirt', art: 'shirt' },
      { id: 'polo', label: 'Polo', art: 'tee', warmth: 1 },
    ],
  },
  {
    id: 'knitwear', label: 'Sweaters & knitwear', singular: 'Knit', slot: 'top', defaultArt: 'sweater', warmth: 2.5,
    subcategories: [
      { id: 'sweater', label: 'Sweater', art: 'sweater' },
      { id: 'cardigan', label: 'Cardigan', art: 'cardigan', slot: 'layer', warmth: 2 },
      { id: 'hoodie', label: 'Hoodie / sweatshirt', art: 'hoodie' },
      { id: 'knit-top', label: 'Knit top', art: 'longTee', warmth: 1.5 },
    ],
  },
  {
    id: 'trousers', label: 'Trousers', singular: 'Trousers', slot: 'bottom', defaultArt: 'trousers', warmth: 2,
    subcategories: [
      { id: 'tailored', label: 'Tailored', art: 'trousers' },
      { id: 'wide-leg', label: 'Wide-leg', art: 'wideTrousers' },
      { id: 'leggings', label: 'Leggings', art: 'leggings' },
      { id: 'cargo', label: 'Cargo / utility', art: 'trousers' },
    ],
  },
  {
    id: 'jeans', label: 'Jeans', singular: 'Jeans', slot: 'bottom', defaultArt: 'jeans', warmth: 2,
    subcategories: [
      { id: 'straight', label: 'Straight', art: 'jeans' },
      { id: 'skinny', label: 'Skinny', art: 'leggings' },
      { id: 'wide', label: 'Wide / baggy', art: 'wideTrousers' },
      { id: 'flare', label: 'Flare', art: 'wideTrousers' },
    ],
  },
  {
    id: 'skirts', label: 'Skirts', singular: 'Skirt', slot: 'bottom', defaultArt: 'skirtMidi', warmth: 1,
    subcategories: [
      { id: 'mini', label: 'Mini', art: 'skirtMini', warmth: 0.5 },
      { id: 'midi', label: 'Midi', art: 'skirtMidi' },
      { id: 'maxi', label: 'Maxi', art: 'skirtMaxi', warmth: 1.5 },
      { id: 'pleated', label: 'Pleated', art: 'skirtMidi' },
    ],
  },
  {
    id: 'shorts', label: 'Shorts', singular: 'Shorts', slot: 'bottom', defaultArt: 'shorts', warmth: 0,
    subcategories: [
      { id: 'denim-shorts', label: 'Denim shorts', art: 'shorts' },
      { id: 'tailored-shorts', label: 'Tailored shorts', art: 'shorts' },
      { id: 'bike-shorts', label: 'Bike shorts', art: 'shorts' },
    ],
  },
  {
    id: 'dresses', label: 'Dresses', singular: 'Dress', slot: 'onePiece', defaultArt: 'dressMidi', warmth: 1,
    subcategories: [
      { id: 'mini-dress', label: 'Mini', art: 'dressMini', warmth: 0.5 },
      { id: 'midi-dress', label: 'Midi', art: 'dressMidi' },
      { id: 'maxi-dress', label: 'Maxi', art: 'dressMaxi', warmth: 1.5 },
      { id: 'slip-dress', label: 'Slip dress', art: 'slipDress', warmth: 0.5 },
      { id: 'knit-dress', label: 'Knit dress', art: 'dressMidi', warmth: 2.5 },
    ],
  },
  {
    id: 'jumpsuits', label: 'Jumpsuits', singular: 'Jumpsuit', slot: 'onePiece', defaultArt: 'jumpsuit', warmth: 1.5,
    subcategories: [
      { id: 'jumpsuit', label: 'Jumpsuit', art: 'jumpsuit' },
      { id: 'playsuit', label: 'Playsuit / romper', art: 'playsuit', warmth: 0.5 },
      { id: 'overalls', label: 'Overalls', art: 'jumpsuit' },
    ],
  },
  {
    id: 'outerwear', label: 'Jackets & coats', singular: 'Jacket / coat', slot: 'layer', defaultArt: 'jacket', warmth: 3,
    subcategories: [
      { id: 'blazer', label: 'Blazer', art: 'blazer', warmth: 2 },
      { id: 'denim-jacket', label: 'Denim jacket', art: 'jacket', warmth: 2 },
      { id: 'leather-jacket', label: 'Leather jacket', art: 'jacket', warmth: 2.5 },
      { id: 'trench', label: 'Trench coat', art: 'coat', warmth: 3 },
      { id: 'wool-coat', label: 'Wool coat', art: 'coat', warmth: 4 },
      { id: 'puffer', label: 'Puffer', art: 'coat', warmth: 4 },
      { id: 'raincoat', label: 'Raincoat', art: 'coat', warmth: 2.5 },
    ],
  },
  {
    id: 'shoes', label: 'Shoes', singular: 'Shoes', slot: 'shoes', defaultArt: 'sneakers', warmth: 1,
    subcategories: [
      { id: 'sneakers', label: 'Sneakers', art: 'sneakers' },
      { id: 'loafers', label: 'Loafers', art: 'loafers' },
      { id: 'heels', label: 'Heels', art: 'heels', warmth: 0.5 },
      { id: 'flats', label: 'Ballet flats', art: 'flats', warmth: 0.5 },
      { id: 'boots', label: 'Boots', art: 'boots', warmth: 3 },
      { id: 'sandals', label: 'Sandals', art: 'sandals', warmth: 0 },
    ],
  },
  {
    id: 'bags', label: 'Bags', singular: 'Bag', slot: 'bag', defaultArt: 'handbag', warmth: 0,
    subcategories: [
      { id: 'handbag', label: 'Handbag', art: 'handbag' },
      { id: 'tote', label: 'Tote', art: 'tote' },
      { id: 'crossbody', label: 'Crossbody', art: 'crossbody' },
      { id: 'clutch', label: 'Clutch', art: 'clutch' },
      { id: 'backpack', label: 'Backpack', art: 'tote' },
    ],
  },
  {
    id: 'jewelry', label: 'Jewelry', singular: 'Jewelry', slot: 'jewelry', defaultArt: 'necklace', warmth: 0,
    subcategories: [
      { id: 'necklace', label: 'Necklace', art: 'necklace' },
      { id: 'earrings', label: 'Earrings', art: 'earrings' },
      { id: 'bracelet', label: 'Bracelet / watch', art: 'bracelet' },
      { id: 'ring', label: 'Ring', art: 'bracelet' },
    ],
  },
  {
    id: 'accessories', label: 'Accessories', singular: 'Accessory', slot: 'accessory', defaultArt: 'scarf', warmth: 0,
    subcategories: [
      { id: 'belt', label: 'Belt', art: 'belt' },
      { id: 'hat', label: 'Hat', art: 'hat', warmth: 0.5 },
      { id: 'scarf', label: 'Scarf', art: 'scarf', warmth: 1 },
      { id: 'sunglasses', label: 'Sunglasses', art: 'sunglasses' },
      { id: 'hair', label: 'Hair bow / clip', art: 'hairbow' },
    ],
  },
  {
    id: 'other', label: 'Other', singular: 'Piece', slot: 'other', defaultArt: 'generic', warmth: 0,
    subcategories: [],
  },
]

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))

export function getCategory(id: CategoryId): CategoryDef {
  return BY_ID.get(id) ?? (BY_ID.get('other') as CategoryDef)
}

export function getSubcategory(categoryId: CategoryId, subId: string | null | undefined): SubcategoryDef | undefined {
  if (!subId) return undefined
  return getCategory(categoryId).subcategories.find((s) => s.id === subId)
}

export function slotFor(item: { category: CategoryId; subcategory?: string | null }): Slot {
  return getSubcategory(item.category, item.subcategory)?.slot ?? getCategory(item.category).slot
}

export function artFor(item: { category: CategoryId; subcategory?: string | null }): ArtKind {
  return getSubcategory(item.category, item.subcategory)?.art ?? getCategory(item.category).defaultArt
}

export function warmthFor(item: { category: CategoryId; subcategory?: string | null }): number {
  return getSubcategory(item.category, item.subcategory)?.warmth ?? getCategory(item.category).warmth
}

export function categoryLabel(id: CategoryId): string {
  return getCategory(id).label
}

export function subcategoryLabel(categoryId: CategoryId, subId: string | null | undefined): string | undefined {
  return getSubcategory(categoryId, subId)?.label
}

export const SLOT_LABELS: Record<Slot, string> = {
  top: 'Top',
  bottom: 'Bottom',
  onePiece: 'Dress / jumpsuit',
  layer: 'Layer',
  shoes: 'Shoes',
  bag: 'Bag',
  jewelry: 'Jewelry',
  accessory: 'Accessory',
  other: 'Other',
}
