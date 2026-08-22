import { isTauri } from '@tauri-apps/api/core'
import type { Card, CardStatus, Project } from '../types'
import { isSupabaseConfigured } from './supabase'
import { localStore } from './localStore'
import { supabaseStore } from './supabaseStore'
import { tauriStore } from './tauriStore'

export interface AuthUser {
  id: string
  email: string | null
}

export type CardPatch = Partial<
  Pick<Card, 'text' | 'status' | 'manual_order' | 'fx' | 'fy' | 'images'>
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

  listProjects(userId: string): Promise<Project[]>
  createProject(userId: string, title: string, parentId: string | null): Promise<Project>
  renameProject(id: string, title: string): Promise<Project>
  // Reparents a project — dragging its row onto another folder in the
  // sidebar tree. Cycle-safety (never dropping a folder onto itself or one
  // of its own descendants) is the caller's job, not the store's.
  moveProject(id: string, parentId: string | null): Promise<Project>
  deleteProject(id: string): Promise<void>

  listCards(projectId: string): Promise<Card[]>
  // Every card across every one of the user's projects, for showing cards
  // as clickable leaves in the sidebar tree without a per-project fetch.
  listCardsForUser(userId: string): Promise<Card[]>
  createCard(projectId: string, text: string, status: CardStatus, images?: string[]): Promise<Card>
  updateCard(id: string, patch: CardPatch): Promise<Card>
  // Reassigns a card to a different project — dragging it onto another
  // group in the sidebar tree. Clears manual_order/fx/fy since those only
  // mean anything relative to the sequence/cloud it was leaving.
  moveCard(id: string, projectId: string): Promise<Card>
  // Soft-delete: the card leaves the board but keeps living in the
  // project's archive rather than being destroyed outright.
  archiveCard(id: string): Promise<void>
  restoreCard(id: string): Promise<Card>
  listArchivedCards(projectId: string): Promise<Card[]>
  // Permanent removal — only ever offered from within the archive itself.
  deleteCard(id: string): Promise<void>
}

// The desktop build (Tauri) always stores data in a local file, full stop —
// that's the whole point of a "no subscription, buy it once" app, and it
// takes priority even if Supabase env vars happened to leak into that
// build. The hosted web app keeps its existing choice: Supabase when
// configured, otherwise a localStorage-backed store so it's usable without
// a backend during development.
export const dataStore: DataStore = isTauri() ? tauriStore : isSupabaseConfigured ? supabaseStore : localStore

