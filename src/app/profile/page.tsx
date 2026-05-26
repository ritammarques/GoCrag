'use client'

// app/profile/page.tsx
// Perfil do utilizador: stats, spots visitados, definições, logout

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Settings, LogOut, MapPin, FileText, Heart, ChevronRight, Edit2, Camera
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AuthModal } from '@/components/auth/AuthModal'
import { Button, Skeleton, EmptyState } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { getInitials } from '@/lib/utils'

export default function ProfilePage() {
  const { user, profile, loading, isLoggedIn, signOut } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const router = useRouter()

  if (loading) return (
    <AppShell>
      <div className="p-4 space-y-4">
        <Skeleton className="h-24 w-24 rounded-full mx-auto" />
        <Skeleton className="h-5 w-40 rounded mx-auto" />
        <Skeleton className="h-4 w-28 rounded mx-auto" />
      </div>
    </AppShell>
  )

  if (!isLoggedIn) return (
    <AppShell>
      <div className="flex flex-col h-full items-center justify-center p-6 gap-6">
        <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center text-4xl">
          👤
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-neutral-900 mb-1">O teu perfil</h2>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Inicia sessão para aceder ao teu perfil, guardar favoritos e partilhar beta com a comunidade.
          </p>
        </div>
        <Button variant="primary" fullWidth onClick={() => setAuthOpen(true)}>
          Iniciar sessão
        </Button>
        <Button variant="secondary" fullWidth onClick={() => setAuthOpen(true)}>
          Criar conta
        </Button>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    </AppShell>
  )

  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'Utilizador'
  const initials    = getInitials(displayName)
  const memberYear  = user?.created_at
    ? new Date(user.created_at).getFullYear()
    : new Date().getFullYear()

  return (
    <AppShell>
      <div className="flex flex-col h-full overflow-y-auto bg-neutral-50">

        {/* ── Header do perfil ──────────────────────── */}
        <div className="bg-white pb-6 pt-8 flex flex-col items-center gap-3 border-b border-neutral-100">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-brand-600 flex items-center justify-center text-2xl font-bold text-white">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                : initials
              }
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-neutral-800 text-white rounded-full flex items-center justify-center shadow-sm">
              <Camera size={13} />
            </button>
          </div>

          {/* Nome e username */}
          <div className="text-center">
            <h1 className="text-xl font-bold text-neutral-900">{displayName}</h1>
            {profile?.username && (
              <p className="text-sm text-neutral-500">@{profile.username}</p>
            )}
          </div>

          {/* Badge de membro */}
          <span className="px-3 py-1 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full">
            Membro desde {memberYear}
          </span>

          {/* Nível */}
          {profile?.level && (
            <span className="text-xs text-neutral-500">{profile.level}</span>
          )}
        </div>

        {/* ── Menu de itens ─────────────────────────── */}
        <div className="p-4 space-y-3">

          {/* Os meus spots */}
          <MenuSection title="Os meus spots">
            <MenuItem
              icon="📍" label="Spots visitados"
              onClick={() => router.push('/favorites')}
            />
            <MenuItem
              icon="❤️" label="Favoritos"
              onClick={() => router.push('/favorites')}
            />
          </MenuSection>

          {/* Conta */}
          <MenuSection title="Conta">
            <MenuItem
              icon={<Edit2 size={16} className="text-neutral-400" />}
              label="Editar perfil"
              onClick={() => {/* TODO: modal de edição */}}
            />
            <MenuItem
              icon={<Settings size={16} className="text-neutral-400" />}
              label="Definições"
              onClick={() => {/* TODO */}}
            />
          </MenuSection>

          {/* Sobre */}
          <MenuSection title="Sobre">
            <MenuItem icon="📖" label="Sobre o GoCrag"    onClick={() => {}} />
            <MenuItem icon="🔒" label="Privacidade"        onClick={() => {}} />
            <MenuItem icon="📧" label="Contacto / Suporte" onClick={() => {}} />
          </MenuSection>

          {/* Logout */}
          <button
            onClick={async () => { await signOut(); router.push('/map') }}
            className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-red-100 text-red-500"
          >
            <LogOut size={18} />
            <span className="text-sm font-semibold">Sair da conta</span>
          </button>
        </div>
      </div>
    </AppShell>
  )
}

// ─── Sub-componentes ────────────────────────────────────

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 px-1">
        {title}
      </p>
      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden divide-y divide-neutral-50">
        {children}
      </div>
    </div>
  )
}

function MenuItem({
  icon, label, value, onClick
}: {
  icon: React.ReactNode | string
  label: string
  value?: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-neutral-50 transition-colors">
      <span className="text-lg w-6 flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium text-neutral-800">{label}</span>
      {value && <span className="text-sm text-neutral-400">{value}</span>}
      <ChevronRight size={14} className="text-neutral-300" />
    </button>
  )
}
export const dynamic = 'force-dynamic'
