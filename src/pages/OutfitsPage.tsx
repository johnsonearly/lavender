import { CalendarPlus, Copy, Heart, Pencil, Plus, Shirt, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OutfitCard } from '@/components/outfits/OutfitCard'
import { ButtonLink, IconButton } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { EmptyState, PageHeader } from '@/components/ui/Layout'
import { occasionLabel } from '@/domain/occasions'
import type { Outfit } from '@/domain/types'
import { cn, pluralize } from '@/lib/utils'
import { useApp } from '@/state/AppProvider'
import { useToast } from '@/state/toast'

export default function OutfitsPage() {
  const { outfits, items, plans, toggleOutfitFavorite, duplicateOutfit, deleteOutfit, markOutfitWorn } = useApp()
  const navigate = useNavigate()
  const toast = useToast()
  const [filter, setFilter] = useState<string>('all')
  const [toDelete, setToDelete] = useState<Outfit | null>(null)
  const [busy, setBusy] = useState(false)

  const occasions = useMemo(() => Array.from(new Set(outfits.map((o) => o.occasion).filter((o): o is string => Boolean(o)))), [outfits])
  const shown = useMemo(
    () =>
      [...outfits]
        .filter((o) => (filter === 'all' ? true : filter === 'favorites' ? o.favorite : o.occasion === filter))
        .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt.localeCompare(a.updatedAt)),
    [outfits, filter],
  )

  const run = async (fn: () => Promise<unknown>, success?: string) => {
    try {
      await fn()
      if (success) toast({ tone: 'success', title: success })
    } catch (err) {
      toast({ tone: 'error', title: 'Something went wrong', description: err instanceof Error ? err.message : undefined })
    }
  }

  const plannedCount = toDelete ? plans.filter((p) => p.outfitId === toDelete.id).length : 0

  return (
    <>
      <PageHeader
        eyebrow="Your lookbook"
        title="Saved outfits"
        description={outfits.length ? `${pluralize(outfits.length, 'outfit')} built from your own wardrobe.` : undefined}
        actions={
          <ButtonLink to="/studio" icon={<Plus className="h-4 w-4" />}>
            Create outfit
          </ButtonLink>
        }
      />
      {outfits.length === 0 ? (
        <EmptyState
          illustration={<Shirt className="h-10 w-10 text-lavender" />}
          title="No saved outfits yet"
          description="Create a look in the Outfit Studio or save one of the AI stylist's suggestions."
          actions={
            <>
              <ButtonLink to="/studio">Open the Studio</ButtonLink>
              <ButtonLink to="/stylist" variant="secondary">
                Ask the stylist
              </ButtonLink>
            </>
          }
        />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter outfits">
            <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
              All
            </Chip>
            <Chip selected={filter === 'favorites'} onClick={() => setFilter('favorites')}>
              Favorites
            </Chip>
            {occasions.map((o) => (
              <Chip key={o} selected={filter === o} onClick={() => setFilter(o)}>
                {occasionLabel(o)}
              </Chip>
            ))}
          </div>
          {shown.length === 0 ? (
            <EmptyState title="Nothing here yet" description="No outfits match this filter." />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((o) => (
                <li key={o.id} className="animate-fade-up">
                  <OutfitCard
                    outfit={o}
                    wardrobe={items}
                    onOpen={() => navigate(`/studio?outfit=${o.id}`)}
                    actions={
                      <>
                        <IconButton label={o.favorite ? `Unfavorite ${o.name}` : `Favorite ${o.name}`} aria-pressed={o.favorite} onClick={() => run(() => toggleOutfitFavorite(o.id))}>
                          <Heart className={cn('h-[18px] w-[18px]', o.favorite && 'fill-plum text-plum')} />
                        </IconButton>
                        <IconButton label={`Edit ${o.name}`} onClick={() => navigate(`/studio?outfit=${o.id}`)}>
                          <Pencil className="h-[18px] w-[18px]" />
                        </IconButton>
                        <IconButton label={`Duplicate ${o.name}`} onClick={() => run(() => duplicateOutfit(o.id, false), 'Outfit duplicated')}>
                          <Copy className="h-[18px] w-[18px]" />
                        </IconButton>
                        <IconButton label={`Plan ${o.name}`} onClick={() => navigate(`/calendar?outfit=${o.id}`)}>
                          <CalendarPlus className="h-[18px] w-[18px]" />
                        </IconButton>
                        <IconButton label={`Delete ${o.name}`} className="hover:bg-red-50 hover:text-red-600" onClick={() => setToDelete(o)}>
                          <Trash2 className="h-[18px] w-[18px]" />
                        </IconButton>
                        <button
                          type="button"
                          className="ml-auto rounded-full px-3 py-1.5 text-xs font-semibold text-plum hover:bg-lilac"
                          onClick={() => run(() => markOutfitWorn(o.id), `Marked “${o.name}” as worn today`)}
                        >
                          Wore it today
                        </button>
                      </>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        busy={busy}
        title={`Delete “${toDelete?.name}”?`}
        description={
          <>
            The outfit will be removed. Your clothes stay in your wardrobe.
            {plannedCount > 0 && ` It is planned on ${pluralize(plannedCount, 'calendar day')}, which will also be cleared.`}
          </>
        }
        onConfirm={async () => {
          if (!toDelete) return
          setBusy(true)
          await run(() => deleteOutfit(toDelete.id), 'Outfit deleted')
          setBusy(false)
          setToDelete(null)
        }}
      />
    </>
  )
}
