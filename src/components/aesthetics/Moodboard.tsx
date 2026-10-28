import { Check } from 'lucide-react'
import type { AestheticDef, MoodPiece } from '@/domain/aesthetics'
import { colorHex } from '@/domain/colors'
import { cn } from '@/lib/utils'
import { GarmentArt } from '../garments/GarmentLayer'
import { Sparkle } from '../decor/Decor'

function Piece({ piece, className }: { piece: MoodPiece; className?: string }) {
  return (
    <div className={cn('min-h-0 overflow-hidden rounded-2xl bg-white/80 p-1.5 shadow-soft', className)}>
      <GarmentArt art={piece.art} colors={piece.colors} pattern={piece.pattern ?? 'solid'} className="h-full w-full" />
    </div>
  )
}

/** Editorial moodboard drawn from the aesthetic's palette — inspiration, not wardrobe items. */
export function Moodboard({ aesthetic, className, compact }: { aesthetic: AestheticDef; className?: string; compact?: boolean }) {
  const [a, b, c] = aesthetic.moodboard
  return (
    <div className={cn('relative overflow-hidden rounded-3xl', className)} style={{ background: `linear-gradient(140deg, ${aesthetic.tint}, #ffffff 70%)` }} aria-hidden>
      <div className={cn('grid h-full grid-cols-[1.3fr_1fr] grid-rows-2 gap-2 p-3', compact && 'gap-1.5 p-2')}>
        <Piece piece={a} className="row-span-2" />
        <Piece piece={b} />
        <Piece piece={c} />
      </div>
      <div className="absolute bottom-2 left-2 flex gap-1 rounded-full bg-white/85 px-1.5 py-1 shadow-soft">
        {aesthetic.palette.slice(0, 5).map((p) => (
          <span key={p} className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: colorHex(p) }} />
        ))}
      </div>
      <Sparkle className="absolute right-2 top-2 h-3 w-3 text-lavender" />
    </div>
  )
}

export function AestheticCard({
  aesthetic,
  selected,
  onToggle,
  description = true,
}: {
  aesthetic: AestheticDef
  selected: boolean
  onToggle: () => void
  description?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-3xl border bg-white text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender focus-visible:ring-offset-2',
        selected ? 'border-plum shadow-lift ring-2 ring-plum/20' : 'border-line hover:-translate-y-0.5 hover:shadow-soft',
      )}
    >
      <Moodboard aesthetic={aesthetic} className="aspect-[4/3] rounded-none" compact />
      <div className="flex flex-1 flex-col p-3.5">
        <span className="font-serif text-lg font-semibold text-ink">{aesthetic.name}</span>
        <span className="text-xs text-muted">{aesthetic.tagline}</span>
        {description && <span className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">{aesthetic.description}</span>}
      </div>
      <span
        className={cn(
          'absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border-2 transition-all',
          selected ? 'border-plum bg-plum text-white' : 'border-white bg-white/70 text-transparent',
        )}
      >
        <Check className="h-4 w-4" />
      </span>
    </button>
  )
}
