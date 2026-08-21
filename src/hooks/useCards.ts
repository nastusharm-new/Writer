import { useCallback, useEffect, useState } from 'react'
import { dataStore, type CardPatch } from '../lib/dataStore'
import type { Card, CardStatus } from '../types'

export function useCards(projectId: string | undefined) {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    setLoading(true)
    dataStore.listCards(projectId).then((list) => {
      if (!cancelled) {
        setCards(list)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [projectId])

  const addCard = useCallback(
    async (text: string, status: CardStatus = 'spark') => {
      if (!projectId || !text.trim()) return
      const card = await dataStore.createCard(projectId, text.trim(), status)
      setCards((prev) => [...prev, card])
      return card
    },
    [projectId],
  )

  const patchCard = useCallback(async (id: string, patch: CardPatch) => {
    // Optimistic update so dragging feels instant.
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    try {
      const updated = await dataStore.updateCard(id, patch)
      setCards((prev) => prev.map((c) => (c.id === id ? updated : c)))
    } catch (err) {
      console.error('Failed to update card', err)
    }
  }, [])

  const removeCard = useCallback(async (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id))
    try {
      await dataStore.deleteCard(id)
    } catch (err) {
      console.error('Failed to delete card', err)
    }
  }, [])

  return { cards, loading, addCard, patchCard, removeCard }
}
