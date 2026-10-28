import { z } from 'zod'
import type { ClothingItem, Outfit, UserProfile } from '@/domain/types'
import type { WeatherDay } from '@/domain/weather'

/**
 * Structured output contract for the stylist. Both the local engine and any remote LLM must
 * produce this shape; it is validated (and item ids checked against the inventory) before rendering.
 */
export const stylistOutfitSchema = z.object({
  name: z.string().trim().min(1).max(80),
  itemIds: z.array(z.string().min(1)).min(1).max(10),
  aesthetic: z.string().max(40).nullable().optional().transform((v) => v ?? null),
  occasion: z.string().max(40).nullable().optional().transform((v) => v ?? null),
  explanation: z.string().max(700),
  alternatives: z
    .array(z.object({ itemId: z.string().min(1), note: z.string().max(160) }))
    .max(4)
    .optional()
    .transform((v) => v ?? []),
  weatherNote: z.string().max(240).nullable().optional().transform((v) => v ?? null),
})

export const purchaseIdeaSchema = z.object({
  name: z.string().max(80),
  reason: z.string().max(240),
})

export const stylistResponseSchema = z.object({
  message: z.string().max(2000),
  outfits: z.array(stylistOutfitSchema).max(5),
  followUp: z.string().max(300).nullable().optional().transform((v) => v ?? null),
  /** Hypothetical items — never presented as owned. */
  purchaseIdeas: z.array(purchaseIdeaSchema).max(5).optional().transform((v) => v ?? []),
  capsule: z
    .object({ itemIds: z.array(z.string()).max(30), combinations: z.number().int().nonnegative() })
    .nullable()
    .optional()
    .transform((v) => v ?? null),
})

export type StylistOutfit = z.output<typeof stylistOutfitSchema>
export type StylistResponse = z.output<typeof stylistResponseSchema>
export type StylistResponseInput = z.input<typeof stylistResponseSchema>

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface StylistRequest {
  message: string
  history: ChatTurn[]
  /** Items the user explicitly chose to style (e.g. "Style this piece"). */
  selectedItemIds: string[]
  /** Optional seed so "show me more" yields different combinations. */
  variation?: number
}

export interface StylistContext {
  items: ClothingItem[]
  outfits: Outfit[]
  profile: UserProfile | null
  /** Real forecast for today, if the user enabled weather. */
  weather: WeatherDay | null
  today: Date
}

export interface StylistReply {
  response: StylistResponse
  /** Ids that the model referenced but are not in the inventory (removed before display). */
  droppedIds: string[]
  source: 'local' | 'remote'
  notice?: string
}

export interface StylistService {
  readonly kind: 'local' | 'remote'
  respond(request: StylistRequest, context: StylistContext): Promise<StylistReply>
}
