'use client'

// app/spot/[id]/page.tsx
// Página de detalhe do spot: condições, info, sectores, uploads, notas

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Share2, MapPin, ChevronRight, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchWeather } from '@/lib/weather'
import { calculateConditionScore } from '@/lib/conditions'
import { useAuth } from '@/hooks/useAuth'
import { ConditionBadge, Tag, WeatherStat, LoginNudge, Skeleton, EmptyState, Button } from '@/components/ui'
import { UploadSection } from '@/components/spot/UploadSection'
import { AuthModal } from '@/components/auth/AuthModal'
import { openGoogleMaps, timeAgo } from '@/lib/utils'
import type { Spot, Sector, Upload, Note, WeatherData, ConditionScore } from '@/types'

interface SpotPageData extends Spot {
  sectors: Sector[]
  uploads: Upload[]
  notes: Note[]
}

export default function SpotPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const { user, isLoggedIn } = useAuth()

  const [spot, setSpot]           = useState<SpotPageData | null>(null)
  const [weather, setWeather]     = useState<WeatherData | null>(null)
  const [condition, setCondition] = useState<ConditionScore | null>(null)
  const [loading, setLoading]     = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [authOpen, setAuthOpen]   = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'sectors' | 'uploads' | 'notes'>('info')

  useEffect(() => {
    if (!id) return
    loadSpot()
  }, [id])

  async function loadSpot() {
    setLoading(true)
    try {
      // Carrega spot + sectores + uploads + notas em paralelo
      const [spotRes, uploadsRes, notesRes] = await Promise.all([
        supabase.from('spots').select('*, sectors(*, challenges(*))')
          .eq('id', id).single(),
        supabase.from('uploads').select('*, profile:profiles(display_name, avatar_url)')
          .eq('spot_id', id).order('created_at', { ascending: false }),
        supabase.from('notes').select('*, profile:profiles(display_name, avatar_url)')
          .eq('spot_id', id).order('created_at', { ascending: false }),
      ])

      if (spotRes.data) {
        const data = spotRes.data as SpotPageData
        data.uploads = (uploadsRes.data ?? []) as Upload[]
        data.notes   = (notesRes.data ?? []) as Note[]
        setSpot(data)

        // Carrega meteorologia
        const result = await fetchWeather(data.lat, data.lng)
        if (result.data) {
          setWeather(result.data)
          setCondition(calculateConditionScore(result.data))
        }
      }

      // Verifica se é favorito
      if (user) {
        const { data } = await supabase.from('favorites')
          .select('spot_id').eq('user_id', user.id).eq('spot_id', id).single()
        setIsFavorite(!!data)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFavorite = async () => {
    if (!isLoggedIn || !user) { setAuthOpen(true); return }
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('spot_id', id)
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, spot_id: id })
    }
    setIsFavorite(!isFavorite)
  }

  if (loading) return <SpotPageSkeleton />

  if (!spot) return (
    <div className="flex flex-col h-full items-center justify-center">
      <EmptyState icon="🪨" title="Spot não encontrado" />
      <Button variant="ghost" onClick={() => router.back()}>Voltar</Button>
    </div>
  )

  const TABS = [
    { id: 'info',    label: 'Info' },
    { id: 'sectors', label: `Sectores (${spot.sectors?.length ?? 0})` },
    { id: 'uploads', label: `Fotos (${spot.uploads?.length ?? 0})` },
    { id: 'notes',   label: `Notas (${spot.notes?.length ?? 0})` },
  ] as const

  return (
    <div className="flex flex-col h-full bg-neutral-50">

      {/* ── Header com foto de capa ───────────────────── */}
      <div className="relative bg-neutral-200 h-52 flex-shrink-0 overflow-hidden">
        {spot.cover_url
          ? <img src={spot.cover_url} alt={spot.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-6xl">🪨</div>
        }
        {/* Gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Botões de topo */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleFavorite}
              className="w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <Heart size={18} className={isFavorite ? 'fill-red-400 text-red-400' : 'text-white'} />
            </button>
            <button className="w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
              <Share2 size={18} />
            </button>
          </div>
        </div>

        {/* Nome e badge no canto inferior */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{spot.name}</h1>
            <p className="text-sm text-white/80 flex items-center gap-1">
              <MapPin size={12} /> {spot.location}
            </p>
          </div>
          {condition && <ConditionBadge status={condition.status} />}
        </div>
      </div>

      {/* ── Tags rápidas ─────────────────────────────── */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto flex-shrink-0 bg-white border-b border-neutral-100">
        {spot.style    && <Tag>{spot.style}</Tag>}
        {spot.rock_type && <Tag>🪨 {spot.rock_type}</Tag>}
        {spot.level_min && <Tag>📊 {spot.level_min}–{spot.level_max}</Tag>}
        {spot.walk_time && <Tag>🚶 {spot.walk_time} a pé</Tag>}
      </div>

      {/* ── Tabs ─────────────────────────────────────── */}
      <div className="flex border-b border-neutral-100 bg-white px-4 gap-1 flex-shrink-0 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-neutral-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Conteúdo das tabs ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'info' && (
          <InfoTab spot={spot} weather={weather} condition={condition} />
        )}

        {activeTab === 'sectors' && (
          <SectorsTab spot={spot} />
        )}

        {activeTab === 'uploads' && (
          <UploadsTab
            spot={spot} user={user} isLoggedIn={isLoggedIn}
            onLoginRequest={() => setAuthOpen(true)}
            onUploadsChange={(uploads) => setSpot(prev => prev ? { ...prev, uploads } : prev)}
          />
        )}

        {activeTab === 'notes' && (
          <NotesTab
            spot={spot} isLoggedIn={isLoggedIn}
            onLoginRequest={() => setAuthOpen(true)}
          />
        )}
      </div>

      {/* ── Botão Google Maps ─────────────────────────── */}
      <div className="p-4 bg-white border-t border-neutral-100 flex-shrink-0"
           style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
        <Button
          variant="primary" fullWidth
          onClick={() => openGoogleMaps(spot.lat, spot.lng)}
        >
          🗺 Abrir no Google Maps
        </Button>
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}

// ─── Tab: Informação ────────────────────────────────────

function InfoTab({ spot, weather, condition }: {
  spot: SpotPageData
  weather: WeatherData | null
  condition: ConditionScore | null
}) {
  return (
    <div className="p-4 space-y-5">

      {/* Bloco de condição */}
      {condition && (
        <div className={`rounded-2xl p-4 flex items-center gap-4 ${
          condition.status === 'good' ? 'bg-good-bg' :
          condition.status === 'ok'   ? 'bg-ok-bg'   : 'bg-bad-bg'
        }`}>
          <span className="text-3xl">
            {condition.status === 'good' ? '☀️' : condition.status === 'ok' ? '⛅' : '🌧️'}
          </span>
          <div>
            <p className={`font-bold text-base ${
              condition.status === 'good' ? 'text-good-text' :
              condition.status === 'ok'   ? 'text-ok-text'   : 'text-bad-text'
            }`}>{condition.label}</p>
            <p className="text-xs text-neutral-500">Score: {condition.score}/100</p>
            {condition.reasons.map((r, i) => (
              <p key={i} className="text-xs text-neutral-500">· {r}</p>
            ))}
          </div>
        </div>
      )}

      {/* Grelha meteorológica */}
      {weather ? (
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Condições agora</p>
          <div className="grid grid-cols-4 gap-2">
            <WeatherStat icon="🌡" value={`${weather.temp}°`}      label="Temperatura" />
            <WeatherStat icon="🌧" value={`${weather.rain_1h}mm`}  label="Chuva" />
            <WeatherStat icon="💧" value={`${weather.humidity}%`}  label="Humidade" />
            <WeatherStat icon="💨" value={`${weather.wind_speed}km/h`} label="Vento" />
          </div>
          <p className="text-[10px] text-neutral-400 mt-1 text-right">
            Fonte: OpenWeatherMap · {new Date(weather.fetched_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      ) : (
        <div className="bg-neutral-50 rounded-2xl p-4 text-sm text-neutral-400 text-center">
          🌥 Meteorologia indisponível
        </div>
      )}

      {/* Sobre o spot */}
      {spot.description && (
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Sobre o spot</p>
          <p className="text-sm text-neutral-700 leading-relaxed">{spot.description}</p>
        </div>
      )}

      {/* Como chegar */}
      {spot.how_to_get && (
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Como chegar</p>
          <p className="text-sm text-neutral-700 leading-relaxed">{spot.how_to_get}</p>
        </div>
      )}

      {/* Info em tabela */}
      <div>
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Informação</p>
        <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-100">
          {[
            ['Tipo de rocha', spot.rock_type],
            ['Nível',  spot.level_min && spot.level_max ? `${spot.level_min} – ${spot.level_max}` : null],
            ['Estilo', spot.style],
            ['A pé',   spot.walk_time],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label as string} className="flex justify-between items-center px-4 py-3">
              <span className="text-sm text-neutral-500">{label}</span>
              <span className="text-sm font-medium text-neutral-800">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Sectores ──────────────────────────────────────

function SectorsTab({ spot }: { spot: SpotPageData }) {
  const router = useRouter()
  const sectors = spot.sectors ?? []

  if (sectors.length === 0) return (
    <EmptyState icon="🗺" title="Sem sectores" description="Este spot ainda não tem sectores definidos." />
  )

  return (
    <div className="p-4 space-y-3">
      {sectors
        .sort((a, b) => a.order_index - b.order_index)
        .map(sector => (
          <button
            key={sector.id}
            onClick={() => router.push(`/spot/${spot.id}/sector/${sector.id}`)}
            className="w-full text-left bg-white border border-neutral-100 rounded-2xl p-4 flex items-center gap-3 active:scale-[.99] transition-transform"
          >
            {sector.cover_url
              ? <img src={sector.cover_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              : <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-xl flex-shrink-0">🪨</div>
            }
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-neutral-900 text-sm">{sector.name}</p>
              <p className="text-xs text-neutral-500 mt-0.5 truncate">{sector.description}</p>
              <p className="text-xs text-brand-600 mt-1 font-medium">
                {(sector.challenges as any[])?.length ?? 0} problemas
              </p>
            </div>
            <ChevronRight size={16} className="text-neutral-300 flex-shrink-0" />
          </button>
        ))}
    </div>
  )
}

// ─── Tab: Uploads ───────────────────────────────────────

function UploadsTab({ spot, user, isLoggedIn, onLoginRequest, onUploadsChange }: {
  spot: SpotPageData
  user: any
  isLoggedIn: boolean
  onLoginRequest: () => void
  onUploadsChange: (u: Upload[]) => void
}) {
  const photos = spot.uploads?.filter(u => u.file_type === 'photo') ?? []
  const others = spot.uploads?.filter(u => u.file_type !== 'photo') ?? []

  return (
    <div className="p-4 space-y-5">
      {/* Secção de upload (só logado) */}
      {isLoggedIn && user ? (
        <UploadSection
          userId={user.id}
          target={{ spotId: spot.id }}
          existingUploads={spot.uploads ?? []}
          onUploadsChange={onUploadsChange}
        />
      ) : (
        <LoginNudge onLogin={onLoginRequest} />
      )}

      {/* Galeria de fotos */}
      {photos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Fotos da comunidade
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map(u => (
              <img key={u.id} src={u.public_url} alt=""
                className="aspect-square w-full object-cover rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Outros uploads */}
      {others.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Documentos e vídeos
          </p>
          <div className="space-y-2">
            {others.map(u => (
              <a key={u.id} href={u.public_url} target="_blank" rel="noopener"
                className="flex items-center gap-3 bg-white border border-neutral-100 rounded-xl p-3">
                <span className="text-xl">{u.file_type === 'video' ? '🎥' : '📄'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">{u.file_name}</p>
                  <p className="text-xs text-neutral-400">{u.file_type}</p>
                </div>
                <ChevronRight size={14} className="text-neutral-300" />
              </a>
            ))}
          </div>
        </div>
      )}

      {spot.uploads?.length === 0 && !isLoggedIn && (
        <EmptyState icon="📷" title="Sem fotos ainda" description="Inicia sessão para ser o primeiro a partilhar." />
      )}
    </div>
  )
}

// ─── Tab: Notas ─────────────────────────────────────────

function NotesTab({ spot, isLoggedIn, onLoginRequest }: {
  spot: SpotPageData
  isLoggedIn: boolean
  onLoginRequest: () => void
}) {
  const notes = spot.notes ?? []

  return (
    <div className="p-4 space-y-4">
      {!isLoggedIn && <LoginNudge onLogin={onLoginRequest} />}

      {notes.length === 0 ? (
        <EmptyState icon="📝" title="Sem notas ainda"
          description="Sê o primeiro a partilhar as condições deste spot." />
      ) : (
        notes.map(note => (
          <div key={note.id} className="bg-white rounded-2xl border border-neutral-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
                {(note.profile as any)?.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-800">
                  {(note.profile as any)?.display_name ?? 'Anónimo'}
                </p>
                <p className="text-[10px] text-neutral-400">{timeAgo(note.created_at)}</p>
              </div>
              {note.rating && (
                <div className="ml-auto flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={10}
                      className={i < note.rating! ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'} />
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-neutral-700 leading-relaxed">{note.content}</p>
            {note.condition_tag && (
              <ConditionBadge status={note.condition_tag} className="mt-2" />
            )}
          </div>
        ))
      )}
    </div>
  )
}

// ─── Skeleton da página ─────────────────────────────────

function SpotPageSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <Skeleton className="h-52 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-48 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    </div>
  )
}
export const dynamic = 'force-dynamic'
