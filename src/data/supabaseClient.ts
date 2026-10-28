import type { SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)
export const isRemoteStylistEnabled = isSupabaseConfigured && import.meta.env.VITE_ENABLE_REMOTE_STYLIST === 'true'

let clientPromise: Promise<SupabaseClient> | null = null

/** Lazily loads the Supabase SDK so demo mode does not pay for it. */
export function getSupabase(): Promise<SupabaseClient> {
  if (!isSupabaseConfigured) return Promise.reject(new Error('Supabase is not configured.'))
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url as string, anonKey as string, { auth: { persistSession: true, autoRefreshToken: true } }),
    )
  }
  return clientPromise
}
