/**
 * Client-side image processing for clothing photos: crop to the 3:4 card ratio, downscale,
 * and optionally remove a *plain* background. Background removal here is a local heuristic
 * (edge flood-fill), not an AI segmentation model — the UI labels it accordingly.
 */

export const OUTPUT_WIDTH = 900
export const OUTPUT_HEIGHT = 1200
export const ASPECT = OUTPUT_WIDTH / OUTPUT_HEIGHT

export interface CropState {
  /** 1 = image covers the frame. */
  zoom: number
  /** Pan offset as a fraction of the frame size (-1..1). */
  offsetX: number
  offsetY: number
  rotation: 0 | 90 | 180 | 270
}

export const DEFAULT_CROP: CropState = { zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 }

export function loadImageFromFile(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('This photo could not be read. It may be corrupted or in an unsupported format.'))
    }
    img.src = url
  })
}

/** Draws the cropped, rotated image into a canvas of the given size. */
export function drawCrop(img: HTMLImageElement, crop: CropState, width = OUTPUT_WIDTH, height = OUTPUT_HEIGHT): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Image editing is not supported in this browser.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  const rotated = crop.rotation === 90 || crop.rotation === 270
  const srcW = rotated ? img.naturalHeight : img.naturalWidth
  const srcH = rotated ? img.naturalWidth : img.naturalHeight
  const cover = Math.max(width / srcW, height / srcH) * crop.zoom
  const drawW = srcW * cover
  const drawH = srcH * cover
  const maxX = Math.max(0, (drawW - width) / 2)
  const maxY = Math.max(0, (drawH - height) / 2)

  ctx.save()
  ctx.translate(width / 2 + crop.offsetX * maxX, height / 2 + crop.offsetY * maxY)
  ctx.rotate((crop.rotation * Math.PI) / 180)
  const w = rotated ? drawH : drawW
  const h = rotated ? drawW : drawH
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, -w / 2, -h / 2, w, h)
  ctx.restore()
  return canvas
}

export interface BackgroundResult {
  canvas: HTMLCanvasElement
  /** Share of pixels made transparent. */
  removedRatio: number
  /** True when the result looks unreliable (busy background or nothing removed). */
  uncertain: boolean
}

/**
 * Removes a plain, evenly lit background by flood-filling from the image border with pixels
 * similar to the border color. Works well for clothes photographed on a bed, wall or floor of a
 * single color; it cannot handle busy backgrounds.
 */
export function removePlainBackground(source: HTMLCanvasElement, tolerance = 38): BackgroundResult {
  const { width, height } = source
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Image editing is not supported in this browser.')
  ctx.drawImage(source, 0, 0)
  const image = ctx.getImageData(0, 0, width, height)
  const data = image.data

  // Average border color as the background reference.
  let r = 0, g = 0, b = 0, n = 0
  const sample = (x: number, y: number) => {
    const i = (y * width + x) * 4
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
  }
  for (let x = 0; x < width; x += 4) { sample(x, 0); sample(x, height - 1) }
  for (let y = 0; y < height; y += 4) { sample(0, y); sample(width - 1, y) }
  const bg = [r / n, g / n, b / n]

  const tol2 = tolerance * tolerance * 3
  const visited = new Uint8Array(width * height)
  const stack: number[] = []
  const pushIfBg = (p: number) => {
    if (visited[p]) return
    visited[p] = 1
    const i = p * 4
    const dr = data[i] - bg[0], dg = data[i + 1] - bg[1], db = data[i + 2] - bg[2]
    if (dr * dr + dg * dg + db * db <= tol2) stack.push(p)
  }
  for (let x = 0; x < width; x++) { pushIfBg(x); pushIfBg((height - 1) * width + x) }
  for (let y = 0; y < height; y++) { pushIfBg(y * width); pushIfBg(y * width + width - 1) }

  let removed = 0
  while (stack.length) {
    const p = stack.pop() as number
    data[p * 4 + 3] = 0
    removed++
    const x = p % width
    const y = (p - x) / width
    if (x > 0) pushIfBg(p - 1)
    if (x < width - 1) pushIfBg(p + 1)
    if (y > 0) pushIfBg(p - width)
    if (y < height - 1) pushIfBg(p + width)
  }

  // Soften the cut edge: partially fade pixels next to removed ones.
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x
      if (data[p * 4 + 3] === 0) continue
      const neighbours = (data[(p - 1) * 4 + 3] === 0 ? 1 : 0) + (data[(p + 1) * 4 + 3] === 0 ? 1 : 0) + (data[(p - width) * 4 + 3] === 0 ? 1 : 0) + (data[(p + width) * 4 + 3] === 0 ? 1 : 0)
      if (neighbours >= 2) data[p * 4 + 3] = 150
    }
  }

  ctx.putImageData(image, 0, 0)
  const removedRatio = removed / (width * height)
  return { canvas, removedRatio, uncertain: removedRatio < 0.08 || removedRatio > 0.97 }
}

/**
 * Crops away fully transparent margins (after background removal) so the garment fills its
 * card and preview zone. Returns the source unchanged when nothing meaningful remains.
 */
export function trimTransparent(source: HTMLCanvasElement, padding = 16): HTMLCanvasElement {
  const ctx = source.getContext('2d', { willReadFrequently: true })
  if (!ctx) return source
  const { width, height } = source
  const data = ctx.getImageData(0, 0, width, height).data
  let minX = width, minY = height, maxX = -1, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0 || (maxX - minX) * (maxY - minY) < width * height * 0.02) return source
  const x = Math.max(0, minX - padding)
  const y = Math.max(0, minY - padding)
  const w = Math.min(width, maxX + padding + 1) - x
  const h = Math.min(height, maxY + padding + 1) - y
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  out.getContext('2d')?.drawImage(source, x, y, w, h, 0, 0, w, h)
  return out
}

/** Quick low-resolution check: does this photo have a plain background worth removing? */
export function detectPlainBackground(img: HTMLImageElement): boolean {
  const small = drawCrop(img, DEFAULT_CROP, 150, 200)
  return !removePlainBackground(small, 38).uncertain
}

export function canvasToBlob(canvas: HTMLCanvasElement, transparent: boolean): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Could not process the photo.'))
        // Some browsers silently fall back to PNG when WebP encoding is unsupported — that's fine.
        resolve(blob)
      },
      'image/webp',
      transparent ? 0.9 : 0.85,
    )
  })
}
