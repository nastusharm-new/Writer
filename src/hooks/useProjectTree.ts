import { useCallback, useEffect, useMemo, useState } from 'react'
import { dataStore } from '../lib/dataStore'
import type { Project } from '../types'

export interface ProjectTreeNode {
  project: Project
  children: ProjectTreeNode[]
}

function buildTree(projects: Project[]): ProjectTreeNode[] {
  const byParent = new Map<string | null, Project[]>()
  for (const p of projects) {
    const key = p.parent_id
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(p)
  }
  const build = (parentId: string | null): ProjectTreeNode[] =>
    (byParent.get(parentId) ?? []).map((project) => ({
      project,
      children: build(project.id),
    }))
  return build(null)
}

function lastProjectKey(userId: string) {
  return `draft:lastProjectId:${userId}`
}

// Owns the whole sidebar tree: every project the user has, nested
// arbitrarily deep via parent_id, plus which one is currently open in the
// main pane.
export function useProjectTree(userId: string | undefined) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      let list = await dataStore.listProjects(userId)
      if (list.length === 0) {
        const root = await dataStore.createProject(userId, 'Черновик', null)
        list = [root]
      }
      if (cancelled) return
      setProjects(list)
      const savedId = localStorage.getItem(lastProjectKey(userId))
      const restored = savedId && list.some((p) => p.id === savedId) ? savedId : list[0].id
      setActiveProjectIdState(restored)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  const setActiveProjectId = useCallback(
    (id: string) => {
      setActiveProjectIdState(id)
      if (userId) localStorage.setItem(lastProjectKey(userId), id)
    },
    [userId],
  )

  const addProject = useCallback(
    async (parentId: string | null, title: string) => {
      if (!userId) return
      const created = await dataStore.createProject(userId, title, parentId)
      setProjects((prev) => [...prev, created])
      setActiveProjectId(created.id)
      return created
    },
    [userId, setActiveProjectId],
  )

  const renameProject = useCallback(async (id: string, title: string) => {
    const updated = await dataStore.renameProject(id, title)
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
  }, [])

  const moveProject = useCallback(async (id: string, parentId: string | null) => {
    const updated = await dataStore.moveProject(id, parentId)
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
  }, [])

  const deleteProject = useCallback(
    async (id: string) => {
      await dataStore.deleteProject(id)
      setProjects((prev) => {
        const toDelete = new Set([id])
        let grew = true
        while (grew) {
          grew = false
          for (const p of prev) {
            if (p.parent_id && toDelete.has(p.parent_id) && !toDelete.has(p.id)) {
              toDelete.add(p.id)
              grew = true
            }
          }
        }
        const next = prev.filter((p) => !toDelete.has(p.id))
        if (activeProjectId && toDelete.has(activeProjectId)) {
          const fallback = next[0]
          if (fallback) setActiveProjectId(fallback.id)
        }
        return next
      })
    },
    [activeProjectId, setActiveProjectId],
  )

  const tree = useMemo(() => buildTree(projects), [projects])

  return {
    projects,
    tree,
    loading,
    activeProjectId,
    setActiveProjectId,
    addProject,
    renameProject,
    moveProject,
    deleteProject,
  }
}
