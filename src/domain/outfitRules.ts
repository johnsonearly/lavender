import { getCategory, SLOT_LABELS, slotFor, type Slot } from './categories'
import type { ClothingItem } from './types'

/** Maximum pieces per slot in a single outfit. */
export const SLOT_LIMITS: Record<Slot, number> = {
  top: 1,
  bottom: 1,
  onePiece: 1,
  layer: 1,
  shoes: 1,
  bag: 1,
  jewelry: 3,
  accessory: 3,
  other: 2,
}

/** Display / dressing order, head-to-toe-ish. */
export const SLOT_ORDER: Slot[] = ['top', 'onePiece', 'layer', 'bottom', 'shoes', 'bag', 'jewelry', 'accessory', 'other']

export interface CompositionChange {
  items: ClothingItem[]
  removed: ClothingItem[]
  /** Plain-language explanation when something was swapped out. */
  message: string | null
}

const MULTI_SLOTS: Slot[] = ['jewelry', 'accessory', 'other']

/**
 * Adds a piece to an outfit while keeping it wearable: a dress replaces a separate top and
 * bottom, a second pair of shoes swaps the first, and so on.
 */
export function addToOutfit(current: ClothingItem[], item: ClothingItem): CompositionChange {
  if (current.some((c) => c.id === item.id)) return { items: current, removed: [], message: null }

  const slot = slotFor(item)
  const removed: ClothingItem[] = []
  let kept = [...current]

  const drop = (predicate: (c: ClothingItem) => boolean) => {
    const out = kept.filter(predicate)
    removed.push(...out)
    kept = kept.filter((c) => !predicate(c))
  }

  if (slot === 'onePiece') drop((c) => ['top', 'bottom', 'onePiece'].includes(slotFor(c)))
  else if (slot === 'top' || slot === 'bottom') drop((c) => slotFor(c) === 'onePiece' || slotFor(c) === slot)
  else if (MULTI_SLOTS.includes(slot)) {
    // Only one of the same kind (one belt, one necklace…), and respect the slot limit.
    if (item.subcategory) drop((c) => slotFor(c) === slot && c.category === item.category && c.subcategory === item.subcategory)
    const sameSlot = kept.filter((c) => slotFor(c) === slot)
    if (sameSlot.length >= SLOT_LIMITS[slot]) drop((c) => c.id === sameSlot[0].id)
  } else drop((c) => slotFor(c) === slot)

  let message: string | null = null
  if (removed.length) {
    const names = removed.map((r) => r.name).join(' and ')
    message =
      slot === 'onePiece' && removed.some((r) => slotFor(r) !== 'onePiece')
        ? `${item.name} replaces ${names} — a ${getCategory(item.category).singular.toLowerCase()} covers top and bottom.`
        : `Swapped ${names} for ${item.name}.`
  }
  return { items: [...kept, item], removed, message }
}

export function removeFromOutfit(current: ClothingItem[], itemId: string): ClothingItem[] {
  return current.filter((c) => c.id !== itemId)
}

export interface OutfitValidation {
  valid: boolean
  issues: string[]
}

/** Checks a full outfit (e.g. from the AI stylist) for incompatible combinations. */
export function validateComposition(items: ClothingItem[]): OutfitValidation {
  const issues: string[] = []
  const counts = new Map<Slot, number>()
  for (const item of items) counts.set(slotFor(item), (counts.get(slotFor(item)) ?? 0) + 1)
  for (const [slot, count] of counts) {
    if (count > SLOT_LIMITS[slot]) issues.push(`Too many pieces for ${SLOT_LABELS[slot].toLowerCase()} (${count}).`)
  }
  if (counts.get('onePiece') && (counts.get('top') || counts.get('bottom'))) {
    issues.push('A dress or jumpsuit should not be combined with a separate top and bottom.')
  }
  if (new Set(items.map((i) => i.id)).size !== items.length) issues.push('The same piece appears twice.')
  return { valid: issues.length === 0, issues }
}

export function hasBase(items: ClothingItem[]): boolean {
  const slots = new Set(items.map(slotFor))
  return slots.has('onePiece') || (slots.has('top') && slots.has('bottom'))
}

export function sortBySlot(items: ClothingItem[]): ClothingItem[] {
  return [...items].sort((a, b) => SLOT_ORDER.indexOf(slotFor(a)) - SLOT_ORDER.indexOf(slotFor(b)))
}

export function groupBySlot(items: ClothingItem[]): Map<Slot, ClothingItem[]> {
  const map = new Map<Slot, ClothingItem[]>()
  for (const item of sortBySlot(items)) {
    const slot = slotFor(item)
    map.set(slot, [...(map.get(slot) ?? []), item])
  }
  return map
}

/** Resolves outfit item ids against the wardrobe, reporting ids that no longer exist. */
export function resolveOutfitItems(ids: string[], wardrobe: ClothingItem[]): { items: ClothingItem[]; missing: number } {
  const byId = new Map(wardrobe.map((i) => [i.id, i]))
  const items: ClothingItem[] = []
  let missing = 0
  for (const id of ids) {
    const item = byId.get(id)
    if (item) items.push(item)
    else missing++
  }
  return { items, missing }
}

/** Finds a saved outfit made of exactly these pieces (order ignored), to avoid saving duplicates. */
export function findOutfitWithItems<T extends { clothingItemIds: string[] }>(outfits: readonly T[], itemIds: readonly string[]): T | undefined {
  const wanted = new Set(itemIds)
  return outfits.find((o) => o.clothingItemIds.length === wanted.size && o.clothingItemIds.every((id) => wanted.has(id)))
}
