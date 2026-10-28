import { describe, expect, it } from 'vitest'
import { clothingItemInputSchema, fieldErrors, validateImageFile } from './schemas'

const valid = { name: 'White blouse', category: 'shirts', subcategory: 'blouse', colors: ['white'], pattern: 'solid', styleTags: ['feminine'], seasons: ['spring'], occasions: ['work'] }

describe('clothing item validation', () => {
  it('accepts a valid item and normalises optional text', () => {
    const r = clothingItemInputSchema.safeParse({ ...valid, brand: '  ', notes: 'Hand wash' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.brand).toBeNull()
      expect(r.data.notes).toBe('Hand wash')
      expect(r.data.purchase).toBeNull()
    }
  })

  it('requires a name, category and at least one color', () => {
    const r = clothingItemInputSchema.safeParse({ ...valid, name: ' ', category: undefined, colors: [] })
    expect(r.success).toBe(false)
    if (!r.success) {
      const errs = fieldErrors(r.error)
      expect(errs.name).toMatch(/name/i)
      expect(errs.category).toBeDefined()
      expect(errs.colors).toMatch(/color/i)
    }
  })

  it('rejects a subcategory from another category', () => {
    const r = clothingItemInputSchema.safeParse({ ...valid, subcategory: 'sneakers' })
    expect(r.success).toBe(false)
  })

  it('rejects unknown colors, more than four colors and duplicate tags', () => {
    expect(clothingItemInputSchema.safeParse({ ...valid, colors: ['neon'] }).success).toBe(false)
    expect(clothingItemInputSchema.safeParse({ ...valid, colors: ['white', 'black', 'red', 'blue', 'green'] }).success).toBe(false)
    expect(clothingItemInputSchema.safeParse({ ...valid, styleTags: ['chic', 'Chic'] }).success).toBe(false)
  })

  it('rejects a negative price', () => {
    expect(clothingItemInputSchema.safeParse({ ...valid, purchase: { price: -5 } }).success).toBe(false)
  })
})

describe('image file validation', () => {
  it('accepts supported images within the size limit', () => {
    expect(validateImageFile({ type: 'image/jpeg', size: 2_000_000 })).toBeNull()
  })
  it('rejects unsupported types, empty and oversized files', () => {
    expect(validateImageFile({ type: 'image/heic', size: 1000 })).toMatch(/JPG/)
    expect(validateImageFile({ type: 'image/png', size: 0 })).toMatch(/empty/)
    expect(validateImageFile({ type: 'image/png', size: 50 * 1024 * 1024 })).toMatch(/12 MB/)
  })
})
