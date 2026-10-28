import { CalendarPlus, Copy, Eraser, GitBranch, Heart, Info, Search, Shirt, Sparkles, Wand2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { EvaluationPanel } from '@/components/outfits/EvaluationPanel'
import { FlatLay, OutfitPreview } from '@/components/garments/OutfitPreview'
import { ItemImage } from '@/components/garments/ItemImage'
import { Button, ButtonLink, IconButton } from '@/components/ui/Button'
import { Badge, MultiChips } from '@/components/ui/Chip'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Card, EmptyState, PageHeader, Segmented } from '@/components/ui/Layout'
import { AESTHETICS } from '@/domain/aesthetics'
import { SLOT_LABELS, slotFor, type Slot } from '@/domain/categories'
import { evaluateOutfit, seasonFor } from '@/domain/evaluation'
import { OCCASIONS } from '@/domain/occasions'
import { addToOutfit, hasBase, removeFromOutfit, SLOT_ORDER, sortBySlot } from '@/domain/outfitRules'
import { outfitInputSchema, fieldErrors } from '@/domain/schemas'
import type { ClothingItem } from '@/domain/types'
import { cn } from '@/lib/utils'
import { buildPreview, type PreviewMode } from '@/rendering/preview'
import { recommendOutfits } from '@/services/ai/recommendationEngine'
import { useApp } from '@/state/AppProvider'
import { useOpenItem } from '@/state/itemDialog'
import { useToast } from '@/state/toast'

type ViewMode = PreviewMode | 'flatlay'
type PanelTab = 'pieces' | 'feedback' | 'save'

export default function StudioPage() {
  const app = useApp()
  const { items, outfits, profile, todayWeather, weather } = app
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const openItem = useOpenItem()

  const outfitId = params.get('outfit')
  const editing = outfitId ? outfits.find((o) => o.id === outfitId) : undefined

  const [selection, setSelection] = useState<ClothingItem[]>([])
  // null = automatic: show the user's photos when the look contains any, else illustrations.
  const [viewChoice, setView] = useState<ViewMode | null>(null)
  const [tab, setTab] = useState<PanelTab>('pieces')
  const [slot, setSlot] = useState<Slot>('top')
  const [query, setQuery] = useState('')
  const [name, setName] = useState('')
  const [occasion, setOccasion] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [favorite, setFavorite] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  // Load from ?outfit= or ?items= once per change of the URL.
  const itemsParam = params.get('items')
  useEffect(() => {
    const byId = new Map(items.map((i) => [i.id, i]))
    if (editing) {
      let composed: ClothingItem[] = []
      for (const id of editing.clothingItemIds) {
        const item = byId.get(id)
        if (item) composed = addToOutfit(composed, item).items
      }
      setSelection(composed)
      setName(editing.name)
      setOccasion(editing.occasion ?? '')
      setTags(editing.styleTags)
      setNotes(editing.notes ?? '')
      setFavorite(editing.favorite)
    } else if (itemsParam) {
      let composed: ClothingItem[] = []
      const swaps: string[] = []
      for (const id of itemsParam.split(',')) {
        const item = byId.get(id)
        if (!item) continue
        const change = addToOutfit(composed, item)
        if (change.message) swaps.push(change.message)
        composed = change.items
      }
      setSelection(composed)
      if (swaps.length) toast({ tone: 'info', title: 'Some pieces were swapped', description: swaps.join(' ') })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the requested outfit/items change
  }, [outfitId, itemsParam])

  const bySlot = useMemo(() => {
    const map = new Map<Slot, ClothingItem[]>()
    for (const item of items) map.set(slotFor(item), [...(map.get(slotFor(item)) ?? []), item])
    return map
  }, [items])
  const slots = SLOT_ORDER.filter((s) => bySlot.has(s))
  const activeSlot = slots.includes(slot) ? slot : slots[0]
  const shown = (bySlot.get(activeSlot) ?? []).filter((i) => !query.trim() || i.name.toLowerCase().includes(query.trim().toLowerCase()))

  const latitude = profile?.settings.weatherLocation?.latitude
  const evaluation = useMemo(
    () => evaluateOutfit(selection, { profile, occasion: occasion || null, weather: todayWeather, season: seasonFor(new Date(), latitude) }),
    [selection, profile, occasion, todayWeather, latitude],
  )
  const view: ViewMode = viewChoice ?? (selection.some((i) => i.imageUrl) ? 'photo' : 'illustrated')
  const preview = buildPreview(selection, view === 'photo' ? 'photo' : 'illustrated')
  const weatherStatus =
    weather.status === 'off' ? 'Weather is off — enable it in Settings for forecast-aware tips.' : weather.status === 'loading' ? 'Loading forecast…' : weather.status === 'error' ? `Weather unavailable (${weather.message}).` : 'No forecast for today.'

  const toggle = (item: ClothingItem) => {
    if (selection.some((s) => s.id === item.id)) {
      setSelection((s) => removeFromOutfit(s, item.id))
      return
    }
    const change = addToOutfit(selection, item)
    setSelection(change.items)
    if (change.message) toast({ tone: 'info', title: change.message })
  }

  const completeLook = () => {
    const [rec] = recommendOutfits(items, profile, {
      anchorIds: selection.map((s) => s.id),
      occasion: occasion || null,
      count: 1,
      season: seasonFor(new Date(), latitude),
      variation: Date.now() % 997,
    })
    if (!rec) {
      toast({ tone: 'info', title: 'Not enough pieces to complete this look', description: 'Add tops, bottoms or dresses to your wardrobe first.' })
      return
    }
    let composed = selection
    for (const item of rec.items) if (!composed.some((c) => c.id === item.id) && !composed.some((c) => slotFor(c) === slotFor(item))) composed = addToOutfit(composed, item).items
    const added = composed.length - selection.length
    setSelection(composed)
    toast({ tone: added ? 'success' : 'info', title: added ? `Added ${added} suggested piece${added === 1 ? '' : 's'}` : 'This look already feels complete', description: added ? 'Suggestions come from your own wardrobe. Swap anything you like.' : undefined })
  }

  const validate = () => {
    const parsed = outfitInputSchema.safeParse({ name, clothingItemIds: selection.map((s) => s.id), styleTags: tags, occasion: occasion || null, notes, favorite })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      setTab('save')
      return null
    }
    setErrors({})
    return parsed.data
  }

  const save = async (asNew: boolean) => {
    const values = validate()
    if (!values) return
    setBusy(asNew ? 'new' : 'save')
    try {
      const saved = await app.saveOutfit(values, { id: asNew ? undefined : editing?.id, parentOutfitId: asNew && editing ? editing.parentOutfitId ?? editing.id : undefined })
      toast({ tone: 'success', title: editing && !asNew ? 'Outfit updated' : 'Outfit saved', description: saved.name, action: { label: 'View saved outfits', onClick: () => navigate('/outfits') } })
      setParams({ outfit: saved.id }, { replace: true })
    } catch (err) {
      toast({ tone: 'error', title: 'Could not save the outfit', description: err instanceof Error ? err.message : undefined })
    } finally {
      setBusy(null)
    }
  }

  const duplicate = async (asVariant: boolean) => {
    if (!editing) return
    setBusy(asVariant ? 'variant' : 'dup')
    try {
      const copy = await app.duplicateOutfit(editing.id, asVariant)
      toast({ tone: 'success', title: asVariant ? 'Variation created' : 'Outfit duplicated', description: `Now editing “${copy.name}”.` })
      setParams({ outfit: copy.id })
    } catch (err) {
      toast({ tone: 'error', title: 'Could not copy the outfit', description: err instanceof Error ? err.message : undefined })
    } finally {
      setBusy(null)
    }
  }

  const markWorn = async () => {
    if (!editing) return
    setBusy('worn')
    try {
      await app.markOutfitWorn(editing.id)
      toast({ tone: 'success', title: 'Marked as worn today', description: 'Wear counts updated for each piece.' })
    } catch (err) {
      toast({ tone: 'error', title: 'Could not update', description: err instanceof Error ? err.message : undefined })
    } finally {
      setBusy(null)
    }
  }

  const clear = () => {
    setSelection([])
    setParams({}, { replace: true })
    setName('')
    setOccasion('')
    setTags([])
    setNotes('')
    setFavorite(false)
  }

  if (!items.length) {
    return (
      <>
        <PageHeader eyebrow="Mix & match" title="Outfit Studio" />
        <EmptyState
          title="Add some pieces to start styling"
          description="The Studio uses the clothes in your wardrobe. Add a few pieces, or load the sample wardrobe from the Wardrobe page."
          actions={<ButtonLink to="/wardrobe">Go to my wardrobe</ButtonLink>}
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Mix & match"
        title={editing ? <>Editing <em className="text-plum">{editing.name}</em></> : 'Outfit Studio'}
        description="Tap pieces to dress the mannequin. Dresses replace separate tops and bottoms automatically."
        actions={
          <>
            <ButtonLink to="/outfits" variant="secondary">
              Saved outfits
            </ButtonLink>
            {selection.length > 0 && (
              <Button variant="ghost" icon={<Eraser className="h-4 w-4" />} onClick={clear}>
                Start over
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(300px,420px)_1fr]">
        {/* Preview */}
        <section aria-label="Outfit preview" className="lg:sticky lg:top-6 lg:self-start">
          <div className="relative overflow-hidden rounded-4xl border border-line bg-gradient-to-b from-white via-lavender-50 to-blush/40 shadow-soft">
            <div className="flex items-center justify-between gap-2 p-3">
              <Segmented
                label="Preview style"
                value={view}
                onChange={setView}
                className="text-xs"
                options={[
                  { id: 'illustrated', label: 'Illustrated' },
                  { id: 'photo', label: 'Photos' },
                  { id: 'flatlay', label: 'Flat lay' },
                ]}
              />
              <Badge tone="outline" className="hidden sm:inline-flex">Styling preview</Badge>
            </div>
            <div className={cn('mx-auto', view === 'flatlay' ? 'min-h-[360px] px-2 pb-2' : 'h-[340px] w-[146px] sm:h-[520px] sm:w-[220px]')}>
              {view === 'flatlay' ? (
                selection.length ? <FlatLay items={sortBySlot(selection)} /> : <p className="grid h-[340px] place-items-center text-sm text-muted">Pick pieces to see them laid out.</p>
              ) : (
                <OutfitPreview items={selection} mode={view} />
              )}
            </div>
            <p className="flex gap-2 border-t border-line/70 bg-white/70 px-4 py-2.5 text-xs leading-relaxed text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {view === 'illustrated'
                ? 'Pieces are drawn from their category, colors and pattern on a generic croquis — a styling sketch, not an exact fit or try-on.'
                : view === 'photo'
                  ? preview.photoCount
                    ? 'Photos are placed by category, not fitted to the figure. Pieces without photos are illustrated.'
                    : 'None of these pieces have photos yet, so they are illustrated.'
                  : 'Your actual item photos side by side — the most accurate view.'}
            </p>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">In this look ({selection.length})</h2>
              <Button size="sm" variant="soft" icon={<Wand2 className="h-4 w-4" />} onClick={completeLook}>
                {selection.length ? 'Complete the look' : 'Suggest a look'}
              </Button>
            </div>
            {selection.length ? (
              <ul className="flex flex-wrap gap-2">
                {sortBySlot(selection).map((item) => (
                  <li key={item.id} className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-1.5">
                    <button type="button" className="flex items-center gap-2 rounded-full text-left" onClick={() => openItem(item.id)}>
                      <span className="w-7">
                        <ItemImage item={item} rounded="rounded-full" sizes="sm" className="aspect-square" />
                      </span>
                      <span className="max-w-[120px] truncate text-xs font-medium">{item.name}</span>
                    </button>
                    <IconButton label={`Remove ${item.name}`} className="h-6 w-6" onClick={() => setSelection((s) => removeFromOutfit(s, item.id))}>
                      <X className="h-3.5 w-3.5" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing yet — choose pieces from the panel.</p>
            )}
            {preview.unplaced.length > 0 && <p className="mt-2 text-xs text-muted">{preview.unplaced.map((u) => u.name).join(', ')} can’t be drawn on the figure but are part of the outfit.</p>}
            {selection.length > 0 && !hasBase(selection) && <p className="mt-2 text-xs text-muted">Tip: add a top and bottom, or a dress, to complete the base.</p>}
          </div>
        </section>

        {/* Controls */}
        <section aria-label="Outfit controls" className="min-w-0">
          <div role="tablist" aria-label="Studio panels" className="mb-4 flex gap-1 rounded-full border border-line bg-white p-1">
            {(
              [
                ['pieces', 'Pieces', Shirt],
                ['feedback', 'Feedback', Sparkles],
                ['save', editing ? 'Save & manage' : 'Save', Heart],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                role="tab"
                id={`tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                onClick={() => setTab(id)}
                className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors', tab === id ? 'bg-plum text-white' : 'text-muted hover:text-ink')}
              >
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'pieces' && (
            <Card className="p-4 md:p-5">
              <div className="scrollbar-thin -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Category">
                {slots.map((s) => {
                  const chosen = selection.filter((i) => slotFor(i) === s).length
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSlot(s)}
                      aria-pressed={activeSlot === s}
                      className={cn('shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors', activeSlot === s ? 'border-plum bg-lilac text-plum' : 'border-line bg-white text-ink hover:border-lavender-300')}
                    >
                      {SLOT_LABELS[s]} <span className="text-muted">{bySlot.get(s)?.length}</span>
                      {chosen > 0 && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-plum align-middle" aria-label="has a selected piece" />}
                    </button>
                  )
                })}
              </div>
              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input aria-label={`Search ${SLOT_LABELS[activeSlot]}`} placeholder={`Search ${SLOT_LABELS[activeSlot].toLowerCase()}…`} className="h-10 pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              {shown.length ? (
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                  {shown.map((item) => {
                    const selected = selection.some((s) => s.id === item.id)
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => toggle(item)}
                          aria-pressed={selected}
                          aria-label={`${selected ? 'Remove' : 'Add'} ${item.name}`}
                          className={cn('w-full rounded-3xl border bg-white p-1.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender', selected ? 'border-plum ring-2 ring-plum/25' : 'border-line hover:border-lavender-300')}
                        >
                          <ItemImage item={item} rounded="rounded-2xl" sizes="sm" />
                          <span className="block truncate px-1 pt-1.5 text-xs font-medium">{item.name}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="py-8 text-center text-sm text-muted">No pieces match.</p>
              )}
              <p className="mt-4 text-xs text-muted">
                Missing something? <Link to="/wardrobe/new" className="font-medium text-plum underline-offset-2 hover:underline">Add a piece</Link>
              </p>
            </Card>
          )}

          {tab === 'feedback' && (
            <Card className="p-4 md:p-5">
              <div className="mb-4 max-w-xs">
                <Field label="Dressing for" optional>
                  {(p) => (
                    <Select {...p} value={occasion} onChange={(e) => setOccasion(e.target.value)}>
                      <option value="">Any occasion</option>
                      {OCCASIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              <EvaluationPanel evaluation={evaluation} showScore={profile?.settings.showStyleScores ?? true} weather={todayWeather} weatherStatus={weatherStatus} unit={profile?.settings.temperatureUnit ?? 'celsius'} />
            </Card>
          )}

          {tab === 'save' && (
            <Card className="p-4 md:p-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Outfit name" error={errors.name} className="md:col-span-2">
                  {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Brunch in lilac" />}
                </Field>
                <Field label="Occasion" optional>
                  {(p) => (
                    <Select {...p} value={occasion} onChange={(e) => setOccasion(e.target.value)}>
                      <option value="">Any occasion</option>
                      {OCCASIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <div className="flex items-end">
                  <Button variant={favorite ? 'soft' : 'secondary'} aria-pressed={favorite} icon={<Heart className={cn('h-4 w-4', favorite && 'fill-current')} />} onClick={() => setFavorite((f) => !f)}>
                    {favorite ? 'Favorite look' : 'Mark as favorite'}
                  </Button>
                </div>
                <div className="md:col-span-2">
                  <p className="mb-2 text-sm font-medium">Style tags</p>
                  <MultiChips options={AESTHETICS.map((a) => ({ id: a.id, label: a.name }))} value={tags} onChange={setTags} />
                </div>
                <Field label="Notes" optional className="md:col-span-2">
                  {(p) => <Textarea {...p} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Tuck the blouse, roll the sleeves…" />}
                </Field>
              </div>
              {errors.clothingItemIds && <p className="mt-3 text-sm text-red-600" role="alert">{errors.clothingItemIds}</p>}
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={() => save(false)} loading={busy === 'save'} disabled={busy !== null}>
                  {editing ? 'Save changes' : 'Save outfit'}
                </Button>
                {editing && (
                  <Button variant="secondary" onClick={() => save(true)} loading={busy === 'new'} disabled={busy !== null}>
                    Save as new outfit
                  </Button>
                )}
              </div>
              {editing && (
                <div className="mt-5 border-t border-line pt-5">
                  <p className="mb-2 text-sm font-medium">Manage “{editing.name}”</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={() => duplicate(false)} loading={busy === 'dup'}>
                      Duplicate
                    </Button>
                    <Button size="sm" variant="secondary" icon={<GitBranch className="h-4 w-4" />} onClick={() => duplicate(true)} loading={busy === 'variant'}>
                      Create variation
                    </Button>
                    <Button size="sm" variant="secondary" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => navigate(`/calendar?outfit=${editing.id}`)}>
                      Plan it
                    </Button>
                    <Button size="sm" variant="secondary" onClick={markWorn} loading={busy === 'worn'}>
                      Wore it today
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted">Unsaved changes above aren’t copied — save first if you want them in the duplicate.</p>
                </div>
              )}
            </Card>
          )}
          </div>
        </section>
      </div>
    </>
  )
}
