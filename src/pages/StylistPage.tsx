import { CalendarPlus, Check, CloudSun, Info, Lightbulb, RefreshCw, Send, ShoppingBag, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Sparkle } from '@/components/decor/Decor'
import { ItemImage } from '@/components/garments/ItemImage'
import { OutfitPreview } from '@/components/garments/OutfitPreview'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Chip'
import { Textarea } from '@/components/ui/Form'
import { PageHeader } from '@/components/ui/Layout'
import { BRAND } from '@/config/brand'
import { AESTHETICS } from '@/domain/aesthetics'
import { OCCASIONS } from '@/domain/occasions'
import { findOutfitWithItems, sortBySlot } from '@/domain/outfitRules'
import type { ClothingItem } from '@/domain/types'
import { cn } from '@/lib/utils'
import { askStylist, SAMPLE_PROMPTS, stylistMode, type ChatTurn, type StylistOutfit, type StylistReply } from '@/services/ai'
import { useApp, useItemMap } from '@/state/AppProvider'
import { useOpenItem } from '@/state/itemDialog'
import { useToast } from '@/state/toast'

interface Message {
  id: number
  role: 'user' | 'assistant'
  text: string
  reply?: StylistReply
  error?: boolean
  /** The request that produced this reply, to ask for different options. */
  request?: { message: string; selectedItemIds: string[] }
}

const SESSION_KEY = 'lavender.stylistChat'

function loadSession(): Message[] {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '[]') as Message[]
  } catch {
    return []
  }
}

function aestheticIdFrom(value: string | null): string[] {
  if (!value) return []
  const match = AESTHETICS.find((a) => a.id === value || a.name.toLowerCase() === value.toLowerCase())
  return match ? [match.id] : []
}

function occasionIdFrom(value: string | null): string | null {
  if (!value) return null
  return OCCASIONS.find((o) => o.id === value || o.label.toLowerCase() === value.toLowerCase())?.id ?? null
}

export default function StylistPage() {
  const app = useApp()
  const { items, outfits, profile, todayWeather } = app
  const itemMap = useItemMap()
  const openItem = useOpenItem()
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [messages, setMessages] = useState<Message[]>(loadSession)
  const [input, setInput] = useState(() => params.get('prompt') ?? '')
  const [pending, setPending] = useState(false)
  const [focusIds, setFocusIds] = useState<string[]>(() => (params.get('item') ?? '').split(',').filter(Boolean))
  const counter = useRef(messages.reduce((m, x) => Math.max(m, x.id), 0))
  const endRef = useRef<HTMLDivElement>(null)

  const focusItems = focusIds.map((id) => itemMap.get(id)).filter((i): i is ClothingItem => Boolean(i))

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages.slice(-30)))
    } catch {
      // Conversation history is a convenience only.
    }
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, pending])

  const ask = async (text: string, selectedItemIds: string[], variation?: number) => {
    const trimmed = text.trim()
    if (!trimmed || pending) return
    const userMsg: Message = { id: ++counter.current, role: 'user', text: trimmed }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setPending(true)
    const history: ChatTurn[] = messages.slice(-8).map((m) => ({ role: m.role, content: m.reply?.response.message ?? m.text }))
    try {
      const reply = await askStylist({ message: trimmed, history, selectedItemIds, variation }, { items, outfits, profile, weather: todayWeather, today: new Date() })
      setMessages((m) => [...m, { id: ++counter.current, role: 'assistant', text: reply.response.message, reply, request: { message: trimmed, selectedItemIds } }])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { id: ++counter.current, role: 'assistant', text: `Sorry — I couldn't put that together (${err instanceof Error ? err.message : 'unknown error'}). Please try again.`, error: true },
      ])
    } finally {
      setPending(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    ask(input, focusIds)
  }

  /** Saves a suggestion (or reuses an identical saved outfit) and returns its id. */
  const saveOutfit = async (outfit: StylistOutfit, then?: 'plan'): Promise<void> => {
    const existing = findOutfitWithItems(outfits, outfit.itemIds)
    try {
      const id =
        existing?.id ??
        (
          await app.saveOutfit(
            { name: outfit.name, clothingItemIds: outfit.itemIds, styleTags: aestheticIdFrom(outfit.aesthetic), occasion: occasionIdFrom(outfit.occasion), notes: outfit.explanation.slice(0, 500), favorite: false },
            { source: 'stylist' },
          )
        ).id
      if (then === 'plan') navigate(`/calendar?outfit=${id}`)
      else toast({ tone: 'success', title: 'Saved to your outfits', description: outfit.name })
    } catch (err) {
      toast({ tone: 'error', title: 'Could not save', description: err instanceof Error ? err.message : undefined })
    }
  }

  const clearFocus = (id: string) => {
    const next = focusIds.filter((x) => x !== id)
    setFocusIds(next)
    if (params.get('item')) setParams(next.length ? { item: next.join(',') } : {}, { replace: true })
  }

  return (
    <div className="flex min-h-[calc(100dvh-180px)] flex-col">
      <PageHeader
        eyebrow="Your personal stylist"
        title={BRAND.stylistName}
        description="Ask for looks for any occasion, mood or weather. Every suggestion uses pieces you actually own."
        actions={
          <>
            <Badge tone={stylistMode === 'remote' ? 'plum' : 'lilac'}>
              <Sparkle className="h-3 w-3" /> {stylistMode === 'remote' ? 'AI model connected' : 'Built-in styling engine'}
            </Badge>
            {messages.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setMessages([])}>
                New conversation
              </Button>
            )}
          </>
        }
      />

      <div className="flex-1 space-y-5" aria-live="polite">
        {messages.length === 0 && (
          <div className="rounded-4xl border border-line bg-gradient-to-br from-lilac/70 via-white to-blush/40 p-5 md:p-7">
            <p className="font-serif text-xl font-semibold">Hi{profile?.displayName ? ` ${profile.displayName}` : ''}, what are we dressing for?</p>
            <p className="mt-1 text-sm text-muted">
              {items.length ? `I can see ${items.length} pieces in your wardrobe.` : 'Your wardrobe is empty — add a few pieces first so I have something to style.'}{' '}
              {stylistMode === 'local' && 'I’m the built-in styling engine: I match colors, occasions, seasons and your style tags, and I only suggest pieces you own.'}
            </p>
            {todayWeather && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                <CloudSun className="h-3.5 w-3.5" /> I’ll consider today’s forecast: {todayWeather.summary}, up to {Math.round(todayWeather.tempMaxC)}°C.
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((p) => (
                <button key={p} type="button" onClick={() => ask(p, focusIds)} className="rounded-full border border-line bg-white px-3.5 py-2 text-left text-sm text-ink transition-colors hover:border-lavender hover:bg-lavender-50">
                  {p}
                </button>
              ))}
            </div>
            {!items.length && (
              <div className="mt-5">
                <ButtonLink to="/wardrobe">Go to my wardrobe</ButtonLink>
              </div>
            )}
          </div>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-plum px-4 py-2.5 text-[15px] text-white shadow-soft">{m.text}</p>
            </div>
          ) : (
            <div key={m.id} className="flex gap-3">
              <span className="mt-1 hidden h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-lavender-200 to-blush text-plum sm:grid">
                <Sparkle className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                <div className={cn('rounded-3xl rounded-tl-lg border bg-white px-4 py-3 text-[15px] leading-relaxed shadow-soft', m.error ? 'border-red-200' : 'border-line')}>
                  {m.text}
                </div>
                {m.reply?.notice && (
                  <p className="flex gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <Info className="h-4 w-4 shrink-0" /> {m.reply.notice}
                  </p>
                )}
                {m.reply && m.reply.droppedIds.length > 0 && (
                  <p className="flex gap-2 rounded-2xl bg-lavender-50 px-3 py-2 text-xs text-muted">
                    <Info className="h-4 w-4 shrink-0" /> I removed {m.reply.droppedIds.length} reference(s) to pieces that aren’t in your wardrobe.
                  </p>
                )}

                {m.reply?.response.outfits.length ? (
                  <ul className="grid gap-3 xl:grid-cols-2">
                    {m.reply.response.outfits.map((o, idx) => {
                      const key = `${m.id}-${idx}`
                      const pieces = sortBySlot(o.itemIds.map((id) => itemMap.get(id)).filter((i): i is ClothingItem => Boolean(i)))
                      return (
                        <li key={key} className="overflow-hidden rounded-4xl border border-line bg-white shadow-soft">
                          <div className="flex gap-3 p-4">
                            <div className="h-44 w-24 shrink-0 rounded-3xl bg-gradient-to-b from-lavender-50 to-blush/40">
                              <OutfitPreview items={pieces} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-serif text-lg font-semibold leading-snug">{o.name}</h3>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {o.aesthetic && <Badge>{o.aesthetic}</Badge>}
                                {o.occasion && <Badge tone="blush">{o.occasion}</Badge>}
                              </div>
                              <p className="mt-2 text-sm leading-relaxed text-muted">{o.explanation}</p>
                            </div>
                          </div>
                          <div className="border-t border-line px-4 py-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Pieces from your wardrobe</p>
                            <ul className="flex flex-wrap gap-1.5">
                              {pieces.map((p) => (
                                <li key={p.id}>
                                  <button type="button" onClick={() => openItem(p.id)} className="flex items-center gap-1.5 rounded-full border border-line bg-cream py-1 pl-1 pr-3 text-xs font-medium hover:border-lavender">
                                    <span className="w-6">
                                      <ItemImage item={p} rounded="rounded-full" sizes="sm" className="aspect-square" />
                                    </span>
                                    {p.name}
                                  </button>
                                </li>
                              ))}
                            </ul>
                            {o.alternatives.length > 0 && (
                              <div className="mt-3 space-y-1">
                                {o.alternatives.map((alt) => {
                                  const altItem = itemMap.get(alt.itemId)
                                  return altItem ? (
                                    <p key={alt.itemId} className="flex items-center gap-1.5 text-xs text-muted">
                                      <RefreshCw className="h-3 w-3" /> Alternative:{' '}
                                      <button type="button" className="font-medium text-plum underline-offset-2 hover:underline" onClick={() => openItem(altItem.id)}>
                                        {altItem.name}
                                      </button>{' '}
                                      — {alt.note}
                                    </p>
                                  ) : null
                                })}
                              </div>
                            )}
                            {o.weatherNote && (
                              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                                <CloudSun className="h-3.5 w-3.5" /> {o.weatherNote}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 border-t border-line bg-cream/60 px-4 py-3">
                            {(() => {
                              const existing = findOutfitWithItems(outfits, o.itemIds)
                              return existing ? (
                                <>
                                  <Button size="sm" variant="soft" icon={<Check className="h-4 w-4" />} onClick={() => navigate(`/studio?outfit=${existing.id}`)}>
                                    Saved · view
                                  </Button>
                                  <Button size="sm" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => navigate(`/calendar?outfit=${existing.id}`)}>
                                    Plan it
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" onClick={() => saveOutfit(o)}>
                                    Save outfit
                                  </Button>
                                  <Button size="sm" variant="soft" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => saveOutfit(o, 'plan')}>
                                    Save & plan
                                  </Button>
                                </>
                              )
                            })()}
                            <Button size="sm" variant="secondary" icon={<Sparkles className="h-4 w-4" />} onClick={() => navigate(`/studio?items=${o.itemIds.join(',')}`)}>
                              Open in Studio
                            </Button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : null}

                {m.reply?.response.capsule && (
                  <div className="rounded-4xl border border-line bg-white p-4 shadow-soft">
                    <p className="mb-3 text-sm font-semibold">Your capsule · {m.reply.response.capsule.itemIds.length} pieces · ~{m.reply.response.capsule.combinations} combinations</p>
                    <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                      {m.reply.response.capsule.itemIds.map((id) => {
                        const item = itemMap.get(id)
                        return item ? (
                          <li key={id}>
                            <button type="button" onClick={() => openItem(id)} className="w-full" title={item.name}>
                              <ItemImage item={item} rounded="rounded-2xl" sizes="sm" />
                              <span className="sr-only">{item.name}</span>
                            </button>
                          </li>
                        ) : null
                      })}
                    </ul>
                  </div>
                )}

                {m.reply && m.reply.response.purchaseIdeas.length > 0 && (
                  <div className="rounded-4xl border border-dashed border-lavender-300 bg-lavender-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <ShoppingBag className="h-4 w-4 text-lavender-600" /> Optional ideas — not in your wardrobe
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {m.reply.response.purchaseIdeas.map((p) => (
                        <li key={p.name}>
                          <span className="font-medium">{p.name}</span> <span className="text-muted">— {p.reason}</span>
                        </li>
                      ))}
                    </ul>
                    {profile?.budget && <p className="mt-2 text-xs text-muted">Your stated budget: {profile.budget.currency} {profile.budget.amount}. No purchase is ever necessary.</p>}
                  </div>
                )}

                {m.reply?.response.followUp && (
                  <p className="flex items-start gap-2 text-sm italic text-muted">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 not-italic text-lavender-600" /> {m.reply.response.followUp}
                  </p>
                )}
                {m.request && m.reply && m.reply.response.outfits.length > 0 && m.id === messages[messages.length - 1]?.id && (
                  <Button size="sm" variant="ghost" icon={<RefreshCw className="h-4 w-4" />} onClick={() => ask(m.request!.message, m.request!.selectedItemIds, (Date.now() % 9973) + 1)} disabled={pending}>
                    Show me different options
                  </Button>
                )}
              </div>
            </div>
          ),
        )}

        {pending && (
          <div className="flex items-center gap-3" role="status">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-lavender-200 to-blush text-plum">
              <Sparkle className="h-4 w-4 animate-twinkle" />
            </span>
            <span className="flex gap-1 rounded-full border border-line bg-white px-4 py-3" aria-label="Stylist is thinking">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-lavender" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="sticky bottom-[76px] z-20 mt-6 rounded-4xl border border-line bg-white/95 p-2 shadow-lift backdrop-blur lg:bottom-4">
        {focusItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2 pt-1">
            <span className="text-xs text-muted">Styling:</span>
            {focusItems.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-1 rounded-full bg-lilac py-0.5 pl-2.5 pr-1 text-xs font-medium text-plum">
                {f.name}
                <button type="button" onClick={() => clearFocus(f.id)} className="rounded-full p-0.5 hover:bg-white" aria-label={`Stop styling around ${f.name}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="stylist-input" className="sr-only">
            Message the stylist
          </label>
          <Textarea
            id="stylist-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                ask(input, focusIds)
              }
            }}
            placeholder={focusItems.length ? `How should I style ${focusItems[0].name}?` : 'Ask for an outfit, an occasion, or a piece to style…'}
            className="min-h-[48px] resize-none border-0 bg-transparent focus:ring-0"
            maxLength={600}
          />
          <Button type="submit" size="icon" className="mb-0.5 shrink-0" disabled={!input.trim() || pending} aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
