import { supabase } from './supabase'
import type { Card, CardStatus, Project } from '../types'
import type { AuthUser, CardPatch, DataStore } from './dataStore'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

function toAuthUser(user: { id: string; email?: string | null } | null): AuthUser | null {
  if (!user) return null
  return { id: user.id, email: user.email ?? null }
}

export const supabaseStore: DataStore = {
  async getSession() {
    const { data } = await client().auth.getSession()
    return toAuthUser(data.session?.user ?? null)
  },

  onAuthStateChange(cb) {
    const {
      data: { subscription },
    } = client().auth.onAuthStateChange((_event, session) => {
      cb(toAuthUser(session?.user ?? null))
    })
    return () => subscription.unsubscribe()
  },

  async signInWithEmail(email: string) {
    const { error } = await client().auth.signInWithOtp({ email })
    if (error) throw error
    // Supabase sends a magic link / OTP; the session lands via
    // onAuthStateChange once the user confirms it.
    return { requiresConfirmation: true }
  },

  async signOut() {
    await client().auth.signOut()
  },

  async listProjects(userId: string) {
    const { data, error } = await client()
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: true })
    if (error) throw error
    return (data ?? []) as Project[]
  },

  async createProject(userId: string, title: string, parentId: string | null) {
    const { data, error } = await client()
      .from('projects')
      .insert({ user_id: userId, title, parent_id: parentId })
      .select()
      .single()
    if (error) throw error
    return data as Project
  },

  async renameProject(id: string, title: string) {
    const { data, error } = await client()
      .from('projects')
      .update({ title })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Project
  },

  async deleteProject(id: string) {
    // ON DELETE CASCADE on projects.parent_id and cards.project_id handles
    // descendant projects and their cards server-side.
    const { error } = await client().from('projects').delete().eq('id', id)
    if (error) throw error
  },

  async listCards(projectId: string) {
    const { data, error } = await client()
      .from('cards')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as Card[]
  },

  async listCardsForUser(userId: string) {
    // Inner-join on projects purely to filter by ownership; RLS already
    // guarantees isolation, this just avoids an N-query fan-out per project.
    const { data, error } = await client()
      .from('cards')
      .select('id, project_id, text, status, created_at, manual_order, fx, fy, projects!inner(user_id)')
      .eq('projects.user_id', userId)
    if (error) throw error
    return (data ?? []).map(({ projects: _projects, ...card }) => card) as Card[]
  },

  async createCard(projectId: string, text: string, status: CardStatus) {
    const { data, error } = await client()
      .from('cards')
      .insert({ project_id: projectId, text, status })
      .select()
      .single()
    if (error) throw error
    return data as Card
  },

  async updateCard(id: string, patch: CardPatch) {
    const { data, error } = await client()
      .from('cards')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Card
  },

  async moveCard(id: string, projectId: string) {
    const { data, error } = await client()
      .from('cards')
      .update({ project_id: projectId, manual_order: null, fx: null, fy: null })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Card
  },

  async deleteCard(id: string) {
    const { error } = await client().from('cards').delete().eq('id', id)
    if (error) throw error
  },
}
