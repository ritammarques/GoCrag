// lib/supabase.ts
// Cliente Supabase — usado em componentes cliente
// Para Server Components usar createServerClient do @supabase/ssr

import { createBrowserClient } from '@supabase/ssr'

// As variáveis de ambiente devem estar no .env.local
// NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Instância singleton para uso directo em hooks/componentes cliente
export const supabase = createClient()
