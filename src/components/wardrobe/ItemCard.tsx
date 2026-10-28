import { Check, Heart } from 'lucide-react'
import { categoryLabel, subcategoryLabel } from '@/domain/categories'
import type { ClothingItem } from '@/domain/types'
import { cn } from '@/lib/utils'
import { ItemImage } from '../garments/ItemImage'
import { Badge, ColorDot } from '../ui/Chip'

interface ItemCardProps {
  item: ClothingItem
  onOpen: () => void
  onToggleFavorite?: () => void
  selectable?: boolean
  selected?: boolean
  onSelect?: () => void
  layout?: 'grid' | 'list'
}

export function ItemCard({ item, onOpen, onToggleFavorite, selectable, selected, onSelect, layout = 'grid' }: ItemCardProps) {
  const sub = subcategoryLabel(item.category, item.subcategory)
  const meta = sub ?? categoryLabel(item.category)
  const handleClick = selectable ? onSelect : onOpen

  if (layout === 'list') {
    return (
      <div className={cn('flex items-center gap-3 rounded-3xl border bg-white p-2 pr-3 transition-all', selected ? 'border-plum shadow-soft' : 'border-line hover:border-lavender-300')}>
        <button type="button" onClick={handleClick} aria-pressed={selectable ? selected : undefined} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender">
          <div className="w-14 shrink-0">
            <ItemImage item={item} rounded="rounded-2xl" sizes="sm" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ink">{item.name}</p>
            <p className="truncate text-xs text-muted">
              {meta}
              {item.timesWorn > 0 && ` · worn ${item.timesWorn}×`}
            </p>
            <div className="mt-1 flex gap-1">
              {item.colors.map((c) => (
                <ColorDot key={c} color={c} size="sm" />
              ))}
            </div>
          </div>
          {item.isSample && <Badge tone="blush">Sample</Badge>}
          {selectable && (
            <span className={cn('grid h-6 w-6 place-items-center rounded-full border-2', selected ? 'border-plum bg-plum text-white' : 'border-line')}>
              {selected && <Check className="h-3.5 w-3.5" />}
            </span>
          )}
        </button>
        {onToggleFavorite && !selectable && <FavButton favorite={item.favorite} name={item.name} onClick={onToggleFavorite} />}
      </div>
    )
  }

  return (
    <article className={cn('group relative flex flex-col rounded-4xl border bg-white p-2 transition-all duration-200', selected ? 'border-plum shadow-lift ring-2 ring-plum/20' : 'border-line hover:-translate-y-0.5 hover:shadow-lift')}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={selectable ? selected : undefined}
        aria-label={selectable ? `${selected ? 'Deselect' : 'Select'} ${item.name}` : `View ${item.name}`}
        className="flex flex-1 flex-col rounded-3xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender"
      >
        <ItemImage item={item} />
        <div className="px-1.5 pb-1 pt-2.5">
          <h3 className="truncate text-sm font-semibold text-ink">{item.name}</h3>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted">{meta}</span>
            <span className="flex shrink-0 -space-x-1">
              {item.colors.slice(0, 3).map((c) => (
                <ColorDot key={c} color={c} size="sm" className="ring-2 ring-white" />
              ))}
            </span>
          </div>
        </div>
      </button>
      <div className="pointer-events-none absolute left-4 top-4 flex flex-col items-start gap-1">
        {item.isSample && <Badge tone="blush">Sample</Badge>}
      </div>
      {selectable ? (
        <span className={cn('pointer-events-none absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full border-2 shadow-soft', selected ? 'border-plum bg-plum text-white' : 'border-white bg-white/80')}>
          {selected && <Check className="h-4 w-4" />}
        </span>
      ) : (
        onToggleFavorite && <FavButton favorite={item.favorite} name={item.name} onClick={onToggleFavorite} className="absolute right-3.5 top-3.5 bg-white/85 shadow-soft" />
      )}
    </article>
  )
}

export function FavButton({ favorite, name, onClick, className }: { favorite: boolean; name: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={favorite}
      aria-label={favorite ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
      className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-blush focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender', className)}
    >
      <Heart key={String(favorite)} className={cn('h-[18px] w-[18px]', favorite ? 'animate-pop fill-plum text-plum' : 'text-muted')} />
    </button>
  )
}
