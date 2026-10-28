import { addToOutfit } from '@/domain/outfitRules'
import type { ClothingItem } from '@/domain/types'
import { stylistResponseSchema, type StylistResponse } from './types'

export class StylistValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StylistValidationError'
  }
}

export interface ValidatedResponse {
  response: StylistResponse
  droppedIds: string[]
}

/**
 * Validates raw stylist output and guarantees every referenced id is a real item in the
 * current user's inventory. Unknown ids are removed; incompatible pieces are resolved with the
 * same composition rules as the Outfit Studio; outfits left empty are discarded.
 */
export function validateStylistResponse(raw: unknown, inventory: readonly ClothingItem[]): ValidatedResponse {
  const parsed = stylistResponseSchema.safeParse(raw)
  if (!parsed.success) {
    throw new StylistValidationError(`Stylist returned an unexpected format: ${parsed.error.issues[0]?.message ?? 'invalid'}`)
  }
  const byId = new Map(inventory.map((i) => [i.id, i]))
  const dropped = new Set<string>()

  const outfits = parsed.data.outfits
    .map((outfit) => {
      let composed: ClothingItem[] = []
      for (const id of outfit.itemIds) {
        const item = byId.get(id)
        if (!item) {
          dropped.add(id)
          continue
        }
        composed = addToOutfit(composed, item).items
      }
      const alternatives = outfit.alternatives.filter((alt) => {
        if (byId.has(alt.itemId)) return true
        dropped.add(alt.itemId)
        return false
      })
      return { ...outfit, itemIds: composed.map((i) => i.id), alternatives }
    })
    .filter((o) => o.itemIds.length > 0)

  let capsule = parsed.data.capsule
  if (capsule) {
    const ids = capsule.itemIds.filter((id) => {
      if (byId.has(id)) return true
      dropped.add(id)
      return false
    })
    capsule = ids.length ? { ...capsule, itemIds: ids } : null
  }

  return { response: { ...parsed.data, outfits, capsule }, droppedIds: [...dropped] }
}
