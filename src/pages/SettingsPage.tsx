import { CloudSun, Download, LogOut, MapPin, Pencil, RefreshCw, ShieldCheck, Tag, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ButtonLink } from '@/components/ui/Button'
import { MultiChips } from '@/components/ui/Chip'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog'
import { Field, FieldGroup, Input, Select } from '@/components/ui/Form'
import { Card, PageHeader, SectionTitle, Segmented } from '@/components/ui/Layout'
import { getSupabase } from '@/data/supabaseClient'
import { AESTHETICS, aestheticName } from '@/domain/aesthetics'
import { CATEGORIES, type CategoryId } from '@/domain/categories'
import { OCCASIONS } from '@/domain/occasions'
import { FIT_LABELS, FITS, STYLING_GOALS, type Fit, type UserSettings, type WeatherLocation } from '@/domain/types'
import { cn, pluralize } from '@/lib/utils'
import { requestBrowserLocation } from '@/services/weather'
import { useApp } from '@/state/AppProvider'
import { useToast } from '@/state/toast'

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted">{description}</span>
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-plum peer-focus-visible:ring-2 peer-focus-visible:ring-lavender peer-focus-visible:ring-offset-2" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

interface GeoResult {
  name: string
  country?: string
  admin1?: string
  latitude: number
  longitude: number
}

export default function SettingsPage() {
  const app = useApp()
  const { profile, items, mode, weather } = app
  const toast = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState(profile?.displayName ?? '')
  const [favoriteColors, setFavoriteColors] = useState(profile?.favoriteColors ?? [])
  const [avoidedColors, setAvoidedColors] = useState(profile?.avoidedColors ?? [])
  const [goals, setGoals] = useState<string[]>(profile?.stylingGoals ?? [])
  const [occasions, setOccasions] = useState<string[]>(profile?.typicalOccasions ?? [])
  const [categories, setCategories] = useState<CategoryId[]>(profile?.preferredCategories ?? [])
  const [fit, setFit] = useState<Fit | ''>(profile?.preferredFit ?? '')
  const [budget, setBudget] = useState(profile?.budget ? String(profile.budget.amount) : '')
  const [currency, setCurrency] = useState(profile?.budget?.currency ?? 'USD')
  const [budgetError, setBudgetError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [city, setCity] = useState('')
  const [geo, setGeo] = useState<GeoResult[] | null>(null)
  const [geoBusy, setGeoBusy] = useState(false)

  const [renaming, setRenaming] = useState<{ tag: string; value: string } | null>(null)
  const [confirm, setConfirm] = useState<'samples' | 'all' | 'account' | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)

  const settings = profile?.settings
  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const i of items) for (const t of i.styleTags) counts.set(t, (counts.get(t) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [items])
  const sampleCount = items.filter((i) => i.isSample).length

  const saveProfile = async () => {
    const amount = budget.trim() ? Number(budget) : null
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      setBudgetError('Enter a positive number, or leave it empty.')
      return
    }
    setBudgetError(null)
    setSaving(true)
    try {
      await app.updateProfile({
        displayName: name.trim().slice(0, 40),
        favoriteColors,
        avoidedColors,
        stylingGoals: goals,
        typicalOccasions: occasions,
        preferredCategories: categories,
        preferredFit: fit || null,
        budget: amount !== null ? { amount, currency } : null,
      })
      toast({ tone: 'success', title: 'Profile saved' })
    } catch (err) {
      toast({ tone: 'error', title: 'Could not save', description: err instanceof Error ? err.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = async (patch: Partial<UserSettings>, message?: string) => {
    if (!profile) return
    try {
      await app.updateProfile({ settings: { ...profile.settings, ...patch } })
      if (message) toast({ tone: 'success', title: message })
    } catch (err) {
      toast({ tone: 'error', title: 'Could not update settings', description: err instanceof Error ? err.message : undefined })
    }
  }

  const useMyLocation = async () => {
    setGeoBusy(true)
    try {
      const location = await requestBrowserLocation()
      await updateSettings({ weatherEnabled: true, weatherLocation: location }, 'Weather enabled for your location')
    } catch (err) {
      toast({ tone: 'error', title: 'Location unavailable', description: err instanceof Error ? err.message : undefined })
    } finally {
      setGeoBusy(false)
    }
  }

  const searchCity = async () => {
    if (!city.trim()) return
    setGeoBusy(true)
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&format=json&name=${encodeURIComponent(city.trim())}`)
      if (!res.ok) throw new Error(`Search failed (${res.status})`)
      const json = (await res.json()) as { results?: GeoResult[] }
      setGeo(json.results ?? [])
    } catch (err) {
      toast({ tone: 'error', title: 'City search failed', description: err instanceof Error ? err.message : undefined })
    } finally {
      setGeoBusy(false)
    }
  }

  const chooseCity = (g: GeoResult) => {
    const location: WeatherLocation = { latitude: Math.round(g.latitude * 100) / 100, longitude: Math.round(g.longitude * 100) / 100, label: [g.name, g.admin1, g.country].filter(Boolean).join(', ') }
    setGeo(null)
    setCity('')
    updateSettings({ weatherEnabled: true, weatherLocation: location }, `Weather set to ${location.label}`)
  }

  const exportData = () => {
    const blob = new Blob([app.exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lavender-wardrobe-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({ tone: 'success', title: 'Export downloaded', description: mode === 'supabase' ? 'Photo links in the export expire after a few hours.' : 'Photos are included inside the file.' })
  }

  const runConfirm = async () => {
    setBusy(true)
    try {
      if (confirm === 'samples') {
        const n = await app.removeSampleData()
        toast({ tone: 'success', title: `Removed ${pluralize(n, 'sample piece')}` })
      } else if (confirm === 'all') {
        await app.deleteAllData()
        toast({ tone: 'success', title: 'All data deleted' })
        navigate('/welcome', { replace: true })
      } else if (confirm === 'account') {
        const client = await getSupabase()
        await app.deleteAllData()
        const { error } = await client.functions.invoke('delete-account', { method: 'POST' })
        if (error) throw new Error(`Your data was deleted, but the login could not be removed: ${error.message}`)
        await client.auth.signOut()
      }
      setConfirm(null)
      setConfirmText('')
    } catch (err) {
      toast({ tone: 'error', title: 'Something went wrong', description: err instanceof Error ? err.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    const client = await getSupabase()
    await client.auth.signOut()
  }

  return (
    <>
      <PageHeader eyebrow="Make it yours" title="Profile & Settings" />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <SectionTitle>Profile & style</SectionTitle>
            <div className="space-y-6">
              <Field label="Display name" optional hint="Used for your greeting only.">
                {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" />}
              </Field>
              <div>
                <p className="mb-2 text-sm font-medium">Aesthetics</p>
                <p className="mb-3 text-sm text-muted">{profile?.stylePreferences.length ? profile.stylePreferences.map((p) => aestheticName(p.aesthetic)).join(', ') : 'None saved yet.'}</p>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink to="/discover" size="sm" variant="secondary">
                    Edit in Style Discovery
                  </ButtonLink>
                  <ButtonLink to="/discover/quiz" size="sm" variant="ghost">
                    Retake the quiz
                  </ButtonLink>
                </div>
              </div>
              <FieldGroup label="Styling goals" optional>
                <MultiChips options={STYLING_GOALS} value={goals} onChange={setGoals} />
              </FieldGroup>
              <FieldGroup label="Favorite colors" optional>
                <ColorPicker label="Favorite colors" value={favoriteColors} onChange={setFavoriteColors} disabledIds={avoidedColors} />
              </FieldGroup>
              <FieldGroup label="Colors you rarely wear" optional>
                <ColorPicker label="Colors you rarely wear" value={avoidedColors} onChange={setAvoidedColors} disabledIds={favoriteColors} />
              </FieldGroup>
              <FieldGroup label="Pieces you reach for most" optional>
                <MultiChips options={CATEGORIES.filter((c) => c.id !== 'other').map((c) => ({ id: c.id, label: c.label }))} value={categories} onChange={setCategories} />
              </FieldGroup>
              <FieldGroup label="Typical occasions" optional>
                <MultiChips options={OCCASIONS.map((o) => ({ id: o.id, label: o.label }))} value={occasions} onChange={setOccasions} />
              </FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Preferred fit" optional>
                  {(p) => (
                    <Select {...p} value={fit} onChange={(e) => setFit(e.target.value as Fit | '')}>
                      <option value="">No preference</option>
                      {FITS.map((f) => (
                        <option key={f} value={f}>
                          {FIT_LABELS[f]}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <div className="grid grid-cols-[1fr_96px] gap-2">
                  <Field label="Budget" optional error={budgetError}>
                    {(p) => <Input {...p} inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} />}
                  </Field>
                  <Field label="Currency">
                    {(p) => (
                      <Select {...p} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                        {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NGN', 'INR', 'JPY'].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveProfile} loading={saving}>
                  Save profile
                </Button>
                <ButtonLink to="/welcome" variant="ghost" icon={<RefreshCw className="h-4 w-4" />}>
                  Redo onboarding
                </ButtonLink>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle action={<Tag className="h-5 w-5 text-lavender-600" />}>Style tags</SectionTitle>
            {tags.length ? (
              <ul className="divide-y divide-line">
                {tags.map(([tag, count]) => (
                  <li key={tag} className="flex items-center justify-between gap-2 py-2">
                    <span className="text-sm">
                      {aestheticName(tag)} <span className="text-muted">· {pluralize(count, 'piece')}</span>
                      {AESTHETICS.some((a) => a.id === tag) && <span className="ml-1 text-xs text-muted">(aesthetic)</span>}
                    </span>
                    <span className="flex gap-1">
                      <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setRenaming({ tag, value: tag })}>
                        Rename
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => app.deleteTag(tag).then((n) => toast({ tone: 'success', title: `Removed “${tag}” from ${pluralize(n, 'piece')}` }))}
                      >
                        Remove
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No tags yet. Add style tags when you add or edit pieces.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <SectionTitle action={<CloudSun className="h-5 w-5 text-lavender-600" />}>Weather</SectionTitle>
            <p className="text-sm text-muted">
              Optional. Uses the free Open-Meteo forecast. Your location is rounded to about 1 km and sent only to Open-Meteo; when weather is off, no weather is shown anywhere.
            </p>
            {settings?.weatherEnabled && settings.weatherLocation ? (
              <div className="mt-4 space-y-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-plum" /> {settings.weatherLocation.label}
                </p>
                <p className="text-xs text-muted">
                  {weather.status === 'ready' ? 'Forecast loaded.' : weather.status === 'loading' ? 'Loading forecast…' : weather.status === 'error' ? `Unavailable: ${weather.message}` : ''}
                </p>
                <Segmented
                  label="Temperature unit"
                  value={settings.temperatureUnit}
                  onChange={(v) => updateSettings({ temperatureUnit: v })}
                  options={[{ id: 'celsius', label: '°C' }, { id: 'fahrenheit', label: '°F' }]}
                />
                <div>
                  <Button size="sm" variant="secondary" onClick={() => updateSettings({ weatherEnabled: false, weatherLocation: null }, 'Weather turned off and location removed')}>
                    Turn off weather
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <Button size="sm" icon={<MapPin className="h-4 w-4" />} onClick={useMyLocation} loading={geoBusy}>
                  Use my location
                </Button>
                <div className="flex gap-2">
                  <Input aria-label="Search for a city" placeholder="…or search a city" value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchCity()} />
                  <Button variant="secondary" onClick={searchCity} disabled={!city.trim() || geoBusy}>
                    Search
                  </Button>
                </div>
                {geo && (
                  <ul className="space-y-1">
                    {geo.length === 0 && <li className="text-sm text-muted">No matches.</li>}
                    {geo.map((g) => (
                      <li key={`${g.latitude},${g.longitude}`}>
                        <button type="button" onClick={() => chooseCity(g)} className="w-full rounded-2xl px-3 py-2 text-left text-sm hover:bg-lavender-50">
                          {[g.name, g.admin1, g.country].filter(Boolean).join(', ')}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle action={<ShieldCheck className="h-5 w-5 text-lavender-600" />}>Privacy & feedback</SectionTitle>
            <div className="divide-y divide-line">
              <Toggle
                checked={settings?.showStyleScores ?? true}
                onChange={(v) => updateSettings({ showStyleScores: v })}
                label="Show harmony estimates"
                description="The 0–100 heuristic in the Studio. Notes still appear when off."
              />
              <Toggle
                checked={settings?.showShoppingSuggestions ?? true}
                onChange={(v) => updateSettings({ showShoppingSuggestions: v })}
                label="Show wardrobe-gap ideas"
                description="Optional suggestions in Insights. Never required, never sponsored."
              />
            </div>
            <div className={cn('mt-4 rounded-3xl bg-cream p-4 text-xs leading-relaxed text-muted')}>
              {mode === 'local' ? (
                <>
                  <strong className="text-ink">Demo mode:</strong> your wardrobe, photos and preferences are stored only in this browser (IndexedDB). Nothing is sent to a server except optional weather lookups. Clearing site data deletes it.
                </>
              ) : (
                <>
                  <strong className="text-ink">Account mode:</strong> records are stored in your private database rows and photos in a private storage folder. Row-level security ensures only you can read or change them.
                </>
              )}
            </div>
          </Card>

          <Card>
            <SectionTitle>Your data</SectionTitle>
            <div className="space-y-3">
              <Button variant="secondary" className="w-full" icon={<Download className="h-4 w-4" />} onClick={exportData}>
                Export wardrobe (JSON)
              </Button>
              {sampleCount > 0 ? (
                <Button variant="secondary" className="w-full" onClick={() => setConfirm('samples')}>
                  Remove sample wardrobe ({sampleCount})
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => app.loadSampleWardrobe().then((n) => toast({ tone: 'success', title: `Added ${pluralize(n, 'sample piece')}` })).catch((e: unknown) => toast({ tone: 'error', title: 'Could not add samples', description: e instanceof Error ? e.message : undefined }))}
                >
                  Load sample wardrobe
                </Button>
              )}
              <p className="pt-2 text-xs text-muted">Individual pieces and outfits can be deleted from their detail views.</p>
              <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm('all')}>
                Delete all my data
              </Button>
              {mode === 'supabase' && (
                <>
                  <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50" onClick={() => setConfirm('account')}>
                    Delete my account
                  </Button>
                  <Button variant="secondary" className="w-full" icon={<LogOut className="h-4 w-4" />} onClick={signOut}>
                    Sign out
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Dialog
        open={Boolean(renaming)}
        onClose={() => setRenaming(null)}
        title="Rename tag"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button
              disabled={!renaming?.value.trim() || (renaming?.value.trim().length ?? 0) > 30}
              onClick={async () => {
                if (!renaming) return
                const n = await app.renameTag(renaming.tag, renaming.value)
                toast({ tone: 'success', title: `Updated ${pluralize(n, 'piece')}` })
                setRenaming(null)
              }}
            >
              Rename
            </Button>
          </>
        }
      >
        {renaming && (
          <Field label="New name" hint="Applies to every piece with this tag.">
            {(p) => <Input {...p} value={renaming.value} maxLength={30} onChange={(e) => setRenaming({ ...renaming, value: e.target.value })} />}
          </Field>
        )}
      </Dialog>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => {
          setConfirm(null)
          setConfirmText('')
        }}
        busy={busy}
        onConfirm={() => {
          if (confirm !== 'samples' && confirmText.trim() !== 'DELETE') {
            toast({ tone: 'error', title: 'Type DELETE to confirm' })
            return
          }
          runConfirm()
        }}
        title={confirm === 'samples' ? 'Remove sample wardrobe?' : confirm === 'account' ? 'Delete your account?' : 'Delete all your data?'}
        confirmLabel={confirm === 'samples' ? 'Remove samples' : 'Delete permanently'}
        description={
          confirm === 'samples' ? (
            'Sample pieces, sample outfits and their calendar plans will be removed. Your own pieces are not affected.'
          ) : (
            <div className="space-y-3">
              <p>
                This permanently deletes every piece, photo, outfit, plan and preference
                {confirm === 'account' ? ', and then removes your login. This cannot be undone.' : mode === 'local' ? ' stored in this browser. This cannot be undone.' : ' in your account. Your login remains.'}
              </p>
              <p>Consider exporting first. Type DELETE to confirm.</p>
              <Input aria-label="Type DELETE to confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
            </div>
          )
        }
      />
    </>
  )
}
