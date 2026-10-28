import type { SupabaseClient } from '@supabase/supabase-js'
import type { CategoryId } from '@/domain/categories'
import {
  DEFAULT_SETTINGS,
  type ClothingItem,
  type Fit,
  type Outfit,
  type OutfitSource,
  type Pattern,
  type PlannedOutfit,
  type PreferenceStrength,
  type PurchaseInfo,
  type Season,
  type UserProfile,
  type UserSettings,
} from '@/domain/types'
import { DataAccessError, type DataStore } from './store'

export const IMAGE_BUCKET = 'wardrobe-images'
const SIGNED_URL_TTL = 60 * 60 * 6

interface ProfileRow {
  id: string
  display_name: string
  favorite_colors: string[]
  avoided_colors: string[]
  styling_goals: string[]
  preferred_categories: string[]
  typical_occasions: string[]
  preferred_fit: Fit | null
  budget_amount: number | null
  budget_currency: string | null
  settings: Partial<UserSettings> | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

interface ItemRow {
  id: string
  user_id: string
  name: string
  category: CategoryId
  subcategory: string | null
  image_path: string | null
  colors: string[]
  pattern: Pattern
  style_tags: string[]
  seasons: Season[]
  occasions: string[]
  fit: Fit | null
  favorite: boolean
  times_worn: number
  last_worn_at: string | null
  brand: string | null
  notes: string | null
  purchase: PurchaseInfo | null
  is_sample: boolean
  created_at: string
  updated_at: string
}

interface OutfitRow {
  id: string
  user_id: string
  name: string
  style_tags: string[]
  occasion: string | null
  notes: string | null
  favorite: boolean
  times_worn: number
  last_worn_at: string | null
  parent_outfit_id: string | null
  source: OutfitSource
  is_sample: boolean
  created_at: string
  updated_at: string
  outfit_items?: { item_id: string; position: number }[]
}

interface PlanRow {
  id: string
  user_id: string
  outfit_id: string
  date: string
  occasion: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

function check<T>(result: { data: T | null; error: { message: string } | null }, action: string): T {
  if (result.error) throw new DataAccessError(`Could not ${action}: ${result.error.message}`, result.error)
  return result.data as T
}

/** Postgres + Storage implementation. Row-level security enforces ownership server-side. */
export class SupabaseStore implements DataStore {
  readonly mode = 'supabase' as const

  constructor(private readonly client: SupabaseClient, readonly userId: string) {}

  async getProfile(): Promise<UserProfile | null> {
    const row = check(await this.client.from('profiles').select('*').eq('id', this.userId).maybeSingle<ProfileRow>(), 'load your profile')
    if (!row) return null
    const prefs = check(
      await this.client.from('style_preferences').select('aesthetic, preference_strength').eq('user_id', this.userId),
      'load style preferences',
    ) as { aesthetic: string; preference_strength: PreferenceStrength }[]
    return {
      id: row.id,
      displayName: row.display_name,
      stylePreferences: prefs.map((p) => ({ aesthetic: p.aesthetic, preferenceStrength: p.preference_strength })),
      favoriteColors: row.favorite_colors,
      avoidedColors: row.avoided_colors,
      stylingGoals: row.styling_goals,
      preferredCategories: row.preferred_categories as CategoryId[],
      typicalOccasions: row.typical_occasions,
      preferredFit: row.preferred_fit,
      budget: row.budget_amount !== null && row.budget_currency ? { amount: Number(row.budget_amount), currency: row.budget_currency } : null,
      settings: { ...DEFAULT_SETTINGS, ...(row.settings ?? {}) },
      onboardingCompleted: row.onboarding_completed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    if (profile.id !== this.userId) throw new DataAccessError('Refusing to write another user’s profile.')
    const row: Omit<ProfileRow, 'created_at'> = {
      id: profile.id,
      display_name: profile.displayName,
      favorite_colors: profile.favoriteColors,
      avoided_colors: profile.avoidedColors,
      styling_goals: profile.stylingGoals,
      preferred_categories: profile.preferredCategories,
      typical_occasions: profile.typicalOccasions,
      preferred_fit: profile.preferredFit,
      budget_amount: profile.budget?.amount ?? null,
      budget_currency: profile.budget?.currency ?? null,
      settings: profile.settings,
      onboarding_completed: profile.onboardingCompleted,
      updated_at: profile.updatedAt,
    }
    check(await this.client.from('profiles').upsert(row), 'save your profile')
    check(await this.client.from('style_preferences').delete().eq('user_id', this.userId), 'update style preferences')
    if (profile.stylePreferences.length) {
      check(
        await this.client.from('style_preferences').insert(
          profile.stylePreferences.map((p) => ({ user_id: this.userId, aesthetic: p.aesthetic, preference_strength: p.preferenceStrength })),
        ),
        'save style preferences',
      )
    }
    return profile
  }

  async listItems(): Promise<ClothingItem[]> {
    const rows = check(
      await this.client.from('clothing_items').select('*').eq('user_id', this.userId).order('created_at', { ascending: false }),
      'load your wardrobe',
    ) as ItemRow[]
    const paths = rows.map((r) => r.image_path).filter((p): p is string => Boolean(p))
    const urls = new Map<string, string>()
    if (paths.length) {
      const signed = check(await this.client.storage.from(IMAGE_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL), 'load photos')
      for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl)
    }
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      category: r.category,
      subcategory: r.subcategory,
      imageUrl: r.image_path ? urls.get(r.image_path) ?? null : null,
      imagePath: r.image_path,
      colors: r.colors,
      pattern: r.pattern,
      styleTags: r.style_tags,
      seasons: r.seasons,
      occasions: r.occasions,
      fit: r.fit,
      favorite: r.favorite,
      timesWorn: r.times_worn,
      lastWornAt: r.last_worn_at,
      brand: r.brand,
      notes: r.notes,
      purchase: r.purchase,
      isSample: r.is_sample,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  }

  async saveItems(items: ClothingItem[]): Promise<void> {
    if (!items.length) return
    const rows: ItemRow[] = items.map((i) => {
      if (i.userId !== this.userId) throw new DataAccessError('Refusing to write a record owned by another user.')
      return {
        id: i.id, user_id: i.userId, name: i.name, category: i.category, subcategory: i.subcategory, image_path: i.imagePath,
        colors: i.colors, pattern: i.pattern, style_tags: i.styleTags, seasons: i.seasons, occasions: i.occasions, fit: i.fit,
        favorite: i.favorite, times_worn: i.timesWorn, last_worn_at: i.lastWornAt, brand: i.brand, notes: i.notes,
        purchase: i.purchase, is_sample: i.isSample, created_at: i.createdAt, updated_at: i.updatedAt,
      }
    })
    check(await this.client.from('clothing_items').upsert(rows), 'save clothing')
  }

  async deleteItem(id: string): Promise<void> {
    const row = check(
      await this.client.from('clothing_items').select('image_path').eq('id', id).eq('user_id', this.userId).maybeSingle<{ image_path: string | null }>(),
      'find the item',
    )
    // outfit_items rows cascade via foreign key.
    check(await this.client.from('clothing_items').delete().eq('id', id).eq('user_id', this.userId), 'delete the item')
    await this.removeImage(row?.image_path ?? null)
  }

  async listOutfits(): Promise<Outfit[]> {
    const rows = check(
      await this.client.from('outfits').select('*, outfit_items(item_id, position)').eq('user_id', this.userId),
      'load outfits',
    ) as OutfitRow[]
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      clothingItemIds: [...(r.outfit_items ?? [])].sort((a, b) => a.position - b.position).map((x) => x.item_id),
      styleTags: r.style_tags,
      occasion: r.occasion,
      notes: r.notes,
      favorite: r.favorite,
      timesWorn: r.times_worn,
      lastWornAt: r.last_worn_at,
      parentOutfitId: r.parent_outfit_id,
      source: r.source,
      isSample: r.is_sample,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  }

  async saveOutfits(outfits: Outfit[]): Promise<void> {
    if (!outfits.length) return
    const rows: OutfitRow[] = outfits.map((o) => {
      if (o.userId !== this.userId) throw new DataAccessError('Refusing to write a record owned by another user.')
      return {
        id: o.id, user_id: o.userId, name: o.name, style_tags: o.styleTags, occasion: o.occasion, notes: o.notes,
        favorite: o.favorite, times_worn: o.timesWorn, last_worn_at: o.lastWornAt, parent_outfit_id: o.parentOutfitId,
        source: o.source, is_sample: o.isSample, created_at: o.createdAt, updated_at: o.updatedAt,
      }
    })
    check(await this.client.from('outfits').upsert(rows), 'save outfits')
    const ids = outfits.map((o) => o.id)
    check(await this.client.from('outfit_items').delete().in('outfit_id', ids), 'update outfit pieces')
    const links = outfits.flatMap((o) => o.clothingItemIds.map((itemId, position) => ({ outfit_id: o.id, item_id: itemId, user_id: this.userId, position })))
    if (links.length) check(await this.client.from('outfit_items').insert(links), 'save outfit pieces')
  }

  async deleteOutfit(id: string): Promise<void> {
    // planned_outfits rows cascade via foreign key.
    check(await this.client.from('outfits').delete().eq('id', id).eq('user_id', this.userId), 'delete the outfit')
  }

  async listPlans(): Promise<PlannedOutfit[]> {
    const rows = check(await this.client.from('planned_outfits').select('*').eq('user_id', this.userId), 'load your calendar') as PlanRow[]
    return rows.map((r) => ({
      id: r.id, userId: r.user_id, outfitId: r.outfit_id, date: r.date, occasion: r.occasion, notes: r.notes,
      createdAt: r.created_at, updatedAt: r.updated_at,
    }))
  }

  async savePlans(plans: PlannedOutfit[]): Promise<void> {
    if (!plans.length) return
    const rows: PlanRow[] = plans.map((p) => {
      if (p.userId !== this.userId) throw new DataAccessError('Refusing to write a record owned by another user.')
      return { id: p.id, user_id: p.userId, outfit_id: p.outfitId, date: p.date, occasion: p.occasion, notes: p.notes, created_at: p.createdAt, updated_at: p.updatedAt }
    })
    check(await this.client.from('planned_outfits').upsert(rows), 'save your plan')
  }

  async deletePlan(id: string): Promise<void> {
    check(await this.client.from('planned_outfits').delete().eq('id', id).eq('user_id', this.userId), 'remove the plan')
  }

  async storeImage(blob: Blob, itemId: string): Promise<{ imageUrl: string; imagePath: string | null }> {
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp'
    const path = `${this.userId}/${itemId}-${Date.now()}.${ext}`
    check(await this.client.storage.from(IMAGE_BUCKET).upload(path, blob, { contentType: blob.type, upsert: false }), 'upload the photo')
    const signed = check(await this.client.storage.from(IMAGE_BUCKET).createSignedUrl(path, SIGNED_URL_TTL), 'prepare the photo')
    return { imageUrl: signed.signedUrl, imagePath: path }
  }

  async removeImage(imagePath: string | null): Promise<void> {
    if (!imagePath || !imagePath.startsWith(`${this.userId}/`)) return
    await this.client.storage.from(IMAGE_BUCKET).remove([imagePath])
  }

  async deleteAllData(): Promise<void> {
    const files = check(await this.client.storage.from(IMAGE_BUCKET).list(this.userId, { limit: 1000 }), 'list photos')
    if (files.length) await this.client.storage.from(IMAGE_BUCKET).remove(files.map((f) => `${this.userId}/${f.name}`))
    check(await this.client.from('planned_outfits').delete().eq('user_id', this.userId), 'delete plans')
    check(await this.client.from('outfits').delete().eq('user_id', this.userId), 'delete outfits')
    check(await this.client.from('clothing_items').delete().eq('user_id', this.userId), 'delete clothing')
    check(await this.client.from('style_preferences').delete().eq('user_id', this.userId), 'delete preferences')
    check(await this.client.from('profiles').delete().eq('id', this.userId), 'delete profile')
  }
}
