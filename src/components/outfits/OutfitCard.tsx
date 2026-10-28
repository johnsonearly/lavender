import type { ReactNode } from 'react'
import { occasionLabel } from '@/domain/occasions'
import { resolveOutfitItems, sortBySlot } from '@/domain/outfitRules'
import type { ClothingItem, Outfit } from '@/domain/types'
import { cn } from '@/lib/utils'
import { OutfitPreview } from '../garments/OutfitPreview'
import { ItemImage } from '../garments/ItemImage'
import { Badge } from '../ui/Chip'

export function OutfitCard({
  outfit,
  wardrobe,
  onOpen,
  actions,
  className,
  compact,
}: {
  outfit: Outfit
  wardrobe: ClothingItem[]
  onOpen?: () => void
  actions?: ReactNode
  className?: string
  compact?: boolean
}) {
  const { items, missing } = resolveOutfitItems(outfit.clothingItemIds, wardrobe)
  const sorted = sortBySlot(items)
  const Wrapper = onOpen ? 'button' : 'div'
  return (
    <article className={cn('flex flex-col overflow-hidden rounded-4xl border border-line bg-white shadow-soft transition-shadow hover:shadow-lift', className)}>
      <Wrapper
        {...(onOpen ? { type: 'button' as const, onClick: onOpen, 'aria-label': `Open ${outfit.name}` } : {})}
        className="relative block w-full bg-gradient-to-b from-lavender-50 to-blush/30 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lavender"
      >
        <div className={cn('mx-auto', compact ? 'h-48 w-28' : 'h-64 w-36')}>
          <OutfitPreview items={items} />
        </div>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1">
          {outfit.isSample && <Badge tone="blush">Sample</Badge>}
          {outfit.parentOutfitId && <Badge tone="outline">Variation</Badge>}
        </div>
      </Wrapper>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-serif text-lg font-semibold text-ink">{outfit.name}</h3>
            <p className="text-xs text-muted">
              {outfit.occasion ? occasionLabel(outfit.occasion) : 'Any occasion'} · {items.length} pieces
              {outfit.timesWorn > 0 && ` · worn ${outfit.timesWorn}×`}
            </p>
          </div>
        </div>
        {!compact && (
          <div className="mt-3 flex gap-1.5 overflow-hidden">
            {sorted.slice(0, 6).map((i) => (
              <div key={i.id} className="w-10 shrink-0" title={i.name}>
                <ItemImage item={i} rounded="rounded-xl" sizes="sm" />
              </div>
            ))}
          </div>
        )}
        {missing > 0 && <p className="mt-2 text-xs text-muted">{missing === 1 ? 'One piece was' : `${missing} pieces were`} deleted from your wardrobe.</p>}
        {actions && <div className="mt-auto flex flex-wrap items-center gap-1 pt-3">{actions}</div>}
      </div>
    </article>
  )
}
