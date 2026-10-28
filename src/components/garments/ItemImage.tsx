import { useState } from 'react'
import { artFor, categoryLabel } from '@/domain/categories'
import { colorLabel } from '@/domain/colors'
import type { ClothingItem } from '@/domain/types'
import { cn } from '@/lib/utils'
import { GarmentArt } from './GarmentLayer'

export function itemAlt(item: Pick<ClothingItem, 'name' | 'colors' | 'category'>): string {
  const colors = item.colors.map(colorLabel).join(' and ').toLowerCase()
  return `${item.name}${colors ? `, ${colors}` : ''} ${categoryLabel(item.category).toLowerCase()}`
}

/**
 * Consistent 3:4 item visual: the user's photo when available, otherwise an illustration
 * generated from the item's category, colors and pattern. Broken photos fall back gracefully.
 */
export function ItemImage({
  item,
  className,
  rounded = 'rounded-3xl',
  sizes,
}: {
  item: Pick<ClothingItem, 'name' | 'colors' | 'category' | 'subcategory' | 'pattern' | 'imageUrl'>
  className?: string
  rounded?: string
  sizes?: 'sm' | 'md'
}) {
  const [failed, setFailed] = useState(false)
  const showPhoto = item.imageUrl && !failed
  return (
    <div
      className={cn(
        'relative aspect-[3/4] w-full overflow-hidden bg-gradient-to-b from-lavender-50 via-white to-blush/40',
        rounded,
        className,
      )}
    >
      {showPhoto ? (
        <img
          src={item.imageUrl as string}
          alt={itemAlt(item)}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-contain', sizes === 'sm' ? 'p-1' : 'p-3')}
        />
      ) : (
        <GarmentArt
          art={artFor(item)}
          colors={item.colors}
          pattern={item.pattern}
          title={`Illustration of ${itemAlt(item)}`}
          className={cn('h-full w-full', sizes === 'sm' ? 'p-1.5' : 'p-3')}
        />
      )}
    </div>
  )
}
