import { describeWeatherCode, type WeatherDay } from '@/domain/weather'
import type { WeatherLocation } from '@/domain/types'

/**
 * Optional forecast from Open-Meteo (free, no API key). Only used after the user opts in and
 * shares a location; nothing is shown when it is disabled or unavailable.
 */
const CACHE_KEY = 'lavender.weather.v1'
const CACHE_MS = 60 * 60 * 1000

interface CacheEntry {
  key: string
  fetchedAt: number
  days: WeatherDay[]
}

interface OpenMeteoResponse {
  daily?: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max?: (number | null)[]
    weather_code: number[]
  }
}

export async function fetchForecast(location: WeatherLocation, signal?: AbortSignal): Promise<WeatherDay[]> {
  const key = `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null') as CacheEntry | null
    if (cached && cached.key === key && Date.now() - cached.fetchedAt < CACHE_MS) return cached.days
  } catch {
    // Ignore unreadable cache.
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(location.latitude))
  url.searchParams.set('longitude', String(location.longitude))
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code')
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '14')

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Weather service responded with ${res.status}`)
  const json = (await res.json()) as OpenMeteoResponse
  const d = json.daily
  if (!d?.time?.length) throw new Error('Weather data was empty')

  const days: WeatherDay[] = d.time.map((date, i) => ({
    date,
    tempMaxC: d.temperature_2m_max[i],
    tempMinC: d.temperature_2m_min[i],
    precipitationProbability: d.precipitation_probability_max?.[i] ?? null,
    weatherCode: d.weather_code[i],
    summary: describeWeatherCode(d.weather_code[i]),
    source: 'Open-Meteo',
  }))
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ key, fetchedAt: Date.now(), days } satisfies CacheEntry))
  } catch {
    // Storage may be unavailable; caching is optional.
  }
  return days
}

export function requestBrowserLocation(): Promise<WeatherLocation> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Location is not available in this browser.'))
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          // Rounded to ~1 km: enough for a forecast, less precise than the raw position.
          latitude: Math.round(pos.coords.latitude * 100) / 100,
          longitude: Math.round(pos.coords.longitude * 100) / 100,
          label: 'Current location',
        }),
      (err) => reject(new Error(err.code === err.PERMISSION_DENIED ? 'Location permission was declined.' : 'Could not determine your location.')),
      { maximumAge: 3_600_000, timeout: 10_000 },
    )
  })
}
