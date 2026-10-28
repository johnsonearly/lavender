export interface OccasionDef {
  id: string
  label: string
  /** 1 = very relaxed, 5 = formal. Used to judge outfit suitability. */
  formality: number
  keywords: readonly string[]
}

export const OCCASIONS: readonly OccasionDef[] = [
  { id: 'casual', label: 'Casual', formality: 1, keywords: ['casual', 'everyday', 'errands', 'weekend', 'hang out', 'relaxed', 'chill'] },
  { id: 'school', label: 'University / class', formality: 1, keywords: ['university', 'uni', 'class', 'school', 'campus', 'lecture', 'college', 'study', 'library'] },
  { id: 'work', label: 'Work / office', formality: 3, keywords: ['work', 'office', 'meeting', 'business', 'presentation', 'workday'] },
  { id: 'interview', label: 'Interview', formality: 4, keywords: ['interview'] },
  { id: 'date', label: 'Date night', formality: 3, keywords: ['date', 'romantic', 'anniversary'] },
  { id: 'dinner', label: 'Dinner out', formality: 3, keywords: ['dinner', 'restaurant'] },
  { id: 'brunch', label: 'Brunch / coffee', formality: 2, keywords: ['brunch', 'lunch', 'coffee', 'cafe', 'café', 'picnic'] },
  { id: 'party', label: 'Party / night out', formality: 3, keywords: ['party', 'night out', 'club', 'birthday', 'drinks', 'concert'] },
  { id: 'church', label: 'Church / service', formality: 3, keywords: ['church', 'sunday service', 'service', 'mosque', 'temple', 'worship', 'mass'] },
  { id: 'wedding', label: 'Wedding guest', formality: 4, keywords: ['wedding', 'ceremony'] },
  { id: 'formal', label: 'Formal event', formality: 5, keywords: ['formal', 'gala', 'black tie', 'cocktail', 'graduation'] },
  { id: 'travel', label: 'Travel', formality: 1, keywords: ['travel', 'flight', 'trip', 'airport', 'vacation', 'holiday', 'road trip'] },
  { id: 'active', label: 'Active / sport', formality: 1, keywords: ['gym', 'workout', 'run', 'yoga', 'hike', 'sport', 'pilates'] },
  { id: 'lounge', label: 'At home', formality: 1, keywords: ['home', 'lounge', 'cozy night', 'movie night'] },
]

const BY_ID = new Map(OCCASIONS.map((o) => [o.id, o]))

export function getOccasion(id: string | null | undefined): OccasionDef | undefined {
  return id ? BY_ID.get(id) : undefined
}

export function occasionLabel(id: string | null | undefined): string {
  if (!id) return 'Any occasion'
  return BY_ID.get(id)?.label ?? id
}
