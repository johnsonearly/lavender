import type { ClothingItem, Outfit, PlannedOutfit, UserProfile } from '@/domain/types'

/**
 * Persistence boundary. Every implementation is scoped to a single user: it must never
 * return or modify records that belong to someone else.
 */
export interface DataStore {
  readonly mode: 'local' | 'supabase'
  readonly userId: string

  getProfile(): Promise<UserProfile | null>
  saveProfile(profile: UserProfile): Promise<UserProfile>

  listItems(): Promise<ClothingItem[]>
  saveItems(items: ClothingItem[]): Promise<void>
  /** Deletes an item and removes it from any outfits that reference it. */
  deleteItem(id: string): Promise<void>

  listOutfits(): Promise<Outfit[]>
  saveOutfits(outfits: Outfit[]): Promise<void>
  /** Deletes an outfit and any calendar plans that use it. */
  deleteOutfit(id: string): Promise<void>

  listPlans(): Promise<PlannedOutfit[]>
  savePlans(plans: PlannedOutfit[]): Promise<void>
  deletePlan(id: string): Promise<void>

  /** Stores a processed clothing photo and returns how to reference it. */
  storeImage(blob: Blob, itemId: string): Promise<{ imageUrl: string; imagePath: string | null }>
  removeImage(imagePath: string | null): Promise<void>

  /** Removes every record (and image) owned by this user. */
  deleteAllData(): Promise<void>
}

export class DataAccessError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'DataAccessError'
  }
}
