// Supabase Edge Function (Deno): AI stylist backed by Claude.
// The Anthropic API key stays server-side (`supabase secrets set ANTHROPIC_API_KEY=...`).
// The function loads the caller's own wardrobe through RLS, asks Claude for structured JSON,
// and drops any item id that is not in that user's inventory before responding.
import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const MODEL = 'claude-opus-5-5'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const nullableString = { type: ['string', 'null'] }

// JSON schema mirrored by `stylistResponseSchema` in src/services/ai/types.ts (validated again client-side).
const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['message', 'outfits', 'followUp', 'purchaseIdeas'],
  properties: {
    message: { type: 'string' },
    followUp: nullableString,
    outfits: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'itemIds', 'aesthetic', 'occasion', 'explanation', 'alternatives', 'weatherNote'],
        properties: {
          name: { type: 'string' },
          itemIds: { type: 'array', items: { type: 'string' } },
          aesthetic: nullableString,
          occasion: nullableString,
          explanation: { type: 'string' },
          weatherNote: nullableString,
          alternatives: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['itemId', 'note'],
              properties: { itemId: { type: 'string' }, note: { type: 'string' } },
            },
          },
        },
      },
    },
    purchaseIdeas: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'reason'],
        properties: { name: { type: 'string' }, reason: { type: 'string' } },
      },
    },
  },
}

const SYSTEM = `You are Lavender, a warm, practical personal stylist. You build outfits ONLY from the user's wardrobe inventory provided below, referencing pieces by their exact "id".

Rules:
- Never invent clothing. Every id in "itemIds" and "alternatives" must come from the inventory.
- A dress or jumpsuit replaces a separate top and bottom. Use at most one pair of shoes, one bag and one outer layer per outfit.
- Return up to 3 outfits unless the user asks for a different number (max 5). Offer genuine alternatives rather than one right answer.
- Explain each look in 1-3 plain sentences: color, proportion, occasion fit. Never comment on body shape, weight or appearance, and don't stereotype.
- Only mention weather if a forecast is provided or the user describes it; otherwise set weatherNote to null.
- Purchases are optional: only add purchaseIdeas when the user asks about shopping or gaps, and phrase them as ideas, not necessities.
- If the request is not about clothing or styling, say briefly what you can help with and return no outfits.
- Ask a short followUp only when it would clearly improve the suggestions; otherwise null.`

interface ItemRow {
  id: string
  name: string
  category: string
  subcategory: string | null
  colors: string[]
  pattern: string
  style_tags: string[]
  seasons: string[]
  occasions: string[]
  fit: string | null
  favorite: boolean
  times_worn: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Not signed in' }, 401)

    // Client bound to the caller's JWT: RLS limits every query to their own rows.
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) return json({ error: 'Not signed in' }, 401)

    const body = (await req.json()) as {
      message?: string
      history?: { role: 'user' | 'assistant'; content: string }[]
      selectedItemIds?: string[]
      weather?: unknown
      today?: string
    }
    const message = (body.message ?? '').slice(0, 600).trim()
    if (!message) return json({ error: 'Empty message' }, 400)

    const [{ data: items, error: itemsError }, { data: profile }, { data: prefs }] = await Promise.all([
      supabase.from('clothing_items').select('id,name,category,subcategory,colors,pattern,style_tags,seasons,occasions,fit,favorite,times_worn').eq('user_id', userData.user.id),
      supabase.from('profiles').select('display_name,favorite_colors,avoided_colors,styling_goals,typical_occasions,preferred_fit,budget_amount,budget_currency').eq('id', userData.user.id).maybeSingle(),
      supabase.from('style_preferences').select('aesthetic,preference_strength').eq('user_id', userData.user.id),
    ])
    if (itemsError) throw itemsError
    const inventory = (items ?? []) as ItemRow[]
    const ownedIds = new Set(inventory.map((i) => i.id))

    const context = {
      today: body.today ?? null,
      forecast: body.weather ?? 'not available',
      profile: profile ?? null,
      stylePreferences: prefs ?? [],
      focusItemIds: (body.selectedItemIds ?? []).filter((id) => ownedIds.has(id)),
      inventory,
    }

    const history = (body.history ?? []).slice(-8).filter((t) => t.content?.trim())
    // The API requires the first message to come from the user.
    while (history.length && history[0].role !== 'user') history.shift()

    const client = new Anthropic()
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: RESPONSE_SCHEMA } },
      system: [
        { type: 'text', text: SYSTEM },
        { type: 'text', text: `Wardrobe context (JSON):\n${JSON.stringify(context)}` },
      ],
      messages: [...history.map((t) => ({ role: t.role, content: t.content })), { role: 'user', content: message }],
    })

    if (response.stop_reason === 'refusal') {
      return json({ message: "I can't help with that request, but I'm happy to style an outfit from your wardrobe.", outfits: [], followUp: null, purchaseIdeas: [] })
    }
    const text = response.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') throw new Error('No response from the model')
    const parsed = JSON.parse(text.text) as {
      message: string
      followUp: string | null
      outfits: { itemIds: string[]; alternatives: { itemId: string }[] }[]
      purchaseIdeas: unknown[]
    }

    // Defence in depth: remove any id the user does not own.
    parsed.outfits = parsed.outfits
      .map((o) => ({ ...o, itemIds: o.itemIds.filter((id) => ownedIds.has(id)), alternatives: o.alternatives.filter((a) => ownedIds.has(a.itemId)) }))
      .filter((o) => o.itemIds.length > 0)

    return json(parsed)
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: 'The stylist is busy, please retry shortly.' }, 429)
    if (err instanceof Anthropic.APIError) return json({ error: `AI service error (${err.status})` }, 502)
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
