'use client'

// app/spot/[id]/sector/[sectorId]/challenge/[challengeId]/page.tsx
// Página de detalhe de um problema/desafio: grau, descrição, uploads, notas pessoais

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Star, ChevronRight, MessageSquare, Camera
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  Tag, LoginNudge, Skeleton, EmptyState, Button, Input
} from '@/components/ui'
import { UploadSection } from '@/components/spot/UploadSection'
import { AuthModal } from '@/components/auth/AuthModal'
import { timeAgo, cn } from '@/lib/utils'
import type { Challenge, Upload, Note } from '@/types'

interface ChallengePageData extends Challenge {
  uploads: Upload[]
  notes: Note[]
  sector: { name: string; id: string }
  spot: { name: string; id: string }
}

export default function ChallengePage() {
  const { id: spotId, sectorId, challengeId } = useParams<{
    id: string; sectorId: string; challengeId: string
  }>()
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()

  const [challenge, setChallenge] = useState<ChallengePageData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [authOpen, setAuthOpen]   = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'uploads' | 'notes'>('info')

  // Estado para adicionar nota
  const [noteText, setNoteText]       = useState('')
  const [noteRating, setNoteRating]   = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [submittingNote, setSubmittingNote] = useState(false)

  useEffect(() => { loadChallenge() }, [challengeId])

  async function loadChallenge() {
    setLoading(true)
    try {
      const [chalRes, uploadsRes, notesRes] = await Promise.all([
        supabase
          .from('challenges')
          .select('*, sector:sectors(id, name), spot:spots(id, name)')
          .eq('id', challengeId)
          .single(),
        supabase
          .from('uploads')
          .select('*, profile:profiles(display_name, avatar_url)')
          .eq('challenge_id', challengeId)
          .order('created_at', { ascending: false }),
        supabase
          .from('notes')
          .select('*, profile:profiles(display_name, avatar_url)')
          .eq('challenge_id', challengeId)
          .order('created_at', { ascending: false }),
      ])

      if (chalRes.data) {
        setChallenge({
          ...(chalRes.data as any),
          uploads: (uploadsRes.data ?? []) as Upload[],
          notes:   (notesRes.data   ?? []) as Note[],
        })
      }
    } finally {
      setLoading(false)
    }
  }

  async function submitNote() {
    if (!user || !noteText.trim()) return
    setSubmittingNote(true)
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id:      user.id,
          challenge_id: challengeId,
          spot_id:      spotId,
          sector_id:    sectorId,
          content:      noteText.trim(),
          rating:       noteRating || null,
        })
        .select('*, profile:profiles(display_name, avatar_url)')
        .single()

      if (!error && data) {
        setChallenge(prev =>
          prev ? { ...prev, notes: [data as Note, ...prev.notes] } : prev
        )
        setNoteText('')
        setNoteRating(0)
      }
    } finally {
      setSubmittingNote(false)
    }
  }

  if (loading) return <ChallengeSkeleton />

  if (!challenge) return (
    <div className="flex flex-col h-full items-center justify-center gap-4">
      <EmptyState icon="🎯" title="Problema não encontrado" />
      <Button variant="ghost" onClick={() => router.back()}>Voltar</Button>
    </div>
  )

  const gradeInfo = getGradeInfo(challenge.grade)

  const TABS = [
    { id: 'info',    label: 'Info' },
    { id: 'uploads', label: `Fotos (${challenge.uploads.length})` },
    { id: 'notes',   label: `Notas (${challenge.notes.length})` },
  ] as const

  return (
    <div className="flex flex-col h-full bg-neutral-50">

      {/* ── Header ────────────────────────────────────── */}
      <div className="bg-white border-b border-neutral-100 flex-shrink-0">
        {/* Área de capa com grau em destaque */}
        <div className="relative h-44 overflow-hidden"
             style={{ background: gradeInfo.bgGradient }}>

          {/* Foto de capa (primeiro upload do tipo photo, se existir) */}
          {challenge.uploads.find(u => u.file_type === 'photo') && (
            <img
              src={challenge.uploads.find(u => u.file_type === 'photo')!.public_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40"
            />
          )}

          {/* Botão voltar */}
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 w-9 h-9 bg-black/25 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Conteúdo central: grau grande */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className={`text-6xl font-black tracking-tight ${gradeInfo.textColor}`}>
              {challenge.grade ?? '?'}
            </span>
            <span className="text-sm font-semibold text-white/80 uppercase tracking-widest">
              {challenge.style ?? 'Boulder'}
            </span>
          </div>

          {/* Breadcrumb bottom */}
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-xs text-white/60">
              {challenge.spot?.name} › {challenge.sector?.name} ›
            </p>
            <h1 className="text-lg font-bold text-white mt-0.5">{challenge.name}</h1>
          </div>
        </div>

        {/* Tags rápidas */}
        <div className="px-4 py-2.5 flex gap-2 overflow-x-auto">
          {challenge.style    && <Tag>{challenge.style}</Tag>}
          {challenge.landing  && <Tag>Aterragem: {challenge.landing}</Tag>}
          {challenge.height_m && <Tag>Altura: {challenge.height_m}m</Tag>}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────── */}
      <div className="flex border-b border-neutral-100 bg-white px-4 gap-1 flex-shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-neutral-500'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Conteúdo ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-20">

        {/* ── Tab: Info ─────────────────────────────── */}
        {activeTab === 'info' && (
          <div className="p-4 space-y-5">

            {/* Descrição */}
            {challenge.description && (
              <div className="bg-white rounded-2xl border border-neutral-100 p-4">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Descrição
                </p>
                <p className="text-sm text-neutral-700 leading-relaxed">
                  {challenge.description}
                </p>
              </div>
            )}

            {/* Ficha técnica */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Ficha técnica
              </p>
              <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50">
                {[
                  ['Grau',      challenge.grade],
                  ['Estilo',    challenge.style],
                  ['Aterragem', challenge.landing],
                  ['Altura',    challenge.height_m ? `${challenge.height_m} m` : null],
                  ['Sector',    challenge.sector?.name],
                  ['Spot',      challenge.spot?.name],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label as string} className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-neutral-500">{label}</span>
                    <span className="text-sm font-semibold text-neutral-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rating médio */}
            {challenge.notes.length > 0 && (() => {
              const rated = challenge.notes.filter(n => n.rating)
              if (!rated.length) return null
              const avg = rated.reduce((s, n) => s + (n.rating ?? 0), 0) / rated.length
              return (
                <div className="flex items-center gap-3 bg-amber-50 rounded-2xl p-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={18}
                        className={i < Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'} />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-amber-800">
                    {avg.toFixed(1)} · {rated.length} avaliações
                  </span>
                </div>
              )
            })()}
          </div>
        )}

        {/* ── Tab: Uploads ──────────────────────────── */}
        {activeTab === 'uploads' && (
          <div className="p-4 space-y-5">
            {isLoggedIn && user ? (
              <UploadSection
                userId={user.id}
                target={{ spotId, sectorId, challengeId }}
                existingUploads={challenge.uploads}
                onUploadsChange={(uploads) =>
                  setChallenge(prev => prev ? { ...prev, uploads } : prev)
                }
              />
            ) : (
              <LoginNudge onLogin={() => setAuthOpen(true)} />
            )}

            {/* Galeria */}
            {challenge.uploads.filter(u => u.file_type === 'photo').length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Fotos
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {challenge.uploads
                    .filter(u => u.file_type === 'photo')
                    .map(u => (
                      <img key={u.id} src={u.public_url} alt=""
                        className="aspect-square w-full object-cover rounded-xl" />
                    ))}
                </div>
              </div>
            )}

            {/* Vídeos e docs */}
            {challenge.uploads.filter(u => u.file_type !== 'photo').map(u => (
              <a key={u.id} href={u.public_url} target="_blank" rel="noopener"
                className="flex items-center gap-3 bg-white border border-neutral-100 rounded-xl p-3">
                <span className="text-xl">{u.file_type === 'video' ? '🎥' : '📄'}</span>
                <p className="flex-1 text-sm font-medium text-neutral-800 truncate">{u.file_name}</p>
                <ChevronRight size={14} className="text-neutral-300" />
              </a>
            ))}

            {challenge.uploads.length === 0 && (
              <EmptyState icon="📷" title="Sem fotos ainda"
                description={isLoggedIn ? 'Sê o primeiro a partilhar!' : 'Inicia sessão para partilhar fotos.'} />
            )}
          </div>
        )}

        {/* ── Tab: Notas ────────────────────────────── */}
        {activeTab === 'notes' && (
          <div className="p-4 space-y-4">

            {/* Formulário de nota (só logado) */}
            {isLoggedIn && user ? (
              <div className="bg-white rounded-2xl border border-neutral-100 p-4 space-y-3">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  A tua nota
                </p>

                {/* Star rating */}
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      onMouseEnter={() => setHoverRating(i + 1)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setNoteRating(noteRating === i + 1 ? 0 : i + 1)}
                    >
                      <Star
                        size={24}
                        className={cn(
                          'transition-colors',
                          i < (hoverRating || noteRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-neutral-200'
                        )}
                      />
                    </button>
                  ))}
                </div>

                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Partilha o teu beta, condições, dicas..."
                  rows={3}
                  className="w-full text-sm text-neutral-700 placeholder:text-neutral-400 bg-neutral-50 border border-neutral-200 rounded-xl p-3 resize-none outline-none focus:border-brand-600 focus:bg-white transition-colors"
                />

                <Button
                  variant="primary" size="sm"
                  disabled={!noteText.trim()}
                  loading={submittingNote}
                  onClick={submitNote}
                >
                  <MessageSquare size={14} /> Publicar nota
                </Button>
              </div>
            ) : (
              <LoginNudge onLogin={() => setAuthOpen(true)} />
            )}

            {/* Lista de notas */}
            {challenge.notes.length === 0 ? (
              <EmptyState icon="📝" title="Sem notas"
                description="Sê o primeiro a partilhar beta deste problema." />
            ) : (
              challenge.notes.map(note => (
                <NoteCard key={note.id} note={note} />
              ))
            )}
          </div>
        )}
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}

// ─── Sub-componentes ────────────────────────────────────

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
        {note.rating != null && (
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={10}
                className={i < note.rating! ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'} />
            ))}
          </div>
        )}
      </div>
      <p className="text-sm text-neutral-700 leading-relaxed">{note.content}</p>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────

interface GradeInfo {
  bgGradient: string
  textColor:  string
}

function getGradeInfo(grade: string | null): GradeInfo {
  if (!grade) return { bgGradient: 'linear-gradient(135deg,#374151,#1f2937)', textColor: 'text-white' }
  const num = parseFloat(grade.replace(/[^0-9.]/g, ''))
  if (num <= 5)  return { bgGradient: 'linear-gradient(135deg,#16a34a,#15803d)', textColor: 'text-white/90' }
  if (num <= 6)  return { bgGradient: 'linear-gradient(135deg,#d97706,#b45309)', textColor: 'text-white/90' }
  if (num <= 7)  return { bgGradient: 'linear-gradient(135deg,#ea580c,#c2410c)', textColor: 'text-white/90' }
  return               { bgGradient: 'linear-gradient(135deg,#dc2626,#991b1b)', textColor: 'text-white/90' }
}

function ChallengeSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-40 rounded" />
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    </div>
  )
}