import { useEffect, useId, useState } from 'react'
import type { ClothingItem } from '@/domain/types'
import { cn } from '@/lib/utils'
import { MANNEQUIN } from '@/rendering/garmentShapes'
import { buildPreview, photoRect, type PreviewMode } from '@/rendering/preview'
import { GarmentLayer } from './GarmentLayer'
import { ItemImage } from './ItemImage'

const sizeCache = new Map<string, { width: number; height: number }>()

/** Natural pixel sizes of photos, so they can be placed without distortion. */
function useImageSizes(urls: string[]) {
  const [, force] = useState(0)
  const key = urls.join('|')
  useEffect(() => {
    let cancelled = false
    for (const url of key ? key.split('|') : []) {
      if (sizeCache.has(url)) continue
      const img = new Image()
      img.onload = () => {
        sizeCache.set(url, { width: img.naturalWidth, height: img.naturalHeight })
        if (!cancelled) force((n) => n + 1)
      }
      img.src = url
    }
    return () => {
      cancelled = true
    }
  }, [key])
  return (url: string) => sizeCache.get(url) ?? null
}

function Mannequin({ gradientId }: { gradientId: string }) {
  const fill = `url(#${gradientId})`
  const stroke = '#D5C7E0'
  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1">
          <stop offset="0" stopColor="#E9DFEF" />
          <stop offset=".5" stopColor="#F6F0F8" />
          <stop offset="1" stopColor="#E6DBEE" />
        </linearGradient>
      </defs>
      {MANNEQUIN.arms.map((d, i) => (
        <path key={i} d={d} fill={fill} stroke={stroke} strokeWidth="1" />
      ))}
      {MANNEQUIN.hands.map((h, i) => (
        <ellipse key={i} {...h} fill={fill} stroke={stroke} strokeWidth="1" />
      ))}
      <path d={MANNEQUIN.body} fill={fill} stroke={stroke} strokeWidth="1" />
      {MANNEQUIN.feet.map((d, i) => (
        <path key={i} d={d} fill={fill} stroke={stroke} strokeWidth="1" />
      ))}
      <path d={MANNEQUIN.neck} fill={fill} stroke={stroke} strokeWidth="1" />
      <ellipse {...MANNEQUIN.head} fill={fill} stroke={stroke} strokeWidth="1" />
      {/* Sleek low bun, kept abstract */}
      <path d="M100,44 Q102,22 120,22 Q140,22 141,46 Q134,30 120,30 Q106,30 100,44 Z" fill="#CDBBD9" opacity=".8" />
    </g>
  )
}

/**
 * Stylised outfit preview on a faceless croquis mannequin. Illustrations are generated from item
 * metadata; photos (in "photo" mode) are positioned in category zones but not fitted.
 */
export function OutfitPreview({
  items,
  mode = 'illustrated',
  className,
  label,
}: {
  items: ClothingItem[]
  mode?: PreviewMode
  className?: string
  label?: string
}) {
  const uid = useId().replace(/:/g, '')
  const plan = buildPreview(items, mode)
  const sizeOf = useImageSizes(plan.layers.filter((l) => l.kind === 'photo' && l.item.imageUrl).map((l) => l.item.imageUrl as string))
  const description = label ?? (items.length ? `Styling preview of ${items.map((i) => i.name).join(', ')}` : 'Empty mannequin')

  return (
    <svg viewBox={MANNEQUIN.viewBox} className={cn('h-full w-full', className)} role="img" aria-label={description}>
      <ellipse cx="120" cy="612" rx="60" ry="8" fill="#5B347F" opacity=".07" />
      <Mannequin gradientId={`m-${uid}`} />
      {plan.layers.map((layer) =>
        layer.kind === 'photo' && layer.zone && layer.item.imageUrl ? (
          (() => {
            const [x, y, w, h] = photoRect(layer.zone, layer.slot, sizeOf(layer.item.imageUrl))
            const clipId = `c-${uid}-${layer.item.id}`
            return (
              <g key={layer.item.id}>
                <clipPath id={clipId}>
                  <rect x={x} y={y} width={w} height={h} rx="6" />
                </clipPath>
                <image
                  href={layer.item.imageUrl}
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  preserveAspectRatio="xMidYMid meet"
                  clipPath={`url(#${clipId})`}
                  style={{ filter: 'drop-shadow(0 2px 3px rgba(48, 38, 58, 0.18))' }}
                />
              </g>
            )
          })()
        ) : (
          <GarmentLayer key={layer.item.id} art={layer.art} colors={layer.item.colors} pattern={layer.item.pattern} />
        ),
      )}
    </svg>
  )
}

/** Flat-lay board: every piece shown as its own photo/illustration. Always accurate to the item. */
export function FlatLay({ items, className }: { items: ClothingItem[]; className?: string }) {
  return (
    <div className={cn('grid grid-cols-3 gap-2 p-2', items.length <= 4 && 'grid-cols-2', className)}>
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl bg-white/70 p-1 shadow-soft">
          <ItemImage item={item} rounded="rounded-xl" sizes="sm" />
          <p className="truncate px-1 pt-1 text-center text-[11px] text-muted">{item.name}</p>
        </div>
      ))}
    </div>
  )
}
