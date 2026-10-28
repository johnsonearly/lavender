import { ArrowLeft, ArrowRight, Check, Heart, Shirt, Sparkles } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AestheticCard } from '@/components/aesthetics/Moodboard'
import { Bow, Hanger, Logo, Sparkle, SparkleField } from '@/components/decor/Decor'
import { OutfitPreview } from '@/components/garments/OutfitPreview'
import { Button } from '@/components/ui/Button'
import { Badge, ColorDot, MultiChips } from '@/components/ui/Chip'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { Field, FieldGroup, Input, Select } from '@/components/ui/Form'
import { Segmented } from '@/components/ui/Layout'
import { BRAND } from '@/config/brand'
import { AESTHETICS, aestheticName } from '@/domain/aesthetics'
import { CATEGORIES, type CategoryId } from '@/domain/categories'
import { OCCASIONS, occasionLabel } from '@/domain/occasions'
import { FIT_LABELS, FITS, STYLING_GOALS, type Fit, type StylePreference } from '@/domain/types'
import { cn } from '@/lib/utils'
import { HERO_LOOK } from '@/rendering/displayItems'
import { useApp } from '@/state/AppProvider'
import { useToast } from '@/state/toast'

const STEPS = ['Welcome', 'Your style', 'Your goals', 'Preferences', 'All set'] as const

export default function OnboardingPage() {
  const { profile, updateProfile, loadSampleWardrobe, items } = useApp()
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState<'sample' | 'empty' | 'skip' | null>(null)

  const [name, setName] = useState(profile?.displayName ?? '')
  const [aesthetics, setAesthetics] = useState<string[]>(profile?.stylePreferences.map((p) => p.aesthetic) ?? [])
  const [goals, setGoals] = useState<string[]>(profile?.stylingGoals ?? [])
  const [favoriteColors, setFavoriteColors] = useState<string[]>(profile?.favoriteColors ?? [])
  const [avoidedColors, setAvoidedColors] = useState<string[]>(profile?.avoidedColors ?? [])
  const [categories, setCategories] = useState<CategoryId[]>(profile?.preferredCategories ?? [])
  const [occasions, setOccasions] = useState<string[]>(profile?.typicalOccasions ?? [])
  const [fit, setFit] = useState<Fit | 'none'>(profile?.preferredFit ?? 'none')
  const [budget, setBudget] = useState(profile?.budget ? String(profile.budget.amount) : '')
  const [currency, setCurrency] = useState(profile?.budget?.currency ?? 'USD')
  const [budgetError, setBudgetError] = useState<string | null>(null)

  const returning = Boolean(profile?.onboardingCompleted)
  const hasSample = items.some((i) => i.isSample)

  const finish = async (withSample: boolean, kind: 'sample' | 'empty' | 'skip') => {
    setBusy(kind)
    try {
      const amount = budget.trim() ? Number(budget) : null
      const existing = new Map((profile?.stylePreferences ?? []).map((p) => [p.aesthetic, p.preferenceStrength]))
      const stylePreferences: StylePreference[] = aesthetics.map((a) => ({ aesthetic: a, preferenceStrength: existing.get(a) ?? 2 }))
      await updateProfile({
        displayName: name.trim().slice(0, 40),
        stylePreferences,
        stylingGoals: goals,
        favoriteColors,
        avoidedColors,
        preferredCategories: categories,
        typicalOccasions: occasions,
        preferredFit: fit === 'none' ? null : fit,
        budget: amount !== null && Number.isFinite(amount) && amount >= 0 ? { amount, currency } : null,
        onboardingCompleted: true,
      })
      if (withSample) {
        const added = await loadSampleWardrobe()
        if (added) toast({ tone: 'success', title: 'Sample wardrobe added', description: `${added} sample pieces and a few outfits to explore. You can remove them in Settings.` })
      }
      navigate(withSample ? '/wardrobe' : '/', { replace: true })
    } catch (err) {
      toast({ tone: 'error', title: 'Could not save your profile', description: err instanceof Error ? err.message : undefined })
      setBusy(null)
    }
  }

  const next = () => {
    if (step === 3 && budget.trim() && (!Number.isFinite(Number(budget)) || Number(budget) < 0)) {
      setBudgetError('Enter a positive number, or leave it empty.')
      return
    }
    setBudgetError(null)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-lilac/60 via-cream to-blush/50">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between">
          <Logo />
          {step > 0 && step < 4 && (
            <button type="button" className="text-sm font-medium text-muted underline-offset-4 hover:text-plum hover:underline" onClick={() => setStep(4)}>
              Skip the rest
            </button>
          )}
        </header>

        {step > 0 && (
          <nav aria-label="Onboarding progress" className="mt-6">
            <ol className="flex gap-1.5">
              {STEPS.map((s, i) => (
                <li key={s} className="flex-1">
                  <span className={cn('block h-1.5 rounded-full transition-colors', i <= step ? 'bg-plum' : 'bg-white')} />
                  <span className={cn('mt-1.5 hidden text-xs sm:block', i === step ? 'font-semibold text-plum' : 'text-muted')} aria-current={i === step ? 'step' : undefined}>
                    {s}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <main className="flex flex-1 flex-col py-6" aria-live="polite">
          {step === 0 && (
            <section className="grid flex-1 items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
              <div className="animate-fade-up">
                <Badge tone="plum" className="mb-4">
                  <Sparkle className="h-3 w-3" /> Your personal stylist
                </Badge>
                <h1 className="font-serif text-4xl font-semibold leading-[1.1] text-ink md:text-5xl">
                  Fall back in love with <em className="text-plum">your</em> wardrobe.
                </h1>
                <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{BRAND.description}</p>
                <ul className="mt-6 space-y-3 text-[15px] text-ink">
                  {[
                    [Shirt, 'Digitize and organize the clothes you already own'],
                    [Sparkles, 'Mix outfits on a styling mannequin and get gentle feedback'],
                    [Heart, 'Get looks for any occasion, plan your week, discover your style'],
                  ].map(([Icon, text]) => {
                    const I = Icon as typeof Shirt
                    return (
                      <li key={text as string} className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-lavender-600 shadow-soft">
                          <I className="h-4 w-4" aria-hidden />
                        </span>
                        {text as string}
                      </li>
                    )
                  })}
                </ul>
                <div className="mt-8 max-w-sm">
                  <Field label="What should we call you?" optional hint="Only used for your greeting.">
                    {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" maxLength={40} autoComplete="given-name" />}
                  </Field>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button size="lg" onClick={() => setStep(1)} icon={<Hanger className="h-5 w-6" />}>
                    {returning ? 'Update my style profile' : 'Set up my wardrobe'}
                  </Button>
                  <Button variant="ghost" onClick={() => finish(false, 'skip')} loading={busy === 'skip'}>
                    {returning ? 'Back to the app' : 'Skip and explore'}
                  </Button>
                </div>
              </div>
              <div className="relative mx-auto aspect-[3/4] w-full max-w-sm">
                <div className="absolute inset-4 rounded-[3rem] bg-gradient-to-b from-white to-lilac shadow-lift" />
                <SparkleField />
                <Bow className="absolute -left-2 top-10 h-10 w-14 rotate-[-12deg] text-blush-deep" />
                <div className="absolute inset-x-10 bottom-6 top-8">
                  <OutfitPreview items={HERO_LOOK} label="Illustrated styling mannequin wearing a white blouse, lavender midi skirt and blush flats" />
                </div>
                <p className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs text-muted shadow-soft">Illustrated styling preview</p>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="animate-fade-up">
              <StepHeading title="Which aesthetics feel like you?" subtitle="Choose as many as you like — most people are a mix. You can change these anytime." />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {AESTHETICS.map((a) => (
                  <AestheticCard
                    key={a.id}
                    aesthetic={a}
                    description={false}
                    selected={aesthetics.includes(a.id)}
                    onToggle={() => setAesthetics((s) => (s.includes(a.id) ? s.filter((x) => x !== a.id) : [...s, a.id]))}
                  />
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="animate-fade-up">
              <StepHeading title="What would you like help with?" subtitle="Pick your styling goals so we can focus on what matters to you." />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {STYLING_GOALS.map((g) => {
                  const selected = goals.includes(g.id)
                  return (
                    <button
                      key={g.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setGoals((s) => (selected ? s.filter((x) => x !== g.id) : [...s, g.id]))}
                      className={cn(
                        'flex items-center gap-3 rounded-3xl border bg-white p-4 text-left text-[15px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender',
                        selected ? 'border-plum shadow-lift' : 'border-line hover:shadow-soft',
                      )}
                    >
                      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', selected ? 'bg-plum text-white' : 'bg-lilac text-plum')}>
                        {selected ? <Check className="h-4 w-4" /> : <Sparkle className="h-4 w-4" />}
                      </span>
                      {g.label}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="animate-fade-up">
              <StepHeading title="A few practical preferences" subtitle="Everything here is optional. We never ask for body measurements." />
              <div className="grid gap-6 rounded-4xl border border-line bg-white/90 p-5 shadow-soft md:grid-cols-2 md:p-7">
                <FieldGroup label="Colors you love" optional>
                  <ColorPicker label="Colors you love" value={favoriteColors} onChange={setFavoriteColors} disabledIds={avoidedColors} />
                </FieldGroup>
                <FieldGroup label="Colors you rarely wear" optional>
                  <ColorPicker label="Colors you rarely wear" value={avoidedColors} onChange={setAvoidedColors} disabledIds={favoriteColors} />
                </FieldGroup>
                <FieldGroup label="Pieces you reach for most" optional className="md:col-span-2">
                  <MultiChips options={CATEGORIES.filter((c) => c.id !== 'other').map((c) => ({ id: c.id, label: c.label }))} value={categories} onChange={setCategories} />
                </FieldGroup>
                <FieldGroup label="Where you usually dress for" optional className="md:col-span-2">
                  <MultiChips options={OCCASIONS.map((o) => ({ id: o.id, label: o.label }))} value={occasions} onChange={setOccasions} />
                </FieldGroup>
                <FieldGroup label="Preferred fit" optional>
                  <Segmented
                    label="Preferred fit"
                    className="flex-wrap rounded-3xl"
                    value={fit}
                    onChange={setFit}
                    options={[{ id: 'none' as const, label: 'No preference' }, ...FITS.map((f) => ({ id: f, label: FIT_LABELS[f] }))]}
                  />
                </FieldGroup>
                <div className="grid grid-cols-[1fr_110px] gap-2">
                  <Field label="Budget for future additions" optional error={budgetError} hint="Only used if you ask for shopping ideas.">
                    {(p) => <Input {...p} inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 150" />}
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
            </section>
          )}

          {step === 4 && (
            <section className="animate-fade-up">
              <StepHeading title={`You're all set${name.trim() ? `, ${name.trim()}` : ''}!`} subtitle="Here's your style profile. It will shape your recommendations, and you can edit it any time in Settings." />
              <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard title="Aesthetics">{aesthetics.length ? aesthetics.map(aestheticName).join(', ') : 'Still exploring — try the style quiz later.'}</SummaryCard>
                <SummaryCard title="Goals">{goals.length ? goals.map((g) => STYLING_GOALS.find((x) => x.id === g)?.label).join(' · ') : 'No goals chosen yet.'}</SummaryCard>
                <SummaryCard title="Colors">
                  {favoriteColors.length ? (
                    <span className="flex flex-wrap gap-1.5">
                      {favoriteColors.map((c) => (
                        <ColorDot key={c} color={c} />
                      ))}
                    </span>
                  ) : (
                    'No favorites yet.'
                  )}
                  {occasions.length > 0 && <span className="mt-2 block text-xs text-muted">Usually dressing for: {occasions.map(occasionLabel).join(', ')}</span>}
                </SummaryCard>
              </div>

              {!hasSample && !returning ? (
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <ChoiceCard
                    title="Explore with a sample wardrobe"
                    text="15 illustrated sample pieces and 4 outfits, clearly marked as samples. Remove them anytime in Settings."
                    action={<Button onClick={() => finish(true, 'sample')} loading={busy === 'sample'} disabled={busy !== null}>Start with samples</Button>}
                    highlight
                  />
                  <ChoiceCard
                    title="Start with an empty closet"
                    text="Jump straight in and add your own clothes with photos."
                    action={<Button variant="secondary" onClick={() => finish(false, 'empty')} loading={busy === 'empty'} disabled={busy !== null}>Start empty</Button>}
                  />
                </div>
              ) : (
                <div className="mt-8">
                  <Button size="lg" onClick={() => finish(false, 'empty')} loading={busy === 'empty'}>
                    Save and continue
                  </Button>
                </div>
              )}
            </section>
          )}
        </main>

        {step > 0 && step < 4 && (
          <footer className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-line bg-cream/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-full sm:border sm:px-3">
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} icon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
            <span className="text-sm text-muted">
              Step {step} of {STEPS.length - 1}
            </span>
            <Button onClick={next}>
              {step === 3 ? 'Finish' : 'Continue'} <ArrowRight className="h-4 w-4" />
            </Button>
          </footer>
        )}
      </div>
    </div>
  )
}

function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-serif text-3xl font-semibold text-ink md:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>
    </div>
  )
}

function SummaryCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-soft">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-lavender-600">{title}</p>
      <div className="text-sm leading-relaxed text-ink">{children}</div>
    </div>
  )
}

function ChoiceCard({ title, text, action, highlight }: { title: string; text: string; action: ReactNode; highlight?: boolean }) {
  return (
    <div className={cn('flex flex-col rounded-4xl border p-6', highlight ? 'border-lavender bg-gradient-to-br from-lilac to-white shadow-lift' : 'border-line bg-white')}>
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      <p className="mb-5 mt-1.5 flex-1 text-sm text-muted">{text}</p>
      <div>{action}</div>
    </div>
  )
}
