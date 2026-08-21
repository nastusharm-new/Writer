import type { Card, CardStatus, Project } from '../types'
import { isSupabaseConfigured } from './supabase'
import { localStore } from './localStore'
import { supabaseStore } from './supabaseStore'

export interface AuthUser {
  id: string
  email: string | null
}

export type CardPatch = Partial<
  Pick<Card, 'text' | 'status' | 'manual_order' | 'fx' | 'fy'>
>

/**
 * Storage-agnostic interface used by the app's hooks/components. Two
 * implementations exist: `supabaseStore` (real backend, per the brief) and
 * `localStore` (browser-only fallback used when no Supabase project is
 * configured, so the app is usable out of the box during development).
 */
export interface DataStore {
  getSession(): Promise<AuthUser | null>
  onAuthStateChange(cb: (user: AuthUser | null) => void): () => void
  signInWithEmail(email: string): Promise<{ requiresConfirmation: boolean }>
  signOut(): Promise<void>

  ensureDefaultProject(userId: string): Promise<Project>

  listCards(projectId: string): Promise<Card[]>
  createCard(projectId: string, text: string, status: CardStatus): Promise<Card>
  updateCard(id: string, patch: CardPatch): Promise<Card>
  deleteCard(id: string): Promise<void>
}

// When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY aren't set, the app runs
// against a localStorage-backed store so it's usable without a backend.
export const dataStore: DataStore = isSupabaseConfigured ? supabaseStore : localStore

