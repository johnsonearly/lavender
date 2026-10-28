import { Check } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { colorHex } from '@/domain/colors'
import { cn } from '@/lib/utils'

export function Chip({
  selected,
  children,
  className,
  icon,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; icon?: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender',
        selected ? 'border-plum bg-plum text-white shadow-soft' : 'border-line bg-white text-ink hover:border-lavender-300 hover:bg-lavender-50',
        className,
      )}
      {...props}
    >
      {selected && !icon ? <Check className="h-3.5 w-3.5" aria-hidden /> : icon}
      {children}
    </button>
  )
}

export function Badge({ children, tone = 'lilac', className }: { children: ReactNode; tone?: 'lilac' | 'blush' | 'cream' | 'plum' | 'outline'; className?: string }) {
  const tones = {
    lilac: 'bg-lilac text-plum',
    blush: 'bg-blush text-plum',
    cream: 'bg-cream text-ink border border-line',
    plum: 'bg-plum text-white',
    outline: 'border border-line text-muted bg-white/80',
  }
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}>{children}</span>
}

export function ColorDot({ color, size = 'md', className }: { color: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-7 w-7' }
  const style = color === 'multicolor' ? { background: 'conic-gradient(#F4CFDC, #B9A3F0, #A9C6E8, #A8B89B, #F1D35E, #F4CFDC)' } : { background: colorHex(color) }
  return <span aria-hidden className={cn('inline-block shrink-0 rounded-full ring-1 ring-black/10', sizes[size], className)} style={style} />
}

export function MultiChips<T extends string>({
  options,
  value,
  onChange,
  max,
  renderIcon,
}: {
  options: readonly { id: T; label: string }[]
  value: T[]
  onChange: (next: T[]) => void
  max?: number
  renderIcon?: (id: T) => ReactNode
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = value.includes(o.id)
        return (
          <Chip
            key={o.id}
            selected={selected}
            icon={renderIcon?.(o.id)}
            disabled={!selected && max !== undefined && value.length >= max}
            onClick={() => onChange(selected ? value.filter((v) => v !== o.id) : [...value, o.id])}
          >
            {o.label}
          </Chip>
        )
      })}
    </div>
  )
}
