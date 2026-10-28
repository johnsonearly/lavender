import { categoryLabel, slotFor, warmthFor, type CategoryId, type Slot } from './categories'
import { colorLabel, isNeutral } from './colors'
import { analyzeColors, itemFormality } from './evaluation'
import type { ClothingItem, Outfit, UserProfile } from './types'

export interface CountEntry<K extends string = string> {
  key: K
  label: string
  count: number
}

function countBy<K extends string>(keys: K[], label: (k: K) => string): CountEntry<K>[] {
  const map = new Map<K, number>()
  for (const k of keys) map.set(k, (map.get(k) ?? 0) + 1)
  return [...map.entries()].map(([key, count]) => ({ key, label: label(key), count })).sort((a, b) => b.count - a.count)
}

export interface WardrobeStats {
  totalItems: number
  outfitCount: number
  favoriteOutfitCount: number
  favoriteItemCount: number
  totalWears: number
  categories: CountEntry<CategoryId>[]
  colors: CountEntry[]
  mostWorn: ClothingItem[]
  leastUsed: ClothingItem[]
  versatile: { item: ClothingItem; occasions: number; outfits: number }[]
  colorPairs: CountEntry[]
}

export function computeStats(items: readonly ClothingItem[], outfits: readonly Outfit[]): WardrobeStats {
  const appearances = new Map<string, number>()
  for (const o of outfits) for (const id of o.clothingItemIds) appearances.set(id, (appearances.get(id) ?? 0) + 1)

  const pairs: string[] = []
  const byId = new Map(items.map((i) => [i.id, i]))
  for (const o of outfits) {
    const primaries = Array.from(new Set(o.clothingItemIds.map((id) => byId.get(id)?.colors[0]).filter((c): c is string => Boolean(c)))).sort()
    for (let a = 0; a < primaries.length; a++) for (let b = a + 1; b < primaries.length; b++) pairs.push(`${primaries[a]}+${primaries[b]}`)
  }

  return {
    totalItems: items.length,
    outfitCount: outfits.length,
    favoriteOutfitCount: outfits.filter((o) => o.favorite).length,
    favoriteItemCount: items.filter((i) => i.favorite).length,
    totalWears: items.reduce((s, i) => s + i.timesWorn, 0),
    categories: countBy(items.map((i) => i.category), categoryLabel),
    colors: countBy(items.map((i) => i.colors[0]).filter(Boolean), colorLabel),
    mostWorn: [...items].filter((i) => i.timesWorn > 0).sort((a, b) => b.timesWorn - a.timesWorn).slice(0, 5),
    leastUsed: [...items]
      .filter((i) => !['jewelry', 'accessory'].includes(slotFor(i)))
      .sort((a, b) => a.timesWorn - b.timesWorn || (appearances.get(a.id) ?? 0) - (appearances.get(b.id) ?? 0) || a.createdAt.localeCompare(b.createdAt))
      .slice(0, 5),
    versatile: items
      .map((item) => ({ item, occasions: item.occasions.length, outfits: appearances.get(item.id) ?? 0 }))
      .filter((v) => v.occasions + v.outfits > 0)
      .sort((a, b) => b.occasions + b.outfits * 1.5 - (a.occasions + a.outfits * 1.5))
      .slice(0, 5),
    colorPairs: countBy(pairs, (k) => k.split('+').map(colorLabel).join(' + ')).slice(0, 5),
  }
}

export interface WardrobeGap {
  id: string
  title: string
  reason: string
  /** Always hypothetical: these are ideas, never items the user owns. */
  suggestion: string
}

/** Practical basics that would unlock more combinations. Never assumes the user must buy. */
export function findGaps(items: readonly ClothingItem[]): WardrobeGap[] {
  const gaps: WardrobeGap[] = []
  const inSlot = (slot: Slot) => items.filter((i) => slotFor(i) === slot)
  const tops = inSlot('top')
  const bottoms = inSlot('bottom')

  if (items.length < 4) return gaps

  if (bottoms.length && !tops.some((t) => isNeutral(t.colors[0]))) {
    gaps.push({ id: 'neutral-top', title: 'A neutral top', reason: `Would pair with all ${bottoms.length} of your bottoms.`, suggestion: 'White, cream or black fitted tee or blouse' })
  }
  if (tops.length && !bottoms.some((b) => isNeutral(b.colors[0]))) {
    gaps.push({ id: 'neutral-bottom', title: 'A neutral bottom', reason: `Would work with all ${tops.length} of your tops.`, suggestion: 'Straight black, navy or denim trousers' })
  }
  const shoes = inSlot('shoes')
  if (!shoes.some((s) => ['sneakers', 'flats', 'loafers'].includes(s.subcategory ?? ''))) {
    gaps.push({ id: 'everyday-shoes', title: 'Everyday shoes', reason: 'Comfortable flat shoes make most daytime outfits easy.', suggestion: 'White sneakers or simple loafers' })
  }
  if (!inSlot('layer').length) {
    gaps.push({ id: 'layer', title: 'A light layer', reason: 'A third piece adds polish and warmth to almost any outfit.', suggestion: 'A cardigan or relaxed blazer in a neutral' })
  }
  if (!items.some((i) => ['outerwear'].includes(i.category) && warmthFor(i) >= 3)) {
    gaps.push({ id: 'coat', title: 'A warm coat', reason: 'Nothing in your wardrobe is tagged as a warm outer layer.', suggestion: 'A classic coat in camel, navy or black' })
  }
  if (!items.some((i) => (itemFormality(i) ?? 0) >= 3.5) && !inSlot('onePiece').length) {
    gaps.push({ id: 'dressy', title: 'A dressier option', reason: 'For dinners, ceremonies and events.', suggestion: 'A simple midi dress or a silky top' })
  }
  if (!inSlot('bag').length) {
    gaps.push({ id: 'bag', title: 'An everyday bag', reason: 'A neutral bag finishes outfits and goes with everything.', suggestion: 'A medium tote or shoulder bag in tan or black' })
  }
  return gaps
}

export interface CapsuleResult {
  items: ClothingItem[]
  outfitCount: number
  notes: string[]
}

function versatility(item: ClothingItem, profile?: Pick<UserProfile, 'stylePreferences' | 'avoidedColors'> | null): number {
  let s = item.occasions.length * 0.6 + (item.seasons.length === 0 ? 4 : item.seasons.length) * 0.4
  if (item.colors[0] && isNeutral(item.colors[0])) s += 2.5
  if (item.pattern === 'solid') s += 1
  if (item.favorite) s += 1
  s += Math.min(item.timesWorn, 10) * 0.15
  for (const p of profile?.stylePreferences ?? []) if (item.styleTags.includes(p.aesthetic)) s += p.preferenceStrength * 0.5
  if (item.colors.some((c) => profile?.avoidedColors?.includes(c))) s -= 2
  return s
}

/** Counts harmonious base combinations (top+bottom pairs and one-pieces). */
export function countBases(items: readonly ClothingItem[]): number {
  const tops = items.filter((i) => slotFor(i) === 'top')
  const bottoms = items.filter((i) => slotFor(i) === 'bottom')
  let n = items.filter((i) => slotFor(i) === 'onePiece').length
  for (const t of tops) for (const b of bottoms) if (analyzeColors([t, b]).score >= 0.6) n++
  return n
}

const CAPSULE_TARGETS: [Slot, number][] = [['top', 4], ['bottom', 3], ['onePiece', 1], ['layer', 2], ['shoes', 2], ['bag', 1]]

/** Picks a small, versatile capsule from pieces the user already owns. */
export function buildCapsule(items: readonly ClothingItem[], profile?: Pick<UserProfile, 'stylePreferences' | 'avoidedColors'> | null): CapsuleResult {
  const picked: ClothingItem[] = []
  const notes: string[] = []
  for (const [slot, target] of CAPSULE_TARGETS) {
    const candidates = items.filter((i) => slotFor(i) === slot).sort((a, b) => versatility(b, profile) - versatility(a, profile))
    // Greedy: choose pieces that add the most harmonious combinations.
    const chosen: ClothingItem[] = []
    while (chosen.length < target && candidates.length) {
      let bestIndex = 0
      let bestGain = -Infinity
      candidates.forEach((c, idx) => {
        const gain = countBases([...picked, ...chosen, c]) * 2 + versatility(c, profile)
        if (gain > bestGain) {
          bestGain = gain
          bestIndex = idx
        }
      })
      chosen.push(candidates.splice(bestIndex, 1)[0])
    }
    if (chosen.length < target && ['top', 'bottom', 'shoes'].includes(slot)) {
      notes.push(`Only ${chosen.length} ${slot === 'shoes' ? 'pair(s) of shoes' : `${slot}(s)`} available — the capsule works with what you have.`)
    }
    picked.push(...chosen)
  }
  const bases = countBases(picked)
  const shoes = Math.max(1, picked.filter((i) => slotFor(i) === 'shoes').length)
  const layers = picked.filter((i) => slotFor(i) === 'layer').length
  return { items: picked, outfitCount: bases * shoes * (1 + layers), notes }
}
