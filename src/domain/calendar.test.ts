import { describe, expect, it } from 'vitest'
import { makeItem } from '@/test/fixtures'
import { addDays, buildPackingList, canAssign, monthGrid, startOfWeek, toDateKey, weekDays } from './calendar'
import type { Outfit, PlannedOutfit } from './types'

const plan = (id: string, outfitId: string, date: string): PlannedOutfit => ({ id, userId: 'u', outfitId, date, occasion: null, notes: null, createdAt: '', updatedAt: '' })
const outfit = (id: string, ids: string[]): Outfit => ({
  id, userId: 'u', name: id, clothingItemIds: ids, styleTags: [], occasion: null, notes: null, favorite: false, timesWorn: 0, lastWornAt: null,
  parentOutfitId: null, source: 'studio', isSample: false, createdAt: '', updatedAt: '',
})

describe('date handling', () => {
  it('uses local calendar dates and crosses month/year boundaries', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('builds Monday-based weeks and a 6-week month grid', () => {
    expect(startOfWeek('2026-10-29')).toBe('2026-10-26')
    expect(weekDays('2026-10-27')).toHaveLength(7)
    const grid = monthGrid('2026-10-15')
    expect(grid).toHaveLength(42)
    expect(grid[0]).toBe('2026-09-28')
  })
})

describe('calendar assignment', () => {
  const plans = [plan('p1', 'o1', '2026-10-27')]
  it('prevents the same outfit twice on one day', () => {
    expect(canAssign(plans, { outfitId: 'o1', date: '2026-10-27' }).ok).toBe(false)
  })
  it('allows a different outfit, or the same one on another day', () => {
    expect(canAssign(plans, { outfitId: 'o2', date: '2026-10-27' }).ok).toBe(true)
    expect(canAssign(plans, { outfitId: 'o1', date: '2026-10-28' }).ok).toBe(true)
  })
  it('lets a plan be re-saved without flagging itself', () => {
    expect(canAssign(plans, { id: 'p1', outfitId: 'o1', date: '2026-10-27' }).ok).toBe(true)
  })
})

describe('packing list', () => {
  it('de-duplicates pieces across looks within the trip only', () => {
    const top = makeItem('shirts')
    const jeans = makeItem('jeans')
    const skirt = makeItem('skirts')
    const outfits = [outfit('o1', [top.id, jeans.id]), outfit('o2', [top.id, skirt.id, 'deleted-id'])]
    const plans = [plan('a', 'o1', '2026-11-01'), plan('b', 'o2', '2026-11-02'), plan('c', 'o2', '2026-12-01')]
    const list = buildPackingList(plans, outfits, [top, jeans, skirt], '2026-11-01', '2026-11-03')
    expect(list.lookCount).toBe(2)
    expect(list.totalItems).toBe(3)
    expect(list.missingPieces).toBe(1)
    const topEntry = list.groups.find((g) => g.slot === 'top')?.entries[0]
    expect(topEntry?.looks).toBe(2)
  })
})
