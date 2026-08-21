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

  async ensureDefaultProject(userId: string) {
    const db = client()
    const { data: existing, error: selectError } = await db
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (selectError) throw selectError
    if (existing) return existing as Project

    const { data: created, error: insertError } = await db
      .from('projects')
      .insert({ user_id: userId, title: 'Черновик' })
      .select()
      .single()
    if (insertError) throw insertError
    return created as Project
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

  async deleteCard(id: string) {
    const { error } = await client().from('cards').delete().eq('id', id)
    if (error) throw error
  },
}
