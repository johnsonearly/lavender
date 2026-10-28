/**
 * Vector garment library drawn in a shared 240×640 "croquis" coordinate space.
 *
 * Every shape is authored to sit on the mannequin defined below, so the same data renders
 * both as a wardrobe thumbnail (cropped to `bbox`) and as a layer in the outfit preview.
 * These are stylised illustrations generated from item metadata — not fitted garments.
 */

export type ArtKind =
  | 'cami' | 'crop' | 'tee' | 'longTee' | 'blouse' | 'shirt' | 'sweater' | 'cardigan' | 'hoodie'
  | 'trousers' | 'wideTrousers' | 'leggings' | 'jeans' | 'shorts'
  | 'skirtMini' | 'skirtMidi' | 'skirtMaxi'
  | 'dressMini' | 'dressMidi' | 'dressMaxi' | 'slipDress' | 'jumpsuit' | 'playsuit'
  | 'blazer' | 'jacket' | 'coat'
  | 'sneakers' | 'loafers' | 'heels' | 'flats' | 'boots' | 'sandals'
  | 'handbag' | 'tote' | 'crossbody' | 'clutch'
  | 'necklace' | 'earrings' | 'bracelet'
  | 'belt' | 'hat' | 'scarf' | 'sunglasses' | 'hairbow'
  | 'generic'

export interface GarmentShape {
  /** Filled outlines. */
  body: string[]
  /** Thin stroke-only details: seams, hems, pleats. */
  details?: string[]
  /** Small filled accents drawn in the shade color: buttons, buckles. */
  accents?: string[]
  /** Thick strokes in the garment color: bag handles, chains. */
  straps?: string[]
  /** Draw a mirrored copy around the vertical centre line (pairs of shoes). */
  mirror?: boolean
  /** Thumbnail crop: x, y, width, height. */
  bbox: [number, number, number, number]
  /** Stacking order in the outfit preview. */
  z: number
  /** Where a pattern motif (graphic print) should be centred, if any. */
  motif?: [number, number]
}

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0 Z`

const NECKS = {
  scoop: 'M108,95 Q120,112 132,95',
  crew: 'M110,95 Q120,104 130,95',
  v: 'M109,95 L120,122 L131,95',
}

function shortTop(hem: number, neck: keyof typeof NECKS): string {
  return `${NECKS[neck]} L159,104 Q170,118 177,146 L160,153 Q156,190 151,${hem} Q120,${hem + 5} 89,${hem} Q84,190 80,153 L63,146 Q70,118 81,104 Z`
}

function longTop(hem: number, neck: keyof typeof NECKS): string {
  return `${NECKS[neck]} L159,104 C171,112 174,132 175,152 C177,195 181,240 185,284 L171,287 C168,250 163,214 159,165 Q156,200 151,${hem} Q120,${hem + 5} 89,${hem} Q84,200 81,165 C77,214 72,250 69,287 L55,284 C59,240 63,195 65,152 C66,132 69,112 81,104 Z`
}

const LEFT_SLEEVE_CUFF = 'M56,276 L70,279'
const RIGHT_SLEEVE_CUFF = 'M184,276 L170,279'

function openFront(hem: number, opening: number, lapel: boolean, sideFlare = 0): string[] {
  const side = 82 - sideFlare
  const neck = lapel ? 'M108,95 L104,104 L112,130' : 'M108,95'
  const left = `${neck} L${opening},175 L${opening + 1},${hem} Q${(opening + side) / 2},${hem + 4} ${side},${hem} Q${side - 2},${(hem + 165) / 2} 80,165 C76,214 72,250 69,287 L55,284 C59,240 63,195 65,152 C66,130 70,110 80,103 Z`
  const mirrorPath = (p: string) => p.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${240 - Number(x)},${y}`)
  return [left, mirrorPath(left)]
}

const BODICE = 'M106,96 Q120,114 134,96 L156,104 Q160,124 156,145 C153,170 147,198 143,214'
const BODICE_LEFT = 'C93,198 87,170 84,145 Q80,124 84,104 Z'

export const GARMENTS: Record<ArtKind, GarmentShape> = {
  cami: {
    body: [
      'M84,126 Q120,138 156,126 L157,142 Q153,175 145,214 Q150,230 151,242 Q120,247 89,242 Q90,230 95,214 Q87,175 83,142 Z',
      'M88,128 L100,98 L103,98 L92,129 Z',
      'M152,128 L140,98 L137,98 L148,129 Z',
    ],
    details: ['M86,132 Q120,143 154,132'],
    bbox: [70, 88, 100, 166], z: 30, motif: [120, 175],
  },
  crop: {
    body: [shortTop(200, 'scoop')],
    details: ['M90,194 Q120,199 150,194'],
    bbox: [56, 88, 128, 120], z: 30, motif: [120, 150],
  },
  tee: {
    body: [shortTop(240, 'crew')],
    details: ['M112,97 Q120,104 128,97', 'M66,140 L79,146', 'M174,140 L161,146'],
    bbox: [56, 88, 128, 162], z: 30, motif: [120, 165],
  },
  longTee: {
    body: [longTop(244, 'crew')],
    details: ['M112,97 Q120,104 128,97', LEFT_SLEEVE_CUFF, RIGHT_SLEEVE_CUFF],
    bbox: [48, 88, 144, 206], z: 30, motif: [120, 165],
  },
  blouse: {
    body: [longTop(238, 'v')],
    details: ['M116,108 L120,122 L124,108', LEFT_SLEEVE_CUFF, RIGHT_SLEEVE_CUFF, 'M72,150 Q66,140 72,128', 'M168,150 Q174,140 168,128'],
    accents: ['M120,121 L112,116 L112,127 Z', 'M120,121 L128,116 L128,127 Z', circle(120, 121, 2)],
    bbox: [48, 88, 144, 206], z: 30, motif: [120, 170],
  },
  shirt: {
    body: [longTop(250, 'v'), 'M109,95 L103,108 L116,113 L120,122 Z', 'M131,95 L137,108 L124,113 L120,122 Z'],
    details: ['M120,122 L120,252', LEFT_SLEEVE_CUFF, RIGHT_SLEEVE_CUFF, 'M96,140 L110,140 L110,154'],
    accents: [circle(122.5, 140, 1.6), circle(122.5, 165, 1.6), circle(122.5, 190, 1.6), circle(122.5, 215, 1.6), circle(122.5, 238, 1.6)],
    bbox: [48, 88, 144, 210], z: 30, motif: [120, 170],
  },
  sweater: {
    body: [longTop(252, 'crew')],
    details: ['M110,97 Q120,108 130,97', 'M90,244 Q120,249 150,244', 'M57,269 L71,272', 'M183,269 L169,272', LEFT_SLEEVE_CUFF, RIGHT_SLEEVE_CUFF],
    bbox: [48, 88, 144, 206], z: 30, motif: [120, 170],
  },
  hoodie: {
    body: ['M98,100 Q102,82 120,80 Q138,82 142,100 Q130,114 120,114 Q110,114 98,100 Z', longTop(254, 'crew')],
    details: ['M98,214 L142,214 L148,246 L92,246 Z', 'M90,246 Q120,251 150,246', LEFT_SLEEVE_CUFF, RIGHT_SLEEVE_CUFF],
    straps: ['M115,104 L114,138', 'M125,104 L126,138'],
    bbox: [48, 78, 144, 214], z: 30, motif: [120, 165],
  },
  cardigan: {
    body: openFront(262, 114, false),
    details: ['M85,256 L115,256', 'M155,256 L125,256', LEFT_SLEEVE_CUFF, RIGHT_SLEEVE_CUFF],
    accents: [circle(111, 186, 2), circle(111.5, 208, 2), circle(112, 230, 2), circle(112.5, 250, 2)],
    bbox: [48, 88, 144, 206], z: 50,
  },
  blazer: {
    body: openFront(276, 116, true),
    details: ['M104,104 L95,122 L106,126 L116,178', 'M136,104 L145,122 L134,126 L124,178', 'M88,236 L104,236', 'M152,236 L136,236', LEFT_SLEEVE_CUFF, RIGHT_SLEEVE_CUFF],
    accents: [circle(113, 214, 2.2)],
    bbox: [48, 88, 144, 206], z: 50,
  },
  jacket: {
    body: openFront(248, 115, false),
    details: ['M108,95 L98,113 L112,120', 'M132,95 L142,113 L128,120', 'M91,150 L106,150 L106,166 L91,166 Z', 'M149,150 L134,150 L134,166 L149,166 Z', 'M84,238 L115,238', 'M156,238 L125,238', LEFT_SLEEVE_CUFF, RIGHT_SLEEVE_CUFF],
    accents: [circle(112, 180, 1.8), circle(112.5, 205, 1.8), circle(113, 228, 1.8)],
    bbox: [48, 88, 144, 206], z: 50,
  },
  coat: {
    body: openFront(440, 116, true, 10),
    details: ['M104,104 L95,122 L106,126 L116,180', 'M136,104 L145,122 L134,126 L124,180', 'M78,226 L117,226', 'M162,226 L123,226', 'M84,300 L100,300', 'M156,300 L140,300', LEFT_SLEEVE_CUFF, RIGHT_SLEEVE_CUFF],
    accents: [circle(112, 200, 2.2), circle(112.5, 250, 2.2)],
    bbox: [48, 88, 144, 360], z: 50,
  },
  trousers: {
    body: ['M96,212 L144,212 C152,235 158,258 158,280 C158,340 154,450 150,580 L127,580 C127,500 125,400 121,320 L119,320 C115,400 113,500 113,580 L90,580 C86,450 82,340 82,280 C82,258 88,235 96,212 Z'],
    details: ['M96,222 L144,222', 'M120,222 L120,262', 'M104,300 L101,575', 'M136,300 L139,575'],
    bbox: [72, 204, 96, 384], z: 20,
  },
  wideTrousers: {
    body: ['M96,212 L144,212 C152,235 159,258 160,280 C162,360 165,470 168,580 L124,580 L121,322 L119,322 L116,580 L72,580 C75,470 78,360 80,280 C81,258 88,235 96,212 Z'],
    details: ['M96,222 L144,222', 'M120,222 L120,262', 'M100,300 L94,575', 'M140,300 L146,575'],
    bbox: [64, 204, 112, 384], z: 20,
  },
  leggings: {
    body: ['M97,212 L143,212 C152,235 158,258 157,280 C156,320 150,400 148,425 C146,470 142,530 140,580 L130,580 C130,530 129,470 128,425 C127,390 125,350 121,320 L119,320 C115,350 113,390 112,425 C111,470 110,530 110,580 L100,580 C98,530 94,470 92,425 C90,400 84,320 83,280 C82,258 88,235 97,212 Z'],
    details: ['M97,220 L143,220'],
    bbox: [76, 204, 88, 384], z: 20,
  },
  jeans: {
    body: ['M96,212 L144,212 C152,235 158,258 158,280 C157,340 152,450 148,580 L128,580 C127,500 125,400 121,320 L119,320 C115,400 113,500 112,580 L92,580 C88,450 83,340 82,280 C82,258 88,235 96,212 Z'],
    details: ['M96,221 L144,221', 'M120,221 L120,266', 'M100,224 Q105,238 90,242', 'M140,224 Q135,238 150,242', 'M93,566 L112,566', 'M147,566 L128,566'],
    accents: [circle(120, 216.5, 1.8)],
    bbox: [72, 204, 96, 384], z: 20,
  },
  shorts: {
    body: ['M96,212 L144,212 C152,235 158,258 158,280 L160,340 L124,344 L121,322 L119,322 L116,344 L80,340 L82,280 C82,258 88,235 96,212 Z'],
    details: ['M96,221 L144,221', 'M120,221 L120,262', 'M81,332 L116,336', 'M159,332 L124,336'],
    bbox: [72, 204, 96, 148], z: 20,
  },
  skirtMini: {
    body: ['M97,212 L143,212 C152,240 160,280 166,330 Q120,342 74,330 C80,280 88,240 97,212 Z'],
    details: ['M97,221 L143,221', 'M110,224 L100,334', 'M130,224 L140,334'],
    bbox: [66, 204, 108, 144], z: 20,
  },
  skirtMidi: {
    body: ['M97,212 L143,212 C156,260 170,370 176,450 Q120,465 64,450 C70,370 84,260 97,212 Z'],
    details: ['M97,221 L143,221', 'M110,224 L96,456', 'M130,224 L144,456', 'M120,224 L120,459'],
    bbox: [58, 204, 124, 266], z: 20,
  },
  skirtMaxi: {
    body: ['M97,212 L143,212 C160,290 172,450 178,560 Q120,574 62,560 C68,450 80,290 97,212 Z'],
    details: ['M97,221 L143,221', 'M110,224 L94,566', 'M130,224 L146,566'],
    bbox: [56, 204, 128, 376], z: 20,
  },
  dressMini: {
    body: [`${BODICE} C152,250 160,300 164,330 Q120,340 76,330 C80,300 88,250 97,214 ${BODICE_LEFT}`],
    details: ['M97,214 Q120,219 143,214'],
    bbox: [66, 88, 108, 256], z: 30, motif: [120, 165],
  },
  dressMidi: {
    body: [`${BODICE} C158,280 172,380 178,452 Q120,468 62,452 C68,380 82,280 97,214 ${BODICE_LEFT}`],
    details: ['M97,214 Q120,219 143,214', 'M112,220 L100,458', 'M128,220 L140,458'],
    bbox: [56, 88, 128, 386], z: 30, motif: [120, 165],
  },
  dressMaxi: {
    body: [`${BODICE} C160,290 172,450 176,565 Q120,578 64,565 C68,450 80,290 97,214 ${BODICE_LEFT}`],
    details: ['M97,214 Q120,219 143,214', 'M112,220 L98,570', 'M128,220 L142,570'],
    bbox: [56, 88, 128, 496], z: 30, motif: [120, 165],
  },
  slipDress: {
    body: [
      'M86,126 Q103,128 120,146 Q137,128 154,126 L157,142 Q153,175 147,214 C156,300 164,400 166,470 Q120,480 74,470 C76,400 84,300 93,214 Q87,175 83,142 Z',
      'M88,127 L100,98 L102,98 L91,128 Z',
      'M152,127 L140,98 L138,98 L149,128 Z',
    ],
    details: ['M104,240 Q100,360 96,470', 'M136,240 Q140,360 144,470'],
    bbox: [64, 88, 112, 398], z: 30, motif: [120, 200],
  },
  jumpsuit: {
    body: [`${BODICE} C152,235 159,258 160,280 C162,360 165,470 168,578 L124,578 L121,322 L119,322 L116,578 L72,578 C75,470 78,360 80,280 C81,258 88,235 97,214 ${BODICE_LEFT}`],
    details: ['M97,214 Q120,220 143,214', 'M100,300 L94,574', 'M140,300 L146,574'],
    accents: ['M120,217 L108,232 L113,233 Z', 'M120,217 L132,232 L127,233 Z'],
    bbox: [64, 88, 112, 500], z: 30, motif: [120, 165],
  },
  playsuit: {
    body: [`${BODICE} C152,235 158,258 158,280 L160,338 L124,342 L121,322 L119,322 L116,342 L80,338 L82,280 C82,258 88,235 97,214 ${BODICE_LEFT}`],
    details: ['M97,214 Q120,220 143,214', 'M81,330 L116,334', 'M159,330 L124,334'],
    bbox: [66, 88, 108, 262], z: 30, motif: [120, 165],
  },
  sneakers: {
    body: ['M96,576 L112,576 Q116,588 116,598 L116,604 Q105,609 94,604 L94,597 Q94,586 96,576 Z'],
    details: ['M94,598 Q105,602 116,598', 'M100,582 L108,582', 'M100,587 L109,587'],
    mirror: true, bbox: [86, 560, 68, 54], z: 10,
  },
  loafers: {
    body: ['M98,584 L112,584 Q114,594 114,602 Q105,607 96,603 Q96,592 98,584 Z'],
    details: ['M98,591 L113,591'],
    accents: [circle(105.5, 591, 1.4)],
    mirror: true, bbox: [86, 568, 68, 46], z: 10,
  },
  heels: {
    body: ['M100,582 L111,582 L112,598 L106,611 L100,600 Z'],
    details: ['M100,587 L111,587'],
    mirror: true, bbox: [86, 566, 68, 50], z: 10,
  },
  flats: {
    body: ['M99,588 L112,588 Q114,596 113,602 Q105,606 97,603 Q97,594 99,588 Z'],
    details: ['M101,592 Q106,595 111,592'],
    mirror: true, bbox: [86, 570, 68, 42], z: 10,
  },
  boots: {
    body: ['M94,500 L114,500 L113,590 Q117,598 116,604 Q105,609 94,604 Q93,596 95,588 Z'],
    details: ['M95,508 L114,508', 'M94,598 Q105,602 116,598'],
    mirror: true, bbox: [80, 490, 80, 126], z: 10,
  },
  sandals: {
    body: ['M97,600 L113,600 L114,605 Q105,608 96,605 Z', 'M98,587 L112,587 L112,590 L98,590 Z', 'M99,595 L112,593 L112,596 L99,598 Z'],
    mirror: true, bbox: [86, 570, 68, 44], z: 10,
  },
  handbag: {
    body: ['M160,302 L200,302 L205,342 Q182,348 155,342 Z'],
    straps: ['M168,302 Q180,270 192,302'],
    details: ['M160,312 L200,312'],
    accents: ['M177,309 L183,309 L183,316 L177,316 Z'],
    bbox: [146, 262, 68, 92], z: 70,
  },
  tote: {
    body: ['M156,300 L204,300 L208,356 L152,356 Z'],
    straps: ['M166,300 Q172,262 180,262 Q188,262 194,300'],
    details: ['M156,310 L204,310'],
    bbox: [146, 254, 70, 108], z: 70,
  },
  crossbody: {
    body: ['M150,262 L184,262 Q188,280 184,296 L150,296 Q146,280 150,262 Z'],
    straps: ['M86,106 L154,264'],
    details: ['M150,263 Q167,284 184,263'],
    accents: [circle(167, 276, 2)],
    bbox: [140, 226, 54, 76], z: 70,
  },
  clutch: {
    body: ['M164,288 L200,288 Q203,300 200,314 L164,314 Q161,300 164,288 Z'],
    details: ['M164,289 L182,302 L200,289'],
    accents: [circle(182, 302, 1.8)],
    bbox: [154, 278, 56, 44], z: 70,
  },
  necklace: {
    body: [circle(120, 126, 4)],
    straps: ['M108,97 Q120,132 132,97'],
    bbox: [100, 90, 40, 46], z: 60,
  },
  earrings: {
    body: [circle(98, 64, 2.6), circle(142, 64, 2.6), circle(98, 71, 2), circle(142, 71, 2)],
    bbox: [90, 52, 60, 28], z: 60,
  },
  bracelet: {
    body: ['M54,276 Q62,272 70,276 L70,281 Q62,277 54,281 Z'],
    bbox: [48, 266, 28, 22], z: 60,
  },
  belt: {
    body: ['M95,209 L145,209 L146,220 L94,220 Z'],
    details: ['M115,208 L125,208 L125,221 L115,221 Z'],
    bbox: [88, 200, 64, 28], z: 40,
  },
  hat: {
    body: ['M100,30 Q100,6 120,5 Q140,6 140,30 Q120,26 100,30 Z', 'M76,32 Q120,20 164,32 Q120,46 76,32 Z'],
    details: ['M100,25 Q120,21 140,25'],
    bbox: [72, 0, 96, 48], z: 80,
  },
  scarf: {
    body: ['M103,90 Q120,104 137,90 L140,104 Q120,122 100,104 Z', 'M104,104 L98,186 L111,188 L115,110 Z'],
    details: ['M99,180 L111,182'],
    bbox: [92, 84, 56, 108], z: 55,
  },
  sunglasses: {
    body: ['M100,44 L117,44 Q117,55 108.5,56 Q100,55 100,44 Z', 'M123,44 L140,44 Q140,55 131.5,56 Q123,55 123,44 Z'],
    straps: ['M117,46 Q120,43 123,46'],
    bbox: [96, 38, 48, 22], z: 85,
  },
  hairbow: {
    body: ['M136,30 L124,20 Q120,30 124,40 Z', 'M136,30 L148,20 Q152,30 148,40 Z', 'M134,32 L129,48 L134,45 Z', 'M138,32 L143,48 L138,45 Z'],
    accents: [circle(136, 30, 3.2)],
    bbox: [116, 14, 40, 38], z: 85,
  },
  generic: {
    body: ['M98,250 L142,250 L152,266 L152,324 L88,324 L88,266 Z'],
    details: [circle(120, 264, 4)],
    bbox: [78, 236, 84, 100], z: 25,
  },
}

/** Mannequin silhouette: a faceless dress-form style croquis in the same coordinate space. */
export const MANNEQUIN = {
  head: { cx: 120, cy: 50, rx: 21, ry: 26 },
  neck: 'M111,70 L129,70 L131,98 Q120,102 109,98 Z',
  arms: [
    'M82,106 C72,112 70,130 69,150 C67,175 64,195 63,210 C61,235 59,260 58,285 L66,287 C68,262 72,238 75,214 C77,196 80,172 84,150 Z',
    'M158,106 C168,112 170,130 171,150 C173,175 176,195 177,210 C179,235 181,260 182,285 L174,287 C172,262 168,238 165,214 C163,196 160,172 156,150 Z',
  ],
  hands: [
    { cx: 61, cy: 297, rx: 6, ry: 11 },
    { cx: 179, cy: 297, rx: 6, ry: 11 },
  ],
  body:
    'M112,94 L128,94 C136,100 152,100 160,106 C163,112 160,126 155,142 C153,165 147,195 142,214 C150,235 158,258 157,280 C156,300 153,320 150,340 C148,380 147,400 147,425 C146,470 141,530 139,580 L131,580 C131,530 130,470 129,425 C128,390 126,350 122,318 L118,318 C114,350 112,390 111,425 C110,470 109,530 109,580 L101,580 C99,530 94,470 93,425 C93,400 92,380 90,340 C87,320 84,300 83,280 C82,258 90,235 98,214 C93,195 87,165 85,142 C80,126 77,112 80,106 C88,100 104,100 112,94 Z',
  feet: ['M101,578 L109,578 L111,596 Q106,604 99,600 Z', 'M139,578 L131,578 L129,596 Q134,604 141,600 Z'],
  viewBox: '0 0 240 640',
} as const

/** Rectangles used when a photo (rather than an illustration) is placed on the figure. */
export const PHOTO_ZONES: Record<string, [number, number, number, number]> = {
  top: [62, 92, 116, 170],
  bottom: [72, 206, 96, 384],
  onePiece: [64, 92, 112, 480],
  layer: [54, 88, 132, 360],
  shoes: [86, 552, 68, 60],
  bag: [148, 262, 66, 96],
  jewelry: [100, 92, 40, 44],
  belt: [90, 202, 60, 24],
  hat: [76, 0, 88, 42],
  scarf: [94, 86, 52, 104],
  sunglasses: [96, 38, 48, 22],
  hairbow: [118, 14, 36, 36],
  accessory: [92, 84, 56, 108],
}
