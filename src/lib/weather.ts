// lib/weather.ts
// OpenWeatherMap API — funciona em Client e Server Components.
// Nota: o fetch() com `next: { revalidate }` só funciona em Server Components.
// Esta lib é chamada de Client Components (hooks), por isso usa cache em memória.

import type { WeatherData, WeatherResult } from '@/types'

const API_KEY  = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
const BASE_URL = 'https://api.openweathermap.org/data/2.5'

// Cache em memória — TTL de 30 minutos
const CACHE_TTL_MS = 30 * 60 * 1000
const memCache = new Map<string, { data: WeatherData; ts: number }>()

export async function fetchWeather(lat: number, lng: number): Promise<WeatherResult> {
  if (!API_KEY) {
    return {
      data: null,
      error: {
        message: 'NEXT_PUBLIC_OPENWEATHER_API_KEY não configurada',
        code: 'NO_API_KEY',
      },
    }
  }

  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`
  const hit = memCache.get(cacheKey)
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return { data: hit.data, error: null }
  }

  try {
    // fetch() simples — sem `next: { revalidate }` (não funciona no cliente)
    const url = `${BASE_URL}/weather?lat=${lat}&lon=${lng}&appid=${API_KEY}&units=metric&lang=pt`
    const res = await fetch(url)

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>
      return {
        data: null,
        error: {
          message: typeof body.message === 'string' ? body.message : `Erro HTTP ${res.status}`,
          code: String(res.status),
        },
      }
    }

    const raw = (await res.json()) as OpenWeatherResponse

    const data: WeatherData = {
      temp:        Math.round(raw.main.temp),
      feels_like:  Math.round(raw.main.feels_like),
      humidity:    raw.main.humidity,
      wind_speed:  Math.round((raw.wind?.speed ?? 0) * 3.6), // m/s → km/h
      rain_1h:     raw.rain?.['1h'] ?? 0,
      description: raw.weather[0]?.description ?? '',
      icon:        raw.weather[0]?.icon ?? '',
      fetched_at:  Date.now(),
    }

    memCache.set(cacheKey, { data, ts: Date.now() })
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Erro de rede',
        code: 'NETWORK_ERROR',
      },
    }
  }
}

export function getWeatherIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`
}

// Tipo da resposta raw da API
interface OpenWeatherResponse {
  main: {
    temp: number
    feels_like: number
    humidity: number
    pressure: number
  }
  weather: Array<{
    id: number
    main: string
    description: string
    icon: string
  }>
  wind?: { speed: number; deg?: number }
  rain?: { '1h'?: number }
  clouds?: { all: number }
  dt: number
  name: string
}
