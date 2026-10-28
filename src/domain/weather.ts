/** A real weather reading for one day. Only ever constructed from a live data source. */
export interface WeatherDay {
  date: string
  tempMaxC: number
  tempMinC: number
  precipitationProbability: number | null
  weatherCode: number
  summary: string
  source: string
}

export type WeatherCondition = 'cold' | 'cool' | 'mild' | 'warm' | 'hot'

export function conditionFor(day: Pick<WeatherDay, 'tempMaxC' | 'tempMinC'>): WeatherCondition {
  const feels = (day.tempMaxC * 2 + day.tempMinC) / 3
  if (feels < 6) return 'cold'
  if (feels < 13) return 'cool'
  if (feels < 21) return 'mild'
  if (feels < 27) return 'warm'
  return 'hot'
}

export function isRainy(day: Pick<WeatherDay, 'precipitationProbability' | 'weatherCode'>): boolean {
  return (day.precipitationProbability ?? 0) >= 50 || [61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(day.weatherCode)
}

/** Ideal summed warmth of the clothing for a condition (see category warmth values). */
export const TARGET_WARMTH: Record<WeatherCondition, [number, number]> = {
  cold: [6, 12],
  cool: [4.5, 8],
  mild: [3, 6],
  warm: [1.5, 4.5],
  hot: [0, 3],
}

export function describeWeatherCode(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code <= 48) return 'Foggy'
  if (code <= 57) return 'Drizzle'
  if (code <= 67) return 'Rain'
  if (code <= 77) return 'Snow'
  if (code <= 82) return 'Showers'
  if (code <= 86) return 'Snow showers'
  return 'Thunderstorms'
}

export function formatTemp(celsius: number, unit: 'celsius' | 'fahrenheit'): string {
  return unit === 'fahrenheit' ? `${Math.round(celsius * 1.8 + 32)}°F` : `${Math.round(celsius)}°C`
}
