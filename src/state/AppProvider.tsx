import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createSampleWardrobe } from '@/data/sampleData'
import type { DataStore } from '@/data/store'
import { canAssign, todayKey } from '@/domain/calendar'
import { applyItemValues, duplicateOutfitRecord, newItem, newOutfit, newPlan, newProfile, recordWear } from '@/domain/records'
import type { ClothingItemValues, OutfitValues, PlannedOutfitValues } from '@/domain/schemas'
import type { ClothingItem, Outfit, OutfitSource, PlannedOutfit, UserProfile } from '@/domain/types'
import type { WeatherDay } from '@/domain/weather'
import { createId, nowIso } from '@/lib/utils'
import { fetchForecast } from '@/services/weather'

export type WeatherState =
  | { status: 'off' }
  | { status: 'loading' }
  | { status: 'ready'; days: WeatherDay[]; locationLabel: string }
  | { status: 'error'; message: string }

export interface ImageChange {
  blob: Blob | null
}

interface AppContextValue {
  mode: DataStore['mode']
  userId: string
  status: 'loading' | 'ready' | 'error'
  loadError: string | null
  reload: () => void
  profile: UserProfile | null
  items: ClothingItem[]
  outfits: Outfit[]
  plans: PlannedOutfit[]
  weather: WeatherState
  todayWeather: WeatherDay | null

  updateProfile: (patch: Partial<UserProfile>) => Promise<UserProfile>

  addItem: (values: ClothingItemValues, image: Blob | null) => Promise<ClothingItem>
  updateItem: (id: string, values: ClothingItemValues, image?: ImageChange) => Promise<ClothingItem>
  deleteItem: (id: string) => Promise<void>
  toggleItemFavorite: (id: string) => Promise<void>

  saveOutfit: (values: OutfitValues, opts?: { id?: string; source?: OutfitSource; parentOutfitId?: string | null }) => Promise<Outfit>
  duplicateOutfit: (id: string, asVariant: boolean) => Promise<Outfit>
  deleteOutfit: (id: string) => Promise<void>
  toggleOutfitFavorite: (id: string) => Promise<void>
  markOutfitWorn: (id: string) => Promise<void>

  addPlan: (values: PlannedOutfitValues) => Promise<PlannedOutfit>
  updatePlan: (id: string, values: PlannedOutfitValues) => Promise<PlannedOutfit>
  deletePlan: (id: string) => Promise<void>

  loadSampleWardrobe: () => Promise<number>
  removeSampleData: () => Promise<number>
  renameTag: (from: string, to: string) => Promise<number>
  deleteTag: (tag: string) => Promise<number>
  exportData: () => string
  deleteAllData: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ store, children }: { store: DataStore; children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [items, setItems] = useState<ClothingItem[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [plans, setPlans] = useState<PlannedOutfit[]>([])
  const [weather, setWeather] = useState<WeatherState>({ status: 'off' })
  const [reloadToken, setReloadToken] = useState(0)

  // Refs give async actions the latest state without re-creating every callback.
  const state = useRef({ profile, items, outfits, plans })
  state.current = { profile, items, outfits, plans }

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    Promise.all([store.getProfile(), store.listItems(), store.listOutfits(), store.listPlans()])
      .then(([p, i, o, pl]) => {
        if (cancelled) return
        setProfile(p)
        setItems(i)
        setOutfits(o)
        setPlans(pl)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : 'Something went wrong loading your wardrobe.')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [store, reloadToken])

  const weatherSettings = profile?.settings
  useEffect(() => {
    const loc = weatherSettings?.weatherLocation
    if (!weatherSettings?.weatherEnabled || !loc) {
      setWeather({ status: 'off' })
      return
    }
    const ctrl = new AbortController()
    setWeather({ status: 'loading' })
    fetchForecast(loc, ctrl.signal)
      .then((days) => setWeather({ status: 'ready', days, locationLabel: loc.label }))
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return
        setWeather({ status: 'error', message: err instanceof Error ? err.message : 'Weather unavailable' })
      })
    return () => ctrl.abort()
  }, [weatherSettings?.weatherEnabled, weatherSettings?.weatherLocation])

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      const base = state.current.profile ?? newProfile(store.userId)
      const next: UserProfile = { ...base, ...patch, id: store.userId, updatedAt: nowIso() }
      await store.saveProfile(next)
      setProfile(next)
      return next
    },
    [store],
  )

  const addItem = useCallback(
    async (values: ClothingItemValues, image: Blob | null) => {
      const id = createId()
      let item = newItem(store.userId, { ...values, imageUrl: null }, id)
      if (image) {
        const stored = await store.storeImage(image, id)
        item = { ...item, imageUrl: stored.imageUrl, imagePath: stored.imagePath }
      }
      try {
        await store.saveItems([item])
      } catch (err) {
        await store.removeImage(item.imagePath)
        throw err
      }
      setItems((all) => [item, ...all])
      return item
    },
    [store],
  )

  const updateItem = useCallback(
    async (id: string, values: ClothingItemValues, image?: ImageChange) => {
      const existing = state.current.items.find((i) => i.id === id)
      if (!existing) throw new Error('This item no longer exists.')
      let next = applyItemValues(existing, { ...values, imageUrl: existing.imageUrl })
      const oldPath = existing.imagePath
      if (image) {
        if (image.blob) {
          const stored = await store.storeImage(image.blob, id)
          next = { ...next, imageUrl: stored.imageUrl, imagePath: stored.imagePath }
        } else next = { ...next, imageUrl: null, imagePath: null }
      }
      await store.saveItems([next])
      if (image && oldPath && oldPath !== next.imagePath) await store.removeImage(oldPath).catch(() => undefined)
      setItems((all) => all.map((i) => (i.id === id ? next : i)))
      return next
    },
    [store],
  )

  const deleteItem = useCallback(
    async (id: string) => {
      await store.deleteItem(id)
      setItems((all) => all.filter((i) => i.id !== id))
      setOutfits((all) => all.map((o) => (o.clothingItemIds.includes(id) ? { ...o, clothingItemIds: o.clothingItemIds.filter((x) => x !== id) } : o)))
    },
    [store],
  )

  const toggleItemFavorite = useCallback(
    async (id: string) => {
      const item = state.current.items.find((i) => i.id === id)
      if (!item) return
      const next = { ...item, favorite: !item.favorite, updatedAt: nowIso() }
      await store.saveItems([next])
      setItems((all) => all.map((i) => (i.id === id ? next : i)))
    },
    [store],
  )

  const saveOutfit = useCallback(
    async (values: OutfitValues, opts: { id?: string; source?: OutfitSource; parentOutfitId?: string | null } = {}) => {
      const existing = opts.id ? state.current.outfits.find((o) => o.id === opts.id) : undefined
      const outfit: Outfit = existing
        ? { ...existing, ...values, updatedAt: nowIso() }
        : newOutfit(store.userId, values, { source: opts.source, parentOutfitId: opts.parentOutfitId })
      await store.saveOutfits([outfit])
      setOutfits((all) => (existing ? all.map((o) => (o.id === outfit.id ? outfit : o)) : [outfit, ...all]))
      return outfit
    },
    [store],
  )

  const duplicateOutfit = useCallback(
    async (id: string, asVariant: boolean) => {
      const source = state.current.outfits.find((o) => o.id === id)
      if (!source) throw new Error('This outfit no longer exists.')
      const copy = duplicateOutfitRecord(source, asVariant, state.current.outfits.map((o) => o.name))
      await store.saveOutfits([copy])
      setOutfits((all) => [copy, ...all])
      return copy
    },
    [store],
  )

  const deleteOutfit = useCallback(
    async (id: string) => {
      await store.deleteOutfit(id)
      setOutfits((all) => all.filter((o) => o.id !== id).map((o) => (o.parentOutfitId === id ? { ...o, parentOutfitId: null } : o)))
      setPlans((all) => all.filter((p) => p.outfitId !== id))
    },
    [store],
  )

  const toggleOutfitFavorite = useCallback(
    async (id: string) => {
      const outfit = state.current.outfits.find((o) => o.id === id)
      if (!outfit) return
      const next = { ...outfit, favorite: !outfit.favorite, updatedAt: nowIso() }
      await store.saveOutfits([next])
      setOutfits((all) => all.map((o) => (o.id === id ? next : o)))
    },
    [store],
  )

  const markOutfitWorn = useCallback(
    async (id: string) => {
      const outfit = state.current.outfits.find((o) => o.id === id)
      if (!outfit) return
      const result = recordWear(outfit, state.current.items)
      await store.saveItems(result.items)
      await store.saveOutfits([result.outfit])
      const updated = new Map(result.items.map((i) => [i.id, i]))
      setItems((all) => all.map((i) => updated.get(i.id) ?? i))
      setOutfits((all) => all.map((o) => (o.id === id ? result.outfit : o)))
    },
    [store],
  )

  const addPlan = useCallback(
    async (values: PlannedOutfitValues) => {
      const check = canAssign(state.current.plans, values)
      if (!check.ok) throw new Error(check.reason)
      const plan = newPlan(store.userId, values)
      await store.savePlans([plan])
      setPlans((all) => [...all, plan])
      return plan
    },
    [store],
  )

  const updatePlan = useCallback(
    async (id: string, values: PlannedOutfitValues) => {
      const existing = state.current.plans.find((p) => p.id === id)
      if (!existing) throw new Error('This plan no longer exists.')
      const check = canAssign(state.current.plans, { ...values, id })
      if (!check.ok) throw new Error(check.reason)
      const next = { ...existing, ...values, updatedAt: nowIso() }
      await store.savePlans([next])
      setPlans((all) => all.map((p) => (p.id === id ? next : p)))
      return next
    },
    [store],
  )

  const deletePlan = useCallback(
    async (id: string) => {
      await store.deletePlan(id)
      setPlans((all) => all.filter((p) => p.id !== id))
    },
    [store],
  )

  const loadSampleWardrobe = useCallback(async () => {
    if (state.current.items.some((i) => i.isSample)) return 0
    const sample = createSampleWardrobe(store.userId)
    await store.saveItems(sample.items)
    await store.saveOutfits(sample.outfits)
    setItems((all) => [...sample.items, ...all])
    setOutfits((all) => [...sample.outfits, ...all])
    // Plan one sample look for today so the calendar and home page have something real to show.
    const today = todayKey()
    if (!state.current.plans.some((p) => p.date === today)) {
      const plan = newPlan(store.userId, { outfitId: sample.outfits[0].id, date: today, occasion: 'Sample plan', notes: null })
      await store.savePlans([plan])
      setPlans((all) => [...all, plan])
    }
    return sample.items.length
  }, [store])

  const removeSampleData = useCallback(async () => {
    const sampleOutfits = state.current.outfits.filter((o) => o.isSample)
    const sampleItems = state.current.items.filter((i) => i.isSample)
    for (const o of sampleOutfits) await store.deleteOutfit(o.id)
    for (const i of sampleItems) await store.deleteItem(i.id)
    const removedOutfits = new Set(sampleOutfits.map((o) => o.id))
    const removedItems = new Set(sampleItems.map((i) => i.id))
    setItems((all) => all.filter((i) => !removedItems.has(i.id)))
    setOutfits((all) => all.filter((o) => !removedOutfits.has(o.id)).map((o) => ({ ...o, clothingItemIds: o.clothingItemIds.filter((id) => !removedItems.has(id)) })))
    setPlans((all) => all.filter((p) => !removedOutfits.has(p.outfitId)))
    return sampleItems.length
  }, [store])

  const retag = useCallback(
    async (transform: (tags: string[]) => string[]) => {
      const changed = state.current.items
        .map((i) => ({ before: i, tags: transform(i.styleTags) }))
        .filter(({ before, tags }) => tags.join('|') !== before.styleTags.join('|'))
        .map(({ before, tags }) => ({ ...before, styleTags: tags, updatedAt: nowIso() }))
      if (changed.length) await store.saveItems(changed)
      const byId = new Map(changed.map((c) => [c.id, c]))
      setItems((all) => all.map((i) => byId.get(i.id) ?? i))
      return changed.length
    },
    [store],
  )

  const renameTag = useCallback(
    (from: string, to: string) => {
      const target = to.trim().toLowerCase()
      return retag((tags) => Array.from(new Set(tags.map((t) => (t === from ? target : t)))))
    },
    [retag],
  )
  const deleteTag = useCallback((tag: string) => retag((tags) => tags.filter((t) => t !== tag)), [retag])

  const exportData = useCallback(() => {
    const { profile: p, items: i, outfits: o, plans: pl } = state.current
    return JSON.stringify({ app: 'Lavender', version: 1, exportedAt: nowIso(), profile: p, items: i, outfits: o, plannedOutfits: pl }, null, 2)
  }, [])

  const deleteAllData = useCallback(async () => {
    await store.deleteAllData()
    setProfile(null)
    setItems([])
    setOutfits([])
    setPlans([])
  }, [store])

  const todayWeather = weather.status === 'ready' ? weather.days.find((d) => d.date === todayKey()) ?? null : null

  const value = useMemo<AppContextValue>(
    () => ({
      mode: store.mode,
      userId: store.userId,
      status,
      loadError,
      reload: () => setReloadToken((n) => n + 1),
      profile,
      items,
      outfits,
      plans,
      weather,
      todayWeather,
      updateProfile,
      addItem,
      updateItem,
      deleteItem,
      toggleItemFavorite,
      saveOutfit,
      duplicateOutfit,
      deleteOutfit,
      toggleOutfitFavorite,
      markOutfitWorn,
      addPlan,
      updatePlan,
      deletePlan,
      loadSampleWardrobe,
      removeSampleData,
      renameTag,
      deleteTag,
      exportData,
      deleteAllData,
    }),
    [
      store, status, loadError, profile, items, outfits, plans, weather, todayWeather, updateProfile, addItem, updateItem, deleteItem,
      toggleItemFavorite, saveOutfit, duplicateOutfit, deleteOutfit, toggleOutfitFavorite, markOutfitWorn, addPlan, updatePlan,
      deletePlan, loadSampleWardrobe, removeSampleData, renameTag, deleteTag, exportData, deleteAllData,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

export function useItemMap(): Map<string, ClothingItem> {
  const { items } = useApp()
  return useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
}
