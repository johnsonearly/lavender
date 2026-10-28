import { createId, nowIso } from '@/lib/utils'
import type { ClothingItemValues, OutfitValues, PlannedOutfitValues } from './schemas'
import { DEFAULT_SETTINGS, type ClothingItem, type Outfit, type OutfitSource, type PlannedOutfit, type UserProfile } from './types'

export function newProfile(userId: string, displayName = ''): UserProfile {
  const now = nowIso()
  return {
    id: userId,
    displayName,
    stylePreferences: [],
    favoriteColors: [],
    avoidedColors: [],
    stylingGoals: [],
    preferredCategories: [],
    typicalOccasions: [],
    preferredFit: null,
    budget: null,
    settings: { ...DEFAULT_SETTINGS },
    onboardingCompleted: false,
    createdAt: now,
    updatedAt: now,
  }
}

export function newItem(userId: string, values: ClothingItemValues, id = createId()): ClothingItem {
  const now = nowIso()
  return {
    id,
    userId,
    ...values,
    imagePath: null,
    favorite: false,
    timesWorn: 0,
    lastWornAt: null,
    isSample: false,
    createdAt: now,
    updatedAt: now,
  }
}

export function applyItemValues(item: ClothingItem, values: ClothingItemValues): ClothingItem {
  return { ...item, ...values, imageUrl: values.imageUrl ?? item.imageUrl, updatedAt: nowIso() }
}

export function newOutfit(
  userId: string,
  values: OutfitValues,
  extra: { source?: OutfitSource; parentOutfitId?: string | null } = {},
): Outfit {
  const now = nowIso()
  return {
    id: createId(),
    userId,
    ...values,
    timesWorn: 0,
    lastWornAt: null,
    parentOutfitId: extra.parentOutfitId ?? null,
    source: extra.source ?? 'studio',
    isSample: false,
    createdAt: now,
    updatedAt: now,
  }
}

export function duplicateOutfitRecord(source: Outfit, asVariant: boolean, existingNames: string[]): Outfit {
  const now = nowIso()
  const base = asVariant ? `${source.name} — variation` : `${source.name} (copy)`
  let name = base
  for (let n = 2; existingNames.includes(name); n++) name = `${base} ${n}`
  return {
    ...source,
    id: createId(),
    name: name.slice(0, 80),
    favorite: false,
    timesWorn: 0,
    lastWornAt: null,
    parentOutfitId: asVariant ? source.parentOutfitId ?? source.id : null,
    isSample: false,
    source: 'studio',
    createdAt: now,
    updatedAt: now,
  }
}

export function newPlan(userId: string, values: PlannedOutfitValues): PlannedOutfit {
  const now = nowIso()
  return { id: createId(), userId, ...values, createdAt: now, updatedAt: now }
}

/** Records a wear for an outfit and each of its pieces. */
export function recordWear(outfit: Outfit, items: ClothingItem[], when = nowIso()): { outfit: Outfit; items: ClothingItem[] } {
  const ids = new Set(outfit.clothingItemIds)
  return {
    outfit: { ...outfit, timesWorn: outfit.timesWorn + 1, lastWornAt: when, updatedAt: when },
    items: items.filter((i) => ids.has(i.id)).map((i) => ({ ...i, timesWorn: i.timesWorn + 1, lastWornAt: when, updatedAt: when })),
  }
}
