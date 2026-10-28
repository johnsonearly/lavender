import { Camera, ImagePlus, Info, RotateCw, Trash2, Undo2, Wand2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { validateImageFile } from '@/domain/schemas'
import { canvasToBlob, DEFAULT_CROP, detectPlainBackground, drawCrop, loadImageFromFile, removePlainBackground, trimTransparent, type CropState } from '@/lib/image'
import { clamp, cn } from '@/lib/utils'
import { Button } from '../ui/Button'

export interface ImageResult {
  blob: Blob
  url: string
}

const PREVIEW_W = 300
const PREVIEW_H = 400

/**
 * Upload → crop/rotate → optional plain-background removal → processed WebP blob.
 * Everything runs in the browser; nothing is uploaded until the item is saved.
 */
export function ImageEditor({
  currentUrl,
  onChange,
}: {
  currentUrl: string | null
  /** null = remove photo. */
  onChange: (result: ImageResult | null) => void
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [crop, setCrop] = useState<CropState>(DEFAULT_CROP)
  const [removeBg, setRemoveBg] = useState(false)
  const [tolerance, setTolerance] = useState(38)
  const [bgUncertain, setBgUncertain] = useState(false)
  const [autoDetected, setAutoDetected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  // Live preview at low resolution.
  useEffect(() => {
    if (!image || !canvasRef.current) return
    let frame = drawCrop(image, crop, PREVIEW_W, PREVIEW_H)
    if (removeBg) {
      const result = removePlainBackground(frame, tolerance)
      frame = result.canvas
      setBgUncertain(result.uncertain)
    }
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H)
    ctx.drawImage(frame, 0, 0)
  }, [image, crop, removeBg, tolerance])

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return
    const problem = validateImageFile(file)
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setBusy(true)
    try {
      const img = await loadImageFromFile(file)
      const plain = detectPlainBackground(img)
      setImage(img)
      setCrop(DEFAULT_CROP)
      setRemoveBg(plain)
      setAutoDetected(plain)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that photo.')
    } finally {
      setBusy(false)
    }
  }, [])

  const apply = async () => {
    if (!image) return
    setBusy(true)
    try {
      let canvas = drawCrop(image, crop)
      if (removeBg) canvas = trimTransparent(removePlainBackground(canvas, tolerance).canvas)
      const blob = await canvasToBlob(canvas, removeBg)
      onChange({ blob, url: URL.createObjectURL(blob) })
      URL.revokeObjectURL(image.src)
      setImage(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process the photo.')
    } finally {
      setBusy(false)
    }
  }

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, ox: crop.offsetX, oy: crop.offsetY }
  }
  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const dx = ((e.clientX - drag.current.x) / rect.width) * 2
    const dy = ((e.clientY - drag.current.y) / rect.height) * 2
    setCrop((c) => ({ ...c, offsetX: clamp(drag.current!.ox + dx, -1, 1), offsetY: clamp(drag.current!.oy + dy, -1, 1) }))
  }
  const endDrag = () => {
    drag.current = null
  }

  const inputs = (
    <>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }} />
    </>
  )

  if (image) {
    return (
      <div className="space-y-4">
        {inputs}
        <div className={cn('relative mx-auto aspect-[3/4] w-full max-w-[300px] overflow-hidden rounded-3xl border border-line', removeBg ? 'checkerboard' : 'bg-white')}>
          <canvas
            ref={canvasRef}
            width={PREVIEW_W}
            height={PREVIEW_H}
            className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            role="img"
            aria-label="Photo crop preview. Drag to reposition."
          />
          <span className="pointer-events-none absolute inset-3 rounded-2xl border border-dashed border-white/80 mix-blend-difference" />
        </div>
        <p className="text-center text-xs text-muted">Drag to reposition · cropped to the 3:4 card shape</p>

        <div className="space-y-3 rounded-3xl bg-lavender-50 p-4">
          <label className="block text-sm font-medium">
            Zoom
            <input type="range" min={1} max={3} step={0.05} value={crop.zoom} onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))} className="mt-1 w-full accent-plum" />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={<RotateCw className="h-4 w-4" />} onClick={() => setCrop((c) => ({ ...c, rotation: ((c.rotation + 90) % 360) as CropState['rotation'] }))}>
              Rotate
            </Button>
            <Button size="sm" variant="secondary" icon={<Undo2 className="h-4 w-4" />} onClick={() => setCrop(DEFAULT_CROP)}>
              Reset
            </Button>
          </div>
          <div className="border-t border-line pt-3">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} className="mt-0.5 h-4 w-4 accent-plum" />
              <span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Wand2 className="h-4 w-4 text-lavender-600" /> Remove plain background
                </span>
                <span className="text-xs text-muted">Works best on a single-color wall, bed or floor. Runs on your device — it is not AI segmentation.</span>
              </span>
            </label>
            {removeBg && autoDetected && (
              <p className="mt-2 rounded-2xl bg-white p-2.5 text-xs text-muted">
                We found a plain background and removed it in the preview. Untick the box to keep the original photo.
              </p>
            )}
            {removeBg && (
              <>
                <label className="mt-3 block text-sm font-medium">
                  Strength
                  <input type="range" min={10} max={80} value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} className="mt-1 w-full accent-plum" />
                </label>
                {bgUncertain && (
                  <p className="mt-2 flex gap-2 rounded-2xl bg-white p-2.5 text-xs text-muted">
                    <Info className="h-4 w-4 shrink-0 text-lavender-600" />
                    The background doesn’t look plain, so this result may be inaccurate. Adjust the strength or keep the original photo.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => { URL.revokeObjectURL(image.src); setImage(null) }}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={apply} loading={busy}>
            Use this photo
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {inputs}
      {currentUrl ? (
        <div className="relative mx-auto aspect-[3/4] w-full max-w-[300px] overflow-hidden rounded-3xl border border-line checkerboard">
          <img src={currentUrl} alt="Current photo of this piece" className="h-full w-full object-contain" />
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFile(e.dataTransfer.files?.[0])
          }}
          className={cn(
            'flex aspect-[3/4] w-full max-w-[300px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-6 text-center transition-colors mx-auto',
            dragOver ? 'border-plum bg-lilac' : 'border-lavender-300 bg-lavender-50',
          )}
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-lavender-600 shadow-soft">
            <ImagePlus className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-ink">Drop a photo here</p>
          <p className="text-xs text-muted">JPG, PNG or WebP, up to 12 MB. Lay the piece flat or hang it against a plain background.</p>
        </div>
      )}
      {error && <p role="alert" className="text-center text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" variant="secondary" icon={<ImagePlus className="h-4 w-4" />} onClick={() => fileRef.current?.click()} loading={busy}>
          {currentUrl ? 'Replace photo' : 'Choose photo'}
        </Button>
        <Button size="sm" variant="secondary" className="sm:hidden" icon={<Camera className="h-4 w-4" />} onClick={() => cameraRef.current?.click()}>
          Take photo
        </Button>
        {currentUrl && (
          <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" icon={<Trash2 className="h-4 w-4" />} onClick={() => onChange(null)}>
            Remove photo
          </Button>
        )}
      </div>
    </div>
  )
}
