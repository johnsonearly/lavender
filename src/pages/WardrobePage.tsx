import { CheckSquare, LayoutGrid, List, MessageCircleHeart, Plus, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hanger } from '@/components/decor/Decor'
import { ItemCard } from '@/components/wardrobe/ItemCard'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Chip, MultiChips } from '@/components/ui/Chip'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { Dialog } from '@/components/ui/Dialog'
import { FieldGroup, Input, Select } from '@/components/ui/Form'
import { EmptyState, PageHeader, Segmented } from '@/components/ui/Layout'
import { aestheticName } from '@/domain/aesthetics'
import { CATEGORIES } from '@/domain/categories'
import { activeFilterCount, collectTags, EMPTY_FILTERS, filterItems, type WardrobeFilters, type WardrobeSort } from '@/domain/filters'
import { OCCASIONS } from '@/domain/occasions'
import { SEASON_LABELS, SEASONS } from '@/domain/types'
import { pluralize } from '@/lib/utils'
import { useApp } from '@/state/AppProvider'
import { useOpenItem } from '@/state/itemDialog'
import { useToast } from '@/state/toast'

const SORTS: { id: WardrobeSort; label: string }[] = [
  { id: 'recent', label: 'Recently added' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'category', label: 'Category' },
  { id: 'most-worn', label: 'Most worn' },
  { id: 'least-worn', label: 'Least worn' },
  { id: 'name', label: 'Name (A–Z)' },
]

const VIEW_KEY = 'lavender.wardrobeView'

export default function WardrobePage() {
  const { items, toggleItemFavorite, loadSampleWardrobe } = useApp()
  const openItem = useOpenItem()
  const navigate = useNavigate()
  const toast = useToast()
  const [filters, setFilters] = useState<WardrobeFilters>(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
    } catch {
      return 'grid'
    }
  })
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [loadingSample, setLoadingSample] = useState(false)

  const results = useMemo(() => filterItems(items, filters), [items, filters])
  const tags = useMemo(() => collectTags(items), [items])
  const presentCategories = useMemo(() => CATEGORIES.filter((c) => items.some((i) => i.category === c.id)), [items])
  const filterCount = activeFilterCount(filters)

  const update = (patch: Partial<WardrobeFilters>) => setFilters((f) => ({ ...f, ...patch }))
  const changeView = (v: 'grid' | 'list') => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      // Preference only.
    }
  }
  const toggleSelect = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const fav = (id: string) => toggleItemFavorite(id).catch(() => toast({ tone: 'error', title: 'Could not update favorite' }))

  const addSample = async () => {
    setLoadingSample(true)
    try {
      const n = await loadSampleWardrobe()
      toast({ tone: 'success', title: 'Sample wardrobe added', description: `${n} sample pieces are ready to style.` })
    } catch (err) {
      toast({ tone: 'error', title: 'Could not add samples', description: err instanceof Error ? err.message : undefined })
    } finally {
      setLoadingSample(false)
    }
  }

  if (!items.length) {
    return (
      <>
        <PageHeader eyebrow="Your digital closet" title="My Wardrobe" />
        <EmptyState
          illustration={
            <span className="grid h-20 w-20 place-items-center rounded-full bg-white text-lavender-600 shadow-soft">
              <Hanger className="h-10 w-14" />
            </span>
          }
          title="Your closet is waiting"
          description="Add your first piece with a photo, or explore Lavender with a sample wardrobe first. Sample items are clearly labelled and easy to remove."
          actions={
            <>
              <ButtonLink to="/wardrobe/new" icon={<Plus className="h-4 w-4" />}>
                Add your first item
              </ButtonLink>
              <Button variant="secondary" onClick={addSample} loading={loadingSample}>
                Load sample wardrobe
              </Button>
            </>
          }
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Your digital closet"
        title="My Wardrobe"
        description={`${pluralize(items.length, 'piece')} · tap a piece for details, or select several to style together.`}
        actions={
          <>
            <Button
              variant={selecting ? 'soft' : 'secondary'}
              icon={<CheckSquare className="h-4 w-4" />}
              onClick={() => {
                setSelecting((s) => !s)
                setSelected([])
              }}
              aria-pressed={selecting}
            >
              {selecting ? 'Cancel selection' : 'Select'}
            </Button>
            <ButtonLink to="/wardrobe/new" icon={<Plus className="h-4 w-4" />}>
              Add item
            </ButtonLink>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            type="search"
            aria-label="Search your wardrobe"
            placeholder="Search by name, color, tag or brand…"
            className="pl-10"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant={filterCount ? 'soft' : 'secondary'} icon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setFiltersOpen(true)}>
            Filters{filterCount ? ` (${filterCount})` : ''}
          </Button>
          <div className="w-44">
            <Select aria-label="Sort items" value={filters.sort} onChange={(e) => update({ sort: e.target.value as WardrobeSort })}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <Segmented
            label="Layout"
            value={view}
            onChange={changeView}
            options={[
              { id: 'grid', label: '', ariaLabel: 'Grid view', icon: <LayoutGrid className="h-4 w-4" aria-hidden /> },
              { id: 'list', label: '', ariaLabel: 'List view', icon: <List className="h-4 w-4" aria-hidden /> },
            ]}
          />
        </div>
      </div>

      <div className="scrollbar-thin -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Quick category filter">
        <Chip selected={filters.categories.length === 0} onClick={() => update({ categories: [] })}>
          All
        </Chip>
        {presentCategories.map((c) => (
          <Chip
            key={c.id}
            className="shrink-0"
            selected={filters.categories.includes(c.id)}
            onClick={() => update({ categories: filters.categories.includes(c.id) ? filters.categories.filter((x) => x !== c.id) : [...filters.categories, c.id] })}
          >
            {c.label}
          </Chip>
        ))}
        <Chip selected={filters.favoritesOnly} onClick={() => update({ favoritesOnly: !filters.favoritesOnly })} className="shrink-0">
          Favorites
        </Chip>
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="No pieces match"
          description="Try a different search or clear some filters."
          actions={
            <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)} icon={<X className="h-4 w-4" />}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted" aria-live="polite">
            Showing {results.length} of {items.length}
          </p>
          {view === 'grid' ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {results.map((item) => (
                <li key={item.id} className="animate-fade-up">
                  <ItemCard item={item} onOpen={() => openItem(item.id)} onToggleFavorite={() => fav(item.id)} selectable={selecting} selected={selected.includes(item.id)} onSelect={() => toggleSelect(item.id)} />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {results.map((item) => (
                <li key={item.id}>
                  <ItemCard layout="list" item={item} onOpen={() => openItem(item.id)} onToggleFavorite={() => fav(item.id)} selectable={selecting} selected={selected.includes(item.id)} onSelect={() => toggleSelect(item.id)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {selecting && (
        <div className="fixed inset-x-0 bottom-[76px] z-40 px-4 lg:bottom-6 lg:left-64">
          <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-2 rounded-full border border-line bg-white/95 py-2 pl-5 pr-2 shadow-lift backdrop-blur">
            <span className="text-sm font-medium">{selected.length ? `${pluralize(selected.length, 'piece')} selected` : 'Select pieces to style'}</span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="soft" disabled={!selected.length} icon={<MessageCircleHeart className="h-4 w-4" />} onClick={() => navigate(`/stylist?item=${selected.join(',')}`)}>
                Ask stylist
              </Button>
              <Button size="sm" disabled={!selected.length} icon={<Sparkles className="h-4 w-4" />} onClick={() => navigate(`/studio?items=${selected.join(',')}`)}>
                Open in Studio
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter your wardrobe"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFilters((f) => ({ ...EMPTY_FILTERS, query: f.query, sort: f.sort }))}>
              Clear all
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>Show {results.length} results</Button>
          </>
        }
      >
        <div className="space-y-6 pt-2">
          <FieldGroup label="Category">
            <MultiChips options={CATEGORIES.map((c) => ({ id: c.id, label: c.label }))} value={filters.categories} onChange={(categories) => update({ categories })} />
          </FieldGroup>
          <FieldGroup label="Color">
            <ColorPicker label="Filter by color" value={filters.colors} onChange={(colors) => update({ colors })} />
          </FieldGroup>
          <FieldGroup label="Season" hint="Pieces without season tags count as all-season.">
            <MultiChips options={SEASONS.map((s) => ({ id: s, label: SEASON_LABELS[s] }))} value={filters.seasons} onChange={(seasons) => update({ seasons })} />
          </FieldGroup>
          {tags.length > 0 && (
            <FieldGroup label="Style">
              <MultiChips options={tags.map((t) => ({ id: t, label: aestheticName(t) }))} value={filters.styles} onChange={(styles) => update({ styles })} />
            </FieldGroup>
          )}
          <FieldGroup label="Occasion">
            <MultiChips options={OCCASIONS.map((o) => ({ id: o.id, label: o.label }))} value={filters.occasions} onChange={(occasions) => update({ occasions })} />
          </FieldGroup>
        </div>
      </Dialog>
    </>
  )
}
