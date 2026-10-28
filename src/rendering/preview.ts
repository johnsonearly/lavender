import { artFor, slotFor, type Slot } from '@/domain/categories'
import type { ClothingItem } from '@/domain/types'
import { GARMENTS, PHOTO_ZONES, type ArtKind } from './garmentShapes'

/**
 * The outfit preview is built from "layers". This module is renderer-agnostic: a future
 * virtual try-on service could consume the same item list and return an image instead.
 */
export type PreviewMode = 'illustrated' | 'photo'

export interface PreviewLayer {
  item: ClothingItem
  slot: Slot
  art: ArtKind
  z: number
  kind: 'vector' | 'photo'
  /** Photo placement rectangle when kind === 'photo'. */
  zone?: [number, number, number, number]
}

export interface PreviewPlan {
  layers: PreviewLayer[]
  /** Items that cannot be placed on the figure (e.g. "Other"). Shown beside the preview. */
  unplaced: ClothingItem[]
  /** Items shown as photos, which are positioned but not fitted. */
  photoCount: number
}

function zoneFor(slot: Slot, art: ArtKind): [number, number, number, number] | undefined {
  if (slot === 'accessory') return PHOTO_ZONES[art] ?? PHOTO_ZONES.accessory
  return PHOTO_ZONES[slot]
}

export function buildPreview(items: ClothingItem[], mode: PreviewMode): PreviewPlan {
  const layers: PreviewLayer[] = []
  const unplaced: ClothingItem[] = []
  let photoCount = 0

  for (const item of items) {
    const slot = slotFor(item)
    if (slot === 'other') {
      unplaced.push(item)
      continue
    }
    const art = artFor(item)
    const shape = GARMENTS[art]
    const zone = zoneFor(slot, art)
    const usePhoto = mode === 'photo' && Boolean(item.imageUrl) && Boolean(zone)
    if (usePhoto) photoCount++
    layers.push({ item, slot, art, z: shape.z, kind: usePhoto ? 'photo' : 'vector', zone: usePhoto ? zone : undefined })
  }

  layers.sort((a, b) => a.z - b.z)
  return { layers, unplaced, photoCount }
}

/** Garments that may spill sideways past their zone (sleeves, wide legs) when scaled to fit. */
const WIDE_SLOTS: Slot[] = ['top', 'bottom', 'onePiece', 'layer']

/**
 * Places a photo inside its zone at its true aspect ratio (uniform scale, never distorted).
 * Clothing is anchored where it is worn — tops and dresses at the shoulders, bottoms at the
 * waist, shoes on the floor — and may overflow the zone width (35% for tops, 70% for long garments) for sleeves and legs.
 */
export function photoRect(
  zone: [number, number, number, number],
  slot: Slot,
  size: { width: number; height: number } | null,
): [number, number, number, number] {
  const [x, y, w, h] = zone
  if (!size || size.width <= 0 || size.height <= 0) return zone
  // Long garments (trousers, dresses) are fitted mainly by length so hems land near the ankle.
  const overflow = slot === 'bottom' || slot === 'onePiece' ? 1.7 : WIDE_SLOTS.includes(slot) ? 1.35 : 1
  const maxW = w * overflow
  const scale = Math.min(maxW / size.width, h / size.height)
  const rw = size.width * scale
  const rh = size.height * scale
  const rx = x + w / 2 - rw / 2
  const ry = WIDE_SLOTS.includes(slot) ? y : slot === 'shoes' ? y + h - rh : y + (h - rh) / 2
  return [rx, ry, rw, rh]
}
