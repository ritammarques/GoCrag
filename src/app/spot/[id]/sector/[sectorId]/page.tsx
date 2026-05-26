'use client'

// app/spot/[id]/sector/[sectorId]/page.tsx
// Página de detalhe de um sector: lista de desafios/problemas, uploads, notas

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  Tag, LoginNudge, Skeleton, EmptyState, Button, ConditionBadge
} from '@/components/ui'
import { UploadSection } from '@/components/spot/UploadSection'
import { AuthModal } from '@/components/auth/AuthModal'
import { timeAgo } from '@/lib/utils'
import type { Sector, Challenge, Upload, Note } from '@/types'

interface SectorPageData extends Sector {
  challenges: Challenge[]
  uploads: Upload[]
  notes: Note[]
  spot: { name: string; id: string }
}

export default function SectorPage() {
  const { id: spotId, sectorId } = useParams<{ id: string; sectorId: string }>()
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()

  const [sector, setSector]   = useState<SectorPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [authOpen, setAuthOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'challenges' | 'uploads' | 'notes'>('challenges')

  useEffect(() => { loadSector() }, [sectorId])

  async function loadSector() {
    setLoading(true)
    try {
      const [sectorRes, uploadsRes, notesRes] = await Promise.all([
        supabase
          .from('sectors')
          .select('*, challenges(*), spot:spots(id, name)')
          .eq('id', sectorId)
          .single(),
        supabase
          .from('uploads')
          .select('*, profile:profiles(display_name, avatar_url)')
          .eq('sector_id', sectorId)
          .order('created_at', { ascending: false }),
        supabase
          .from('notes')
          .select('*, profile:profiles(display_name, avatar_url)')
          .eq('sector_id', sectorId)
          .order('created_at', { ascending: false }),
      ])

      if (sectorRes.data) {
        setSector({
          ...(sectorRes.data as any),
          uploads: (uploadsRes.data ?? []) as Upload[],
          notes:   (notesRes.data   ?? []) as Note[],
        })
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <SectorSkeleton />
  if (!sector) return (
    <div className="flex flex-col h-full items-center justify-center gap-4">
      <EmptyState icon="🗺" title="Sector não encontrado" />
      <Button variant="ghost" onClick={() => router.back()}>Voltar</Button>
    </div>
  )

  const TABS = [
    { id: 'challenges', label: `Problemas (${sector.challenges?.length ?? 0})` },
    { id: 'uploads',    label: `Fotos (${sector.uploads?.length ?? 0})` },
    { id: 'notes',      label: `Notas (${sector.notes?.length ?? 0})` },
  ] as const

  return (
    <div className="flex flex-col h-full bg-neutral-50">

      {/* ── Header ───────────────────────────────────── */}
      <div className="bg-white border-b border-neutral-100 flex-shrink-0">
        {/* Foto de capa do sector */}
        <div className="relative h-40 bg-neutral-100 overflow-hidden">
          {sector.cover_url
            ? <img src={sector.cover_url} alt={sector.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-5xl">🧗</div>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Breadcrumb */}
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-xs text-white/70 mb-0.5">{sector.spot?.name} ›</p>
            <h1 className="text-lg font-bold text-white">{sector.name}</h1>
          </div>
        </div>

        {/* Descrição + tags */}
        {sector.description && (
          <p className="text-sm text-neutral-600 px-4 py-3 leading-relaxed border-b border-neutral-50">
            {sector.description}
          </p>
        )}
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

      {/* ── Conteúdo ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-20">

        {/* Lista de problemas */}
        {activeTab === 'challenges' && (
          <div className="p-4 space-y-2">
            {!sector.challenges || sector.challenges.length === 0 ? (
              <EmptyState
                icon="🎯"
                title="Sem problemas ainda"
                description="Este sector ainda não tem problemas catalogados."
              />
            ) : (
              sector.challenges
                .sort((a, b) => a.order_index - b.order_index)
                .map(challenge => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    onClick={() => router.push(`/spot/${spotId}/sector/${sectorId}/challenge/${challenge.id}`)}
                  />
                ))
            )}
          </div>
        )}

        {/* Uploads */}
        {activeTab === 'uploads' && (
          <div className="p-4 space-y-5">
            {isLoggedIn && user ? (
              <UploadSection
                userId={user.id}
                target={{ spotId, sectorId }}
                existingUploads={sector.uploads}
                onUploadsChange={(uploads) => setSector(prev => prev ? { ...prev, uploads } : prev)}
              />
            ) : (
              <LoginNudge onLogin={() => setAuthOpen(true)} />
            )}

            {sector.uploads.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Fotos da comunidade
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {sector.uploads
                    .filter(u => u.file_type === 'photo')
                    .map(u => (
                      <img key={u.id} src={u.public_url} alt=""
                        className="aspect-square w-full object-cover rounded-xl" />
                    ))}
                </div>
                {/* Docs / vídeos */}
                {sector.uploads.filter(u => u.file_type !== 'photo').map(u => (
                  <a key={u.id} href={u.public_url} target="_blank" rel="noopener"
                    className="flex items-center gap-3 bg-white border border-neutral-100 rounded-xl p-3 mt-2">
                    <span className="text-xl">{u.file_type === 'video' ? '🎥' : '📄'}</span>
                    <p className="flex-1 text-sm font-medium text-neutral-800 truncate">{u.file_name}</p>
                    <ChevronRight size={14} className="text-neutral-300" />
                  </a>
                ))}
              </div>
            )}

            {sector.uploads.length === 0 && !isLoggedIn && (
              <EmptyState icon="📷" title="Sem fotos" description="Inicia sessão para partilhar fotos deste sector." />
            )}
          </div>
        )}

        {/* Notas */}
        {activeTab === 'notes' && (
          <div className="p-4 space-y-4">
            {!isLoggedIn && <LoginNudge onLogin={() => setAuthOpen(true)} />}
            {sector.notes.length === 0 ? (
              <EmptyState icon="📝" title="Sem notas" description="Sê o primeiro a comentar este sector." />
            ) : (
              sector.notes.map(note => <NoteCard key={note.id} note={note} />)
            )}
          </div>
        )}
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}

// ─── Card de problema ───────────────────────────────────

function ChallengeCard({ challenge, onClick }: { challenge: Challenge; onClick: () => void }) {
  const gradeColor = getGradeColor(challenge.grade)

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-neutral-100 rounded-2xl p-4 flex items-center gap-3 active:scale-[.99] transition-transform"
    >
      {/* Badge de grau */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${gradeColor}`}>
        {challenge.grade ?? '?'}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-neutral-900 text-sm">{challenge.name}</p>
        <div className="flex gap-1.5 mt-1 flex-wrap">
          {challenge.style  && <Tag>{challenge.style}</Tag>}
          {challenge.landing && <Tag>Aterragem: {challenge.landing}</Tag>}
          {challenge.height_m && <Tag>{challenge.height_m}m</Tag>}
        </div>
        {challenge.description && (
          <p className="text-xs text-neutral-400 mt-1 truncate">{challenge.description}</p>
        )}
      </div>

      <ChevronRight size={16} className="text-neutral-300 flex-shrink-0" />
    </button>
  )
}

// ─── Card de nota ───────────────────────────────────────

function NoteCard({ note }: { note: Note }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
          {(note.profile as any)?.display_name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-neutral-800">
            {(note.profile as any)?.display_name ?? 'Anónimo'}
          </p>
          <p className="text-[10px] text-neutral-400">{timeAgo(note.created_at)}</p>
        </div>
        {note.rating && (
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={10}
                className={i < note.rating! ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'} />
            ))}
          </div>
        )}
      </div>
      <p className="text-sm text-neutral-700 leading-relaxed">{note.content}</p>
      {note.condition_tag && <ConditionBadge status={note.condition_tag} className="mt-2" />}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────

/** Cor de fundo do badge de grau baseada na dificuldade */
function getGradeColor(grade: string | null): string {
  if (!grade) return 'bg-neutral-100 text-neutral-500'
  const n = parseFloat(grade)
  if (n <= 5)  return 'bg-green-100 text-green-700'
  if (n <= 6)  return 'bg-yellow-100 text-yellow-700'
  if (n <= 7)  return 'bg-orange-100 text-orange-700'
  return             'bg-red-100 text-red-700'
}

function SectorSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-40 rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 items-center bg-white rounded-2xl p-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-32 rounded" />
              <Skeleton className="h-3   w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
export const dynamic = 'force-dynamic'
