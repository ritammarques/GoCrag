'use client'

// app/login/page.tsx
// Página de login standalone (acesso directo via URL /login)

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, User, ArrowLeft } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { signIn, signUp, isLoggedIn } = useAuth()

  const [view, setView]             = useState<'login' | 'register'>(
    params.get('view') === 'register' ? 'register' : 'login'
  )
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [name, setName]             = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Redireciona se já estiver logado
  useEffect(() => {
    if (isLoggedIn) router.replace(params.get('redirect') ?? '/map')
  }, [isLoggedIn])

  const handleSubmit = async () => {
    setError(null)
    if (!email || !password) { setError('Preenche todos os campos'); return }
    if (password.length < 6) { setError('Palavra-passe: mínimo 6 caracteres'); return }

    setLoading(true)
    try {
      if (view === 'login') {
        const { error } = await signIn(email, password)
        if (error) throw error
      } else {
        const { error } = await signUp(email, password, name || undefined)
        if (error) throw error
      }
      router.replace(params.get('redirect') ?? '/map')
    } catch (err: any) {
      const msg = err.message ?? ''
      if (msg.includes('Invalid login credentials')) setError('Email ou palavra-passe incorretos')
      else if (msg.includes('already registered'))   setError('Este email já tem conta.')
      else setError(msg || 'Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 w-9 h-9 bg-white rounded-full shadow-sm flex items-center justify-center"
      >
        <ArrowLeft size={18} className="text-neutral-600" />
      </button>

      {/* Conteúdo central */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">

          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-brand-600 rounded-3xl flex items-center justify-center text-3xl shadow-md">
              ⛰
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-black text-neutral-900">GoCrag</h1>
              <p className="text-sm text-neutral-500 mt-1">
                {view === 'login' ? 'Bem-vindo de volta!' : 'Cria a tua conta'}
              </p>
            </div>
          </div>

          {/* Formulário */}
          <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 p-6 space-y-4">
            {view === 'register' && (
              <Input
                id="name" label="Nome (opcional)" placeholder="O teu nome de escalada"
                value={name} onChange={e => setName(e.target.value)}
                icon={<User size={14} />}
              />
            )}
            <Input
              id="email" type="email" label="Email" placeholder="exemplo@email.com"
              value={email} onChange={e => setEmail(e.target.value)}
              icon={<Mail size={14} />}
            />
            <Input
              id="password" type="password" label="Palavra-passe" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              icon={<Lock size={14} />}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />

            {error && (
              <div className="bg-red-50 text-red-600 text-xs rounded-xl px-3 py-2.5 font-medium">
                {error}
              </div>
            )}

            <Button variant="primary" fullWidth loading={loading} onClick={handleSubmit}>
              {view === 'login' ? 'Iniciar sessão' : 'Criar conta'}
            </Button>
          </div>

          {/* Toggle */}
          <p className="text-center text-sm text-neutral-500">
            {view === 'login' ? 'Ainda não tens conta? ' : 'Já tens conta? '}
            <button
              onClick={() => { setView(v => v === 'login' ? 'register' : 'login'); setError(null) }}
              className="text-brand-600 font-bold"
            >
              {view === 'login' ? 'Criar conta' : 'Iniciar sessão'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}