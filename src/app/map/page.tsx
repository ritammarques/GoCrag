'use client'

// app/map/page.tsx
// HOME: mapa + bottom sheet com lista de spots


import { useState, useCallback } from 'react'
import nextDynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { LocateFixed, SlidersHorizontal, Search, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { SpotCard } from '@/components/spot/SpotCard'
import { AuthModal } from '@/components/auth/AuthModal'
import { SpotCardSkeleton, EmptyState, OfflineBanner } from '@/components/ui'
import { useSpots } from '@/hooks/useSpots'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useAuth } from '@/hooks/useAuth'
import { useOnline } from '@/hooks/useOnline'
import type { SpotWithCondition } from '@/types'

// Leaflet só corre no browser — importação dinâmica sem SSR
const MapView = nextDynamic(
  () => import('@/components/map/MapView').then(m => ({ default: m.MapView })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-500">A carregar mapa...</p>
        </div>
      </div>
    ),
  }
)

type SortMode = 'score' | 'distance'

export default function MapPage() {
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()
  const geo    = useGeolocation()
  const isOnline = useOnline()

  const { spots, loading, error, toggleFavorite } = useSpots({
    userLat: geo.lat ?? undefined,
    userLng: geo.lng ?? undefined,
    userId:  user?.id ?? null,
  })

  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [sortMode,    setSortMode]    = useState<SortMode>('score')
  const [sheetOpen,   setSheetOpen]   = useState(false)
  const [authOpen,    setAuthOpen]    = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSpots: SpotWithCondition[] = spots
    .filter(s =>
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.location ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) =>
      sortMode === 'score'
        ? (b.condition?.score ?? 0) - (a.condition?.score ?? 0)
        : (a.distance ?? 999)      - (b.distance ?? 999)
    )

  const handleSpotSelect = useCallback((spotId: string) => {
    setSelectedId(spotId)
    setSheetOpen(true)
  }, [])

  const handleSpotOpen = useCallback((spotId: string) => {
    router.push(`/spot/${spotId}`)
  }, [router])

  const handleFavorite = (spotId: string, current: boolean) => {
    if (!isLoggedIn || !user) { setAuthOpen(true); return }
    toggleFavorite(spotId, current, user.id)
  }

  return (
    <AppShell fullscreen>
      {!isOnline && <OfflineBanner />}

      <div className="relative w-full h-full">
        {/* Mapa */}
        <MapView
          spots={spots}
          selectedSpotId={selectedId}
          onSpotSelect={handleSpotSelect}
          userLat={geo.lat}
          userLng={geo.lng}
          className="w-full h-full"
        />

        {/* Search bar flutuante */}
        <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl shadow-card px-4 h-12 border border-neutral-100">
            <Search size={16} className="text-neutral-400 flex-shrink-0" />
            <input
              className="flex-1 text-sm placeholder:text-neutral-400 outline-none bg-transparent"
              placeholder="Pesquisar spots..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSheetOpen(true)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X size={14} className="text-neutral-400" />
              </button>
            )}
          </div>
          <button
            className="w-12 h-12 bg-white rounded-2xl shadow-card border border-neutral-100 flex items-center justify-center"
            aria-label="Filtros"
          >
            <SlidersHorizontal size={18} className="text-neutral-600" />
          </button>
        </div>

        {/* Botão de localização */}
        <button
          onClick={geo.requestLocation}
          className="absolute bottom-24 right-4 z-10 w-11 h-11 bg-white rounded-full shadow-card border border-neutral-100 flex items-center justify-center"
          title="A minha localização"
        >
          {geo.loading ? (
            <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <LocateFixed
              size={18}
              className={geo.isDefault ? 'text-neutral-400' : 'text-brand-600'}
            />
          )}
        </button>

        {/* FAB para abrir o sheet */}
        {!sheetOpen && (
          <button
            onClick={() => setSheetOpen(true)}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 bg-neutral-900 text-white rounded-full px-5 h-11 flex items-center gap-2 shadow-lg text-sm font-semibold whitespace-nowrap"
          >
            📍{' '}
            {loading
              ? 'A carregar...'
              : spots.length > 0
              ? `${spots.length} spots próximos`
              : 'Ver spots'}
          </button>
        )}

        {/* Bottom sheet com lista */}
        {sheetOpen && (
          <>
            {/* Backdrop */}
            <div
              className="absolute inset-0 z-10"
              onClick={() => setSheetOpen(false)}
            />

            <div className="absolute bottom-16 left-0 right-0 z-20 animate-slide-up">
              <div className="bg-white rounded-t-3xl shadow-modal border-t border-neutral-100 flex flex-col max-h-[65vh]">
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <button
                    onClick={() => setSheetOpen(false)}
                    className="w-10 h-1 bg-neutral-200 rounded-full"
                    aria-label="Fechar lista"
                  />
                </div>

                {/* Header */}
                <div className="px-4 pb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-neutral-800">
                    {filteredSpots.length} spots encontrados
                  </p>
                  <div className="flex gap-1">
                    {(['score', 'distance'] as SortMode[]).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setSortMode(mode)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          sortMode === mode
                            ? 'bg-brand-600 text-white'
                            : 'bg-neutral-100 text-neutral-500'
                        }`}
                      >
                        {mode === 'score' ? '⭐ Condições' : '📍 Distância'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lista */}
                <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-2">
                  {loading &&
                    Array.from({ length: 4 }).map((_, i) => (
                      <SpotCardSkeleton key={i} />
                    ))}

                  {!loading && error && (
                    <EmptyState icon="⚠️" title="Erro ao carregar spots" description={error} />
                  )}

                  {!loading && !error && filteredSpots.length === 0 && (
                    <EmptyState
                      icon="🗺"
                      title="Nenhum spot encontrado"
                      description={
                        searchQuery
                          ? `Sem resultados para "${searchQuery}"`
                          : 'Ainda não há spots nesta zona.'
                      }
                    />
                  )}

                  {!loading &&
                    filteredSpots.map(spot => (
                      <div
                        key={spot.id}
                        onClick={() => handleSpotOpen(spot.id)}
                        className="cursor-pointer"
                      >
                        <SpotCard
                          spot={spot}
                          onSelect={handleSpotSelect}
                          onFavorite={handleFavorite}
                          isLoggedIn={isLoggedIn}
                          selected={spot.id === selectedId}
                        />
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
