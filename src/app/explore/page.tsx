'use client'

// app/explore/page.tsx
// Página Explorar: lista pesquisável de todos os spots com filtros

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { SpotCard } from '@/components/spot/SpotCard'
import { SpotCardSkeleton, EmptyState, Tag } from '@/components/ui'
import { useSpots } from '@/hooks/useSpots'
import { useAuth } from '@/hooks/useAuth'
import { useGeolocation } from '@/hooks/useGeolocation'
import type { ConditionStatus } from '@/types'

const ROCK_TYPES  = ['Granito', 'Calcário', 'Xisto', 'Basalto']
const CONDITIONS: { label: string; value: ConditionStatus }[] = [
  { label: 'Bom',  value: 'good' },
  { label: 'Ok',   value: 'ok'   },
  { label: 'Mau',  value: 'bad'  },
]

export default function ExplorePage() {
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()
  const geo = useGeolocation()
  const { spots, loading, error, toggleFavorite } = useSpots({
    userLat: geo.lat ?? undefined,
    userLng: geo.lng ?? undefined,
    userId: user?.id ?? null,
  })

  const [query,        setQuery]        = useState('')
  const [filterCond,   setFilterCond]   = useState<ConditionStatus | null>(null)
  const [filterRock,   setFilterRock]   = useState<string | null>(null)
  const [showFilters,  setShowFilters]  = useState(false)

  const filtered = useMemo(() => spots.filter(s => {
    if (query && !s.name.toLowerCase().includes(query.toLowerCase()) &&
        !s.location?.toLowerCase().includes(query.toLowerCase())) return false
    if (filterCond && s.condition?.status !== filterCond) return false
    if (filterRock && s.rock_type !== filterRock) return false
    return true
  }).sort((a, b) => (b.condition?.score ?? 0) - (a.condition?.score ?? 0)), [spots, query, filterCond, filterRock])

  const hasFilters = !!(filterCond || filterRock)

  return (
    <AppShell>
      <div className="flex flex-col h-full bg-neutral-50">

        {/* ── Header fixo ───────────────────────────── */}
        <div className="bg-white border-b border-neutral-100 pt-14 pb-3 px-4 space-y-3 flex-shrink-0">
          <h1 className="text-xl font-bold text-neutral-900">Explorar</h1>

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-neutral-100 rounded-xl px-3 h-10">
              <Search size={15} className="text-neutral-400 flex-shrink-0" />
              <input
                className="flex-1 text-sm placeholder:text-neutral-400 outline-none bg-transparent"
                placeholder="Pesquisar spots..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && (
                <button onClick={() => setQuery('')}>
                  <X size={14} className="text-neutral-400" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative ${
                hasFilters ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              <SlidersHorizontal size={16} />
              {hasFilters && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {[filterCond, filterRock].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Filtros expandíveis */}
          {showFilters && (
            <div className="space-y-3 pt-1">
              {/* Condição */}
              <div>
                <p className="text-xs text-neutral-500 mb-1.5">Condição</p>
                <div className="flex gap-2 flex-wrap">
                  {CONDITIONS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setFilterCond(filterCond === c.value ? null : c.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        filterCond === c.value
                          ? c.value === 'good' ? 'bg-good text-white'
                          : c.value === 'ok'   ? 'bg-ok   text-white'
                          :                      'bg-bad  text-white'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Tipo de rocha */}
              <div>
                <p className="text-xs text-neutral-500 mb-1.5">Tipo de rocha</p>
                <div className="flex gap-2 flex-wrap">
                  {ROCK_TYPES.map(r => (
                    <button
                      key={r}
                      onClick={() => setFilterRock(filterRock === r ? null : r)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        filterRock === r
                          ? 'bg-brand-600 text-white'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {hasFilters && (
                <button
                  onClick={() => { setFilterCond(null); setFilterRock(null) }}
                  className="text-xs text-red-500 font-medium"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}

          <p className="text-xs text-neutral-400">
            {filtered.length} spot{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* ── Lista ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && Array.from({ length: 5 }).map((_, i) => <SpotCardSkeleton key={i} />)}

          {!loading && error && (
            <EmptyState icon="⚠️" title="Erro ao carregar" description={error} />
          )}

          {!loading && !error && filtered.length === 0 && (
            <EmptyState
              icon="🔍"
              title="Sem resultados"
              description={query ? `Nenhum spot para "${query}"` : 'Tenta outros filtros.'}
            />
          )}

          {!loading && filtered.map(spot => (
            <SpotCard
              key={spot.id}
              spot={spot}
              onSelect={(id) => router.push(`/spot/${id}`)}
              onFavorite={user ? (id, cur) => toggleFavorite(id, cur, user.id) : undefined}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </div>
      </div>
    </AppShell>
  )
}