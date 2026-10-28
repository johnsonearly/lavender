import { BarChart3, Layers, Lightbulb, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ItemImage } from '@/components/garments/ItemImage'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Badge, ColorDot } from '@/components/ui/Chip'
import { Card, EmptyState, PageHeader, SectionTitle } from '@/components/ui/Layout'
import { buildCapsule, computeStats, findGaps, type CountEntry } from '@/domain/insights'
import type { ClothingItem } from '@/domain/types'
import { pluralize } from '@/lib/utils'
import { useApp } from '@/state/AppProvider'
import { useOpenItem } from '@/state/itemDialog'

function StatTile({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-4 shadow-soft">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 font-serif text-3xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

/** Single-series horizontal bars: one hue, values in text ink, list semantics double as the table view. */
function BarList({ entries, total, swatches }: { entries: CountEntry[]; total: number; swatches?: boolean }) {
  const max = Math.max(1, ...entries.map((e) => e.count))
  return (
    <ul className="space-y-2.5">
      {entries.map((e) => (
        <li key={e.key} className="group" title={`${e.label}: ${e.count} of ${total}`}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-ink">
              {swatches && <ColorDot color={e.key} size="sm" />}
              {e.label}
            </span>
            <span className="tabular-nums text-muted">
              {e.count} <span className="text-xs">({Math.round((e.count / total) * 100)}%)</span>
            </span>
          </div>
          <div className="h-2 rounded bg-lilac/60" aria-hidden>
            <div className="h-2 rounded bg-lavender-500 transition-colors group-hover:bg-plum" style={{ width: `${(e.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function ItemRow({ item, detail, onOpen }: { item: ClothingItem; detail: string; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-2xl p-1.5 text-left hover:bg-lavender-50">
        <span className="w-10 shrink-0">
          <ItemImage item={item} rounded="rounded-xl" sizes="sm" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{item.name}</span>
          <span className="block text-xs text-muted">{detail}</span>
        </span>
      </button>
    </li>
  )
}

export default function InsightsPage() {
  const { items, outfits, profile } = useApp()
  const openItem = useOpenItem()
  const [showCapsule, setShowCapsule] = useState(false)
  const stats = useMemo(() => computeStats(items, outfits), [items, outfits])
  const gaps = useMemo(() => findGaps(items), [items])
  const capsule = useMemo(() => (showCapsule ? buildCapsule(items, profile) : null), [showCapsule, items, profile])
  const showShopping = profile?.settings.showShoppingSuggestions ?? true

  if (items.length < 3) {
    return (
      <>
        <PageHeader eyebrow="Know your closet" title="Wardrobe insights" />
        <EmptyState
          illustration={<BarChart3 className="h-10 w-10 text-lavender" />}
          title="Not enough data yet"
          description={`Insights are calculated from your real wardrobe, so they need at least 3 pieces (you have ${items.length}). We won't show made-up numbers.`}
          actions={<ButtonLink to="/wardrobe/new">Add a piece</ButtonLink>}
        />
      </>
    )
  }

  return (
    <>
      <PageHeader eyebrow="Know your closet" title="Wardrobe insights" description="Everything here is calculated from the pieces, outfits and wears you’ve recorded." />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Pieces" value={stats.totalItems} hint={`${stats.favoriteItemCount} favorites`} />
        <StatTile label="Saved outfits" value={stats.outfitCount} />
        <StatTile label="Favorite looks" value={stats.favoriteOutfitCount} />
        <StatTile label="Wears logged" value={stats.totalWears} hint={stats.totalWears ? undefined : 'Mark outfits as worn to track'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Pieces by category</SectionTitle>
          <BarList entries={stats.categories} total={stats.totalItems} />
        </Card>
        <Card>
          <SectionTitle>Main colors</SectionTitle>
          <BarList entries={stats.colors.slice(0, 8)} total={stats.totalItems} swatches />
          {stats.colors.length > 8 && <p className="mt-3 text-xs text-muted">+{stats.colors.length - 8} more colors</p>}
        </Card>

        <Card>
          <SectionTitle>Most worn</SectionTitle>
          {stats.mostWorn.length ? (
            <ul className="space-y-1">
              {stats.mostWorn.map((i) => (
                <ItemRow key={i.id} item={i} detail={`Worn ${pluralize(i.timesWorn, 'time')}`} onOpen={() => openItem(i.id)} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No wears logged yet. Use “Wore it today” on an outfit to start tracking.</p>
          )}
        </Card>
        <Card>
          <SectionTitle>Waiting for some love</SectionTitle>
          <ul className="space-y-1">
            {stats.leastUsed.map((i) => (
              <ItemRow key={i.id} item={i} detail={i.timesWorn ? `Worn ${pluralize(i.timesWorn, 'time')}` : 'Not worn yet'} onOpen={() => openItem(i.id)} />
            ))}
          </ul>
          <ButtonLink to={`/stylist?prompt=${encodeURIComponent('How can I wear my clothes in more combinations?')}`} variant="soft" size="sm" className="mt-3">
            Get ideas to re-wear these
          </ButtonLink>
        </Card>

        <Card>
          <SectionTitle>Most versatile</SectionTitle>
          {stats.versatile.length ? (
            <ul className="space-y-1">
              {stats.versatile.map((v) => (
                <ItemRow key={v.item.id} item={v.item} detail={`${pluralize(v.occasions, 'occasion')} · in ${pluralize(v.outfits, 'outfit')}`} onOpen={() => openItem(v.item.id)} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Tag pieces with occasions to see which work hardest.</p>
          )}
        </Card>
        <Card>
          <SectionTitle>Your color combinations</SectionTitle>
          {stats.colorPairs.length ? (
            <ul className="space-y-2">
              {stats.colorPairs.map((p) => (
                <li key={p.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="flex -space-x-1">
                      {p.key.split('+').map((c) => (
                        <ColorDot key={c} color={c} className="ring-2 ring-white" />
                      ))}
                    </span>
                    {p.label}
                  </span>
                  <span className="text-muted">{pluralize(p.count, 'outfit')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Save a few outfits to see which color pairings you return to.</p>
          )}
        </Card>
      </div>

      <Card className="mt-6 bg-gradient-to-br from-lilac/60 to-white">
        <SectionTitle action={<Layers className="h-5 w-5 text-lavender-600" />}>Capsule from what you own</SectionTitle>
        <p className="text-sm text-muted">A small, versatile edit chosen from your existing pieces — favoring neutrals, your style profile and pieces that pair easily.</p>
        {!capsule ? (
          <Button className="mt-4" icon={<Sparkles className="h-4 w-4" />} onClick={() => setShowCapsule(true)}>
            Build my capsule
          </Button>
        ) : (
          <div className="mt-4">
            <p className="mb-3 text-sm font-medium">
              {pluralize(capsule.items.length, 'piece')} · about {capsule.outfitCount} combinations (counting shoes and optional layers)
            </p>
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {capsule.items.map((i) => (
                <li key={i.id}>
                  <button type="button" className="w-full" onClick={() => openItem(i.id)} title={i.name}>
                    <ItemImage item={i} rounded="rounded-2xl" sizes="sm" />
                    <span className="mt-1 block truncate text-[11px] text-muted">{i.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            {capsule.notes.map((n) => (
              <p key={n} className="mt-2 text-xs text-muted">
                {n}
              </p>
            ))}
          </div>
        )}
      </Card>

      {showShopping && gaps.length > 0 && (
        <Card className="mt-6 border-dashed">
          <SectionTitle action={<Badge tone="outline">Optional</Badge>}>Gaps worth knowing about</SectionTitle>
          <p className="mb-4 text-sm text-muted">Not a shopping list — just practical basics that would unlock more combinations if you ever want them. You can hide this in Settings.</p>
          <ul className="grid gap-3 md:grid-cols-2">
            {gaps.map((g) => (
              <li key={g.id} className="flex gap-3 rounded-3xl bg-cream p-4">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-lavender-600" />
                <div>
                  <p className="text-sm font-semibold">{g.title}</p>
                  <p className="text-sm text-muted">{g.reason}</p>
                  <p className="mt-1 text-xs text-muted">Idea: {g.suggestion}</p>
                </div>
              </li>
            ))}
          </ul>
          {profile?.budget && <p className="mt-3 text-xs text-muted">Budget noted: {profile.budget.currency} {profile.budget.amount}.</p>}
        </Card>
      )}
    </>
  )
}
