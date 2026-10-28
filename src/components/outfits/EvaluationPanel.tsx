import { AlertTriangle, CheckCircle2, CloudSun, Info, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import type { EvaluationNote, OutfitEvaluation } from '@/domain/evaluation'
import { formatTemp, type WeatherDay } from '@/domain/weather'
import { cn } from '@/lib/utils'

const TONE = {
  good: { icon: CheckCircle2, className: 'text-emerald-600', bg: 'bg-emerald-50' },
  tip: { icon: Lightbulb, className: 'text-lavender-600', bg: 'bg-lavender-50' },
  caution: { icon: AlertTriangle, className: 'text-amber-600', bg: 'bg-amber-50' },
} as const

function Note({ note }: { note: EvaluationNote }) {
  const tone = TONE[note.tone]
  const Icon = tone.icon
  return (
    <li className={cn('flex gap-3 rounded-2xl p-3', tone.bg)}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone.className)} aria-hidden />
      <div>
        <p className="text-sm font-semibold text-ink">{note.title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted">{note.detail}</p>
      </div>
    </li>
  )
}

export function EvaluationPanel({
  evaluation,
  showScore,
  weather,
  weatherStatus,
  unit,
}: {
  evaluation: OutfitEvaluation
  showScore: boolean
  weather: WeatherDay | null
  weatherStatus: string
  unit: 'celsius' | 'fahrenheit'
}) {
  const [scoreHidden, setScoreHidden] = useState(false)
  if (!evaluation.notes.length) {
    return <p className="text-sm text-muted">Add a few pieces to get styling feedback.</p>
  }
  return (
    <div className="space-y-4">
      {showScore && !scoreHidden && (
        <div className="rounded-3xl border border-line bg-gradient-to-br from-lilac/60 to-white p-4">
          <div className="flex items-center gap-4">
            <div className="relative grid h-16 w-16 shrink-0 place-items-center">
              <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#EDE5FF" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#7752CF" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(evaluation.score / 100) * 97.4} 97.4`} />
              </svg>
              <span className="font-serif text-lg font-semibold text-plum">{evaluation.score}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Harmony estimate</p>
              <p className="text-xs leading-relaxed text-muted">
                A rough heuristic from colors, tags and occasion — not a judgement of the outfit or of you. Trust your own eye.
              </p>
              <button type="button" className="mt-1 text-xs font-medium text-plum underline-offset-2 hover:underline" onClick={() => setScoreHidden(true)}>
                Hide score
              </button>
            </div>
          </div>
        </div>
      )}
      <ul className="space-y-2" aria-label="Styling notes">
        {evaluation.notes.map((n, i) => (
          <Note key={`${n.aspect}-${i}`} note={n} />
        ))}
      </ul>
      <p className="flex items-center gap-2 text-xs text-muted">
        {weather ? <CloudSun className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
        {weather
          ? `Weather from ${weather.source}: ${weather.summary}, ${formatTemp(weather.tempMinC, unit)}–${formatTemp(weather.tempMaxC, unit)}.`
          : weatherStatus}
      </p>
    </div>
  )
}
