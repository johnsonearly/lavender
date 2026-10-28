import { useId } from 'react'
import { colorHex } from '@/domain/colors'
import type { Pattern } from '@/domain/types'
import { darken, isLight, lighten, mix } from '@/lib/color'
import { GARMENTS, type ArtKind } from '@/rendering/garmentShapes'

export interface GarmentLayerProps {
  art: ArtKind
  colors: string[]
  pattern?: Pattern
}

function palette(colors: string[]) {
  const primaryId = colors[0] ?? 'lilac'
  let base = colorHex(primaryId)
  let secondary = colors[1] ? colorHex(colors[1]) : isLight(base) ? darken(base, 0.35) : lighten(base, 0.5)
  if (primaryId === 'multicolor') {
    base = '#F4CFDC'
    secondary = '#B9A3F0'
  }
  // Very light garments get a slightly deeper outline so they read against the mannequin.
  const stroke = isLight(base) ? darken(base, 0.28) : darken(base, 0.35)
  return { base, secondary, stroke, highlight: lighten(base, 0.35) }
}

function PatternDef({ id, pattern, base, secondary }: { id: string; pattern: Pattern; base: string; secondary: string }) {
  switch (pattern) {
    case 'striped':
      return (
        <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill={base} />
          <rect width="10" height="3.6" fill={secondary} />
        </pattern>
      )
    case 'floral':
      return (
        <pattern id={id} width="26" height="26" patternUnits="userSpaceOnUse">
          <rect width="26" height="26" fill={base} />
          {[[7, 7], [20, 19]].map(([x, y]) => (
            <g key={`${x}-${y}`} fill={secondary}>
              <circle cx={x - 2.6} cy={y} r="2.2" />
              <circle cx={x + 2.6} cy={y} r="2.2" />
              <circle cx={x} cy={y - 2.6} r="2.2" />
              <circle cx={x} cy={y + 2.6} r="2.2" />
              <circle cx={x} cy={y} r="1.5" fill={mix(base, '#ffffff', 0.6)} />
            </g>
          ))}
          <path d="M18 6 q3 -3 5 0 q-3 2 -5 0Z M4 20 q3 -3 5 0 q-3 2 -5 0Z" fill={mix(secondary, '#4b6b4b', 0.45)} />
        </pattern>
      )
    case 'plaid':
      return (
        <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse">
          <rect width="22" height="22" fill={base} />
          <rect x="7" width="8" height="22" fill={secondary} opacity=".45" />
          <rect y="7" width="22" height="8" fill={secondary} opacity=".45" />
          <path d="M0 3 H22 M3 0 V22" stroke={darken(secondary, 0.2)} strokeWidth=".8" opacity=".6" />
        </pattern>
      )
    case 'checked':
      return (
        <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill={base} />
          <rect width="6" height="12" fill={secondary} opacity=".5" />
          <rect width="12" height="6" fill={secondary} opacity=".5" />
        </pattern>
      )
    case 'polka-dot':
      return (
        <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill={base} />
          <circle cx="3" cy="3" r="1.8" fill={secondary} />
          <circle cx="9" cy="9" r="1.8" fill={secondary} />
        </pattern>
      )
    case 'animal':
      return (
        <pattern id={id} width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill={base} />
          <path d="M4 5 q3 -2 5 1 q-1 3 -4 2Z M15 14 q4 -1 4 3 q-3 2 -5 -1Z M16 3 q2 0 2 2 q-2 1 -3 -1Z M5 17 q2 -1 3 1 q-1 2 -3 0Z" fill={secondary} />
        </pattern>
      )
    case 'textured':
      return (
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill={base} />
          <path d="M0 6 L3 0 L6 6" fill="none" stroke={darken(base, 0.12)} strokeWidth=".7" />
        </pattern>
      )
    default:
      return (
        <pattern id={id} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill={base} />
        </pattern>
      )
  }
}

function GraphicMotif({ x, y, color }: { x: number; y: number; color: string }) {
  return <path transform={`translate(${x - 9} ${y - 8}) scale(0.75)`} d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.1 4.4 2.6.8-1.5 2.3-2.6 4.4-2.6 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21Z" fill={color} />
}

/** Renders one garment in mannequin coordinates (no <svg> wrapper). */
export function GarmentLayer({ art, colors, pattern = 'solid' }: GarmentLayerProps) {
  const uid = useId().replace(/:/g, '')
  const shape = GARMENTS[art]
  const { base, secondary, stroke, highlight } = palette(colors)
  const patternId = `p-${uid}`
  const shadeId = `s-${uid}`
  const fill = pattern === 'solid' || pattern === 'graphic' || pattern === 'other' ? base : `url(#${patternId})`

  const content = (
    <>
      {shape.straps?.map((d, i) => (
        <path key={`st-${i}`} d={d} fill="none" stroke={stroke} strokeWidth={art === 'necklace' || art === 'sunglasses' ? 1.4 : 3} strokeLinecap="round" />
      ))}
      {shape.body.map((d, i) => (
        <g key={`b-${i}`}>
          <path d={d} fill={fill} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
          <path d={d} fill={`url(#${shadeId})`} />
        </g>
      ))}
      {shape.details?.map((d, i) => (
        <path key={`d-${i}`} d={d} fill="none" stroke={stroke} strokeWidth=".8" strokeLinecap="round" opacity=".55" />
      ))}
      {shape.accents?.map((d, i) => (
        <path key={`a-${i}`} d={d} fill={art === 'blouse' || art === 'hairbow' ? darken(base, 0.08) : stroke} stroke={stroke} strokeWidth=".5" />
      ))}
      {pattern === 'graphic' && shape.motif && <GraphicMotif x={shape.motif[0]} y={shape.motif[1]} color={secondary} />}
    </>
  )

  return (
    <g>
      <defs>
        <PatternDef id={patternId} pattern={pattern} base={base} secondary={secondary} />
        <linearGradient id={shadeId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#2a1d3a" stopOpacity=".12" />
          <stop offset=".35" stopColor={highlight} stopOpacity=".1" />
          <stop offset=".65" stopColor={highlight} stopOpacity=".04" />
          <stop offset="1" stopColor="#2a1d3a" stopOpacity=".14" />
        </linearGradient>
      </defs>
      {content}
      {shape.mirror && <g transform="matrix(-1 0 0 1 240 0)">{content}</g>}
    </g>
  )
}

/** Stand-alone illustration cropped to the garment, used for thumbnails without photos. */
export function GarmentArt({ art, colors, pattern, className, title }: GarmentLayerProps & { className?: string; title?: string }) {
  const [x, y, w, h] = GARMENTS[art].bbox
  const pad = Math.max(w, h) * 0.12
  return (
    <svg
      viewBox={`${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}`}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      preserveAspectRatio="xMidYMid meet"
    >
      <GarmentLayer art={art} colors={colors} pattern={pattern} />
    </svg>
  )
}
