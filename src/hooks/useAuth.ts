'use client'

// hooks/useAuth.ts
// Hook central de autenticação — usa Supabase Auth

'use client'

import { useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  })

  // Carrega perfil do utilizador do Supabase
  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return data as Profile | null
  }, [])

  useEffect(() => {
    // Obtém a sessão actual ao montar o componente
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const profile = session?.user ? await loadProfile(session.user.id) : null
      setState({ user: session?.user ?? null, session, profile, loading: false })
    })

    // Subscreve a mudanças de sessão (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const profile = session?.user ? await loadProfile(session.user.id) : null
        setState({ user: session?.user ?? null, session, profile, loading: false })
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProfile])

  // ── Métodos de auth ──────────────────────────────────

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { user: data.user, error }
  }

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || email.split('@')[0] } }
    })
    return { user: data.user, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!state.user) return { error: new Error('Não autenticado') }
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', state.user.id)
      .select()
      .single()
    if (data) setState(prev => ({ ...prev, profile: data as Profile }))
    return { error }
  }

  return {
    ...state,
    isLoggedIn: !!state.user,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }
}
