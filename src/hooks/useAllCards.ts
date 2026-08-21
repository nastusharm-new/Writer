import { useEffect, useMemo, useState } from 'react'
import { dataStore } from '../lib/dataStore'
import type { Card } from '../types'

// Groups every one of the user's cards by project, for the sidebar tree.
// The currently active project is always overlaid with its live `cards`
// (from useCards) rather than this snapshot — that's the only project
// whose cards can actually change while you're looking at the tree, so
// it's the only one that needs to be perfectly live; everything else just
// needs to be recent, and gets refreshed whenever you switch projects.
export function useAllCards(userId: string | undefined, activeProjectId: string | null, activeCards: Card[]) {
  const [snapshot, setSnapshot] = useState<Card[]>([])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    dataStore.listCardsForUser(userId).then((cards) => {
      if (!cancelled) setSnapshot(cards)
    })
    return () => {
      cancelled = true
    }
  }, [userId, activeProjectId])

  return useMemo(() => {
    const map = new Map<string, Card[]>()
    for (const card of snapshot) {
      if (card.project_id === activeProjectId) continue
      const list = map.get(card.project_id)
      if (list) list.push(card)
      else map.set(card.project_id, [card])
    }
    if (activeProjectId) map.set(activeProjectId, activeCards)
    return map
  }, [snapshot, activeProjectId, activeCards])
}
