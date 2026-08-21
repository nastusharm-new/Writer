import { useEffect, useState } from 'react'
import { dataStore } from '../lib/dataStore'
import type { Project } from '../types'

// MVP has no project switcher UI (per the brief): each user gets a single
// default project created on first login.
export function useProject(userId: string | undefined) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoading(true)
    dataStore.ensureDefaultProject(userId).then((p) => {
      if (!cancelled) {
        setProject(p)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  return { project, loading }
}
