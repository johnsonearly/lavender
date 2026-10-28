import { ArrowLeft, ChevronDown, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ItemImage } from '@/components/garments/ItemImage'
import { ImageEditor, type ImageResult } from '@/components/wardrobe/ImageEditor'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Badge, MultiChips } from '@/components/ui/Chip'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { Field, FieldGroup, Input, Select, Textarea } from '@/components/ui/Form'
import { Card, EmptyState, PageHeader } from '@/components/ui/Layout'
import { AESTHETICS } from '@/domain/aesthetics'
import { CATEGORIES, getCategory, type CategoryId } from '@/domain/categories'
import { colorLabel } from '@/domain/colors'
import { collectTags } from '@/domain/filters'
import { OCCASIONS } from '@/domain/occasions'
import { clothingItemInputSchema, fieldErrors } from '@/domain/schemas'
import { FIT_LABELS, FITS, PATTERN_LABELS, PATTERNS, SEASON_LABELS, SEASONS, type Fit, type Pattern, type Season } from '@/domain/types'
import { useApp } from '@/state/AppProvider'
import { useToast } from '@/state/toast'

interface FormState {
  name: string
  category: CategoryId | ''
  subcategory: string
  colors: string[]
  pattern: Pattern
  styleTags: string[]
  seasons: Season[]
  occasions: string[]
  fit: Fit | ''
  brand: string
  notes: string
  price: string
  currency: string
  purchaseDate: string
  store: string
}

const EMPTY: FormState = {
  name: '', category: '', subcategory: '', colors: [], pattern: 'solid', styleTags: [], seasons: [], occasions: [], fit: '',
  brand: '', notes: '', price: '', currency: 'USD', purchaseDate: '', store: '',
}

export default function ItemEditorPage() {
  const { id } = useParams()
  const { items, addItem, updateItem } = useApp()
  const navigate = useNavigate()
  const toast = useToast()
  const existing = id ? items.find((i) => i.id === id) : undefined
  const isEdit = Boolean(id)

  const [form, setForm] = useState<FormState>(() =>
    existing
      ? {
          name: existing.name, category: existing.category, subcategory: existing.subcategory ?? '', colors: existing.colors, pattern: existing.pattern,
          styleTags: existing.styleTags, seasons: existing.seasons, occasions: existing.occasions, fit: existing.fit ?? '', brand: existing.brand ?? '',
          notes: existing.notes ?? '', price: existing.purchase?.price != null ? String(existing.purchase.price) : '', currency: existing.purchase?.currency ?? 'USD',
          purchaseDate: existing.purchase?.date ?? '', store: existing.purchase?.store ?? '',
        }
      : EMPTY,
  )
  const [photo, setPhoto] = useState<ImageResult | null | undefined>(undefined) // undefined = unchanged
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<'save' | 'another' | null>(null)
  const [customTag, setCustomTag] = useState('')
  const [moreOpen, setMoreOpen] = useState(Boolean(existing?.brand || existing?.purchase || existing?.notes))
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url)
  }, [photo])

  const knownTags = useMemo(() => {
    const aesthetic = AESTHETICS.map((a) => ({ id: a.id, label: a.name }))
    const custom = collectTags(items).filter((t) => !AESTHETICS.some((a) => a.id === t)).map((t) => ({ id: t, label: t }))
    const extra = form.styleTags.filter((t) => !aesthetic.some((a) => a.id === t) && !custom.some((c) => c.id === t)).map((t) => ({ id: t, label: t }))
    return [...aesthetic, ...custom, ...extra]
  }, [items, form.styleTags])

  if (isEdit && !existing) {
    return (
      <EmptyState
        title="This piece isn't in your wardrobe"
        description="It may have been deleted."
        actions={<ButtonLink to="/wardrobe">Back to wardrobe</ButtonLink>}
      />
    )
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))
  const category = form.category ? getCategory(form.category) : null
  const previewUrl = photo === undefined ? existing?.imageUrl ?? null : photo?.url ?? null

  const addCustomTag = () => {
    const tag = customTag.trim().toLowerCase()
    if (!tag) return
    if (tag.length > 30) {
      setErrors((e) => ({ ...e, styleTags: 'Tags should be under 30 characters' }))
      return
    }
    if (!form.styleTags.includes(tag)) set('styleTags', [...form.styleTags, tag])
    setCustomTag('')
  }

  const submit = async (e: FormEvent, mode: 'save' | 'another' = 'save') => {
    e.preventDefault()
    const price = form.price.trim() ? Number(form.price) : null
    const hasPurchase = price !== null || form.purchaseDate || form.store.trim()
    const parsed = clothingItemInputSchema.safeParse({
      name: form.name,
      category: form.category || undefined,
      subcategory: form.subcategory || null,
      colors: form.colors,
      pattern: form.pattern,
      styleTags: form.styleTags,
      seasons: form.seasons,
      occasions: form.occasions,
      fit: form.fit || null,
      brand: form.brand,
      notes: form.notes,
      purchase: hasPurchase ? { price: price !== null && Number.isFinite(price) ? price : NaN, currency: form.currency, date: form.purchaseDate || null, store: form.store.trim() || null } : null,
    })
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error)
      if (errs['purchase.price']) errs['purchase.price'] = 'Enter a valid price'
      setErrors(errs)
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-error="true"]')?.focus())
      return
    }
    setErrors({})
    setSaving(mode)
    try {
      if (existing) {
        await updateItem(existing.id, parsed.data, photo === undefined ? undefined : { blob: photo?.blob ?? null })
        toast({ tone: 'success', title: 'Changes saved', description: parsed.data.name })
        navigate('/wardrobe')
      } else {
        const item = await addItem(parsed.data, photo?.blob ?? null)
        toast({ tone: 'success', title: `${item.name} added to your wardrobe` })
        if (mode === 'another') {
          setForm({ ...EMPTY, category: form.category })
          setPhoto(undefined)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        } else navigate('/wardrobe')
      }
    } catch (err) {
      toast({ tone: 'error', title: 'Could not save this piece', description: err instanceof Error ? err.message : 'Please try again.' })
    } finally {
      setSaving(null)
    }
  }

  const errorCount = Object.keys(errors).length

  return (
    <>
      <Link to="/wardrobe" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-plum">
        <ArrowLeft className="h-4 w-4" /> Wardrobe
      </Link>
      <PageHeader
        eyebrow={isEdit ? 'Edit piece' : 'New piece'}
        title={isEdit ? `Edit ${existing?.name}` : 'Add to your wardrobe'}
        description="A photo is optional — without one, Lavender draws an illustration from the details you choose."
      />
      <form ref={formRef} onSubmit={(e) => submit(e)} noValidate className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-4 md:p-5">
            <h2 className="mb-3 font-serif text-lg font-semibold">Photo</h2>
            <ImageEditor
              currentUrl={previewUrl}
              onChange={(result) => {
                if (photo) URL.revokeObjectURL(photo.url)
                setPhoto(result)
              }}
            />
          </Card>
          {!previewUrl && form.category && (
            <Card className="p-4 md:p-5">
              <p className="mb-2 text-sm font-medium">Illustration preview</p>
              <div className="mx-auto w-40">
                <ItemImage item={{ name: form.name || 'New piece', category: form.category, subcategory: form.subcategory || null, colors: form.colors.length ? form.colors : ['lilac'], pattern: form.pattern, imageUrl: null }} />
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {errorCount > 0 && (
            <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Please fix {errorCount === 1 ? 'one field' : `${errorCount} fields`} below.
            </p>
          )}
          <Card>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Name" error={errors.name} className="md:col-span-2" hint="e.g. “Cream knit cardigan”">
                {(p) => <Input {...p} value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={80} autoComplete="off" />}
              </Field>
              <Field label="Category" error={errors.category}>
                {(p) => (
                  <Select {...p} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as CategoryId, subcategory: '' }))}>
                    <option value="">Choose a category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Type" optional error={errors.subcategory}>
                {(p) => (
                  <Select {...p} value={form.subcategory} disabled={!category?.subcategories.length} onChange={(e) => set('subcategory', e.target.value)}>
                    <option value="">{category ? 'Not specified' : 'Choose a category first'}</option>
                    {category?.subcategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <FieldGroup label="Colors" error={errors.colors} hint={form.colors.length ? `Main color: ${colorLabel(form.colors[0])}. Pick up to four.` : 'Choose the main color first, then up to three more.'} className="md:col-span-2">
                <div data-error={errors.colors ? 'true' : undefined} tabIndex={errors.colors ? -1 : undefined}>
                  <ColorPicker label="Item colors" value={form.colors} onChange={(v) => set('colors', v)} max={4} />
                </div>
              </FieldGroup>
              <Field label="Pattern">
                {(p) => (
                  <Select {...p} value={form.pattern} onChange={(e) => set('pattern', e.target.value as Pattern)}>
                    {PATTERNS.map((pt) => (
                      <option key={pt} value={pt}>
                        {PATTERN_LABELS[pt]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Fit" optional>
                {(p) => (
                  <Select {...p} value={form.fit} onChange={(e) => set('fit', e.target.value as Fit | '')}>
                    <option value="">Not specified</option>
                    {FITS.map((f) => (
                      <option key={f} value={f}>
                        {FIT_LABELS[f]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </Card>

          <Card>
            <div className="space-y-6">
              <FieldGroup label="Style tags" optional error={errors.styleTags} hint="Aesthetics help the stylist match pieces. Add your own tags too.">
                <MultiChips options={knownTags} value={form.styleTags} onChange={(v) => set('styleTags', v)} />
                <div className="mt-2 flex max-w-sm gap-2">
                  <Input
                    aria-label="Add a custom tag"
                    placeholder="Add a custom tag"
                    value={customTag}
                    maxLength={30}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCustomTag()
                      }
                    }}
                  />
                  <Button variant="secondary" onClick={addCustomTag} icon={<Plus className="h-4 w-4" />} disabled={!customTag.trim()}>
                    Add
                  </Button>
                </div>
              </FieldGroup>
              <FieldGroup label="Seasons" optional hint="Leave empty if you wear it all year.">
                <MultiChips options={SEASONS.map((s) => ({ id: s, label: SEASON_LABELS[s] }))} value={form.seasons} onChange={(v) => set('seasons', v)} />
              </FieldGroup>
              <FieldGroup label="Occasions" optional>
                <MultiChips options={OCCASIONS.map((o) => ({ id: o.id, label: o.label }))} value={form.occasions} onChange={(v) => set('occasions', v)} />
              </FieldGroup>
            </div>
          </Card>

          <Card>
            <button type="button" className="flex w-full items-center justify-between text-left" aria-expanded={moreOpen} onClick={() => setMoreOpen((o) => !o)}>
              <span className="font-serif text-lg font-semibold">
                Brand, notes & purchase <Badge tone="outline">Optional</Badge>
              </span>
              <ChevronDown className={`h-5 w-5 text-muted transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
            </button>
            {moreOpen && (
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field label="Brand" optional error={errors.brand}>
                  {(p) => <Input {...p} value={form.brand} onChange={(e) => set('brand', e.target.value)} maxLength={60} />}
                </Field>
                <Field label="Store" optional>
                  {(p) => <Input {...p} value={form.store} onChange={(e) => set('store', e.target.value)} maxLength={60} />}
                </Field>
                <div className="grid grid-cols-[1fr_100px] gap-2">
                  <Field label="Price" optional error={errors['purchase.price']}>
                    {(p) => <Input {...p} inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value)} />}
                  </Field>
                  <Field label="Currency">
                    {(p) => (
                      <Select {...p} value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                        {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NGN', 'INR', 'JPY'].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </div>
                <Field label="Purchase date" optional error={errors['purchase.date']}>
                  {(p) => <Input {...p} type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} />}
                </Field>
                <Field label="Notes" optional error={errors.notes} className="md:col-span-2" hint="Care instructions, styling ideas, alterations…">
                  {(p) => <Textarea {...p} value={form.notes} onChange={(e) => set('notes', e.target.value)} maxLength={500} />}
                </Field>
              </div>
            )}
          </Card>

          <div className="flex flex-wrap justify-end gap-2 pb-4">
            <ButtonLink to="/wardrobe" variant="ghost" icon={<X className="h-4 w-4" />}>
              Cancel
            </ButtonLink>
            {!isEdit && (
              <Button variant="secondary" onClick={(e) => submit(e, 'another')} loading={saving === 'another'} disabled={saving !== null}>
                Save & add another
              </Button>
            )}
            <Button type="submit" loading={saving === 'save'} disabled={saving !== null}>
              {isEdit ? 'Save changes' : 'Save to wardrobe'}
            </Button>
          </div>
        </div>
      </form>
    </>
  )
}
