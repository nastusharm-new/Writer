import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Server-only client using the service-role key, which bypasses RLS — that
// is exactly why it must never be prefixed VITE_ (Vite would bundle it
// into the client JS) and only ever read here, inside a Vercel Function.
// Reuses the same project URL the web app already talks to
// (VITE_SUPABASE_URL) since Node sees every env var regardless of the
// VITE_ prefix — that prefix only controls what Vite inlines into the
// browser bundle.
let cached: SupabaseClient | null = null

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached
  const url = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set')
  cached = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
  return cached
}
