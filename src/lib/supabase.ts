// lib/supabase.ts
// Cliente Supabase para Client Components.
// Lazy: só cria a instância quando é chamado pela primeira vez,
// nunca durante o build (onde as env vars não existem).

import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Singleton lazy — criado na primeira chamada, não no import
let _client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (!_client) {
    _client = createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
  }
  return _client
}

// Alias para compatibilidade com o código existente
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_target, prop) {
    return (getSupabaseClient() as any)[prop]
  },
})
