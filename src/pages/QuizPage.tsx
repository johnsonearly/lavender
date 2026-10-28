import { ArrowLeft, Check, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Moodboard } from '@/components/aesthetics/Moodboard'
import { Sparkle, SparkleField } from '@/components/decor/Decor'
import { GarmentArt } from '@/components/garments/GarmentLayer'
import { OutfitPreview } from '@/components/garments/OutfitPreview'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Layout'
import { AESTHETICS, getAesthetic } from '@/domain/aesthetics'
import { colorHex } from '@/domain/colors'
import type { PreferenceStrength, StylePreference } from '@/domain/types'
import { cn } from '@/lib/utils'
import { displayItem } from '@/rendering/displayItems'
import type { ArtKind } from '@/rendering/garmentShapes'
import { useApp } from '@/state/AppProvider'
import { useToast } from '@/state/toast'

type Visual =
  | { kind: 'look'; items: ReturnType<typeof displayItem>[] }
  | { kind: 'palette'; colors: string[] }
  | { kind: 'art'; art: ArtKind; colors: string[]; pattern?: 'floral' | 'striped' | 'plaid' | 'graphic' | 'solid' }
  | { kind: 'text'; emoji: string }

interface Option {
  label: string
  visual: Visual
  weights: Record<string, number>
}

interface Question {
  title: string
  options: Option[]
}

const d = displayItem

const QUESTIONS: Question[] = [
  {
    title: 'Pick a Saturday outfit',
    options: [
      { label: 'Jeans, tee & sneakers', visual: { kind: 'look', items: [d('a', 'tshirts', 'crew', ['white']), d('b', 'jeans', 'straight', ['denim']), d('c', 'shoes', 'sneakers', ['white'])] }, weights: { casual: 2, streetwear: 1, sporty: 1 } },
      { label: 'Floral dress & flats', visual: { kind: 'look', items: [d('a', 'dresses', 'midi-dress', ['blush', 'sage'], 'floral'), d('c', 'shoes', 'flats', ['cream'])] }, weights: { romantic: 2, feminine: 2, bohemian: 1 } },
      { label: 'Tailored & polished', visual: { kind: 'look', items: [d('a', 'shirts', 'blouse', ['cream']), d('b', 'trousers', 'tailored', ['black']), d('c', 'shoes', 'loafers', ['black'])] }, weights: { minimalist: 2, chic: 1, 'old-money': 1, 'business-casual': 1 } },
      { label: 'Mini skirt & a bow', visual: { kind: 'look', items: [d('a', 'tops', 'camisole', ['blush']), d('b', 'skirts', 'mini', ['white']), d('c', 'shoes', 'flats', ['pink']), d('d', 'accessories', 'hair', ['pink'])] }, weights: { coquette: 3, feminine: 1 } },
    ],
  },
  {
    title: 'Which palette feels most like you?',
    options: [
      { label: 'Quiet neutrals', visual: { kind: 'palette', colors: ['white', 'beige', 'camel', 'grey', 'black'] }, weights: { minimalist: 2, 'old-money': 1, elegant: 1 } },
      { label: 'Soft pastels', visual: { kind: 'palette', colors: ['blush', 'lilac', 'lavender', 'cream', 'light-blue'] }, weights: { coquette: 2, feminine: 2, romantic: 1 } },
      { label: 'Warm earth tones', visual: { kind: 'palette', colors: ['camel', 'mustard', 'olive', 'brown', 'orange'] }, weights: { bohemian: 2, vintage: 2 } },
      { label: 'Black & contrast', visual: { kind: 'palette', colors: ['black', 'charcoal', 'white', 'silver', 'burgundy'] }, weights: { edgy: 2, streetwear: 1, chic: 1 } },
      { label: 'Navy, green & cream', visual: { kind: 'palette', colors: ['navy', 'cream', 'green', 'white', 'red'] }, weights: { preppy: 2, 'old-money': 1, 'business-casual': 1 } },
    ],
  },
  {
    title: 'Your go-to shoes',
    options: [
      { label: 'Sneakers', visual: { kind: 'art', art: 'sneakers', colors: ['white'] }, weights: { casual: 1, sporty: 2, streetwear: 1 } },
      { label: 'Ballet flats', visual: { kind: 'art', art: 'flats', colors: ['blush'] }, weights: { feminine: 1, coquette: 1, preppy: 1 } },
      { label: 'Loafers', visual: { kind: 'art', art: 'loafers', colors: ['brown'] }, weights: { 'old-money': 2, preppy: 1, minimalist: 1, 'business-casual': 1 } },
      { label: 'Boots', visual: { kind: 'art', art: 'boots', colors: ['black'] }, weights: { edgy: 2, bohemian: 1, vintage: 1 } },
      { label: 'Heels', visual: { kind: 'art', art: 'heels', colors: ['burgundy'] }, weights: { elegant: 2, chic: 1 } },
    ],
  },
  {
    title: 'How do you feel about prints?',
    options: [
      { label: 'Solids, always', visual: { kind: 'art', art: 'tee', colors: ['beige'] }, weights: { minimalist: 2, elegant: 1 } },
      { label: 'Florals please', visual: { kind: 'art', art: 'blouse', colors: ['cream', 'pink'], pattern: 'floral' }, weights: { romantic: 2, bohemian: 1, feminine: 1 } },
      { label: 'Stripes & plaid', visual: { kind: 'art', art: 'skirtMini', colors: ['green', 'navy'], pattern: 'plaid' }, weights: { preppy: 2, vintage: 1, casual: 1 } },
      { label: 'Bold graphics', visual: { kind: 'art', art: 'hoodie', colors: ['black', 'orange'], pattern: 'graphic' }, weights: { streetwear: 2, edgy: 1 } },
    ],
  },
  {
    title: 'Pick a bag',
    options: [
      { label: 'Roomy tote', visual: { kind: 'art', art: 'tote', colors: ['camel'] }, weights: { 'business-casual': 2, minimalist: 1, casual: 1 } },
      { label: 'Crossbody', visual: { kind: 'art', art: 'crossbody', colors: ['black'] }, weights: { casual: 1, streetwear: 1, sporty: 1 } },
      { label: 'Evening clutch', visual: { kind: 'art', art: 'clutch', colors: ['gold'] }, weights: { elegant: 2, chic: 1 } },
      { label: 'Structured handbag', visual: { kind: 'art', art: 'handbag', colors: ['burgundy'] }, weights: { 'old-money': 1, chic: 2, vintage: 1 } },
    ],
  },
  {
    title: 'Your ideal weekend plan',
    options: [
      { label: 'Brunch & a gallery', visual: { kind: 'text', emoji: '🖼️' }, weights: { chic: 2, elegant: 1, minimalist: 1 } },
      { label: 'Yoga & a long walk', visual: { kind: 'text', emoji: '🧘' }, weights: { sporty: 3, casual: 1 } },
      { label: 'Thrift shopping', visual: { kind: 'text', emoji: '🛍️' }, weights: { vintage: 2, bohemian: 1, streetwear: 1 } },
      { label: 'A live concert', visual: { kind: 'text', emoji: '🎸' }, weights: { edgy: 2, streetwear: 1 } },
      { label: 'Picnic in the park', visual: { kind: 'text', emoji: '🧺' }, weights: { romantic: 2, coquette: 1, feminine: 1 } },
      { label: 'Tennis & lunch at the club', visual: { kind: 'text', emoji: '🎾' }, weights: { preppy: 2, 'old-money': 2 } },
    ],
  },
]

function OptionVisual({ visual }: { visual: Visual }) {
  switch (visual.kind) {
    case 'look':
      return (
        <div className="mx-auto h-36 w-16">
          <OutfitPreview items={visual.items} label="" />
        </div>
      )
    case 'palette':
      return (
        <div className="flex h-36 items-center justify-center gap-1">
          {visual.colors.map((c, i) => (
            <span key={c} className="h-20 w-6 rounded-full ring-1 ring-black/10" style={{ background: colorHex(c), transform: `translateY(${(i % 2) * 10 - 5}px)` }} />
          ))}
        </div>
      )
    case 'art':
      return <GarmentArt art={visual.art} colors={visual.colors} pattern={visual.pattern ?? 'solid'} className="mx-auto h-36 w-28" />
    case 'text':
      return (
        <div className="grid h-24 place-items-center text-4xl" aria-hidden>
          {visual.emoji}
        </div>
      )
  }
}

export function scoreQuiz(answers: (number | null)[]): { id: string; percent: number }[] {
  const totals = new Map<string, number>()
  answers.forEach((choice, q) => {
    if (choice === null) return
    const option = QUESTIONS[q]?.options[choice]
    if (!option) return
    for (const [id, w] of Object.entries(option.weights)) totals.set(id, (totals.get(id) ?? 0) + w)
  })
  const sum = [...totals.values()].reduce((s, v) => s + v, 0) || 1
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([id, v]) => ({ id, percent: Math.round((v / sum) * 100) }))
}

export default function QuizPage() {
  const { profile, updateProfile } = useApp()
  const toast = useToast()
  const navigate = useNavigate()
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUESTIONS.map(() => null))
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const done = step >= QUESTIONS.length
  const results = useMemo(() => (done ? scoreQuiz(answers).slice(0, 3) : []), [done, answers])

  const choose = (index: number) => {
    setAnswers((a) => a.map((v, i) => (i === step ? index : v)))
    window.setTimeout(() => setStep((s) => s + 1), 220)
  }

  const save = async () => {
    setSaving(true)
    const strengths: PreferenceStrength[] = [3, 2, 1]
    const merged = new Map((profile?.stylePreferences ?? []).map((p) => [p.aesthetic, p.preferenceStrength]))
    results.forEach((r, i) => merged.set(r.id, Math.max(merged.get(r.id) ?? 0, strengths[i]) as PreferenceStrength))
    const stylePreferences: StylePreference[] = [...merged.entries()].map(([aesthetic, preferenceStrength]) => ({ aesthetic, preferenceStrength }))
    try {
      await updateProfile({ stylePreferences })
      toast({ tone: 'success', title: 'Style profile updated', description: 'Recommendations will lean into your results.' })
      navigate('/discover')
    } catch (err) {
      toast({ tone: 'error', title: 'Could not save results', description: err instanceof Error ? err.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/discover" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-plum">
        <ArrowLeft className="h-4 w-4" /> Style Discovery
      </Link>

      {!done ? (
        <section aria-labelledby="quiz-q" className="animate-fade-up" key={step}>
          <div className="mb-2 flex items-center justify-between text-sm text-muted">
            <span>
              Question {step + 1} of {QUESTIONS.length}
            </span>
            {step > 0 && (
              <button type="button" className="font-medium hover:text-plum" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            )}
          </div>
          <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-plum transition-all" style={{ width: `${(step / QUESTIONS.length) * 100}%` }} />
          </div>
          <h1 id="quiz-q" className="mb-6 font-serif text-3xl font-semibold md:text-4xl">
            {QUESTIONS[step].title}
          </h1>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {QUESTIONS[step].options.map((o, i) => {
              const selected = answers[step] === i
              return (
                <li key={o.label}>
                  <button
                    type="button"
                    onClick={() => choose(i)}
                    aria-pressed={selected}
                    className={cn(
                      'flex h-full w-full flex-col rounded-4xl border bg-white p-3 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender',
                      selected ? 'border-plum shadow-lift ring-2 ring-plum/20' : 'border-line hover:-translate-y-0.5 hover:shadow-soft',
                    )}
                  >
                    <div className="rounded-3xl bg-gradient-to-b from-lavender-50 to-blush/30 py-2">
                      <OptionVisual visual={o.visual} />
                    </div>
                    <span className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold">
                      {selected && <Check className="h-4 w-4 text-plum" />}
                      {o.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <button type="button" className="mt-5 text-sm text-muted underline-offset-4 hover:text-plum hover:underline" onClick={() => setStep((s) => s + 1)}>
            Skip this question
          </button>
        </section>
      ) : results.length === 0 ? (
        <Card className="text-center">
          <h1 className="font-serif text-2xl font-semibold">No answers yet</h1>
          <p className="mt-2 text-sm text-muted">Answer at least one question to see your style profile.</p>
          <Button className="mt-4" onClick={() => setStep(0)}>
            Start again
          </Button>
        </Card>
      ) : (
        <section className="animate-fade-up">
          <div className="relative mb-6 overflow-hidden rounded-4xl bg-gradient-to-br from-plum to-lavender-600 p-6 text-white md:p-8">
            <SparkleField />
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-lavender-200">
              <Sparkle className="h-3 w-3" /> Your style profile
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">{results.map((r) => getAesthetic(r.id)?.name).join(' · ')}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">A mix, not a box. These percentages describe your answers today — your style can and will evolve.</p>
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {results.map((r) => {
              const a = AESTHETICS.find((x) => x.id === r.id)
              if (!a) return null
              return (
                <li key={r.id} className="overflow-hidden rounded-4xl border border-line bg-white shadow-soft">
                  <Moodboard aesthetic={a} className="aspect-[4/3] rounded-none" />
                  <div className="p-4">
                    <div className="flex items-baseline justify-between">
                      <h2 className="font-serif text-xl font-semibold">{a.name}</h2>
                      <span className="font-serif text-lg text-plum">{r.percent}%</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-lilac">
                      <div className="h-full rounded-full bg-plum" style={{ width: `${Math.min(100, r.percent * 2)}%` }} />
                    </div>
                    <p className="mt-3 text-sm text-muted">{a.principles[0]}.</p>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={save} loading={saving}>
              Save to my style profile
            </Button>
            <Button
              variant="secondary"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={() => {
                setAnswers(QUESTIONS.map(() => null))
                setStep(0)
              }}
            >
              Retake quiz
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
