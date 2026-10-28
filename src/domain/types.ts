import type { CategoryId } from './categories'

export const PATTERNS = ['solid', 'striped', 'floral', 'plaid', 'checked', 'polka-dot', 'graphic', 'animal', 'textured', 'other'] as const
export type Pattern = (typeof PATTERNS)[number]

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const
export type Season = (typeof SEASONS)[number]

export const FITS = ['fitted', 'regular', 'relaxed', 'oversized'] as const
export type Fit = (typeof FITS)[number]

export interface PurchaseInfo {
  price?: number | null
  currency?: string | null
  date?: string | null
  store?: string | null
}

export interface ClothingItem {
  id: string
  userId: string
  name: string
  category: CategoryId
  subcategory: string | null
  /** Displayable image URL (data URL locally, signed URL with Supabase). */
  imageUrl: string | null
  /** Storage key for backends that keep images outside the record. */
  imagePath: string | null
  colors: string[]
  pattern: Pattern
  styleTags: string[]
  seasons: Season[]
  occasions: string[]
  fit: Fit | null
  favorite: boolean
  timesWorn: number
  lastWornAt: string | null
  brand: string | null
  notes: string | null
  purchase: PurchaseInfo | null
  isSample: boolean
  createdAt: string
  updatedAt: string
}

export type OutfitSource = 'studio' | 'stylist' | 'sample'

export interface Outfit {
  id: string
  userId: string
  name: string
  clothingItemIds: string[]
  styleTags: string[]
  occasion: string | null
  notes: string | null
  favorite: boolean
  timesWorn: number
  lastWornAt: string | null
  /** Set when this outfit was created as a variation of another. */
  parentOutfitId: string | null
  source: OutfitSource
  isSample: boolean
  createdAt: string
  updatedAt: string
}

export interface PlannedOutfit {
  id: string
  userId: string
  outfitId: string
  /** Local calendar date, YYYY-MM-DD. */
  date: string
  occasion: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type PreferenceStrength = 1 | 2 | 3

export interface StylePreference {
  aesthetic: string
  preferenceStrength: PreferenceStrength
}

export interface WeatherLocation {
  latitude: number
  longitude: number
  label: string
}

export interface UserSettings {
  showStyleScores: boolean
  showShoppingSuggestions: boolean
  weatherEnabled: boolean
  weatherLocation: WeatherLocation | null
  temperatureUnit: 'celsius' | 'fahrenheit'
}

export interface UserProfile {
  id: string
  displayName: string
  stylePreferences: StylePreference[]
  favoriteColors: string[]
  avoidedColors: string[]
  stylingGoals: string[]
  preferredCategories: CategoryId[]
  typicalOccasions: string[]
  preferredFit: Fit | null
  budget: { amount: number; currency: string } | null
  settings: UserSettings
  onboardingCompleted: boolean
  createdAt: string
  updatedAt: string
}

export const DEFAULT_SETTINGS: UserSettings = {
  showStyleScores: true,
  showShoppingSuggestions: true,
  weatherEnabled: false,
  weatherLocation: null,
  temperatureUnit: 'celsius',
}

export const STYLING_GOALS = [
  { id: 'combinations', label: 'Make better outfit combinations' },
  { id: 'confidence', label: 'Dress more confidently' },
  { id: 'plan-ahead', label: 'Plan outfits ahead of time' },
  { id: 'use-more', label: 'Get more use out of existing clothes' },
  { id: 'capsule', label: 'Build a capsule wardrobe' },
  { id: 'discover', label: 'Discover my personal style' },
] as const

export const PATTERN_LABELS: Record<Pattern, string> = {
  solid: 'Solid',
  striped: 'Striped',
  floral: 'Floral',
  plaid: 'Plaid',
  checked: 'Gingham / check',
  'polka-dot': 'Polka dot',
  graphic: 'Graphic',
  animal: 'Animal print',
  textured: 'Textured / knit',
  other: 'Other',
}

export const SEASON_LABELS: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
}

export const FIT_LABELS: Record<Fit, string> = {
  fitted: 'Fitted',
  regular: 'Regular',
  relaxed: 'Relaxed',
  oversized: 'Oversized / wide',
}
