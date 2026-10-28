import { aestheticName, getAesthetic } from './aesthetics'
import { slotFor, warmthFor } from './categories'
import { colorLabel, getColor, hueRelation } from './colors'
import { getOccasion, occasionLabel } from './occasions'
import { hasBase } from './outfitRules'
import type { ClothingItem, Season, UserProfile } from './types'
import { conditionFor, isRainy, TARGET_WARMTH, type WeatherDay } from './weather'

export type NoteTone = 'good' | 'tip' | 'caution'
export type NoteAspect = 'color' | 'style' | 'occasion' | 'weather' | 'season' | 'proportion' | 'completeness'

export interface EvaluationNote {
  aspect: NoteAspect
  tone: NoteTone
  title: string
  detail: string
}

export interface OutfitEvaluation {
  /** Heuristic harmony estimate 0–100. Subjective — never presented as a verdict. */
  score: number
  notes: EvaluationNote[]
}

export interface EvaluationContext {
  profile?: Pick<UserProfile, 'stylePreferences' | 'favoriteColors' | 'avoidedColors'> | null
  occasion?: string | null
  weather?: WeatherDay | null
  season?: Season | null
}

export function seasonFor(date: Date, latitude?: number | null): Season {
  const m = date.getMonth()
  const north: Season = m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn'
  if (latitude !== undefined && latitude !== null && latitude < 0) {
    return ({ winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring' } as const)[north]
  }
  return north
}

/** Estimated formality of an item from its occasion tags (1–5), or null if untagged. */
export function itemFormality(item: Pick<ClothingItem, 'occasions'>): number | null {
  const levels = item.occasions.map((o) => getOccasion(o)?.formality).filter((f): f is number => f !== undefined)
  if (!levels.length) return null
  return (Math.min(...levels) + Math.max(...levels)) / 2
}

export interface ColorAnalysis {
  score: number
  note: EvaluationNote
}

/** Color harmony heuristic shared by the studio feedback and the recommendation engine. */
export function analyzeColors(items: Pick<ClothingItem, 'colors' | 'pattern' | 'name'>[]): ColorAnalysis {
  const all = items.flatMap((i) => i.colors)
  const chromatic = Array.from(new Set(all.filter((c) => !getColor(c)?.neutral)))
  const hues = chromatic.map((c) => getColor(c)?.hue).filter((h): h is number => h !== null && h !== undefined)
  const patterned = items.filter((i) => !['solid', 'textured'].includes(i.pattern))

  if (!all.length) {
    return { score: 0.6, note: { aspect: 'color', tone: 'tip', title: 'No colors recorded', detail: 'Add colors to your pieces for color feedback.' } }
  }

  let score: number
  let note: EvaluationNote
  if (chromatic.length === 0) {
    score = 0.85
    note = { aspect: 'color', tone: 'good', title: 'Calm neutral palette', detail: 'Neutrals always work together. If you want a lift, a colored bag or jewelry can act as an accent.' }
  } else if (chromatic.length === 1) {
    score = 0.95
    note = { aspect: 'color', tone: 'good', title: `${colorLabel(chromatic[0])} is the hero`, detail: `One color against neutrals reads intentional and easy to wear.` }
  } else if (chromatic.length === 2 && hues.length === 2) {
    const rel = hueRelation(hues[0], hues[1])
    const pair = `${colorLabel(chromatic[0])} and ${colorLabel(chromatic[1])}`
    if (rel === 'same' || rel === 'analogous') {
      score = 0.92
      note = { aspect: 'color', tone: 'good', title: 'Tonal harmony', detail: `${pair} sit close on the color wheel, so they blend softly.` }
    } else if (rel === 'complementary' || rel === 'contrast') {
      score = 0.8
      note = { aspect: 'color', tone: 'good', title: 'Confident contrast', detail: `${pair} contrast boldly. Keep the rest neutral so they don't compete.` }
    } else {
      score = 0.62
      note = { aspect: 'color', tone: 'tip', title: 'Colors in tension', detail: `${pair} are close but not matching. A neutral piece between them, or repeating one of them in an accessory, ties them together.` }
    }
  } else {
    score = chromatic.length >= 4 ? 0.45 : 0.58
    note = {
      aspect: 'color', tone: 'tip', title: 'Lots of color',
      detail: `${chromatic.map(colorLabel).join(', ')} together is lively. It can work if it's intentional — or swap one piece for a neutral to calm it down.`,
    }
  }

  if (patterned.length > 1) {
    score -= 0.12
    note = {
      ...note,
      tone: note.tone === 'good' ? 'tip' : note.tone,
      detail: `${note.detail} Two patterns (${patterned.map((p) => p.name).join(', ')}) work best when they share a color or differ clearly in scale.`,
    }
  }
  return { score: Math.max(0, Math.min(1, score)), note }
}

function aestheticTags(item: ClothingItem): string[] {
  return item.styleTags.filter((t) => getAesthetic(t))
}

export function evaluateOutfit(items: ClothingItem[], ctx: EvaluationContext = {}): OutfitEvaluation {
  const notes: EvaluationNote[] = []
  if (!items.length) return { score: 0, notes }

  // Completeness
  let completeness = 1
  const slots = new Set(items.map(slotFor))
  if (!hasBase(items)) {
    completeness = 0.5
    notes.push({ aspect: 'completeness', tone: 'caution', title: 'Missing a base', detail: 'Add a top and bottom, or a dress or jumpsuit, to complete the look.' })
  } else if (!slots.has('shoes')) {
    completeness = 0.8
    notes.push({ aspect: 'completeness', tone: 'tip', title: 'Choose shoes', detail: 'Shoes change the mood of an outfit — try a pair to finish it.' })
  }

  // Color
  const color = analyzeColors(items)
  notes.push(color.note)
  const avoided = ctx.profile?.avoidedColors ?? []
  const favorites = ctx.profile?.favoriteColors ?? []
  const usedAvoided = Array.from(new Set(items.flatMap((i) => i.colors).filter((c) => avoided.includes(c))))
  const usedFavorite = Array.from(new Set(items.flatMap((i) => i.colors).filter((c) => favorites.includes(c))))
  if (usedFavorite.length) {
    notes.push({ aspect: 'color', tone: 'good', title: 'Features colors you love', detail: `Includes ${usedFavorite.map(colorLabel).join(', ')} from your favorite colors.` })
  }
  if (usedAvoided.length) {
    notes.push({ aspect: 'color', tone: 'tip', title: 'Outside your usual colors', detail: `You mentioned you rarely wear ${usedAvoided.map(colorLabel).join(', ')}. Totally fine if you're experimenting!` })
  }

  // Style consistency
  let style = 0.7
  const tagged = items.filter((i) => aestheticTags(i).length)
  if (tagged.length >= 2) {
    const counts = new Map<string, number>()
    for (const item of tagged) for (const t of aestheticTags(item)) counts.set(t, (counts.get(t) ?? 0) + 1)
    const [topTag, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    const share = topCount / tagged.length
    if (share >= 0.66) {
      style = 0.9
      notes.push({ aspect: 'style', tone: 'good', title: `Cohesive ${aestheticName(topTag).toLowerCase()} feel`, detail: `${topCount} of ${tagged.length} tagged pieces share the ${aestheticName(topTag)} aesthetic.` })
    } else {
      style = 0.65
      const mix = [...counts.keys()].slice(0, 3).map(aestheticName).join(', ')
      notes.push({ aspect: 'style', tone: 'tip', title: 'A mix of moods', detail: `This blends ${mix}. Contrast can look great when one piece clearly leads.` })
    }
  }
  const prefs = ctx.profile?.stylePreferences ?? []
  const matchedPrefs = prefs.filter((p) => items.some((i) => i.styleTags.includes(p.aesthetic)))
  if (matchedPrefs.length) {
    style = Math.min(1, style + 0.1)
    notes.push({ aspect: 'style', tone: 'good', title: 'Matches your style profile', detail: `Leans ${matchedPrefs.map((p) => aestheticName(p.aesthetic)).join(' and ')}, which you said you like.` })
  }

  // Occasion
  let occasionScore = 0.75
  const occasion = getOccasion(ctx.occasion)
  if (occasion) {
    const tagged = items.filter((i) => i.occasions.length && slotFor(i) !== 'jewelry')
    const mismatched = tagged.filter((i) => !i.occasions.includes(occasion.id))
    const formalities = items.map(itemFormality).filter((f): f is number => f !== null)
    const avg = formalities.length ? formalities.reduce((s, f) => s + f, 0) / formalities.length : null
    if (avg !== null && Math.abs(avg - occasion.formality) > 1.4) {
      occasionScore = 0.45
      notes.push({
        aspect: 'occasion', tone: 'caution',
        title: avg > occasion.formality ? 'Dressier than the occasion' : 'More relaxed than the occasion',
        detail: `For ${occasion.label.toLowerCase()}, consider ${avg > occasion.formality ? 'swapping one piece for something more relaxed' : 'a sharper shoe or a structured layer'}.`,
      })
    } else if (tagged.length && mismatched.length === 0) {
      occasionScore = 1
      notes.push({ aspect: 'occasion', tone: 'good', title: `Ready for ${occasion.label.toLowerCase()}`, detail: 'Every tagged piece is marked as suitable for this occasion.' })
    } else if (mismatched.length) {
      occasionScore = 0.65
      notes.push({ aspect: 'occasion', tone: 'tip', title: 'Check the occasion fit', detail: `${mismatched.map((m) => m.name).join(', ')} ${mismatched.length === 1 ? "isn't" : "aren't"} tagged for ${occasion.label.toLowerCase()} — your call.` })
    }
  }

  // Weather (only from a real forecast) or season tags
  let weatherScore = 0.8
  const clothing = items.filter((i) => ['top', 'bottom', 'onePiece', 'layer', 'shoes', 'accessory'].includes(slotFor(i)))
  const warmth = clothing.reduce((s, i) => s + warmthFor(i), 0)
  if (ctx.weather) {
    const cond = conditionFor(ctx.weather)
    const [lo, hi] = TARGET_WARMTH[cond]
    if (warmth < lo) {
      weatherScore = 0.45
      notes.push({ aspect: 'weather', tone: 'caution', title: `Might be chilly (${cond})`, detail: 'The forecast is cooler than this outfit. Add a layer, closed shoes or a scarf.' })
    } else if (warmth > hi) {
      weatherScore = 0.55
      notes.push({ aspect: 'weather', tone: 'tip', title: `Could feel warm (${cond})`, detail: 'Consider a lighter layer or breathable fabrics for the forecast.' })
    } else {
      weatherScore = 1
      notes.push({ aspect: 'weather', tone: 'good', title: 'Suits the forecast', detail: `Comfortable for ${ctx.weather.summary.toLowerCase()} and around ${Math.round(ctx.weather.tempMaxC)}°C.` })
    }
    if (isRainy(ctx.weather)) {
      const openShoes = items.filter((i) => i.category === 'shoes' && ['sandals', 'flats', 'heels'].includes(i.subcategory ?? ''))
      notes.push({
        aspect: 'weather', tone: 'tip', title: 'Rain is likely',
        detail: openShoes.length ? `${openShoes[0].name} may get soaked — closed shoes and a coat would help.` : 'Bring a coat or umbrella.',
      })
    }
  } else if (ctx.season) {
    const offSeason = items.filter((i) => i.seasons.length && !i.seasons.includes(ctx.season as Season))
    if (offSeason.length) {
      weatherScore = 0.65
      notes.push({ aspect: 'season', tone: 'tip', title: 'Season check', detail: `${offSeason.map((o) => o.name).join(', ')} ${offSeason.length === 1 ? 'is' : 'are'} tagged for other seasons than ${ctx.season}.` })
    }
  }

  // Proportions (only when fit info exists)
  const top = items.find((i) => ['top', 'layer'].includes(slotFor(i)) && i.fit)
  const bottom = items.find((i) => slotFor(i) === 'bottom' && i.fit)
  if (top?.fit && bottom?.fit) {
    const loose = (f: string) => f === 'relaxed' || f === 'oversized'
    if (loose(top.fit) && loose(bottom.fit)) {
      notes.push({ aspect: 'proportion', tone: 'tip', title: 'Lots of volume', detail: 'Both top and bottom are relaxed. A half-tuck, belt or slimmer shoe can add shape — or lean into it on purpose.' })
    } else if (loose(top.fit) !== loose(bottom.fit)) {
      notes.push({ aspect: 'proportion', tone: 'good', title: 'Balanced proportions', detail: 'Pairing a relaxed piece with a fitted one creates an easy, balanced silhouette.' })
    }
  }

  const score = Math.round((color.score * 0.35 + style * 0.2 + occasionScore * 0.15 + weatherScore * 0.1 + completeness * 0.2) * 100)
  return { score, notes }
}

export function describeOccasionMatch(item: ClothingItem, occasion: string | null | undefined): string | null {
  if (!occasion || !item.occasions.includes(occasion)) return null
  return `tagged for ${occasionLabel(occasion).toLowerCase()}`
}
