import { slotFor, SLOT_LABELS, type Slot } from './categories'
import { SLOT_ORDER } from './outfitRules'
import type { ClothingItem, Outfit, PlannedOutfit } from './types'

/** All calendar dates are local "YYYY-MM-DD" strings to avoid timezone drift. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

/** Monday-based week start. */
export function startOfWeek(key: string): string {
  const d = parseDateKey(key)
  const offset = (d.getDay() + 6) % 7
  return addDays(key, -offset)
}

export function weekDays(key: string): string[] {
  const start = startOfWeek(key)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** 6×7 grid of date keys covering the month containing `key`. */
export function monthGrid(key: string): string[] {
  const d = parseDateKey(key)
  const first = toDateKey(new Date(d.getFullYear(), d.getMonth(), 1))
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export function sameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / 86_400_000)
}

export function dateRange(from: string, to: string): string[] {
  const n = daysBetween(from, to)
  if (n < 0) return []
  return Array.from({ length: n + 1 }, (_, i) => addDays(from, i))
}

export function formatDateKey(key: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }): string {
  return parseDateKey(key).toLocaleDateString(undefined, opts)
}

export interface AssignmentCheck {
  ok: boolean
  reason?: string
}

/** Prevents accidental duplicates: the same outfit twice on one date. */
export function canAssign(plans: readonly PlannedOutfit[], candidate: { outfitId: string; date: string; id?: string }): AssignmentCheck {
  const duplicate = plans.find((p) => p.date === candidate.date && p.outfitId === candidate.outfitId && p.id !== candidate.id)
  if (duplicate) return { ok: false, reason: 'This outfit is already planned for that day.' }
  const sameDay = plans.filter((p) => p.date === candidate.date && p.id !== candidate.id)
  if (sameDay.length >= 6) return { ok: false, reason: 'That day already has six looks planned.' }
  return { ok: true }
}

export function plansByDate(plans: readonly PlannedOutfit[]): Map<string, PlannedOutfit[]> {
  const map = new Map<string, PlannedOutfit[]>()
  for (const p of [...plans].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    map.set(p.date, [...(map.get(p.date) ?? []), p])
  }
  return map
}

export interface PackingEntry {
  item: ClothingItem
  /** Number of planned looks that use this piece. */
  looks: number
  dates: string[]
}

export interface PackingList {
  groups: { slot: Slot; label: string; entries: PackingEntry[] }[]
  totalItems: number
  lookCount: number
  missingPieces: number
}

/** Builds a de-duplicated packing list from looks planned within a date range. */
export function buildPackingList(
  plans: readonly PlannedOutfit[],
  outfits: readonly Outfit[],
  items: readonly ClothingItem[],
  from: string,
  to: string,
): PackingList {
  const outfitById = new Map(outfits.map((o) => [o.id, o]))
  const itemById = new Map(items.map((i) => [i.id, i]))
  const entries = new Map<string, PackingEntry>()
  let lookCount = 0
  let missingPieces = 0

  for (const plan of plans) {
    if (plan.date < from || plan.date > to) continue
    const outfit = outfitById.get(plan.outfitId)
    if (!outfit) continue
    lookCount++
    for (const id of outfit.clothingItemIds) {
      const item = itemById.get(id)
      if (!item) {
        missingPieces++
        continue
      }
      const entry = entries.get(id) ?? { item, looks: 0, dates: [] }
      entry.looks++
      if (!entry.dates.includes(plan.date)) entry.dates.push(plan.date)
      entries.set(id, entry)
    }
  }

  const bySlot = new Map<Slot, PackingEntry[]>()
  for (const entry of entries.values()) {
    const slot = slotFor(entry.item)
    bySlot.set(slot, [...(bySlot.get(slot) ?? []), entry])
  }
  const groups = SLOT_ORDER.filter((s) => bySlot.has(s)).map((slot) => ({
    slot,
    label: SLOT_LABELS[slot],
    entries: (bySlot.get(slot) ?? []).sort((a, b) => b.looks - a.looks),
  }))
  return { groups, totalItems: entries.size, lookCount, missingPieces }
}
