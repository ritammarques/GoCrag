'use client'

// hooks/useWeather.ts

import { useState, useEffect } from 'react'
import { fetchWeather } from '@/lib/weather'
import { calculateConditionScore } from '@/lib/conditions'
import type { WeatherData, ConditionScore, WeatherError } from '@/types'

interface UseWeatherResult {
  weather:   WeatherData | null
  condition: ConditionScore | null
  loading:   boolean
  error:     WeatherError | null
  refresh:   () => void
}

export function useWeather(lat: number, lng: number): UseWeatherResult {
  const [weather,   setWeather]   = useState<WeatherData | null>(null)
  const [condition, setCondition] = useState<ConditionScore | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<WeatherError | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)

    // Tenta usar cache offline do localStorage
    if (typeof window !== 'undefined' && !navigator.onLine) {
      try {
        const key    = `wx_${lat.toFixed(2)}_${lng.toFixed(2)}`
        const cached = localStorage.getItem(key)
        if (cached) {
          const data = JSON.parse(cached) as WeatherData
          setWeather(data)
          setCondition(calculateConditionScore(data))
          setError({ message: 'Dados guardados (sem ligação)', code: 'OFFLINE' })
          setLoading(false)
          return
        }
      } catch { /* ignora */ }
      setError({ message: 'Sem ligação à internet', code: 'OFFLINE' })
      setLoading(false)
      return
    }

    const result = await fetchWeather(lat, lng)

    if (result.data) {
      setWeather(result.data)
      setCondition(calculateConditionScore(result.data))
      // Persiste para uso offline
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            `wx_${lat.toFixed(2)}_${lng.toFixed(2)}`,
            JSON.stringify(result.data)
          )
        } catch { /* ignora quota exceeded */ }
      }
    } else {
      setError(result.error)
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  return { weather, condition, loading, error, refresh: load }
}
