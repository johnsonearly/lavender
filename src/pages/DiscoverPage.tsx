import { Blend, Heart, MessageCircleHeart, Sparkles, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Moodboard } from '@/components/aesthetics/Moodboard'
import { Sparkle } from '@/components/decor/Decor'
import { ItemImage } from '@/components/garments/ItemImage'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Badge, Chip, ColorDot } from '@/components/ui/Chip'
import { Dialog } from '@/components/ui/Dialog'
import { Card, PageHeader, SectionTitle, Segmented } from '@/components/ui/Layout'
import { AESTHETICS, blendAesthetics, type AestheticDef } from '@/domain/aesthetics'
import { colorLabel } from '@/domain/colors'
import type { PreferenceStrength } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp } from '@/state/AppProvider'
import { useOpenItem } from '@/state/itemDialog'
import { useToast } from '@/state/toast'

const STRENGTHS: { id: '1' | '2' | '3'; label: string }[] = [
  { id: '1', label: 'A little' },
  { id: '2', label: 'Quite a lot' },
  { id: '3', label: 'Signature' },
]

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-lavender-600">{title}</p>
      <ul className="space-y-1 text-sm text-ink">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <Sparkle className="mt-1 h-2.5 w-2.5 shrink-0 text-lavender" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function DiscoverPage() {
  const { profile, updateProfile, items } = useApp()
  const toast = useToast()
  const navigate = useNavigate()
  const openItem = useOpenItem()
  const [detail, setDetail] = useState<AestheticDef | null>(null)
  const [blend, setBlend] = useState<string[]>(() => profile?.stylePreferences.slice(0, 2).map((p) => p.aesthetic) ?? [])
  const prefs = profile?.stylePreferences ?? []
  const prefOf = (id: string) => prefs.find((p) => p.aesthetic === id)
  const blended = useMemo(() => (blend.length >= 2 ? blendAesthetics(blend) : null), [blend])

  const setPreference = async (id: string, strength: PreferenceStrength | null) => {
    const others = prefs.filter((p) => p.aesthetic !== id)
    const next = strength ? [...others, { aesthetic: id, preferenceStrength: strength }] : others
    try {
      await updateProfile({ stylePreferences: next })
      toast({ tone: 'success', title: strength ? 'Saved to your style profile' : 'Removed from your style profile' })
    } catch (err) {
      toast({ tone: 'error', title: 'Could not update your preferences', description: err instanceof Error ? err.message : undefined })
    }
  }

  const wardrobeMatches = (id: string) => items.filter((i) => i.styleTags.includes(id))

  return (
    <>
      <PageHeader
        eyebrow="Find your style"
        title="Style Discovery"
        description="Browse aesthetics, blend them into your own mix, and save what resonates. Moodboards are editorial inspiration — not items you own."
        actions={
          <ButtonLink to="/discover/quiz" icon={<Wand2 className="h-4 w-4" />}>
            Take the style quiz
          </ButtonLink>
        }
      />

      {prefs.length > 0 && (
        <Card className="mb-6 bg-gradient-to-br from-lilac/60 to-white">
          <SectionTitle>Your style mix</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {[...prefs]
              .sort((a, b) => b.preferenceStrength - a.preferenceStrength)
              .map((p) => {
                const a = AESTHETICS.find((x) => x.id === p.aesthetic)
                return (
                  <button key={p.aesthetic} type="button" onClick={() => a && setDetail(a)} className="flex items-center gap-2 rounded-full border border-line bg-white py-1.5 pl-3 pr-2 text-sm font-medium hover:border-lavender">
                    {a?.name ?? p.aesthetic}
                    <span className="flex gap-0.5" aria-label={`strength ${p.preferenceStrength} of 3`}>
                      {[1, 2, 3].map((n) => (
                        <Heart key={n} className={cn('h-3 w-3', n <= p.preferenceStrength ? 'fill-plum text-plum' : 'text-line')} />
                      ))}
                    </span>
                  </button>
                )
              })}
          </div>
        </Card>
      )}

      <Card className="mb-8">
        <SectionTitle action={<Blend className="h-5 w-5 text-lavender-600" />}>Blend aesthetics</SectionTitle>
        <p className="mb-3 text-sm text-muted">Choose two or three aesthetics to see how they combine — you don’t have to fit one box.</p>
        <div className="flex flex-wrap gap-2">
          {AESTHETICS.map((a) => (
            <Chip
              key={a.id}
              selected={blend.includes(a.id)}
              disabled={!blend.includes(a.id) && blend.length >= 3}
              onClick={() => setBlend((b) => (b.includes(a.id) ? b.filter((x) => x !== a.id) : [...b, a.id]))}
            >
              {a.name}
            </Chip>
          ))}
        </div>
        {blended ? (
          <div className="mt-5 grid gap-5 rounded-3xl bg-cream p-4 md:grid-cols-[1fr_2fr] md:p-5">
            <div>
              <p className="font-serif text-2xl font-semibold text-plum">{blended.name}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {blended.palette.map((c) => (
                  <span key={c} className="flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-xs">
                    <ColorDot color={c} size="sm" /> {colorLabel(c)}
                  </span>
                ))}
              </div>
              <Button
                className="mt-4"
                size="sm"
                variant="soft"
                icon={<MessageCircleHeart className="h-4 w-4" />}
                onClick={() => navigate(`/stylist?prompt=${encodeURIComponent(`Give me outfits that blend ${blended.name.replace(/ × /g, ' and ').toLowerCase()} from my wardrobe.`)}`)}
              >
                Ask the stylist
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <List title="Key pieces" items={blended.garments} />
              <List title="Styling principles" items={blended.principles} />
              <List title="Footwear" items={blended.footwear} />
              <List title="Accessories" items={blended.accessories} />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">Pick at least two to see the blend.</p>
        )}
      </Card>

      <SectionTitle>Aesthetic library</SectionTitle>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AESTHETICS.map((a) => {
          const pref = prefOf(a.id)
          return (
            <li key={a.id}>
              <article className="flex h-full flex-col overflow-hidden rounded-4xl border border-line bg-white shadow-soft transition-shadow hover:shadow-lift">
                <button type="button" onClick={() => setDetail(a)} className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lavender" aria-label={`Explore ${a.name}`}>
                  <Moodboard aesthetic={a} className="aspect-[16/10] rounded-none" />
                </button>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-serif text-xl font-semibold">{a.name}</h3>
                      <p className="text-xs text-muted">{a.tagline}</p>
                    </div>
                    {pref && (
                      <Badge tone="plum">
                        <Heart className="h-3 w-3 fill-current" /> Saved
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">{a.description}</p>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setDetail(a)}>
                      Explore
                    </Button>
                    <Button size="sm" variant={pref ? 'soft' : 'primary'} icon={<Heart className={cn('h-4 w-4', pref && 'fill-current')} />} onClick={() => setPreference(a.id, pref ? null : 2)} aria-pressed={Boolean(pref)}>
                      {pref ? 'Saved' : 'Save to my style'}
                    </Button>
                  </div>
                </div>
              </article>
            </li>
          )
        })}
      </ul>

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.name ?? ''} description={detail?.tagline} size="xl">
        {detail && (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div>
              <Moodboard aesthetic={detail} className="aspect-[4/5]" />
              <p className="mt-2 text-center text-xs text-muted">Editorial inspiration · illustrated</p>
            </div>
            <div className="space-y-5">
              <p className="text-[15px] leading-relaxed text-ink">{detail.description}</p>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-lavender-600">Characteristic colors</p>
                <div className="flex flex-wrap gap-2">
                  {detail.palette.map((c) => (
                    <span key={c} className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs">
                      <ColorDot color={c} size="sm" /> {colorLabel(c)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <List title="Common pieces" items={detail.garments} />
                <List title="Footwear" items={detail.footwear} />
                <List title="Accessories" items={detail.accessories} />
                <List title="Styling principles" items={detail.principles} />
              </div>
              <div className="rounded-3xl bg-lavender-50 p-4">
                <p className="mb-2 text-sm font-semibold">How much is this you?</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Segmented
                    label={`Preference strength for ${detail.name}`}
                    value={String(prefOf(detail.id)?.preferenceStrength ?? '') as '1' | '2' | '3'}
                    onChange={(v) => setPreference(detail.id, Number(v) as PreferenceStrength)}
                    options={STRENGTHS}
                    className="flex-wrap"
                  />
                  {prefOf(detail.id) && (
                    <Button size="sm" variant="ghost" onClick={() => setPreference(detail.id, null)}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  In your wardrobe <Badge tone="outline">tagged {detail.name}</Badge>
                </p>
                {wardrobeMatches(detail.id).length ? (
                  <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {wardrobeMatches(detail.id).slice(0, 10).map((i) => (
                      <li key={i.id}>
                        <button
                          type="button"
                          className="w-full"
                          onClick={() => {
                            setDetail(null)
                            openItem(i.id)
                          }}
                          title={i.name}
                        >
                          <ItemImage item={i} rounded="rounded-2xl" sizes="sm" />
                          <span className="sr-only">{i.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">No pieces tagged with this aesthetic yet. Add the tag when editing a piece.</p>
                )}
              </div>
              <Button
                variant="secondary"
                icon={<Sparkles className="h-4 w-4" />}
                onClick={() => {
                  setDetail(null)
                  navigate(`/stylist?prompt=${encodeURIComponent(`Put together a ${detail.name.toLowerCase()} outfit for me.`)}`)
                }}
              >
                Ask the stylist for a {detail.name.toLowerCase()} look
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}
