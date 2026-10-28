import { cn } from '@/lib/utils'

/** Small hand-drawn brand ornaments. Decorative only: hidden from assistive tech. */

export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} aria-hidden fill="currentColor">
      <path d="M12 1.5c.9 4.9 3.6 7.6 8.5 8.5-4.9.9-7.6 3.6-8.5 8.5-.9-4.9-3.6-7.6-8.5-8.5 4.9-.9 7.6-3.6 8.5-8.5Z" />
    </svg>
  )
}

export function Bow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={cn('h-6 w-9', className)} aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M24 15 8 5c-4 3-4 13 0 17l16-7Z" fill="currentColor" fillOpacity=".18" />
      <path d="m24 15 16-10c4 3 4 13 0 17l-16-7Z" fill="currentColor" fillOpacity=".18" />
      <path d="m22 17-6 13M26 17l6 13" />
      <circle cx="24" cy="15.5" r="3.2" fill="currentColor" />
    </svg>
  )
}

export function Hanger({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={cn('h-6 w-9', className)} aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7a4 4 0 1 1 6 3.5c-1.3.8-2 1.6-2 3V15" />
      <path d="M24 15 4 26.5c-1.2.7-.7 2.5.7 2.5h38.6c1.4 0 1.9-1.8.7-2.5L24 15Z" />
    </svg>
  )
}

export function Heart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} aria-hidden fill="currentColor">
      <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.1 4.4 2.6.8-1.5 2.3-2.6 4.4-2.6 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21Z" />
    </svg>
  )
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="relative grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-lavender-200 to-blush text-plum shadow-soft">
        <Sparkle className="h-5 w-5" />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-plum" />
      </span>
      {!compact && <span className="font-serif text-2xl font-semibold tracking-tight text-plum">Lavender</span>}
    </span>
  )
}

/** Soft floating sparkles for hero areas. */
export function SparkleField({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <Sparkle className="absolute left-[8%] top-[18%] h-3 w-3 animate-twinkle text-lavender" />
      <Sparkle className="absolute right-[12%] top-[12%] h-5 w-5 animate-twinkle text-lavender-300 [animation-delay:0.8s]" />
      <Sparkle className="absolute bottom-[16%] right-[28%] h-3 w-3 animate-twinkle text-blush-deep [animation-delay:1.6s]" />
      <Heart className="absolute bottom-[22%] left-[22%] h-3 w-3 animate-twinkle text-blush-deep [animation-delay:2.2s]" />
    </div>
  )
}
