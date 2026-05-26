// lib/supabase-server.ts
// Cliente Supabase para Server Components — usa a API getAll/setAll
// do @supabase/ssr v0.4+ (compatível com Netlify SSR)

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Em Server Components read-only, o set falha silenciosamente.
            // O middleware trata da actualização do cookie.
          }
        },
      },
    }
  )
}
