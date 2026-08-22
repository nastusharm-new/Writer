import { load, type Store } from '@tauri-apps/plugin-store'
import { v4 as uuid } from 'uuid'
import type { Card, CardStatus, Project } from '../types'
import type { AuthUser, CardPatch, DataStore } from './dataStore'

// The desktop build's real data store: a JSON file in the OS's app-data
// directory (via Tauri's store plugin), not a server. Same shape as
// localStore (the browser-only dev fallback) — same three keys, same
// filter/sort logic — just persisted to an actual file on disk instead of
// the browser's localStorage, which is small, per-webview, and not
// somewhere a user could find and back up.

const LS_USER = 'draft:user'
const LS_PROJECTS = 'draft:projects'
const LS_CARDS = 'draft:cards'

let storePromise: Promise<Store> | null = null
function getStore(): Promise<Store> {
  storePromise ??= load('draft-data.json', { autoSave: true })
  return storePromise
}

async function read<T>(key: string, fallback: T): Promise<T> {
  const store = await getStore()
  const value = await store.get<T>(key)
  return value ?? fallback
}

async function write<T>(key: string, value: T): Promise<void> {
  const store = await getStore()
  await store.set(key, value)
}

const listeners = new Set<(user: AuthUser | null) => void>()

async function currentUser(): Promise<AuthUser | null> {
  return read<AuthUser | null>(LS_USER, null)
}

export const tauriStore: DataStore = {
  async getSession() {
    return currentUser()
  },

  onAuthStateChange(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },

  async signInWithEmail(email: string) {
    // No real auth on the desktop build either — one licensed copy is
    // already tied to one buyer (see lib/license.ts); "signing in" here
    // just names the local workspace.
    const user: AuthUser = { id: `local-${email}`, email }
    await write(LS_USER, user)
    listeners.forEach((cb) => cb(user))
    return { requiresConfirmation: false }
  },

  async signOut() {
    await write(LS_USER, null)
    listeners.forEach((cb) => cb(null))
  },

  async listProjects(userId: string) {
    const projects = await read<Project[]>(LS_PROJECTS, [])
    return projects.filter((p) => p.user_id === userId)
  },

  async createProject(userId: string, title: string, parentId: string | null) {
    const projects = await read<Project[]>(LS_PROJECTS, [])
    const project: Project = { id: uuid(), user_id: userId, title, parent_id: parentId }
    await write(LS_PROJECTS, [...projects, project])
    return project
  },

  async renameProject(id: string, title: string) {
    const projects = await read<Project[]>(LS_PROJECTS, [])
    let updated: Project | undefined
    const next = projects.map((p) => {
      if (p.id !== id) return p
      updated = { ...p, title }
      return updated
    })
    await write(LS_PROJECTS, next)
    if (!updated) throw new Error('project not found')
    return updated
  },

  async moveProject(id: string, parentId: string | null) {
    const projects = await read<Project[]>(LS_PROJECTS, [])
    let updated: Project | undefined
    const next = projects.map((p) => {
      if (p.id !== id) return p
      updated = { ...p, parent_id: parentId }
      return updated
    })
    await write(LS_PROJECTS, next)
    if (!updated) throw new Error('project not found')
    return updated
  },

  async deleteProject(id: string) {
    // Mirrors the DB's ON DELETE CASCADE: drop the project, its descendant
    // projects (any depth), and their cards.
    const projects = await read<Project[]>(LS_PROJECTS, [])
    const toDelete = new Set<string>([id])
    let grew = true
    while (grew) {
      grew = false
      for (const p of projects) {
        if (p.parent_id && toDelete.has(p.parent_id) && !toDelete.has(p.id)) {
          toDelete.add(p.id)
          grew = true
        }
      }
    }
    await write(
      LS_PROJECTS,
      projects.filter((p) => !toDelete.has(p.id)),
    )
    const cards = await read<Card[]>(LS_CARDS, [])
    await write(
      LS_CARDS,
      cards.filter((c) => !toDelete.has(c.project_id)),
    )
  },

  async listCards(projectId: string) {
    const cards = await read<Card[]>(LS_CARDS, [])
    return cards
      .filter((c) => c.project_id === projectId && !c.archived_at)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
  },

  async listCardsForUser(userId: string) {
    const projects = await read<Project[]>(LS_PROJECTS, [])
    const ownIds = new Set(projects.filter((p) => p.user_id === userId).map((p) => p.id))
    const cards = await read<Card[]>(LS_CARDS, [])
    return cards.filter((c) => ownIds.has(c.project_id) && !c.archived_at)
  },

  async createCard(projectId: string, text: string, status: CardStatus, images: string[] = []) {
    const cards = await read<Card[]>(LS_CARDS, [])
    const card: Card = {
      id: uuid(),
      project_id: projectId,
      text,
      status,
      created_at: new Date().toISOString(),
      manual_order: null,
      fx: null,
      fy: null,
      images,
      archived_at: null,
    }
    await write(LS_CARDS, [...cards, card])
    return card
  },

  async updateCard(id: string, patch: CardPatch) {
    const cards = await read<Card[]>(LS_CARDS, [])
    let updated: Card | undefined
    const next = cards.map((c) => {
      if (c.id !== id) return c
      updated = { ...c, ...patch }
      return updated
    })
    await write(LS_CARDS, next)
    if (!updated) throw new Error('card not found')
    return updated
  },

  async moveCard(id: string, projectId: string) {
    const cards = await read<Card[]>(LS_CARDS, [])
    let updated: Card | undefined
    const next = cards.map((c) => {
      if (c.id !== id) return c
      updated = { ...c, project_id: projectId, manual_order: null, fx: null, fy: null }
      return updated
    })
    await write(LS_CARDS, next)
    if (!updated) throw new Error('card not found')
    return updated
  },

  async archiveCard(id: string) {
    const cards = await read<Card[]>(LS_CARDS, [])
    await write(
      LS_CARDS,
      cards.map((c) => (c.id === id ? { ...c, archived_at: new Date().toISOString() } : c)),
    )
  },

  async restoreCard(id: string) {
    const cards = await read<Card[]>(LS_CARDS, [])
    let updated: Card | undefined
    const next = cards.map((c) => {
      if (c.id !== id) return c
      updated = { ...c, archived_at: null }
      return updated
    })
    await write(LS_CARDS, next)
    if (!updated) throw new Error('card not found')
    return updated
  },

  async listArchivedCards(projectId: string) {
    const cards = await read<Card[]>(LS_CARDS, [])
    return cards
      .filter((c) => c.project_id === projectId && c.archived_at)
      .sort((a, b) => (b.archived_at ?? '').localeCompare(a.archived_at ?? ''))
  },

  async deleteCard(id: string) {
    const cards = await read<Card[]>(LS_CARDS, [])
    await write(
      LS_CARDS,
      cards.filter((c) => c.id !== id),
    )
  },
}
