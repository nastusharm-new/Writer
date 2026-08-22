import { useCallback, useEffect, useState } from 'react'
import { dataStore } from '../lib/dataStore'
import type { Card } from '../types'

// Backs the archive panel: loaded lazily (only while the panel is open,
// see BoardView) rather than kept live alongside the board's own cards —
// archived cards don't need to be perfectly real-time, just correct
// whenever someone actually opens the archive to look through it.
export function useArchive(projectId: string, open: boolean) {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    dataStore.listArchivedCards(projectId).then((list) => {
      setCards(list)
      setLoading(false)
    })
  }, [projectId])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const restore = useCallback(
    async (id: string) => {
      setCards((prev) => prev.filter((c) => c.id !== id))
      await dataStore.restoreCard(id)
    },
    [],
  )

  const destroy = useCallback(async (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id))
    await dataStore.deleteCard(id)
  }, [])

  return { cards, loading, restore, destroy }
}
