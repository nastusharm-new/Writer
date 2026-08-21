import type { Card } from '../types'

// A card belongs to the ordered "sequence" once the author has manually
// placed it (drag in the timeline); everything else settles in the
// "пока вне сюжета" zone below, sorted by creation time. This mirrors the
// brief: cards without links and without a manual order aren't forced into
// a structure the author hasn't chosen yet.
export function getSequence(cards: Card[]): Card[] {
  return cards
    .filter((c) => c.manual_order != null)
    .sort((a, b) => (a.manual_order as number) - (b.manual_order as number))
}

export function getUnassigned(cards: Card[]): Card[] {
  return cards
    .filter((c) => c.manual_order == null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export function timelinePositionLabel(cards: Card[], id: string): string {
  const sequence = getSequence(cards)
  const idx = sequence.findIndex((c) => c.id === id)
  if (idx === -1) return 'пока вне сюжета'
  return `№${idx + 1} из ${sequence.length}`
}
