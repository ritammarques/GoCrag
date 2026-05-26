'use client'

// hooks/useSpots.ts
// Carrega spots do Supabase, enriquece com weather e score de condições.
// Trata erros de forma graciosa para não quebrar a UI.

'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchWeather } from '@/lib/weather'
import { calculateConditionScore } from '@/lib/conditions'
import { distanceKm } from '@/lib/utils'
import type { Spot, SpotWithCondition } from '@/types'

interface UseSpotsOptions {
  userLat?: number
  userLng?: number
  userId?: string | null
}

export function useSpots({ userLat, userLng, userId }: UseSpotsOptions = {}) {
  const [spots,   setSpots]   = useState<SpotWithCondition[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const loadSpots = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: rawSpots, error: spotsError } = await supabase
        .from('spots')
        .select('*')
        .eq('is_published', true)

      if (spotsError) throw new Error(spotsError.message)
      if (!rawSpots || rawSpots.length === 0) {
        setSpots([])
        return
      }

      // Favoritos do utilizador (só se autenticado)
      const favoriteIds = new Set<string>()
      if (userId) {
        const { data: favs } = await supabase
          .from('favorites')
          .select('spot_id')
          .eq('user_id', userId)
        favs?.forEach((f: { spot_id: string }) => favoriteIds.add(f.spot_id))
      }

      // Weather em paralelo (com timeout individual por spot)
      const enriched: SpotWithCondition[] = await Promise.all(
        (rawSpots as Spot[]).map(async spot => {
          const weatherResult = await fetchWeather(spot.lat, spot.lng)
          const condition = weatherResult.data
            ? calculateConditionScore(weatherResult.data)
            : null
          const distance =
            userLat != null && userLng != null
              ? distanceKm(userLat, userLng, spot.lat, spot.lng)
              : null

          return {
            ...spot,
            weather:      weatherResult.data,
            weatherError: weatherResult.error,
            condition,
            distance,
            isFavorite: favoriteIds.has(spot.id),
          }
        })
      )

      setSpots(enriched)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar spots')
    } finally {
      setLoading(false)
    }
  }, [userLat, userLng, userId])

  useEffect(() => {
    loadSpots()
  }, [loadSpots])

  const toggleFavorite = async (
    spotId: string,
    currentlyFav: boolean,
    userId: string
  ) => {
    // Optimistic update
    setSpots(prev =>
      prev.map(s =>
        s.id === spotId ? { ...s, isFavorite: !currentlyFav } : s
      )
    )
    try {
      if (currentlyFav) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('spot_id', spotId)
      } else {
        await supabase
          .from('favorites')
          .insert({ user_id: userId, spot_id: spotId })
      }
    } catch {
      // Reverte se falhou
      setSpots(prev =>
        prev.map(s =>
          s.id === spotId ? { ...s, isFavorite: currentlyFav } : s
        )
      )
    }
  }

  return { spots, loading, error, refresh: loadSpots, toggleFavorite }
}
