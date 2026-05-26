'use client'

// components/auth/AuthModal.tsx

import { useState } from 'react'
import { X, Mail, Lock, User } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialView?: 'login' | 'register'
}

export function AuthModal({
  isOpen,
  onClose,
  initialView = 'login',
}: AuthModalProps) {
  const [view,     setView]     = useState<'login' | 'register'>(initialView)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const { signIn, signUp } = useAuth()

  if (!isOpen) return null

  const reset = () => { setError(null); setEmail(''); setPassword(''); setName('') }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async () => {
    setError(null)
    if (!email.trim() || !password) {
      setError('Preenche email e palavra-passe')
      return
    }
    if (password.length < 6) {
      setError('Palavra-passe: mínimo 6 caracteres')
      return
    }

    setLoading(true)
    try {
      if (view === 'login') {
        const { error: e } = await signIn(email.trim(), password)
        if (e) throw e
      } else {
        const { error: e } = await signUp(email.trim(), password, name.trim() || undefined)
        if (e) throw e
      }
      handleClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Invalid login credentials'))
        setError('Email ou palavra-passe incorretos')
      else if (msg.includes('Email not confirmed'))
        setError('Confirma o teu email antes de entrar')
      else if (msg.includes('already registered'))
        setError('Este email já tem conta — faz login')
      else
        setError(msg || 'Erro ao autenticar. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      {/* Card */}
      <div className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-8 animate-slide-up shadow-modal z-10 mx-0 sm:mx-4">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>

        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-2xl">
            ⛰
          </div>
          <h2 className="text-xl font-bold text-neutral-900">
            {view === 'login' ? 'Bem-vindo de volta!' : 'Criar conta'}
          </h2>
          <p className="text-sm text-neutral-500 text-center leading-snug">
            {view === 'login'
              ? 'Inicia sessão para guardar spots e partilhar beta.'
              : 'Junta-te à comunidade de bouldering outdoor.'}
          </p>
        </div>

        {/* Form */}
        <div className="space-y-3">
          {view === 'register' && (
            <Input
              id="auth-name"
              label="Nome (opcional)"
              placeholder="O teu nome"
              value={name}
              onChange={e => setName(e.target.value)}
              icon={<User size={14} />}
              autoComplete="name"
            />
          )}
          <Input
            id="auth-email"
            type="email"
            label="Email"
            placeholder="exemplo@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            icon={<Mail size={14} />}
            autoComplete="email"
          />
          <Input
            id="auth-password"
            type="password"
            label="Palavra-passe"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            icon={<Lock size={14} />}
            autoComplete={view === 'login' ? 'current-password' : 'new-password'}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />

          {error && (
            <div
              className="bg-red-50 text-red-600 text-xs rounded-xl px-3 py-2.5 font-medium"
              role="alert"
            >
              {error}
            </div>
          )}

          <Button
            variant="primary"
            fullWidth
            loading={loading}
            onClick={handleSubmit}
          >
            {view === 'login' ? 'Iniciar sessão' : 'Criar conta'}
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-neutral-100" />
          <span className="text-xs text-neutral-400">ou</span>
          <div className="flex-1 h-px bg-neutral-100" />
        </div>

        {/* Toggle */}
        <p className="text-center text-sm text-neutral-500">
          {view === 'login' ? 'Ainda não tens conta? ' : 'Já tens conta? '}
          <button
            onClick={() => {
              setView(v => (v === 'login' ? 'register' : 'login'))
              setError(null)
            }}
            className="text-brand-600 font-semibold"
          >
            {view === 'login' ? 'Criar conta' : 'Iniciar sessão'}
          </button>
        </p>
      </div>
    </div>
  )
}
