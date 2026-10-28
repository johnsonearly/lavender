import { getSupabase, isRemoteStylistEnabled } from '@/data/supabaseClient'
import { localStylist } from './localStylist'
import type { StylistContext, StylistReply, StylistRequest, StylistService } from './types'
import { validateStylistResponse } from './validateResponse'

/**
 * Remote stylist: calls the `stylist` Supabase Edge Function, which holds the LLM API key
 * server-side, loads the signed-in user's own inventory, and returns structured JSON.
 * The response is validated again here against the local inventory before rendering.
 */
const remoteStylist: StylistService = {
  kind: 'remote',
  async respond(request: StylistRequest, ctx: StylistContext): Promise<StylistReply> {
    const supabase = await getSupabase()
    const { data, error } = await supabase.functions.invoke('stylist', {
      body: {
        message: request.message,
        history: request.history.slice(-8),
        selectedItemIds: request.selectedItemIds,
        weather: ctx.weather,
        today: ctx.today.toISOString().slice(0, 10),
      },
    })
    if (error) throw new Error(error.message)
    const { response, droppedIds } = validateStylistResponse(data, ctx.items)
    return { response, droppedIds, source: 'remote' }
  },
}

export async function askStylist(request: StylistRequest, ctx: StylistContext): Promise<StylistReply> {
  if (!isRemoteStylistEnabled) return localStylist.respond(request, ctx)
  try {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('request timed out')), 30_000))
    return await Promise.race([remoteStylist.respond(request, ctx), timeout])
  } catch (err) {
    const reply = await localStylist.respond(request, ctx)
    return {
      ...reply,
      notice: `The AI service was unavailable (${err instanceof Error ? err.message : 'unknown error'}), so the built-in stylist answered instead.`,
    }
  }
}

export const stylistMode: 'local' | 'remote' = isRemoteStylistEnabled ? 'remote' : 'local'
export { SAMPLE_PROMPTS } from './localStylist'
export type { StylistReply, StylistResponse, StylistOutfit, ChatTurn } from './types'
