import { aestheticName, getAesthetic } from '@/domain/aesthetics'
import { slotFor, warmthFor } from '@/domain/categories'
import { colorLabel } from '@/domain/colors'
import { analyzeColors, itemFormality } from '@/domain/evaluation'
import { getOccasion, occasionLabel } from '@/domain/occasions'
import type { ClothingItem, Season, UserProfile } from '@/domain/types'
import { TARGET_WARMTH, type WeatherCondition } from '@/domain/weather'
import { hashString } from '@/lib/utils'

export interface RecommendOptions {
  occasion?: string | null
  aesthetics?: string[]
  /** Pieces the outfit must be built around. */
  anchorIds?: string[]
  requireShoeTypes?: string[]
  avoidShoeTypes?: string[]
  condition?: WeatherCondition | null
  rain?: boolean
  season?: Season | null
  formalityRange?: [number, number] | null
  preferLessWorn?: boolean
  /** Restrict candidates to this subset (e.g. a capsule). */
  onlyIds?: string[]
  count?: number
  /** Varies tie-breaks so repeated requests can surface different looks. */
  variation?: number
}

export interface Recommendation {
  name: string
  items: ClothingItem[]
  score: number
  reasons: string[]
  aesthetic: string | null
  occasion: string | null
  alternatives: { itemId: string; note: string }[]
}

type Profile = Pick<UserProfile, 'stylePreferences' | 'favoriteColors' | 'avoidedColors'> | null | undefined

const ADJECTIVES: Record<string, string> = {
  minimalist: 'Clean', casual: 'Easy', chic: 'Polished', feminine: 'Soft', elegant: 'Refined', streetwear: 'Cool',
  coquette: 'Sweet', 'old-money': 'Heritage', romantic: 'Dreamy', sporty: 'Fresh', 'business-casual': 'Smart',
  vintage: 'Retro', bohemian: 'Free-spirited', preppy: 'Crisp', edgy: 'Bold',
}
const NOUNS: Record<string, string> = {
  casual: 'everyday look', school: 'campus look', work: 'workday look', interview: 'interview look', date: 'date-night look',
  dinner: 'dinner look', brunch: 'brunch look', party: 'night-out look', church: 'Sunday look', wedding: 'wedding-guest look',
  formal: 'evening look', travel: 'travel look', active: 'active look', lounge: 'at-home look',
}

function itemScore(item: ClothingItem, opts: RecommendOptions, profile: Profile): number {
  let s = 0
  const slot = slotFor(item)
  const occasion = getOccasion(opts.occasion)
  if (occasion) {
    if (item.occasions.includes(occasion.id)) s += 2
    else if (item.occasions.length && slot !== 'jewelry') s -= 1.2
  }
  const formality = itemFormality(item)
  if (opts.formalityRange && formality !== null) {
    const [lo, hi] = opts.formalityRange
    if (formality < lo) s -= (lo - formality) * 1.2
    if (formality > hi) s -= (formality - hi) * 1.2
  }
  const requested = (opts.aesthetics ?? []).filter((a) => item.styleTags.includes(a))
  s += Math.min(requested.length, 2) * 1.5
  for (const p of profile?.stylePreferences ?? []) if (item.styleTags.includes(p.aesthetic)) s += p.preferenceStrength * 0.35
  if (opts.season && item.seasons.length) s += item.seasons.includes(opts.season) ? 0.4 : -1
  if (item.colors.some((c) => profile?.avoidedColors?.includes(c))) s -= 1.5
  if (item.colors.some((c) => profile?.favoriteColors?.includes(c))) s += 0.5
  if (item.favorite) s += 0.3
  if (opts.preferLessWorn) s += 1.2 / (1 + item.timesWorn)
  // Small deterministic jitter for variety between requests.
  s += ((hashString(`${opts.variation ?? 0}:${item.id}`) % 100) / 100) * (opts.variation ? 1.4 : 0.3)
  return s
}

function pickBest<T>(list: T[], score: (t: T) => number): { best: T | null; ranked: T[] } {
  const ranked = [...list].sort((a, b) => score(b) - score(a))
  return { best: ranked[0] ?? null, ranked }
}

function dominantAesthetic(items: ClothingItem[], preferred: string[]): string | null {
  const counts = new Map<string, number>()
  for (const item of items) for (const t of item.styleTags) if (getAesthetic(t)) counts.set(t, (counts.get(t) ?? 0) + (preferred.includes(t) ? 1.5 : 1))
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return top ? top[0] : preferred[0] ?? null
}

export function recommendOutfits(wardrobe: readonly ClothingItem[], profile: Profile, opts: RecommendOptions = {}): Recommendation[] {
  const count = opts.count ?? 3
  const pool = opts.onlyIds ? wardrobe.filter((i) => opts.onlyIds?.includes(i.id)) : [...wardrobe]
  const anchors = pool.filter((i) => opts.anchorIds?.includes(i.id))
  const bySlot = (slot: string) => pool.filter((i) => slotFor(i) === slot)
  const score = new Map(pool.map((i) => [i.id, itemScore(i, opts, profile)]))
  const sc = (i: ClothingItem) => score.get(i.id) ?? 0

  const anchorBase = anchors.filter((a) => ['top', 'bottom', 'onePiece'].includes(slotFor(a)))
  const anchorTop = anchorBase.find((a) => slotFor(a) === 'top')
  const anchorBottom = anchorBase.find((a) => slotFor(a) === 'bottom')
  const anchorOne = anchorBase.find((a) => slotFor(a) === 'onePiece')

  // 1. Base combinations
  const bases: ClothingItem[][] = []
  if (anchorOne) bases.push([anchorOne])
  else {
    const tops = anchorTop ? [anchorTop] : bySlot('top')
    const bottoms = anchorBottom ? [anchorBottom] : bySlot('bottom')
    for (const t of tops.slice(0, 40)) for (const b of bottoms.slice(0, 40)) bases.push([t, b])
    if (!anchorTop && !anchorBottom) for (const d of bySlot('onePiece')) bases.push([d])
  }
  if (!bases.length) return []

  const baseScore = (base: ClothingItem[]) => {
    let s = base.reduce((sum, i) => sum + sc(i), 0) + analyzeColors(base).score * 3
    if (base.length === 2) {
      const [f1, f2] = base.map(itemFormality)
      if (f1 !== null && f2 !== null) s -= Math.abs(f1 - f2) * 0.6
    } else s += 0.6 // one-pieces need fewer matches; keep them competitive
    return s
  }
  const topBases = [...bases].sort((a, b) => baseScore(b) - baseScore(a)).slice(0, 30)

  // 2. Complete each base with shoes, layer, bag and jewelry
  const candidates = topBases.map((base) => completeOutfit(base, pool, anchors, opts, sc))

  // 3. Pick diverse results
  const chosen: { items: ClothingItem[]; score: number; alternatives: Recommendation['alternatives'] }[] = []
  const remaining = [...candidates]
  while (chosen.length < count && remaining.length) {
    let bestIdx = 0
    let bestVal = -Infinity
    remaining.forEach((c, idx) => {
      let penalty = 0
      for (const prev of chosen) {
        for (const item of c.items) {
          if (!prev.items.some((p) => p.id === item.id) || anchors.some((a) => a.id === item.id)) continue
          penalty += ['top', 'bottom', 'onePiece'].includes(slotFor(item)) ? 3 : 0.8
        }
      }
      if (c.score - penalty > bestVal) {
        bestVal = c.score - penalty
        bestIdx = idx
      }
    })
    const pick = remaining.splice(bestIdx, 1)[0]
    if (chosen.some((p) => sameSet(p.items, pick.items))) continue
    chosen.push(pick)
  }

  const usedNames = new Set<string>()
  return chosen.map((c) => {
    const aesthetic = dominantAesthetic(c.items, opts.aesthetics ?? [])
    let name = `${(aesthetic && ADJECTIVES[aesthetic]) || 'Easy'} ${(opts.occasion && NOUNS[opts.occasion]) || 'look'}`
    if (usedNames.has(name)) {
      const hero = c.items.find((i) => ['top', 'onePiece'].includes(slotFor(i)))?.colors[0]
      name = `${name} in ${hero ? colorLabel(hero).toLowerCase() : 'a new mix'}`
    }
    usedNames.add(name)
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      items: c.items,
      score: c.score,
      reasons: explain(c.items, anchors, opts, profile),
      aesthetic,
      occasion: opts.occasion ?? null,
      alternatives: c.alternatives,
    }
  })
}

function sameSet(a: ClothingItem[], b: ClothingItem[]): boolean {
  return a.length === b.length && a.every((x) => b.some((y) => y.id === x.id))
}

function completeOutfit(
  base: ClothingItem[],
  pool: ClothingItem[],
  anchors: ClothingItem[],
  opts: RecommendOptions,
  sc: (i: ClothingItem) => number,
) {
  const items = [...base]
  const alternatives: Recommendation['alternatives'] = []
  const relaxedOccasion = ['active', 'lounge'].includes(opts.occasion ?? '')
  const anchorIn = (slot: string) => anchors.find((a) => slotFor(a) === slot)

  // Shoes
  let shoes = pool.filter((i) => slotFor(i) === 'shoes')
  if (opts.avoidShoeTypes?.length) shoes = shoes.filter((s) => !opts.avoidShoeTypes?.includes(s.subcategory ?? ''))
  if (opts.requireShoeTypes?.length) {
    const required = shoes.filter((s) => opts.requireShoeTypes?.includes(s.subcategory ?? ''))
    if (required.length) shoes = required
  }
  const shoeScore = (s: ClothingItem) => {
    let v = sc(s) + analyzeColors([...items, s]).score * 2
    if (opts.rain && ['sandals', 'flats'].includes(s.subcategory ?? '')) v -= 2
    if (opts.condition === 'cold' && s.subcategory === 'boots') v += 1.2
    if ((opts.condition === 'cold' || opts.condition === 'cool') && s.subcategory === 'sandals') v -= 2
    if (opts.condition === 'hot' && s.subcategory === 'boots') v -= 1.5
    return v
  }
  const shoePick = anchorIn('shoes') ? { best: anchorIn('shoes') as ClothingItem, ranked: [] } : pickBest(shoes, shoeScore)
  if (shoePick.best) {
    items.push(shoePick.best)
    const alt = shoePick.ranked.find((s) => s.id !== shoePick.best?.id)
    if (alt) alternatives.push({ itemId: alt.id, note: `Swap in ${alt.name} for a different mood.` })
  }

  // Layer: when it's cool, when the occasion is smarter, or when explicitly anchored
  const layers = pool.filter((i) => slotFor(i) === 'layer')
  const formality = getOccasion(opts.occasion)?.formality ?? 2
  const wantsLayer = Boolean(anchorIn('layer')) || opts.condition === 'cold' || opts.condition === 'cool' || formality >= 3
  if (layers.length && opts.condition !== 'hot') {
    const layerScore = (l: ClothingItem) => {
      let v = sc(l) + analyzeColors([...items, l]).score * 2
      if (opts.condition === 'cold') v += warmthFor(l)
      if (opts.rain && l.subcategory === 'trench') v += 1.5
      if (opts.rain && l.subcategory === 'raincoat') v += 2
      return v
    }
    const layer = anchorIn('layer') ?? pickBest(layers, layerScore).best
    if (layer && (wantsLayer || layerScore(layer) > 4.2)) items.push(layer)
    else if (layer) alternatives.push({ itemId: layer.id, note: `Add ${layer.name} if it gets cooler.` })
  }

  // Bag and jewelry
  if (!relaxedOccasion || anchorIn('bag')) {
    const bag = anchorIn('bag') ?? pickBest(pool.filter((i) => slotFor(i) === 'bag'), (b) => sc(b) + analyzeColors([...items, b]).score).best
    if (bag) items.push(bag)
    const jewelry = anchorIn('jewelry') ?? pickBest(pool.filter((i) => slotFor(i) === 'jewelry'), (j) => sc(j)).best
    if (jewelry && (sc(jewelry) > 0 || anchorIn('jewelry'))) items.push(jewelry)
  }
  for (const a of anchors) if (!items.some((i) => i.id === a.id) && ['accessory', 'jewelry'].includes(slotFor(a))) items.push(a)

  // Final score
  let total = items.reduce((s, i) => s + sc(i), 0) + analyzeColors(items).score * 3
  if (opts.condition) {
    const warmth = items.filter((i) => slotFor(i) !== 'bag' && slotFor(i) !== 'jewelry').reduce((s, i) => s + warmthFor(i), 0)
    const [lo, hi] = TARGET_WARMTH[opts.condition]
    if (warmth < lo) total -= (lo - warmth) * 1.5
    if (warmth > hi) total -= (warmth - hi) * 1.2
  }
  return { items, score: total, alternatives }
}

function explain(items: ClothingItem[], anchors: ClothingItem[], opts: RecommendOptions, profile: Profile): string[] {
  const reasons: string[] = []
  const anchored = anchors.filter((a) => items.some((i) => i.id === a.id))
  if (anchored.length) reasons.push(`Built around your ${anchored.map((a) => a.name).join(' and ')}.`)
  reasons.push(analyzeColors(items).note.detail)

  const occasion = getOccasion(opts.occasion)
  if (occasion) {
    const main = items.filter((i) => ['top', 'bottom', 'onePiece', 'shoes'].includes(slotFor(i)))
    const fit = main.filter((i) => i.occasions.includes(occasion.id))
    if (fit.length === main.length && main.length) reasons.push(`Every main piece is tagged for ${occasionLabel(occasion.id).toLowerCase()}.`)
    else if (fit.length) reasons.push(`${fit.map((f) => f.name).join(', ')} ${fit.length === 1 ? 'is' : 'are'} tagged for ${occasionLabel(occasion.id).toLowerCase()}.`)
  }
  const aesthetics = [...(opts.aesthetics ?? []), ...(profile?.stylePreferences ?? []).map((p) => p.aesthetic)]
  const matched = Array.from(new Set(aesthetics.filter((a) => items.some((i) => i.styleTags.includes(a))))).slice(0, 2)
  if (matched.length) reasons.push(`Leans ${matched.map((a) => aestheticName(a).toLowerCase()).join(' and ')}.`)
  const layer = items.find((i) => slotFor(i) === 'layer')
  if (layer && (opts.condition === 'cold' || opts.condition === 'cool')) reasons.push(`${layer.name} adds warmth.`)
  if (opts.preferLessWorn) {
    const fresh = items.filter((i) => i.timesWorn === 0 && ['top', 'bottom', 'onePiece', 'layer'].includes(slotFor(i)))
    if (fresh.length) reasons.push(`Gives ${fresh.map((f) => f.name).join(' and ')} some well-deserved wear.`)
  }
  return reasons
}
