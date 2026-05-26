'use client'

// app/favorites/page.tsx
// Spots guardados pelo utilizador

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { AuthModal } from '@/components/auth/AuthModal'
import { SpotCard } from '@/components/spot/SpotCard'
import { Button, SpotCardSkeleton, EmptyState } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { fetchWeather } from '@/lib/weather'
import { calculateConditionScore } from '@/lib/conditions'
import { useGeolocation } from '@/hooks/useGeolocation'
import { distanceKm } from '@/lib/utils'
import type { SpotWithCondition } from '@/types'

export default function FavoritesPage() {
  const { user, isLoggedIn, loading: authLoading } = useAuth()
  const geo = useGeolocation()
  const router = useRouter()
  const [spots, setSpots]   = useState<SpotWithCondition[]>([])
  const [loading, setLoading] = useState(true)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!isLoggedIn) { setLoading(false); return }
    loadFavorites()
  }, [isLoggedIn, authLoading])

  async function loadFavorites() {
    if (!user) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('favorites')
        .select('spot:spots(*)')
        .eq('user_id', user.id)

      const rawSpots = (data ?? []).map((f: any) => f.spot).filter(Boolean)

      const enriched: SpotWithCondition[] = await Promise.all(
        rawSpots.map(async (spot: any) => {
          const weatherResult = await fetchWeather(spot.lat, spot.lng)
          const condition = weatherResult.data
            ? calculateConditionScore(weatherResult.data)
            : null
          const distance = (geo.lat != null && geo.lng != null)
            ? distanceKm(geo.lat, geo.lng, spot.lat, spot.lng)
            : null
          return { ...spot, weather: weatherResult.data, weatherError: weatherResult.error, condition, distance, isFavorite: true }
        })
      )
      setSpots(enriched)
    } finally {
      setLoading(false)
    }
  }

  const removeFavorite = async (spotId: string) => {
    if (!user) return
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('spot_id', spotId)
    setSpots(prev => prev.filter(s => s.id !== spotId))
  }

  if (!isLoggedIn && !authLoading) return (
    <AppShell>
      <div className="flex flex-col h-full items-center justify-center p-6 gap-4">
        <span className="text-5xl">❤️</span>
        <div className="text-center">
          <h2 className="text-lg font-bold mb-1">Os teus favoritos</h2>
          <p className="text-sm text-neutral-500">Guarda os teus spots preferidos e acede rapidamente.</p>
        </div>
        <Button variant="primary" onClick={() => setAuthOpen(true)}>Iniciar sessão</Button>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    </AppShell>
  )

  return (
    <AppShell>
      <div className="flex flex-col h-full bg-neutral-50">
        <div className="bg-white px-4 pt-14 pb-4 border-b border-neutral-100">
          <h1 className="text-xl font-bold text-neutral-900">Favoritos</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{spots.length} spots guardados</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && Array.from({ length: 3 }).map((_, i) => <SpotCardSkeleton key={i} />)}

          {!loading && spots.length === 0 && (
            <EmptyState
              icon="🗺"
              title="Ainda sem favoritos"
              description="Explora o mapa e guarda os spots que mais gostas."
              action={<Button variant="secondary" onClick={() => router.push('/map')}>Ver mapa</Button>}
            />
          )}

          {!loading && spots.map(spot => (
            <SpotCard
              key={spot.id}
              spot={spot}
              onSelect={(id) => router.push(`/spot/${id}`)}
              onFavorite={(id) => removeFavorite(id)}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </div>
      </div>
    </AppShell>
  )
}
export const dynamic = 'force-dynamic'
