import { z } from 'zod'
import { CATEGORY_IDS, getCategory } from './categories'
import { COLORS } from './colors'
import { OCCASIONS } from './occasions'
import { FITS, PATTERNS, SEASONS } from './types'

const colorIds = COLORS.map((c) => c.id) as [string, ...string[]]
const occasionIds = OCCASIONS.map((o) => o.id) as [string, ...string[]]

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .transform((v) => (v.length ? v : null))
    .nullable()
    .optional()
    .transform((v) => v ?? null)

const tag = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(30, 'Tags should be under 30 characters')

/** Validates the user-editable part of a clothing item (form input and imports). */
export const clothingItemInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Give this piece a name').max(80, 'Keep the name under 80 characters'),
    category: z.enum(CATEGORY_IDS, { errorMap: () => ({ message: 'Choose a category' }) }),
    subcategory: z.string().trim().nullable().optional().transform((v) => v || null),
    imageUrl: z.string().nullable().optional().transform((v) => v ?? null),
    colors: z.array(z.enum(colorIds)).min(1, 'Pick at least one color').max(4, 'Choose up to four main colors'),
    pattern: z.enum(PATTERNS).default('solid'),
    styleTags: z.array(tag).max(12, 'Up to 12 style tags').default([]),
    seasons: z.array(z.enum(SEASONS)).default([]),
    occasions: z.array(z.enum(occasionIds)).default([]),
    fit: z.enum(FITS).nullable().optional().transform((v) => v ?? null),
    brand: optionalText(60),
    notes: optionalText(500),
    purchase: z
      .object({
        price: z.number().nonnegative('Price cannot be negative').max(1_000_000).nullable().optional(),
        currency: z.string().max(3).nullable().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date').nullable().optional(),
        store: z.string().trim().max(60).nullable().optional(),
      })
      .nullable()
      .optional()
      .transform((v) => v ?? null),
  })
  .superRefine((value, ctx) => {
    if (value.subcategory) {
      const valid = getCategory(value.category).subcategories.some((s) => s.id === value.subcategory)
      if (!valid) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['subcategory'], message: 'That type does not belong to this category' })
    }
    const tags = value.styleTags
    if (new Set(tags).size !== tags.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['styleTags'], message: 'Remove duplicate tags' })
    }
  })

export type ClothingItemInput = z.input<typeof clothingItemInputSchema>
export type ClothingItemValues = z.output<typeof clothingItemInputSchema>

export const outfitInputSchema = z.object({
  name: z.string().trim().min(1, 'Name your outfit').max(80, 'Keep the name under 80 characters'),
  clothingItemIds: z.array(z.string().min(1)).min(1, 'Add at least one piece'),
  styleTags: z.array(tag).max(12).default([]),
  occasion: z.enum(occasionIds).nullable().optional().transform((v) => v ?? null),
  notes: optionalText(500),
  favorite: z.boolean().default(false),
})

export type OutfitValues = z.output<typeof outfitInputSchema>

export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')

export const plannedOutfitInputSchema = z.object({
  outfitId: z.string().min(1, 'Choose an outfit'),
  date: dateKeySchema,
  occasion: optionalText(60),
  notes: optionalText(300),
})

export type PlannedOutfitValues = z.output<typeof plannedOutfitInputSchema>

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Please choose a JPG, PNG or WebP photo. (HEIC photos can be exported as JPG from your phone.)'
  }
  if (file.size > MAX_IMAGE_BYTES) return 'That photo is larger than 12 MB. Try a smaller or compressed version.'
  if (file.size === 0) return 'That file appears to be empty.'
  return null
}

/** Flattens zod issues into a field → message map for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    if (!out[key]) out[key] = issue.message
  }
  return out
}
