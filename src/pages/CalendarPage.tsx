import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCopy, CloudSun, Luggage, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { OutfitPreview } from '@/components/garments/OutfitPreview'
import { ItemImage } from '@/components/garments/ItemImage'
import { Button, ButtonLink, IconButton } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Chip'
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Card, EmptyState, PageHeader, SectionTitle, Segmented } from '@/components/ui/Layout'
import {
  addDays, buildPackingList, canAssign, dateRange, formatDateKey, monthGrid, parseDateKey, plansByDate, sameMonth, toDateKey, todayKey, weekDays,
} from '@/domain/calendar'
import { occasionLabel } from '@/domain/occasions'
import { resolveOutfitItems, sortBySlot } from '@/domain/outfitRules'
import { fieldErrors, plannedOutfitInputSchema } from '@/domain/schemas'
import type { Outfit, PlannedOutfit } from '@/domain/types'
import { formatTemp, type WeatherDay } from '@/domain/weather'
import { cn, pluralize } from '@/lib/utils'
import { useApp } from '@/state/AppProvider'
import { useOpenItem } from '@/state/itemDialog'
import { useToast } from '@/state/toast'

interface Draft {
  planId?: string
  outfitId: string
  date: string
  occasion: string
  notes: string
}

export default function CalendarPage() {
  const app = useApp()
  const { plans, outfits, items, weather, profile } = app
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const openItem = useOpenItem()
  const [view, setView] = useState<'week' | 'month'>('week')
  const [cursor, setCursor] = useState(todayKey())
  const [draft, setDraft] = useState<Draft | null>(null)
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState<PlannedOutfit | null>(null)
  const [removing, setRemoving] = useState<PlannedOutfit | null>(null)
  const [tripFrom, setTripFrom] = useState(todayKey())
  const [tripTo, setTripTo] = useState(addDays(todayKey(), 4))
  const [packed, setPacked] = useState<string[]>([])

  const today = todayKey()
  const outfitById = useMemo(() => new Map(outfits.map((o) => [o.id, o])), [outfits])
  const byDate = useMemo(() => plansByDate(plans), [plans])
  const forecast = useMemo(() => new Map((weather.status === 'ready' ? weather.days : []).map((d) => [d.date, d])), [weather])
  const unit = profile?.settings.temperatureUnit ?? 'celsius'

  // Deep link: /calendar?outfit=ID opens the planner for that outfit.
  useEffect(() => {
    const id = params.get('outfit')
    if (id && outfitById.has(id)) {
      setDraft({ outfitId: id, date: today, occasion: '', notes: '' })
      setParams({}, { replace: true })
    }
  }, [params, outfitById, setParams, today])

  const days = view === 'week' ? weekDays(cursor) : monthGrid(cursor)
  const shift = (dir: 1 | -1) => {
    if (view === 'week') setCursor((c) => addDays(c, dir * 7))
    else {
      const d = parseDateKey(cursor)
      setCursor(toDateKey(new Date(d.getFullYear(), d.getMonth() + dir, 1)))
    }
  }
  const title =
    view === 'week'
      ? `${formatDateKey(days[0], { month: 'short', day: 'numeric' })} – ${formatDateKey(days[6], { month: 'short', day: 'numeric', year: 'numeric' })}`
      : parseDateKey(cursor).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const openNew = (date: string) => setDraft({ outfitId: outfits[0]?.id ?? '', date, occasion: '', notes: '' })
  const openEdit = (plan: PlannedOutfit) => {
    setViewing(null)
    setDraft({ planId: plan.id, outfitId: plan.outfitId, date: plan.date, occasion: plan.occasion ?? '', notes: plan.notes ?? '' })
  }

  const saveDraft = async () => {
    if (!draft) return
    const parsed = plannedOutfitInputSchema.safeParse({ outfitId: draft.outfitId, date: draft.date, occasion: draft.occasion, notes: draft.notes })
    if (!parsed.success) {
      setDraftErrors(fieldErrors(parsed.error))
      return
    }
    const check = canAssign(plans, { ...parsed.data, id: draft.planId })
    if (!check.ok) {
      setDraftErrors({ outfitId: check.reason ?? 'Cannot plan this outfit.' })
      return
    }
    setDraftErrors({})
    setSaving(true)
    try {
      if (draft.planId) await app.updatePlan(draft.planId, parsed.data)
      else await app.addPlan(parsed.data)
      toast({ tone: 'success', title: draft.planId ? 'Plan updated' : 'Outfit planned', description: `${outfitById.get(parsed.data.outfitId)?.name} · ${formatDateKey(parsed.data.date)}` })
      setDraft(null)
      setCursor(parsed.data.date)
    } catch (err) {
      toast({ tone: 'error', title: 'Could not save the plan', description: err instanceof Error ? err.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  const packing = useMemo(() => (tripFrom <= tripTo ? buildPackingList(plans, outfits, items, tripFrom, tripTo) : null), [plans, outfits, items, tripFrom, tripTo])
  const tripDays = tripFrom <= tripTo ? dateRange(tripFrom, tripTo).slice(0, 31) : []

  const copyPacking = async () => {
    if (!packing) return
    const text = packing.groups.map((g) => `${g.label}\n${g.entries.map((e) => `- ${e.item.name}${e.looks > 1 ? ` (${e.looks} looks)` : ''}`).join('\n')}`).join('\n\n')
    try {
      await navigator.clipboard.writeText(`Packing list ${formatDateKey(tripFrom)} – ${formatDateKey(tripTo)}\n\n${text}`)
      toast({ tone: 'success', title: 'Packing list copied' })
    } catch {
      toast({ tone: 'error', title: 'Copy failed', description: 'Your browser blocked clipboard access.' })
    }
  }

  const quickAssign = async (date: string, outfitId: string) => {
    if (!outfitId) return
    try {
      await app.addPlan({ outfitId, date, occasion: null, notes: null })
      toast({ tone: 'success', title: `Planned for ${formatDateKey(date)}` })
    } catch (err) {
      toast({ tone: 'error', title: 'Could not plan', description: err instanceof Error ? err.message : undefined })
    }
  }

  if (!outfits.length && !plans.length) {
    return (
      <>
        <PageHeader eyebrow="Plan ahead" title="Outfit Calendar" />
        <EmptyState
          illustration={<CalendarDays className="h-10 w-10 text-lavender" />}
          title="Save an outfit to start planning"
          description="The calendar uses your saved outfits. Create one in the Studio or save a suggestion from the stylist."
          actions={
            <>
              <ButtonLink to="/studio">Create an outfit</ButtonLink>
              <ButtonLink to="/stylist" variant="secondary">
                Ask the stylist
              </ButtonLink>
            </>
          }
        />
      </>
    )
  }

  const viewingOutfit = viewing ? outfitById.get(viewing.outfitId) : undefined

  return (
    <>
      <PageHeader
        eyebrow="Plan ahead"
        title="Outfit Calendar"
        description="Assign saved outfits to days, plan trips, and never repeat a look by accident."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => openNew(today)} disabled={!outfits.length}>
            Plan an outfit
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <IconButton label={view === 'week' ? 'Previous week' : 'Previous month'} onClick={() => shift(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </IconButton>
          <h2 className="min-w-[200px] text-center font-serif text-lg font-semibold" aria-live="polite">
            {title}
          </h2>
          <IconButton label={view === 'week' ? 'Next week' : 'Next month'} onClick={() => shift(1)}>
            <ChevronRight className="h-5 w-5" />
          </IconButton>
          <Button size="sm" variant="ghost" onClick={() => setCursor(today)}>
            Today
          </Button>
        </div>
        <Segmented label="Calendar view" value={view} onChange={setView} options={[{ id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }]} />
      </div>
      {weather.status === 'off' && <p className="mb-3 text-xs text-muted">Weather is off. You can enable a real forecast in Settings.</p>}
      {weather.status === 'error' && <p className="mb-3 text-xs text-muted">Weather unavailable right now ({weather.message}).</p>}

      {view === 'week' ? (
        <ol className="grid gap-3 md:grid-cols-7">
          {days.map((date) => {
            const dayPlans = byDate.get(date) ?? []
            return (
              <li key={date} className={cn('flex flex-col rounded-3xl border bg-white p-3', date === today ? 'border-lavender shadow-soft ring-2 ring-lavender/30' : 'border-line')}>
                <div className="mb-2 flex items-start justify-between gap-1 md:flex-col">
                  <p className="text-sm font-semibold">
                    {formatDateKey(date, { weekday: 'short' })} <span className="text-muted">{formatDateKey(date, { day: 'numeric', month: 'short' })}</span>
                    {date === today && <Badge className="ml-1" tone="plum">Today</Badge>}
                  </p>
                  <WeatherChip day={forecast.get(date)} unit={unit} />
                </div>
                <ul className="flex flex-1 flex-row gap-2 overflow-x-auto md:flex-col">
                  {dayPlans.map((p) => {
                    const o = outfitById.get(p.outfitId)
                    if (!o) return null
                    return (
                      <li key={p.id} className="min-w-[120px] md:min-w-0">
                        <button type="button" onClick={() => setViewing(p)} className="flex w-full items-center gap-2 rounded-2xl bg-lavender-50 p-1.5 text-left hover:bg-lilac md:flex-col md:items-stretch">
                          <span className="h-20 w-10 shrink-0 md:mx-auto md:h-28 md:w-14">
                            <OutfitPreview items={resolveOutfitItems(o.clothingItemIds, items).items} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold">{o.name}</span>
                            {p.occasion && <span className="block truncate text-[11px] text-muted">{p.occasion}</span>}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <button
                  type="button"
                  onClick={() => openNew(date)}
                  disabled={!outfits.length}
                  className="mt-2 flex items-center justify-center gap-1 rounded-2xl border border-dashed border-lavender-300 py-1.5 text-xs font-medium text-plum hover:bg-lavender-50 disabled:opacity-40"
                  aria-label={`Plan an outfit for ${formatDateKey(date, { weekday: 'long', month: 'long', day: 'numeric' })}`}
                >
                  <Plus className="h-3.5 w-3.5" /> Plan
                </button>
              </li>
            )
          })}
        </ol>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-white">
          <div className="grid grid-cols-7 border-b border-line bg-cream text-center text-[11px] font-semibold uppercase tracking-wider text-muted">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <ol className="grid grid-cols-7">
            {days.map((date) => {
              const dayPlans = byDate.get(date) ?? []
              const inMonth = sameMonth(date, cursor)
              return (
                <li key={date} className={cn('min-h-[72px] border-b border-r border-line/70 p-1 md:min-h-[104px] md:p-1.5', !inMonth && 'bg-cream/60 text-muted/60')}>
                  <button
                    type="button"
                    onClick={() => (dayPlans.length ? setViewing(dayPlans[0]) : openNew(date))}
                    className="flex h-full w-full flex-col items-start rounded-xl p-1 text-left hover:bg-lavender-50"
                    aria-label={`${formatDateKey(date, { weekday: 'long', month: 'long', day: 'numeric' })}: ${dayPlans.length ? pluralize(dayPlans.length, 'planned look') : 'nothing planned'}`}
                  >
                    <span className={cn('grid h-6 w-6 place-items-center rounded-full text-xs', date === today && 'bg-plum font-semibold text-white')}>{parseDateKey(date).getDate()}</span>
                    <span className="mt-1 hidden w-full space-y-0.5 md:block">
                      {dayPlans.slice(0, 2).map((p) => (
                        <span key={p.id} className="block truncate rounded-md bg-lilac px-1.5 py-0.5 text-[11px] font-medium text-plum">
                          {outfitById.get(p.outfitId)?.name}
                        </span>
                      ))}
                      {dayPlans.length > 2 && <span className="block text-[11px] text-muted">+{dayPlans.length - 2} more</span>}
                    </span>
                    {dayPlans.length > 0 && (
                      <span className="mt-1 flex gap-0.5 md:hidden">
                        {dayPlans.map((p) => (
                          <span key={p.id} className="h-1.5 w-1.5 rounded-full bg-plum" />
                        ))}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* Trip & event planner */}
      <Card className="mt-8">
        <SectionTitle action={<Luggage className="h-5 w-5 text-lavender-600" />}>Trip & event planner</SectionTitle>
        <p className="mb-4 text-sm text-muted">Choose dates, plan a look for each day, and get a de-duplicated packing list.</p>
        <div className="grid max-w-md grid-cols-2 gap-3">
          <Field label="From">{(p) => <Input {...p} type="date" value={tripFrom} onChange={(e) => setTripFrom(e.target.value)} />}</Field>
          <Field label="To" error={tripFrom > tripTo ? 'End date is before the start' : null}>
            {(p) => <Input {...p} type="date" value={tripTo} min={tripFrom} onChange={(e) => setTripTo(e.target.value)} />}
          </Field>
        </div>
        {tripDays.length > 0 && (
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold">Looks by day</p>
              <ul className="space-y-2">
                {tripDays.map((date) => {
                  const dayPlans = byDate.get(date) ?? []
                  return (
                    <li key={date} className="rounded-2xl border border-line p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium">{formatDateKey(date)}</span>
                        <div className="w-48">
                          <Select aria-label={`Add a look on ${formatDateKey(date)}`} value="" onChange={(e) => quickAssign(date, e.target.value)}>
                            <option value="">+ Add a look</option>
                            {outfits
                              .filter((o) => !dayPlans.some((p) => p.outfitId === o.id))
                              .map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.name}
                                </option>
                              ))}
                          </Select>
                        </div>
                      </div>
                      {dayPlans.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {dayPlans.map((p) => (
                            <button key={p.id} type="button" onClick={() => setViewing(p)} className="rounded-full bg-lilac px-2.5 py-1 text-xs font-medium text-plum">
                              {outfitById.get(p.outfitId)?.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">
                  Packing list {packing && packing.totalItems > 0 && <span className="font-normal text-muted">· {pluralize(packing.totalItems, 'piece')} for {pluralize(packing.lookCount, 'look')}</span>}
                </p>
                {packing && packing.totalItems > 0 && (
                  <Button size="sm" variant="ghost" icon={<ClipboardCopy className="h-4 w-4" />} onClick={copyPacking}>
                    Copy
                  </Button>
                )}
              </div>
              {packing && packing.totalItems > 0 ? (
                <div className="space-y-4">
                  {packing.groups.map((g) => (
                    <fieldset key={g.slot}>
                      <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{g.label}</legend>
                      <ul className="space-y-1">
                        {g.entries.map((e) => (
                          <li key={e.item.id}>
                            <label className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-lavender-50">
                              <input type="checkbox" className="h-4 w-4 accent-plum" checked={packed.includes(e.item.id)} onChange={() => setPacked((p) => (p.includes(e.item.id) ? p.filter((x) => x !== e.item.id) : [...p, e.item.id]))} />
                              <span className="w-8 shrink-0">
                                <ItemImage item={e.item} rounded="rounded-lg" sizes="sm" />
                              </span>
                              <span className={cn('flex-1 text-sm', packed.includes(e.item.id) && 'text-muted line-through')}>{e.item.name}</span>
                              {e.looks > 1 && <Badge>{e.looks} looks</Badge>}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </fieldset>
                  ))}
                  {packing.missingPieces > 0 && <p className="text-xs text-muted">{pluralize(packing.missingPieces, 'piece')} in these outfits no longer exist in your wardrobe.</p>}
                </div>
              ) : (
                <p className="rounded-2xl bg-cream p-4 text-sm text-muted">Plan looks for these dates to build your packing list.</p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Plan editor */}
      <Dialog
        open={Boolean(draft)}
        onClose={() => {
          setDraft(null)
          setDraftErrors({})
        }}
        title={draft?.planId ? 'Edit plan' : 'Plan an outfit'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={saveDraft} loading={saving}>
              {draft?.planId ? 'Save changes' : 'Add to calendar'}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date" error={draftErrors.date}>
                {(p) => <Input {...p} type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />}
              </Field>
              <Field label="Occasion or activity" optional error={draftErrors.occasion}>
                {(p) => <Input {...p} value={draft.occasion} maxLength={60} placeholder="e.g. Team lunch" onChange={(e) => setDraft({ ...draft, occasion: e.target.value })} />}
              </Field>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Outfit</legend>
              {draftErrors.outfitId && <p className="mb-2 text-sm font-medium text-red-600" role="alert">{draftErrors.outfitId}</p>}
              <div role="radiogroup" aria-label="Outfit" className="grid max-h-[320px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                {outfits.map((o) => (
                  <OutfitOption key={o.id} outfit={o} selected={draft.outfitId === o.id} onSelect={() => setDraft({ ...draft, outfitId: o.id })} items={items} />
                ))}
              </div>
            </fieldset>
            <Field label="Notes" optional error={draftErrors.notes}>
              {(p) => <Textarea {...p} value={draft.notes} maxLength={300} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />}
            </Field>
          </div>
        )}
      </Dialog>

      {/* Plan details */}
      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewingOutfit?.name ?? 'Planned outfit'} description={viewing ? formatDateKey(viewing.date, { weekday: 'long', month: 'long', day: 'numeric' }) : undefined}>
        {viewing && viewingOutfit && (
          <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
            <div className="mx-auto h-64 w-32 rounded-3xl bg-gradient-to-b from-lavender-50 to-blush/40">
              <OutfitPreview items={resolveOutfitItems(viewingOutfit.clothingItemIds, items).items} />
            </div>
            <div className="min-w-0 space-y-3">
              {viewing.occasion && <Badge tone="blush">{viewing.occasion}</Badge>}
              {viewingOutfit.occasion && <p className="text-sm text-muted">Outfit occasion: {occasionLabel(viewingOutfit.occasion)}</p>}
              {viewing.notes && <p className="text-sm">{viewing.notes}</p>}
              <ul className="flex flex-wrap gap-1.5">
                {sortBySlot(resolveOutfitItems(viewingOutfit.clothingItemIds, items).items).map((i) => (
                  <li key={i.id}>
                    <button type="button" onClick={() => openItem(i.id)} className="rounded-full border border-line px-2.5 py-1 text-xs hover:border-lavender">
                      {i.name}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" onClick={() => openEdit(viewing)}>
                  Edit plan
                </Button>
                <Button size="sm" variant="secondary" icon={<Sparkles className="h-4 w-4" />} onClick={() => navigate(`/studio?outfit=${viewingOutfit.id}`)}>
                  Open in Studio
                </Button>
                {viewing.date <= today && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      app
                        .markOutfitWorn(viewingOutfit.id)
                        .then(() => toast({ tone: 'success', title: 'Marked as worn' }))
                        .catch(() => toast({ tone: 'error', title: 'Could not update' }))
                    }
                  >
                    I wore this
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" icon={<Trash2 className="h-4 w-4" />} onClick={() => setRemoving(viewing)}>
                  Remove
                </Button>
              </div>
              {(byDate.get(viewing.date)?.length ?? 0) > 1 && (
                <div className="border-t border-line pt-3">
                  <p className="mb-1 text-xs font-semibold text-muted">Also planned this day</p>
                  {byDate
                    .get(viewing.date)
                    ?.filter((p) => p.id !== viewing.id)
                    .map((p) => (
                      <button key={p.id} type="button" className="mr-1.5 rounded-full bg-lilac px-2.5 py-1 text-xs font-medium text-plum" onClick={() => setViewing(p)}>
                        {outfitById.get(p.outfitId)?.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Remove from calendar?"
        description="The outfit stays saved — only this plan is removed."
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!removing) return
          try {
            await app.deletePlan(removing.id)
            toast({ tone: 'success', title: 'Removed from calendar' })
          } catch (err) {
            toast({ tone: 'error', title: 'Could not remove', description: err instanceof Error ? err.message : undefined })
          }
          setRemoving(null)
          setViewing(null)
        }}
      />
    </>
  )
}

function WeatherChip({ day, unit }: { day?: WeatherDay; unit: 'celsius' | 'fahrenheit' }) {
  if (!day) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-[11px] text-muted" title={`${day.summary} · ${day.source}`}>
      <CloudSun className="h-3 w-3" /> {formatTemp(day.tempMaxC, unit)}
    </span>
  )
}

function OutfitOption({ outfit, selected, onSelect, items }: { outfit: Outfit; selected: boolean; onSelect: () => void; items: ReturnType<typeof useApp>['items'] }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn('rounded-3xl border p-1.5 text-left transition-all', selected ? 'border-plum bg-lilac ring-2 ring-plum/20' : 'border-line bg-white hover:border-lavender-300')}
    >
      <span className="mx-auto block h-28 w-14">
        <OutfitPreview items={resolveOutfitItems(outfit.clothingItemIds, items).items} />
      </span>
      <span className="block truncate px-1 pt-1 text-xs font-semibold">{outfit.name}</span>
    </button>
  )
}
