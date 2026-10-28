import type { ArtKind } from '@/rendering/garmentShapes'
import type { Pattern } from './types'

export interface MoodPiece {
  art: ArtKind
  colors: string[]
  pattern?: Pattern
}

export interface AestheticDef {
  id: string
  name: string
  tagline: string
  description: string
  /** Color ids from the shared palette. */
  palette: string[]
  garments: string[]
  footwear: string[]
  accessories: string[]
  principles: string[]
  /** Words in a request or item tag that signal this aesthetic. */
  keywords: string[]
  /** Formality tendency (1 relaxed – 5 formal), used to match occasions. */
  formality: number
  moodboard: [MoodPiece, MoodPiece, MoodPiece]
  /** Background tint for the moodboard card. */
  tint: string
}

/** Extend this list to add new aesthetics; everything else picks them up automatically. */
export const AESTHETICS: readonly AestheticDef[] = [
  {
    id: 'minimalist', name: 'Minimalist', tagline: 'Less, but better',
    description: 'Clean lines, quiet colors and pieces that work hard. The focus is on fit, fabric and effortless repetition.',
    palette: ['white', 'black', 'beige', 'grey', 'camel'],
    garments: ['Crisp shirts', 'Straight trousers', 'Fine knits', 'Slip skirts'],
    footwear: ['Leather loafers', 'Clean white sneakers', 'Simple mules'],
    accessories: ['Structured tote', 'One delicate necklace'],
    principles: ['Keep to 2–3 colors per look', 'Choose one interesting texture instead of prints', 'Let proportion do the talking'],
    keywords: ['minimal', 'minimalist', 'clean', 'simple', 'neutral', 'understated'],
    formality: 3, tint: '#F5F2EE',
    moodboard: [{ art: 'shirt', colors: ['white'] }, { art: 'trousers', colors: ['black'] }, { art: 'loafers', colors: ['black'] }],
  },
  {
    id: 'casual', name: 'Casual', tagline: 'Easy, everyday ease',
    description: 'Comfortable favourites styled with intention: good jeans, soft tees and sneakers you can walk in all day.',
    palette: ['denim', 'white', 'grey', 'light-blue', 'cream'],
    garments: ['T-shirts', 'Straight jeans', 'Sweatshirts', 'Denim jackets'],
    footwear: ['Sneakers', 'Flats', 'Sandals'],
    accessories: ['Crossbody bag', 'Baseball cap', 'Canvas tote'],
    principles: ['Tuck or half-tuck tees for shape', 'Mix one elevated piece into a relaxed look', 'Comfort first'],
    keywords: ['casual', 'relaxed', 'comfy', 'comfortable', 'easy', 'laid back', 'everyday'],
    formality: 1, tint: '#EEF3FA',
    moodboard: [{ art: 'tee', colors: ['white'] }, { art: 'jeans', colors: ['denim'] }, { art: 'sneakers', colors: ['white'] }],
  },
  {
    id: 'chic', name: 'Chic', tagline: 'Polished with a wink',
    description: 'Sharp tailoring, considered contrast and a confident accessory. Effortless, but never accidental.',
    palette: ['black', 'white', 'camel', 'red', 'cream'],
    garments: ['Blazers', 'Tailored trousers', 'Silk blouses', 'Little black dresses'],
    footwear: ['Pointed flats', 'Heeled loafers', 'Slingbacks'],
    accessories: ['Structured handbag', 'Sunglasses', 'Gold hoops'],
    principles: ['Add one statement accessory', 'Contrast textures: crisp vs. soft', 'Red lip, red bag, or red shoe — just one'],
    keywords: ['chic', 'polished', 'sophisticated', 'parisian', 'sharp'],
    formality: 3, tint: '#F8F0EC',
    moodboard: [{ art: 'blazer', colors: ['black'] }, { art: 'blouse', colors: ['cream'] }, { art: 'handbag', colors: ['red'] }],
  },
  {
    id: 'feminine', name: 'Feminine', tagline: 'Soft shapes, gentle colors',
    description: 'Flowing skirts, blouses with detail and a soft palette. Graceful without feeling fussy.',
    palette: ['blush', 'lavender', 'cream', 'white', 'pink'],
    garments: ['Blouses', 'Midi skirts', 'Wrap dresses', 'Cardigans'],
    footwear: ['Ballet flats', 'Strappy sandals', 'Kitten heels'],
    accessories: ['Pearl earrings', 'Hair ribbons', 'Small shoulder bag'],
    principles: ['Define the waist', 'Choose movement: pleats, ruffles, flow', 'Soft color with one grounding neutral'],
    keywords: ['feminine', 'soft', 'girly', 'pretty', 'delicate', 'sweet'],
    formality: 2, tint: '#FBEFF5',
    moodboard: [{ art: 'blouse', colors: ['blush'] }, { art: 'skirtMidi', colors: ['lavender'] }, { art: 'flats', colors: ['cream'] }],
  },
  {
    id: 'elegant', name: 'Elegant', tagline: 'Timeless and refined',
    description: 'Long lines, luxurious fabrics and restraint. Pieces that feel special without being loud.',
    palette: ['navy', 'cream', 'black', 'burgundy', 'gold'],
    garments: ['Midi dresses', 'Wide-leg trousers', 'Silk tops', 'Long coats'],
    footwear: ['Heels', 'Pointed flats', 'Sleek boots'],
    accessories: ['Fine jewelry', 'Clutch', 'Silk scarf'],
    principles: ['Elongate with column dressing', 'Invest in drape and fabric', 'Keep jewelry fine and few'],
    keywords: ['elegant', 'refined', 'classy', 'graceful', 'dressy', 'luxurious', 'timeless'],
    formality: 4, tint: '#F1EEF6',
    moodboard: [{ art: 'dressMidi', colors: ['navy'] }, { art: 'clutch', colors: ['gold'] }, { art: 'heels', colors: ['black'] }],
  },
  {
    id: 'streetwear', name: 'Streetwear', tagline: 'Bold, relaxed, current',
    description: 'Oversized shapes, sporty references and statement sneakers. Comfort with attitude.',
    palette: ['black', 'grey', 'white', 'olive', 'orange'],
    garments: ['Hoodies', 'Cargo trousers', 'Graphic tees', 'Bomber jackets'],
    footwear: ['Chunky sneakers', 'High-tops'],
    accessories: ['Cap', 'Crossbody bag', 'Chain necklace'],
    principles: ['Play with oversized proportions', 'Let sneakers lead', 'Layer textures and logos sparingly'],
    keywords: ['streetwear', 'street', 'urban', 'oversized', 'sporty-cool', 'baggy'],
    formality: 1, tint: '#EFEFEF',
    moodboard: [{ art: 'hoodie', colors: ['grey'] }, { art: 'trousers', colors: ['olive'] }, { art: 'sneakers', colors: ['white'] }],
  },
  {
    id: 'coquette', name: 'Coquette', tagline: 'Bows, lace and sweetness',
    description: 'Playful romance: bows, pastel pinks, lace trims and dainty details with a vintage wink.',
    palette: ['blush', 'pink', 'white', 'cream', 'lilac'],
    garments: ['Lace-trim camis', 'Mini skirts', 'Puff-sleeve blouses', 'Cardigans'],
    footwear: ['Mary Janes', 'Ballet flats'],
    accessories: ['Hair bows', 'Pearls', 'Heart lockets'],
    principles: ['One bow goes a long way', 'Pastels with crisp white', 'Dainty, not costume'],
    keywords: ['coquette', 'bow', 'bows', 'lace', 'dainty', 'girly'],
    formality: 2, tint: '#FDEEF4',
    moodboard: [{ art: 'cami', colors: ['blush'] }, { art: 'skirtMini', colors: ['white'] }, { art: 'hairbow', colors: ['pink'] }],
  },
  {
    id: 'old-money', name: 'Old money', tagline: 'Quiet, heritage luxury',
    description: 'Understated quality: cable knits, pleated trousers, loafers and navy-and-cream color stories.',
    palette: ['navy', 'cream', 'camel', 'white', 'green'],
    garments: ['Cable-knit sweaters', 'Pleated trousers', 'Polo shirts', 'Trench coats'],
    footwear: ['Loafers', 'Riding boots', 'Ballet flats'],
    accessories: ['Leather belt', 'Silk scarf', 'Simple watch'],
    principles: ['No visible logos', 'Natural fibres and muted tones', 'Draped sweater over the shoulders'],
    keywords: ['old money', 'quiet luxury', 'heritage', 'country club', 'classic'],
    formality: 3, tint: '#F3F1EA',
    moodboard: [{ art: 'sweater', colors: ['cream'], pattern: 'textured' }, { art: 'trousers', colors: ['navy'] }, { art: 'loafers', colors: ['brown'] }],
  },
  {
    id: 'romantic', name: 'Romantic', tagline: 'Dreamy and flowing',
    description: 'Florals, ruffles and soft movement, inspired by gardens and golden-hour light.',
    palette: ['blush', 'cream', 'lavender', 'sage', 'burgundy'],
    garments: ['Floral dresses', 'Ruffled blouses', 'Maxi skirts'],
    footwear: ['Strappy sandals', 'Lace-up flats'],
    accessories: ['Pearl drops', 'Straw bag', 'Ribbon'],
    principles: ['Florals with a solid companion', 'Movement in skirts and sleeves', 'Soft makeup, soft palette'],
    keywords: ['romantic', 'dreamy', 'floral', 'flowy', 'ruffle', 'whimsical'],
    formality: 2, tint: '#FAF0F0',
    moodboard: [{ art: 'dressMidi', colors: ['blush', 'sage'], pattern: 'floral' }, { art: 'cardigan', colors: ['cream'] }, { art: 'sandals', colors: ['beige'] }],
  },
  {
    id: 'sporty', name: 'Sporty', tagline: 'Active and fresh',
    description: 'Athletic pieces styled for life: leggings, zip-ups, clean sneakers and a confident pony.',
    palette: ['white', 'black', 'grey', 'light-blue', 'sage'],
    garments: ['Leggings', 'Zip jackets', 'Bike shorts', 'Fitted tees'],
    footwear: ['Running sneakers', 'Slides'],
    accessories: ['Baseball cap', 'Belt bag', 'Water bottle'],
    principles: ['Matching sets look instantly put-together', 'Balance fitted with relaxed', 'Clean white sneakers lift everything'],
    keywords: ['sporty', 'athletic', 'active', 'gym', 'athleisure'],
    formality: 1, tint: '#EEF5F3',
    moodboard: [{ art: 'crop', colors: ['white'] }, { art: 'leggings', colors: ['black'] }, { art: 'sneakers', colors: ['light-blue'] }],
  },
  {
    id: 'business-casual', name: 'Business casual', tagline: 'Professional, still you',
    description: 'Office-ready without the stiffness: blazers over knits, tailored trousers and comfortable flats.',
    palette: ['navy', 'white', 'grey', 'camel', 'light-blue'],
    garments: ['Blazers', 'Tailored trousers', 'Knit tops', 'Shirt dresses'],
    footwear: ['Loafers', 'Block heels', 'Pointed flats'],
    accessories: ['Tote bag', 'Watch', 'Simple studs'],
    principles: ['Third piece rule: add a blazer or cardigan', 'One color pop at most', 'Comfortable shoes you can commute in'],
    keywords: ['business', 'office', 'professional', 'work', 'smart casual', 'smart'],
    formality: 3, tint: '#EEF1F7',
    moodboard: [{ art: 'blazer', colors: ['navy'] }, { art: 'shirt', colors: ['light-blue'] }, { art: 'tote', colors: ['camel'] }],
  },
  {
    id: 'vintage', name: 'Vintage', tagline: 'Old soul, new stories',
    description: 'Thrifted treasures and retro silhouettes: high-waisted jeans, cardigans, midi skirts and warm tones.',
    palette: ['mustard', 'brown', 'cream', 'burgundy', 'sage'],
    garments: ['High-waisted jeans', 'Pleated midi skirts', 'Cardigans', 'Collared blouses'],
    footwear: ['Mary Janes', 'Loafers', 'Ankle boots'],
    accessories: ['Headscarf', 'Cat-eye sunglasses', 'Brooch'],
    principles: ['Mix one vintage hero with modern basics', 'Warm, earthy palettes', 'Waist-defining silhouettes'],
    keywords: ['vintage', 'retro', 'thrift', 'thrifted', '70s', '90s'],
    formality: 2, tint: '#F7F0E3',
    moodboard: [{ art: 'cardigan', colors: ['mustard'] }, { art: 'skirtMidi', colors: ['brown'], pattern: 'checked' }, { art: 'loafers', colors: ['burgundy'] }],
  },
  {
    id: 'bohemian', name: 'Bohemian', tagline: 'Free-spirited layers',
    description: 'Relaxed, earthy and layered: flowing maxis, embroidery, fringe and natural textures.',
    palette: ['camel', 'cream', 'orange', 'olive', 'brown'],
    garments: ['Maxi dresses', 'Peasant blouses', 'Flared jeans', 'Crochet cardigans'],
    footwear: ['Suede boots', 'Flat sandals'],
    accessories: ['Layered necklaces', 'Wide-brim hat', 'Woven bag'],
    principles: ['Layer textures and jewelry', 'Earth tones with one warm accent', 'Loose, breezy shapes'],
    keywords: ['boho', 'bohemian', 'hippie', 'earthy', 'free spirit'],
    formality: 1, tint: '#F7EFE6',
    moodboard: [{ art: 'dressMaxi', colors: ['orange', 'cream'], pattern: 'floral' }, { art: 'hat', colors: ['camel'] }, { art: 'boots', colors: ['brown'] }],
  },
  {
    id: 'preppy', name: 'Preppy', tagline: 'Crisp and collegiate',
    description: 'Polished classics with a playful edge: pleated skirts, cable knits, collars and loafers.',
    palette: ['navy', 'white', 'green', 'red', 'cream'],
    garments: ['Pleated skirts', 'Cable sweaters', 'Button-down shirts', 'Blazers'],
    footwear: ['Loafers', 'Boat shoes', 'Knee socks with Mary Janes'],
    accessories: ['Headband', 'Pearl studs', 'Satchel'],
    principles: ['Peek a collar out of a sweater', 'Plaid and stripes in moderation', 'Navy is your black'],
    keywords: ['preppy', 'collegiate', 'ivy', 'schoolgirl', 'academia'],
    formality: 2, tint: '#EEF2F6',
    moodboard: [{ art: 'sweater', colors: ['navy'], pattern: 'textured' }, { art: 'skirtMini', colors: ['green', 'navy'], pattern: 'plaid' }, { art: 'loafers', colors: ['black'] }],
  },
  {
    id: 'edgy', name: 'Edgy', tagline: 'Dark, bold, fearless',
    description: 'Leather, black on black, hardware and boots. Strong silhouettes with a rebellious streak.',
    palette: ['black', 'charcoal', 'silver', 'burgundy', 'white'],
    garments: ['Leather jackets', 'Black skinny jeans', 'Slip dresses', 'Band tees'],
    footwear: ['Combat boots', 'Chelsea boots'],
    accessories: ['Silver jewelry', 'Studded belt', 'Chain bag'],
    principles: ['Contrast soft with hard (slip dress + leather)', 'Monochrome black with texture', 'Silver hardware'],
    keywords: ['edgy', 'grunge', 'rock', 'punk', 'dark', 'goth', 'leather'],
    formality: 2, tint: '#ECEBEE',
    moodboard: [{ art: 'jacket', colors: ['black'] }, { art: 'slipDress', colors: ['burgundy'] }, { art: 'boots', colors: ['black'] }],
  },
]

const BY_ID = new Map(AESTHETICS.map((a) => [a.id, a]))

export function getAesthetic(id: string): AestheticDef | undefined {
  return BY_ID.get(id)
}

export function aestheticName(id: string): string {
  return BY_ID.get(id)?.name ?? id
}

/** Blends several aesthetics into a combined guide for "explore combinations". */
export function blendAesthetics(ids: string[]) {
  const defs = ids.map((id) => BY_ID.get(id)).filter((a): a is AestheticDef => Boolean(a))
  const take = <T,>(lists: T[][], n: number) => {
    const out: T[] = []
    for (let i = 0; out.length < n && i < 6; i++) {
      for (const list of lists) if (list[i] !== undefined && !out.includes(list[i])) out.push(list[i])
    }
    return out.slice(0, n)
  }
  return {
    name: defs.map((d) => d.name).join(' × '),
    palette: take(defs.map((d) => d.palette), 6),
    garments: take(defs.map((d) => d.garments), 6),
    footwear: take(defs.map((d) => d.footwear), 4),
    accessories: take(defs.map((d) => d.accessories), 4),
    principles: take(defs.map((d) => d.principles), 4),
    formality: defs.length ? defs.reduce((s, d) => s + d.formality, 0) / defs.length : 2,
  }
}
