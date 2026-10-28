import { AESTHETICS, aestheticName } from '@/domain/aesthetics'
import { CATEGORIES, slotFor, type Slot } from '@/domain/categories'
import { COLORS } from '@/domain/colors'
import { seasonFor } from '@/domain/evaluation'
import { buildCapsule, findGaps } from '@/domain/insights'
import { OCCASIONS, occasionLabel } from '@/domain/occasions'
import { hasBase } from '@/domain/outfitRules'
import type { ClothingItem } from '@/domain/types'
import { conditionFor, isRainy, type WeatherCondition } from '@/domain/weather'
import { recommendOutfits, type Recommendation, type RecommendOptions } from './recommendationEngine'
import type { StylistContext, StylistOutfit, StylistReply, StylistRequest, StylistResponseInput, StylistService } from './types'
import { validateStylistResponse } from './validateResponse'

export type StylistIntent = 'outfits' | 'capsule' | 'versatility' | 'gaps' | 'greeting' | 'unsupported'

export interface ParsedRequest {
  intent: StylistIntent
  occasion: string | null
  aesthetics: string[]
  count: number
  anchors: ClothingItem[]
  requireShoes: string[]
  avoidShoes: string[]
  condition: WeatherCondition | null
  rain: boolean
  formalityRange: [number, number] | null
  /** True when the request gives no occasion, aesthetic, weather or anchor. */
  vague: boolean
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, couple: 2, few: 3, several: 3 }

const SLOT_WORDS: Record<string, Slot> = {
  top: 'top', tops: 'top', blouse: 'top', shirt: 'top', tee: 'top', 't-shirt': 'top', tshirt: 'top', sweater: 'top', jumper: 'top', knit: 'top', cami: 'top', hoodie: 'top',
  trousers: 'bottom', pants: 'bottom', jeans: 'bottom', skirt: 'bottom', shorts: 'bottom', leggings: 'bottom', slacks: 'bottom',
  dress: 'onePiece', jumpsuit: 'onePiece', playsuit: 'onePiece', romper: 'onePiece',
  jacket: 'layer', coat: 'layer', blazer: 'layer', cardigan: 'layer', trench: 'layer',
  shoes: 'shoes', sneakers: 'shoes', trainers: 'shoes', heels: 'shoes', loafers: 'shoes', boots: 'shoes', flats: 'shoes', sandals: 'shoes',
  bag: 'bag', handbag: 'bag', purse: 'bag', tote: 'bag',
  necklace: 'jewelry', earrings: 'jewelry', bracelet: 'jewelry', jewelry: 'jewelry', jewellery: 'jewelry',
  belt: 'accessory', scarf: 'accessory', hat: 'accessory', bow: 'accessory',
}

const SHOE_WORDS: Record<string, string> = {
  sneakers: 'sneakers', sneaker: 'sneakers', trainers: 'sneakers', heels: 'heels', heel: 'heels', loafers: 'loafers',
  boots: 'boots', boot: 'boots', flats: 'flats', 'ballet flats': 'flats', sandals: 'sandals',
}

const STOPWORDS = new Set(['the', 'and', 'with', 'for', 'my', 'this', 'these', 'that', 'those', 'your', 'some', 'outfit', 'outfits', 'look', 'wear', 'what', 'can', 'help', 'style'])

const FASHION_WORDS = /\b(wear|wearing|outfit|outfits|look|looks|style|styling|dress|dressed|clothes|wardrobe|closet|put together|combine|combination|match|pair|layer|capsule|accessor|shoes?|fashion)\b/

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasWord(text: string, word: string): boolean {
  return new RegExp(`\\b${escape(word)}\\b`).test(text)
}

function findAnchors(text: string, items: readonly ClothingItem[]): ClothingItem[] {
  const mentionedSlots = new Set(Object.entries(SLOT_WORDS).filter(([w]) => hasWord(text, w)).map(([, s]) => s))
  const scored = items
    .map((item) => {
      const name = item.name.toLowerCase()
      const exact = text.includes(name) ? 5 : 0
      const tokens = name.split(/[^a-z0-9-]+/).filter((t) => t.length > 2 && !STOPWORDS.has(t))
      const tokenHits = tokens.filter((t) => hasWord(text, t)).length
      const colorHit = item.colors.some((c) => {
        const label = COLORS.find((x) => x.id === c)?.label.toLowerCase() ?? c
        return hasWord(text, label)
      })
      const slotHit = mentionedSlots.has(slotFor(item))
      const score = exact + tokenHits + (colorHit ? 1 : 0) + (slotHit ? 1.5 : 0)
      const strong = exact > 0 || (colorHit && slotHit) || (tokenHits >= 2 && slotHit)
      return { item, score, strong }
    })
    .filter((s) => s.strong && s.score >= 3)
    .sort((a, b) => b.score - a.score)
  if (!scored.length) return []
  const best = scored[0].score
  const picked: ClothingItem[] = []
  for (const s of scored) {
    if (s.score < best - 1 || picked.length >= 2) break
    if (picked.some((p) => slotFor(p) === slotFor(s.item))) continue
    picked.push(s.item)
  }
  return picked
}

export function parseRequest(message: string, items: readonly ClothingItem[], selectedIds: string[] = []): ParsedRequest {
  const text = ` ${message.toLowerCase().replace(/[’']/g, "'")} `

  let intent: StylistIntent = 'outfits'
  if (/\bcapsule\b/.test(text)) intent = 'capsule'
  else if (/(more combinations|more use|get more out|re-?wear|versatil|underused|don't wear enough|never wear)/.test(text)) intent = 'versatility'
  else if (/(what should i buy|shopping|what am i missing|missing pieces|wardrobe gaps?|need to buy|buy next|invest in)/.test(text)) intent = 'gaps'

  // Longest keywords first so "dinner date" beats "dinner".
  const occasionHits = OCCASIONS.flatMap((o) => o.keywords.map((k) => ({ id: o.id, k }))).sort((a, b) => b.k.length - a.k.length)
  const occasionMatch = occasionHits.find((o) => hasWord(text, o.k))
  let occasion = occasionMatch?.id ?? null
  if (occasion === 'dinner' && hasWord(text, 'date')) occasion = 'date'

  const aesthetics = AESTHETICS.filter((a) => a.keywords.some((k) => hasWord(text, k)) || hasWord(text, a.name.toLowerCase())).map((a) => a.id)

  let count = 3
  const digit = text.match(/\b([1-5])\s+(?:outfits?|looks?|ideas?|options?|ways?)/)
  const word = text.match(/\b(one|two|three|four|five|couple|few|several)\b(?:\s+of)?\s+(?:\w+\s+)?(?:outfits?|looks?|ideas?|options?|ways?)/)
  if (digit) count = Number(digit[1])
  else if (word) count = NUMBER_WORDS[word[1]]
  else if (/\b(an|one|a single) (outfit|look)\b/.test(text)) count = 1

  const requireShoes: string[] = []
  const avoidShoes: string[] = []
  for (const [w, type] of Object.entries(SHOE_WORDS)) {
    if (!hasWord(text, w)) continue
    const negated = new RegExp(`(instead of|no|not|without|rather than|skip|avoid)\\s+(?:\\w+\\s+){0,2}${escape(w)}\\b`).test(text)
    if (negated) avoidShoes.push(type)
    else if (!requireShoes.includes(type)) requireShoes.push(type)
  }

  let condition: WeatherCondition | null = null
  if (/\b(freezing|snow|snowy|icy)\b/.test(text)) condition = 'cold'
  else if (/\b(cold|chilly|winter|cool)\b/.test(text)) condition = 'cool'
  else if (/\b(hot|heat|heatwave|summer|sunny|warm)\b/.test(text)) condition = 'warm'
  if (/\b(very hot|heatwave|scorching)\b/.test(text)) condition = 'hot'
  const rain = /\b(rain|rainy|raining|wet|drizzle|storm)\b/.test(text)

  let formalityRange: [number, number] | null = null
  if (/(not too dressy|not too formal|not overdressed|low[- ]key|laid[- ]back|not fancy|casual but)/.test(text)) formalityRange = [1, 2.6]
  else if (/\b(dressy|fancy|dressed up|dress up|formal|smart)\b/.test(text)) formalityRange = [2.8, 5]

  const selected = items.filter((i) => selectedIds.includes(i.id))
  const anchors = selected.length ? selected : findAnchors(text, items)

  const fashionSignal =
    FASHION_WORDS.test(text) || Boolean(occasion) || aesthetics.length > 0 || anchors.length > 0 || requireShoes.length > 0 ||
    Object.keys(SLOT_WORDS).some((w) => hasWord(text, w)) || CATEGORIES.some((c) => hasWord(text, c.label.toLowerCase()))

  if (intent === 'outfits' && /^\s*(hi|hello|hey|hiya|good (morning|afternoon|evening))[\s!.,]*$/.test(text)) intent = 'greeting'
  else if (intent === 'outfits' && !fashionSignal && !condition && !rain) intent = 'unsupported'

  const vague = !occasion && !aesthetics.length && !anchors.length && !condition && !rain && !formalityRange && !requireShoes.length
  return { intent, occasion, aesthetics, count, anchors, requireShoes, avoidShoes, condition, rain, formalityRange, vague }
}

function toStylistOutfit(rec: Recommendation, weatherNote: string | null): StylistOutfit {
  return {
    name: rec.name,
    itemIds: rec.items.map((i) => i.id),
    aesthetic: rec.aesthetic ? aestheticName(rec.aesthetic) : null,
    occasion: rec.occasion ? occasionLabel(rec.occasion) : null,
    explanation: rec.reasons.join(' '),
    alternatives: rec.alternatives,
    weatherNote,
  }
}

export const SAMPLE_PROMPTS = [
  'Help me put together a casual outfit for university.',
  'What can I wear for a dinner date?',
  'Give me three outfits using these black trousers.',
  'I want something feminine but not too dressy.',
  'Create an outfit for church on Sunday.',
  'What can I wear when it is cold and rainy?',
  'Help me create a small capsule wardrobe.',
  'How can I wear my clothes in more combinations?',
  'Suggest an outfit with sneakers instead of heels.',
]

/** Builds a stylist response from wardrobe metadata alone — no network, no API key. */
export function composeLocalResponse(request: StylistRequest, ctx: StylistContext): StylistResponseInput {
  const items = ctx.items
  const parsed = parseRequest(request.message, items, request.selectedItemIds)
  const profile = ctx.profile

  if (parsed.intent === 'greeting') {
    return {
      message: `Hi${profile?.displayName ? ` ${profile.displayName}` : ''}! Tell me where you're going, the mood you want, or a piece you'd like to style, and I'll put together looks from your wardrobe.`,
      outfits: [],
      followUp: 'For example: "What can I wear for brunch on Saturday?"',
    }
  }
  if (parsed.intent === 'unsupported') {
    return {
      message: "I'm your wardrobe stylist, so I'm best at outfits, combinations, occasions, weather-ready layering and capsule planning. I couldn't find a styling question in that message.",
      outfits: [],
      followUp: 'Try asking for an outfit for a specific occasion, or name a piece you want to style.',
    }
  }
  if (!items.length) {
    return {
      message: 'Your wardrobe is empty, so I have nothing to style yet. Add a few pieces (or load the sample wardrobe from Settings) and I will start building outfits from them.',
      outfits: [],
    }
  }

  // Weather: user-stated conditions win; otherwise use the real forecast when available.
  let condition = parsed.condition
  let rain = parsed.rain
  let weatherNote: string | null = null
  if (!condition && !rain && ctx.weather) {
    condition = conditionFor(ctx.weather)
    rain = isRainy(ctx.weather)
    weatherNote = `Forecast today: ${ctx.weather.summary}, ${Math.round(ctx.weather.tempMinC)}–${Math.round(ctx.weather.tempMaxC)}°C${rain ? ', rain likely' : ''}.`
  } else if (condition || rain) {
    weatherNote = `Styled for the ${[condition, rain ? 'rainy' : null].filter(Boolean).join(', ')} weather you described.`
  }

  const latitude = profile?.settings.weatherLocation?.latitude
  const baseOpts: RecommendOptions = {
    occasion: parsed.occasion,
    aesthetics: parsed.aesthetics,
    anchorIds: parsed.anchors.map((a) => a.id),
    requireShoeTypes: parsed.requireShoes,
    avoidShoeTypes: parsed.avoidShoes,
    condition,
    rain,
    season: condition || ctx.weather ? null : seasonFor(ctx.today, latitude),
    formalityRange: parsed.formalityRange,
    count: Math.min(parsed.count, 5),
    variation: request.variation,
    preferLessWorn: profile?.stylingGoals.includes('use-more'),
  }

  if (parsed.intent === 'capsule') {
    const capsule = buildCapsule(items, profile)
    const recs = recommendOutfits(items, profile, { ...baseOpts, onlyIds: capsule.items.map((i) => i.id), anchorIds: [], count: 3 })
    return {
      message: `Here's a ${capsule.items.length}-piece capsule chosen from what you already own. Versatile neutrals and your most-loved styles come first. Together these make roughly ${capsule.outfitCount} outfit combinations (counting shoes and optional layers).${capsule.notes.length ? ` ${capsule.notes.join(' ')}` : ''}`,
      outfits: recs.map((r) => toStylistOutfit(r, weatherNote)),
      capsule: { itemIds: capsule.items.map((i) => i.id), combinations: capsule.outfitCount },
      followUp: 'Want a capsule for a specific trip or season? Tell me the dates or the weather.',
    }
  }

  if (parsed.intent === 'gaps') {
    const gaps = findGaps(items)
    return {
      message: gaps.length
        ? "These are optional ideas, not things you own. Before buying anything, try the outfits your current pieces already make — but if you'd like to fill a gap, these would add the most combinations:"
        : "Your wardrobe already covers the practical basics really well — I wouldn't buy anything right now. Let's get more outfits out of what you have instead.",
      outfits: [],
      purchaseIdeas: gaps.slice(0, 4).map((g) => ({ name: `${g.title} (e.g. ${g.suggestion.toLowerCase()})`, reason: g.reason })),
    }
  }

  if (parsed.intent === 'versatility') {
    const underused = [...items]
      .filter((i) => ['top', 'bottom', 'onePiece', 'layer'].includes(slotFor(i)))
      .sort((a, b) => a.timesWorn - b.timesWorn || a.createdAt.localeCompare(b.createdAt))
      .slice(0, 3)
    const outfits: StylistOutfit[] = []
    const used = new Set<string>()
    for (const item of underused) {
      const rec = recommendOutfits(items, profile, { ...baseOpts, anchorIds: [item.id], count: 2, preferLessWorn: true }).find(
        (r) => !used.has(r.items.map((i) => i.id).sort().join()),
      )
      if (!rec) continue
      used.add(rec.items.map((i) => i.id).sort().join())
      outfits.push(toStylistOutfit({ ...rec, name: `New way to wear: ${item.name}` }, weatherNote))
    }
    return {
      message: outfits.length
        ? 'A few ideas to re-wear pieces that have had the least attention. Mixing a less-worn piece with your reliable favorites is the easiest way to multiply combinations.'
        : 'I need a few tops and bottoms (or dresses) to suggest new combinations.',
      outfits,
      followUp: 'Mark outfits as worn from the Studio or Calendar and I can track what needs more love.',
    }
  }

  // Outfit requests
  let recs = recommendOutfits(items, profile, baseOpts)
  const notes: string[] = []
  if (!recs.length && parsed.anchors.length) {
    notes.push(`I couldn't build complete looks around ${parsed.anchors.map((a) => a.name).join(' and ')} yet, so here are other options.`)
    recs = recommendOutfits(items, profile, { ...baseOpts, anchorIds: [] })
  }
  if (!recs.length) {
    const slots = new Set(items.map(slotFor))
    const missing = !slots.has('top') && !slots.has('onePiece') ? 'tops' : !slots.has('bottom') && !slots.has('onePiece') ? 'bottoms' : 'a few more pieces'
    return { message: `I need ${missing} in your wardrobe to put complete outfits together. Add some and ask me again!`, outfits: [] }
  }

  const ownedShoeTypes = new Set(items.filter((i) => slotFor(i) === 'shoes').map((i) => i.subcategory))
  for (const s of parsed.requireShoes) if (!ownedShoeTypes.has(s)) notes.push(`You don't have ${s} in your wardrobe yet, so I chose the closest shoes you own.`)
  if (recs.some((r) => !hasBase(r.items))) notes.push('Some looks are partial — add more pieces for complete outfits.')

  const what = [
    parsed.occasion ? `for ${occasionLabel(parsed.occasion).toLowerCase()}` : null,
    parsed.aesthetics.length ? `with a ${parsed.aesthetics.map((a) => aestheticName(a).toLowerCase()).join(' + ')} feel` : null,
    parsed.anchors.length ? `built around your ${parsed.anchors.map((a) => a.name).join(' and ')}` : null,
    parsed.formalityRange && parsed.formalityRange[1] < 3 ? 'kept relaxed rather than dressy' : null,
  ].filter(Boolean)

  return {
    message: `${recs.length === 1 ? 'Here is a look' : `Here are ${recs.length} looks`} from your wardrobe${what.length ? ` ${what.join(', ')}` : ''}. ${notes.join(' ')}`.trim(),
    outfits: recs.map((r) => toStylistOutfit(r, weatherNote)),
    followUp: parsed.vague ? 'Where are you headed? Tell me the occasion, weather or mood and I can tailor these.' : null,
  }
}

export const localStylist: StylistService = {
  kind: 'local',
  async respond(request: StylistRequest, ctx: StylistContext): Promise<StylistReply> {
    const raw = composeLocalResponse(request, ctx)
    const { response, droppedIds } = validateStylistResponse(raw, ctx.items)
    return { response, droppedIds, source: 'local' }
  },
}
