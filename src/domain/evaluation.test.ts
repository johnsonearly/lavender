import { describe, expect, it } from 'vitest'
import { makeItem } from '@/test/fixtures'
import { analyzeColors, evaluateOutfit, seasonFor } from './evaluation'
import { computeStats, findGaps } from './insights'

describe('styling heuristics', () => {
  it('praises one color against neutrals and flags many colors', () => {
    expect(analyzeColors([makeItem('shirts', { colors: ['purple'] }), makeItem('trousers', { colors: ['black'] })]).note.tone).toBe('good')
    const busy = analyzeColors(['red', 'green', 'yellow', 'blue'].map((c) => makeItem('tops', { colors: [c] })))
    expect(busy.note.tone).toBe('tip')
  })

  it('flags an occasion mismatch and missing shoes', () => {
    const r = evaluateOutfit([makeItem('tshirts', { occasions: ['casual'] }), makeItem('shorts', { occasions: ['casual'] })], { occasion: 'formal' })
    expect(r.notes.some((n) => n.aspect === 'occasion' && n.tone === 'caution')).toBe(true)
    expect(r.notes.some((n) => n.aspect === 'completeness')).toBe(true)
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(100)
  })

  it('only gives weather notes when a forecast is supplied', () => {
    const items = [makeItem('tops', { subcategory: 'camisole' }), makeItem('shorts'), makeItem('shoes', { subcategory: 'sandals' })]
    expect(evaluateOutfit(items).notes.some((n) => n.aspect === 'weather')).toBe(false)
    const cold = { date: '2026-01-01', tempMaxC: 2, tempMinC: -4, precipitationProbability: 80, weatherCode: 63, summary: 'Rain', source: 'test' }
    const notes = evaluateOutfit(items, { weather: cold }).notes.filter((n) => n.aspect === 'weather')
    expect(notes.length).toBe(2)
  })

  it('flips seasons in the southern hemisphere', () => {
    expect(seasonFor(new Date(2026, 6, 1))).toBe('summer')
    expect(seasonFor(new Date(2026, 6, 1), -33)).toBe('winter')
  })
})

describe('insights', () => {
  it('computes stats from real data only', () => {
    const items = [makeItem('shirts', { timesWorn: 3 }), makeItem('shirts'), makeItem('jeans', { colors: ['denim'] })]
    const s = computeStats(items, [])
    expect(s.totalItems).toBe(3)
    expect(s.categories[0]).toMatchObject({ key: 'shirts', count: 2 })
    expect(s.mostWorn).toHaveLength(1)
    expect(s.outfitCount).toBe(0)
  })
  it('does not suggest gaps for tiny wardrobes', () => {
    expect(findGaps([makeItem('shirts')])).toEqual([])
  })
})
