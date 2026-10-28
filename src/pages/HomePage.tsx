import { ArrowRight, CalendarHeart, CloudSun, MessageCircleHeart, Plus, Shirt, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Moodboard } from '@/components/aesthetics/Moodboard'
import { Bow, Hanger, Sparkle, SparkleField } from '@/components/decor/Decor'
import { ItemImage } from '@/components/garments/ItemImage'
import { OutfitPreview } from '@/components/garments/OutfitPreview'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Chip'
import { Card, SectionTitle } from '@/components/ui/Layout'
import { AESTHETICS, aestheticName } from '@/domain/aesthetics'
import { plansByDate, todayKey } from '@/domain/calendar'
import { seasonFor } from '@/domain/evaluation'
import { computeStats } from '@/domain/insights'
import { findOutfitWithItems, resolveOutfitItems } from '@/domain/outfitRules'
import { conditionFor, formatTemp, isRainy } from '@/domain/weather'
import { pluralize } from '@/lib/utils'
import { recommendOutfits } from '@/services/ai/recommendationEngine'
import { useApp } from '@/state/AppProvider'
import { useOpenItem } from '@/state/itemDialog'
import { useToast } from '@/state/toast'

const ENCOURAGEMENTS = [
  'Your closet has more outfits in it than you think.',
  'Small styling changes make a big difference.',
  'Wear the thing you have been saving for a special day.',
  'Confidence is the best accessory — the bow is a close second.',
]

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function HomePage() {
  const app = useApp()
  const { items, outfits, plans, profile, todayWeather } = app
  const navigate = useNavigate()
  const toast = useToast()
  const openItem = useOpenItem()
  const [variation, setVariation] = useState(0)

  const today = todayKey()
  const todayPlans = plansByDate(plans).get(today) ?? []
  const todayOutfit = todayPlans.map((p) => outfits.find((o) => o.id === p.outfitId)).find(Boolean)
  const stats = useMemo(() => computeStats(items, outfits), [items, outfits])
  const unit = profile?.settings.temperatureUnit ?? 'celsius'

  const recommendations = useMemo(
    () =>
      recommendOutfits(items, profile, {
        count: 3,
        season: todayWeather ? null : seasonFor(new Date(), profile?.settings.weatherLocation?.latitude),
        condition: todayWeather ? conditionFor(todayWeather) : null,
        rain: todayWeather ? isRainy(todayWeather) : false,
        occasion: profile?.typicalOccasions[0] ?? null,
        variation,
        preferLessWorn: profile?.stylingGoals.includes('use-more'),
      }),
    [items, profile, todayWeather, variation],
  )
  const recent = useMemo(() => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6), [items])
  const inspiration = useMemo(() => {
    const preferred = (profile?.stylePreferences ?? []).map((p) => AESTHETICS.find((a) => a.id === p.aesthetic)).filter((a): a is (typeof AESTHETICS)[number] => Boolean(a))
    return (preferred.length >= 3 ? preferred : [...preferred, ...AESTHETICS.filter((a) => !preferred.includes(a))]).slice(0, 3)
  }, [profile])
  const encouragement = ENCOURAGEMENTS[new Date().getDate() % ENCOURAGEMENTS.length]

  const saveRec = async (index: number) => {
    const rec = recommendations[index]
    try {
      const saved = await app.saveOutfit(
        { name: rec.name, clothingItemIds: rec.items.map((i) => i.id), styleTags: rec.aesthetic ? [rec.aesthetic] : [], occasion: rec.occasion, notes: rec.reasons.join(' ').slice(0, 500), favorite: false },
        { source: 'stylist' },
      )
      toast({ tone: 'success', title: 'Outfit saved', description: saved.name, action: { label: 'Open', onClick: () => navigate(`/studio?outfit=${saved.id}`) } })
    } catch (err) {
      toast({ tone: 'error', title: 'Could not save', description: err instanceof Error ? err.message : undefined })
    }
  }

  const quickActions = [
    { to: '/wardrobe/new', label: 'Add a clothing item', icon: Plus, tint: 'from-lilac to-white' },
    { to: '/studio', label: 'Create an outfit', icon: Sparkles, tint: 'from-blush to-white' },
    { to: '/stylist', label: 'Ask the AI stylist', icon: MessageCircleHeart, tint: 'from-lavender-100 to-white' },
    { to: '/calendar', label: 'Plan the week', icon: CalendarHeart, tint: 'from-cream to-white' },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <section className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-lilac via-white to-blush p-6 shadow-soft md:p-10">
        <SparkleField />
        <Bow className="absolute right-6 top-6 hidden h-10 w-14 rotate-12 text-blush-deep md:block" />
        <div className="relative max-w-xl">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-lavender-600">
            <Sparkle className="h-3 w-3" /> {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight md:text-5xl">
            {greeting()}
            {profile?.displayName ? `, ${profile.displayName}` : ''}.
          </h1>
          <p className="mt-3 text-[15px] text-muted md:text-lg">{encouragement}</p>
          {todayWeather && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs text-muted">
              <CloudSun className="h-3.5 w-3.5" /> {todayWeather.summary} · {formatTemp(todayWeather.tempMinC, unit)}–{formatTemp(todayWeather.tempMaxC, unit)}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink to="/studio" size="lg" icon={<Sparkles className="h-5 w-5" />}>
              Create an outfit
            </ButtonLink>
            <ButtonLink to="/stylist" size="lg" variant="secondary">
              What should I wear?
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Today's outfit */}
        <Card className="flex flex-col">
          <SectionTitle action={<Link to="/calendar" className="text-sm font-medium text-plum hover:underline">Calendar</Link>}>Today’s outfit</SectionTitle>
          {todayOutfit ? (
            <div className="flex flex-1 gap-4">
              <div className="h-56 w-28 shrink-0 rounded-3xl bg-gradient-to-b from-lavender-50 to-blush/40">
                <OutfitPreview items={resolveOutfitItems(todayOutfit.clothingItemIds, items).items} />
              </div>
              <div className="flex min-w-0 flex-col">
                <p className="font-serif text-xl font-semibold">{todayOutfit.name}</p>
                {todayPlans[0]?.occasion && <Badge tone="blush" className="mt-1 self-start">{todayPlans[0].occasion}</Badge>}
                <p className="mt-2 text-sm text-muted">{pluralize(resolveOutfitItems(todayOutfit.clothingItemIds, items).items.length, 'piece')}{todayPlans.length > 1 && ` · +${todayPlans.length - 1} more planned`}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <ButtonLink to={`/studio?outfit=${todayOutfit.id}`} size="sm" variant="secondary">
                    View
                  </ButtonLink>
                  <Button
                    size="sm"
                    onClick={() =>
                      app
                        .markOutfitWorn(todayOutfit.id)
                        .then(() => toast({ tone: 'success', title: 'Enjoy your day!', description: 'Marked as worn.' }))
                        .catch(() => toast({ tone: 'error', title: 'Could not update' }))
                    }
                  >
                    I’m wearing it
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-lavender-50 to-white px-4 py-8 text-center">
              <Hanger className="h-10 w-14 text-lavender" />
              <p className="mt-3 font-serif text-lg font-semibold">Nothing planned for today</p>
              <p className="mt-1 text-sm text-muted">Style something new or pick a saved look.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <ButtonLink to="/studio" size="sm">
                  Style a new look
                </ButtonLink>
                {outfits.length > 0 && (
                  <ButtonLink to={`/calendar?outfit=${outfits[0].id}`} size="sm" variant="secondary">
                    Plan a saved outfit
                  </ButtonLink>
                )}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          {/* Quick actions */}
          <nav aria-label="Quick actions" className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className={`group flex items-center gap-3 rounded-3xl border border-line bg-gradient-to-br ${a.tint} p-4 text-sm font-semibold shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-lavender-600 shadow-soft">
                  <a.icon className="h-5 w-5" aria-hidden />
                </span>
                {a.label}
              </Link>
            ))}
          </nav>

          {/* Overview */}
          <Card>
            <SectionTitle action={<Link to="/insights" className="text-sm font-medium text-plum hover:underline">Insights</Link>}>Wardrobe overview</SectionTitle>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted">Pieces</dt>
                <dd className="font-serif text-3xl font-semibold">{stats.totalItems}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Saved outfits</dt>
                <dd className="font-serif text-3xl font-semibold">{stats.outfitCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Favorite looks</dt>
                <dd className="font-serif text-3xl font-semibold">{stats.favoriteOutfitCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Top categories</dt>
                <dd className="mt-1 text-sm font-medium">{stats.categories.length ? stats.categories.slice(0, 2).map((c) => `${c.label} (${c.count})`).join(', ') : '—'}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {/* Recommendations */}
      <section>
        <SectionTitle
          action={
            recommendations.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setVariation((v) => v + 1)}>
                Shuffle
              </Button>
            )
          }
        >
          Suggested for you
        </SectionTitle>
        {recommendations.length ? (
          <ul className="grid gap-4 md:grid-cols-3">
            {recommendations.map((r, idx) => (
              <li key={r.items.map((i) => i.id).join()} className="flex flex-col overflow-hidden rounded-4xl border border-line bg-white shadow-soft">
                <div className="mx-auto h-60 w-32">
                  <OutfitPreview items={r.items} />
                </div>
                <div className="flex flex-1 flex-col border-t border-line p-4">
                  <p className="font-serif text-lg font-semibold">{r.name}</p>
                  {r.aesthetic && <p className="text-xs text-muted">{aestheticName(r.aesthetic)}</p>}
                  <p className="mt-2 line-clamp-3 text-sm text-muted">{r.reasons.join(' ')}</p>
                  <div className="mt-auto flex gap-2 pt-3">
                    {findOutfitWithItems(outfits, r.items.map((i) => i.id)) ? (
                      <ButtonLink size="sm" variant="soft" to={`/studio?outfit=${findOutfitWithItems(outfits, r.items.map((i) => i.id))?.id}`}>
                        Saved · view
                      </ButtonLink>
                    ) : (
                      <Button size="sm" onClick={() => saveRec(idx)}>
                        Save
                      </Button>
                    )}
                    <ButtonLink size="sm" variant="secondary" to={`/studio?items=${r.items.map((i) => i.id).join(',')}`}>
                      Open in Studio
                    </ButtonLink>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Card className="text-center">
            <p className="text-sm text-muted">Add a few tops and bottoms (or dresses) and shoes, and Lavender will suggest combinations from your wardrobe.</p>
            <ButtonLink to="/wardrobe" size="sm" className="mt-3">
              Go to wardrobe
            </ButtonLink>
          </Card>
        )}
      </section>

      {/* Recently added */}
      <section>
        <SectionTitle action={<Link to="/wardrobe" className="inline-flex items-center gap-1 text-sm font-medium text-plum hover:underline">All pieces <ArrowRight className="h-3.5 w-3.5" /></Link>}>Recently added</SectionTitle>
        {recent.length ? (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {recent.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => openItem(i.id)} className="w-full rounded-3xl border border-line bg-white p-1.5 text-left transition-shadow hover:shadow-soft">
                  <ItemImage item={i} rounded="rounded-2xl" sizes="sm" />
                  <span className="block truncate px-1 pt-1.5 text-xs font-medium">{i.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Card className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <Shirt className="h-8 w-8 text-lavender" />
            <p className="flex-1 text-sm text-muted">Your wardrobe is empty. Add your first piece — a photo is optional.</p>
            <ButtonLink to="/wardrobe/new" size="sm">
              Add your first item
            </ButtonLink>
          </Card>
        )}
      </section>

      {/* Inspiration */}
      <section>
        <SectionTitle action={<Link to="/discover" className="text-sm font-medium text-plum hover:underline">Explore styles</Link>}>Styling inspiration</SectionTitle>
        <ul className="grid gap-4 sm:grid-cols-3">
          {inspiration.map((a) => (
            <li key={a.id}>
              <Link to="/discover" className="block overflow-hidden rounded-4xl border border-line bg-white shadow-soft transition-shadow hover:shadow-lift">
                <Moodboard aesthetic={a} className="aspect-[4/3] rounded-none" />
                <div className="p-4">
                  <p className="font-serif text-lg font-semibold">{a.name}</p>
                  <p className="text-sm text-muted">{a.principles[0]}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">Moodboards are illustrated inspiration, not pieces from your wardrobe.</p>
      </section>
    </div>
  )
}
