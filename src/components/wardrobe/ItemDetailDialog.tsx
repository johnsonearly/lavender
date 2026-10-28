import { CalendarClock, Heart, MessageCircleHeart, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { aestheticName } from '@/domain/aesthetics'
import { categoryLabel, subcategoryLabel } from '@/domain/categories'
import { colorLabel } from '@/domain/colors'
import { occasionLabel } from '@/domain/occasions'
import { FIT_LABELS, PATTERN_LABELS, SEASON_LABELS, type ClothingItem } from '@/domain/types'
import { cn, pluralize } from '@/lib/utils'
import { useApp } from '@/state/AppProvider'
import { useToast } from '@/state/toast'
import { ItemImage } from '../garments/ItemImage'
import { Badge, ColorDot } from '../ui/Chip'
import { Button } from '../ui/Button'
import { ConfirmDialog, Dialog } from '../ui/Dialog'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 border-b border-line/70 py-2.5 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  )
}

export function ItemDetailDialog({ item, onClose }: { item: ClothingItem | null; onClose: () => void }) {
  const { toggleItemFavorite, deleteItem, outfits } = useApp()
  const navigate = useNavigate()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!item) return <Dialog open={false} onClose={onClose} title="Item" />

  const usedIn = outfits.filter((o) => o.clothingItemIds.includes(item.id))
  const go = (to: string) => {
    onClose()
    navigate(to)
  }

  const handleDelete = async () => {
    setBusy(true)
    try {
      await deleteItem(item.id)
      toast({ tone: 'success', title: `${item.name} deleted`, description: usedIn.length ? `Removed from ${pluralize(usedIn.length, 'outfit')}.` : undefined })
      setConfirming(false)
      onClose()
    } catch (err) {
      toast({ tone: 'error', title: 'Could not delete', description: err instanceof Error ? err.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Dialog open onClose={onClose} title={item.name} size="lg">
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <div>
            <ItemImage item={item} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.isSample && <Badge tone="blush">Sample item</Badge>}
              {!item.imageUrl && <Badge tone="outline">Illustration</Badge>}
            </div>
          </div>
          <div className="min-w-0">
            <dl>
              <Row label="Category">
                {categoryLabel(item.category)}
                {subcategoryLabel(item.category, item.subcategory) && <span className="text-muted"> · {subcategoryLabel(item.category, item.subcategory)}</span>}
              </Row>
              <Row label="Colors">
                <span className="flex flex-wrap gap-2">
                  {item.colors.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1.5">
                      <ColorDot color={c} size="sm" />
                      {colorLabel(c)}
                    </span>
                  ))}
                </span>
              </Row>
              <Row label="Pattern">{PATTERN_LABELS[item.pattern]}</Row>
              {item.fit && <Row label="Fit">{FIT_LABELS[item.fit]}</Row>}
              {item.styleTags.length > 0 && (
                <Row label="Style">
                  <span className="flex flex-wrap gap-1.5">
                    {item.styleTags.map((t) => (
                      <Badge key={t}>{aestheticName(t)}</Badge>
                    ))}
                  </span>
                </Row>
              )}
              <Row label="Seasons">{item.seasons.length ? item.seasons.map((s) => SEASON_LABELS[s]).join(', ') : 'All seasons'}</Row>
              {item.occasions.length > 0 && <Row label="Occasions">{item.occasions.map(occasionLabel).join(', ')}</Row>}
              {item.brand && <Row label="Brand">{item.brand}</Row>}
              {item.purchase && (item.purchase.price != null || item.purchase.store || item.purchase.date) && (
                <Row label="Purchase">
                  {[item.purchase.price != null ? `${item.purchase.currency ?? ''} ${item.purchase.price}`.trim() : null, item.purchase.store, item.purchase.date].filter(Boolean).join(' · ')}
                </Row>
              )}
              <Row label="Worn">
                {item.timesWorn ? `${pluralize(item.timesWorn, 'time')}` : 'Not tracked yet'}
                {item.lastWornAt && <span className="text-muted"> · last {new Date(item.lastWornAt).toLocaleDateString()}</span>}
              </Row>
              <Row label="In outfits">{usedIn.length ? usedIn.map((o) => o.name).join(', ') : 'None yet'}</Row>
              {item.notes && <Row label="Notes">{item.notes}</Row>}
            </dl>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button icon={<Sparkles className="h-4 w-4" />} onClick={() => go(`/studio?items=${item.id}`)}>
            Style in Studio
          </Button>
          <Button variant="soft" icon={<MessageCircleHeart className="h-4 w-4" />} onClick={() => go(`/stylist?item=${item.id}`)}>
            Ask the stylist
          </Button>
          <Button
            variant="secondary"
            icon={<Heart className={cn('h-4 w-4', item.favorite && 'fill-current text-plum')} />}
            onClick={() => toggleItemFavorite(item.id).catch(() => toast({ tone: 'error', title: 'Could not update favorite' }))}
            aria-pressed={item.favorite}
          >
            {item.favorite ? 'Favorited' : 'Favorite'}
          </Button>
          <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => go(`/wardrobe/${item.id}/edit`)}>
            Edit
          </Button>
          <Button variant="ghost" className="text-red-600 hover:bg-red-50" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirming(true)}>
            Delete
          </Button>
        </div>
        {item.lastWornAt === null && item.timesWorn === 0 && (
          <p className="mt-4 flex items-center gap-2 text-xs text-muted">
            <CalendarClock className="h-3.5 w-3.5" /> Wear counts update when you mark an outfit as worn.
          </p>
        )}
      </Dialog>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={handleDelete}
        busy={busy}
        title={`Delete ${item.name}?`}
        description={
          <>
            This permanently removes the piece{item.imageUrl ? ' and its photo' : ''}.
            {usedIn.length > 0 && ` It will also be removed from ${pluralize(usedIn.length, 'saved outfit')} (${usedIn.map((o) => o.name).join(', ')}).`}
          </>
        }
      />
    </>
  )
}
