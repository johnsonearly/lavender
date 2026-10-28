import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Sparkle } from '../decor/Decor'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-lavender-600">
            <Sparkle className="h-3 w-3" />
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif text-3xl font-semibold leading-tight text-ink md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function Card({ children, className, as: Tag = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' | 'li' }) {
  return <Tag className={cn('rounded-4xl border border-line bg-white p-5 shadow-soft md:p-6', className)}>{children}</Tag>
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <h2 className="font-serif text-xl font-semibold text-ink">{children}</h2>
      {action}
    </div>
  )
}

export function EmptyState({
  illustration,
  title,
  description,
  actions,
  className,
}: {
  illustration?: ReactNode
  title: string
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center rounded-4xl border border-dashed border-lavender-300 bg-gradient-to-b from-lavender-50 to-white px-6 py-10 text-center', className)}>
      {illustration && <div className="mb-4">{illustration}</div>}
      <h3 className="font-serif text-xl font-semibold text-ink">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-lilac/60', className)} aria-hidden />
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string
  options: readonly { id: T; label: string; icon?: ReactNode; ariaLabel?: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-full border border-line bg-white p-1', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          aria-label={o.ariaLabel}
          onClick={() => onChange(o.id)}
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender',
            value === o.id ? 'bg-plum text-white' : 'text-muted hover:text-ink',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}
