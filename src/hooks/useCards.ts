import { useCallback, useEffect, useState } from 'react'
import { dataStore, type CardPatch } from '../lib/dataStore'
import type { Card, CardStatus } from '../types'

interface Loaded {
  projectId: string | undefined
  cards: Card[]
}

export function useCards(projectId: string | undefined) {
  // Tracks which project the held `cards` actually belong to. Without this,
  // switching projects has a render where `projectId` already points at the
  // new project but the effect below hasn't fired yet — callers would
  // briefly see the *previous* project's cards under the new project's id.
  const [loaded, setLoaded] = useState<Loaded>({ projectId: undefined, cards: [] })
  const [fetching, setFetching] = useState(true)
  const [refetchToken, setRefetchToken] = useState(0)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    setFetching(true)
    dataStore.listCards(projectId).then((list) => {
      if (!cancelled) {
        setLoaded({ projectId, cards: list })
        setFetching(false)
      }
    })
    return () => {
      cancelled = true
    }
    // refetchToken is a deliberate re-run trigger — see refetch() below,
    // used when a card is dragged into or out of this project from the
    // sidebar tree (a mutation useCards itself didn't make).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, refetchToken])

  const refetch = useCallback(() => setRefetchToken((t) => t + 1), [])

  const stale = loaded.projectId !== projectId
  const cards = stale ? [] : loaded.cards
  const loading = stale || fetching

  const setCards = useCallback((updater: (prev: Card[]) => Card[]) => {
    setLoaded((prev) => ({ ...prev, cards: updater(prev.cards) }))
  }, [])

  const addCard = useCallback(
    async (text: string, status: CardStatus = 'spark') => {
      if (!projectId || !text.trim()) return
      const card = await dataStore.createCard(projectId, text.trim(), status)
      setCards((prev) => [...prev, card])
      return card
    },
    [projectId, setCards],
  )

  const patchCard = useCallback(
    async (id: string, patch: CardPatch) => {
      // Optimistic update so dragging feels instant.
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
      try {
        const updated = await dataStore.updateCard(id, patch)
        setCards((prev) => prev.map((c) => (c.id === id ? updated : c)))
      } catch (err) {
        console.error('Failed to update card', err)
      }
    },
    [setCards],
  )

  const removeCard = useCallback(
    async (id: string) => {
      setCards((prev) => prev.filter((c) => c.id !== id))
      try {
        await dataStore.deleteCard(id)
      } catch (err) {
        console.error('Failed to delete card', err)
      }
    },
    [setCards],
  )

  return { cards, loading, addCard, patchCard, removeCard, refetch }
}
