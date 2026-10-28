import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastInput {
  title: string
  description?: string
  tone?: ToastTone
  action?: { label: string; onClick: () => void }
}

interface Toast extends ToastInput {
  id: number
}

const ToastContext = createContext<((t: ToastInput) => void) | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), [])

  const toast = useCallback(
    (input: ToastInput) => {
      const id = ++counter.current
      setToasts((all) => [...all.slice(-3), { ...input, id }])
      window.setTimeout(() => dismiss(id), input.tone === 'error' ? 7000 : 4200)
    },
    [dismiss],
  )

  const value = useMemo(() => toast, [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-16 z-[100] flex flex-col items-center gap-2 px-4 lg:left-auto lg:right-6 lg:top-6 lg:items-end"
      >
        {toasts.map((t) => {
          const Icon = t.tone === 'error' ? XCircle : t.tone === 'success' ? CheckCircle2 : Info
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-2xl border bg-white/95 p-3.5 pr-2 shadow-lift backdrop-blur',
                t.tone === 'error' ? 'border-red-200' : 'border-line',
              )}
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', t.tone === 'error' ? 'text-red-500' : t.tone === 'success' ? 'text-lavender-600' : 'text-muted')} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                {t.description && <p className="mt-0.5 text-sm text-muted">{t.description}</p>}
                {t.action && (
                  <button
                    type="button"
                    className="mt-1.5 text-sm font-semibold text-plum underline-offset-2 hover:underline"
                    onClick={() => {
                      t.action?.onClick()
                      dismiss(t.id)
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} className="rounded-full p-1 text-muted hover:bg-lilac hover:text-ink" aria-label="Dismiss notification">
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
