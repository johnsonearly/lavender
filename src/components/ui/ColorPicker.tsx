import { Check } from 'lucide-react'
import { COLORS, colorHex } from '@/domain/colors'
import { isLight } from '@/lib/color'
import { cn } from '@/lib/utils'

/** Multi-select color swatches with accessible names. */
export function ColorPicker({
  value,
  onChange,
  max,
  disabledIds = [],
  label,
}: {
  value: string[]
  onChange: (next: string[]) => void
  max?: number
  disabledIds?: string[]
  label: string
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {COLORS.map((c) => {
        const selected = value.includes(c.id)
        const order = value.indexOf(c.id)
        const disabled = disabledIds.includes(c.id) || (!selected && max !== undefined && value.length >= max)
        const bg = c.id === 'multicolor' ? 'conic-gradient(#F4CFDC, #B9A3F0, #A9C6E8, #A8B89B, #F1D35E, #F4CFDC)' : colorHex(c.id)
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={selected}
            aria-label={`${c.label}${selected && order === 0 && max !== undefined ? ' (main color)' : ''}`}
            title={c.label}
            disabled={disabled}
            onClick={() => onChange(selected ? value.filter((v) => v !== c.id) : [...value, c.id])}
            className={cn(
              'relative grid h-9 w-9 place-items-center rounded-full ring-1 ring-black/10 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100',
              selected && 'ring-2 ring-plum ring-offset-2',
            )}
            style={{ background: bg }}
          >
            {selected && <Check className={cn('h-4 w-4', isLight(colorHex(c.id)) ? 'text-plum' : 'text-white')} aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}
