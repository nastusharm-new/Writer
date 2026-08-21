import { useEffect, useState } from 'react'
import { dataStore, type AuthUser } from '../lib/dataStore'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    dataStore.getSession().then((session) => {
      if (!cancelled) {
        setUser(session)
        setLoading(false)
      }
    })
    const unsubscribe = dataStore.onAuthStateChange((next) => setUser(next))
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return {
    user,
    loading,
    signInWithEmail: dataStore.signInWithEmail,
    signOut: dataStore.signOut,
  }
}
