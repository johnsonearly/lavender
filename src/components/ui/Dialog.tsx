import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Hide the visible title (still announced to screen readers). */
  hideTitle?: boolean
}

/**
 * Native <dialog> gives focus trapping, Escape handling and inert background for free.
 * On small screens it docks to the bottom like a sheet.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', hideTitle }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  const sizes = { sm: 'md:max-w-md', md: 'md:max-w-lg', lg: 'md:max-w-2xl', xl: 'md:max-w-4xl' }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      aria-labelledby={titleId}
      className={cn(
        'lav-dialog m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-4xl border border-line bg-white p-0 text-ink shadow-lift backdrop:bg-plum/25 backdrop:backdrop-blur-[2px]',
        'md:m-auto md:rounded-4xl',
        sizes[size],
      )}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5 md:px-7 md:pt-6">
            <div className={cn(hideTitle && 'sr-only')}>
              <h2 id={titleId} className="font-serif text-xl font-semibold text-ink md:text-2xl">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="-mr-1 rounded-full p-2 text-muted hover:bg-lilac hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 md:px-7">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-cream/60 px-5 py-4 md:px-7">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  busy,
  tone = 'danger',
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: ReactNode
  confirmLabel?: string
  busy?: boolean
  tone?: 'danger' | 'primary'
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-muted">{description}</div>
    </Dialog>
  )
}
