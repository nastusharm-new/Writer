import { v4 as uuid } from 'uuid'
import type { Card, CardStatus, Project } from '../types'
import type { AuthUser, CardPatch, DataStore } from './dataStore'

// Browser-only fallback store, used when no Supabase project is configured
// (see src/lib/supabase.ts). It mirrors the shape of the real Supabase
// schema (projects / cards) so switching to a real backend later is a
// matter of filling in .env.local, not rewriting the app.

const LS_USER = 'draft:user'
const LS_PROJECTS = 'draft:projects'
const LS_CARDS = 'draft:cards'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

const listeners = new Set<(user: AuthUser | null) => void>()

function currentUser(): AuthUser | null {
  return read<AuthUser | null>(LS_USER, null)
}

export const localStore: DataStore = {
  async getSession() {
    return currentUser()
  },

  onAuthStateChange(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },

  async signInWithEmail(email: string) {
    // No real auth in local mode: "signing in" just remembers the email.
    const user: AuthUser = { id: `local-${email}`, email }
    write(LS_USER, user)
    listeners.forEach((cb) => cb(user))
    return { requiresConfirmation: false }
  },

  async signOut() {
    localStorage.removeItem(LS_USER)
    listeners.forEach((cb) => cb(null))
  },

  async ensureDefaultProject(userId: string) {
    const projects = read<Project[]>(LS_PROJECTS, [])
    const existing = projects.find((p) => p.user_id === userId)
    if (existing) return existing
    const project: Project = { id: uuid(), user_id: userId, title: 'Черновик' }
    write(LS_PROJECTS, [...projects, project])
    return project
  },

  async listCards(projectId: string) {
    const cards = read<Card[]>(LS_CARDS, [])
    return cards
      .filter((c) => c.project_id === projectId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
  },

  async createCard(projectId: string, text: string, status: CardStatus) {
    const cards = read<Card[]>(LS_CARDS, [])
    const card: Card = {
      id: uuid(),
      project_id: projectId,
      text,
      status,
      created_at: new Date().toISOString(),
      manual_order: null,
      fx: null,
      fy: null,
    }
    write(LS_CARDS, [...cards, card])
    return card
  },

  async updateCard(id: string, patch: CardPatch) {
    const cards = read<Card[]>(LS_CARDS, [])
    let updated: Card | undefined
    const next = cards.map((c) => {
      if (c.id !== id) return c
      updated = { ...c, ...patch }
      return updated
    })
    write(LS_CARDS, next)
    if (!updated) throw new Error('card not found')
    return updated
  },

  async deleteCard(id: string) {
    const cards = read<Card[]>(LS_CARDS, [])
    write(
      LS_CARDS,
      cards.filter((c) => c.id !== id),
    )
  },
}
