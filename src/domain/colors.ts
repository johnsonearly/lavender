export interface ColorDef {
  id: string
  label: string
  hex: string
  /** Neutrals pair with almost anything. */
  neutral: boolean
  /** Hue angle for chromatic colors; null for neutrals and metallics. */
  hue: number | null
}

export const COLORS: readonly ColorDef[] = [
  { id: 'black', label: 'Black', hex: '#1F1B24', neutral: true, hue: null },
  { id: 'white', label: 'White', hex: '#FBFAF8', neutral: true, hue: null },
  { id: 'cream', label: 'Cream', hex: '#F1E6D4', neutral: true, hue: null },
  { id: 'beige', label: 'Beige', hex: '#D8C1A2', neutral: true, hue: null },
  { id: 'camel', label: 'Camel', hex: '#B9895A', neutral: true, hue: null },
  { id: 'brown', label: 'Brown', hex: '#6B4934', neutral: true, hue: null },
  { id: 'grey', label: 'Grey', hex: '#A3A0A8', neutral: true, hue: null },
  { id: 'charcoal', label: 'Charcoal', hex: '#4A4650', neutral: true, hue: null },
  { id: 'navy', label: 'Navy', hex: '#26355A', neutral: true, hue: null },
  { id: 'denim', label: 'Denim', hex: '#5A78A0', neutral: true, hue: null },
  { id: 'light-blue', label: 'Light blue', hex: '#A9C6E8', neutral: false, hue: 210 },
  { id: 'blue', label: 'Blue', hex: '#3F6FC2', neutral: false, hue: 222 },
  { id: 'green', label: 'Green', hex: '#3F8A5B', neutral: false, hue: 142 },
  { id: 'olive', label: 'Olive', hex: '#707443', neutral: false, hue: 64 },
  { id: 'sage', label: 'Sage', hex: '#A8B89B', neutral: false, hue: 95 },
  { id: 'yellow', label: 'Yellow', hex: '#F1D35E', neutral: false, hue: 50 },
  { id: 'mustard', label: 'Mustard', hex: '#C9A13B', neutral: false, hue: 44 },
  { id: 'orange', label: 'Orange', hex: '#E68A4F', neutral: false, hue: 24 },
  { id: 'red', label: 'Red', hex: '#C73B42', neutral: false, hue: 357 },
  { id: 'burgundy', label: 'Burgundy', hex: '#7A2338', neutral: false, hue: 345 },
  { id: 'pink', label: 'Pink', hex: '#EE9DC0', neutral: false, hue: 330 },
  { id: 'blush', label: 'Blush', hex: '#F4CFDC', neutral: false, hue: 340 },
  { id: 'purple', label: 'Purple', hex: '#7A50B5', neutral: false, hue: 270 },
  { id: 'lavender', label: 'Lavender', hex: '#B9A3F0', neutral: false, hue: 260 },
  { id: 'lilac', label: 'Lilac', hex: '#DCCDF6', neutral: false, hue: 265 },
  { id: 'gold', label: 'Gold', hex: '#CDAA5C', neutral: true, hue: null },
  { id: 'silver', label: 'Silver', hex: '#C4C8CF', neutral: true, hue: null },
  { id: 'multicolor', label: 'Multicolor', hex: '#C9A7E0', neutral: false, hue: null },
]

const BY_ID = new Map(COLORS.map((c) => [c.id, c]))

export function getColor(id: string): ColorDef | undefined {
  return BY_ID.get(id)
}

export function colorHex(id: string | undefined, fallback = '#D9CDE6'): string {
  return (id && BY_ID.get(id)?.hex) || fallback
}

export function colorLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id
}

export function isNeutral(id: string): boolean {
  return BY_ID.get(id)?.neutral ?? false
}

export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

export type HueRelation = 'same' | 'analogous' | 'complementary' | 'contrast' | 'tension'

export function hueRelation(a: number, b: number): HueRelation {
  const d = hueDistance(a, b)
  if (d <= 15) return 'same'
  if (d <= 45) return 'analogous'
  if (d >= 150) return 'complementary'
  if (d >= 100) return 'contrast'
  return 'tension'
}
