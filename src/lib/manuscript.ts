import type { Card } from '../types'
import { getSequence, getUnassigned } from './timeline'

export interface ManuscriptSection {
  id: string
  title: string
  depth: number
  cards: Card[]
}

// Walks a project and every nested subgroup depth-first, laying out each
// one's cards in the same order the timeline would (sequence first, then
// whatever hasn't been placed yet) — used both by the downloadable
// compiled document and by the on-screen manuscript ("Текст") view, each
// supplying its own lookup shape for children/cards/titles.
export function buildManuscript(
  rootId: string,
  getChildren: (id: string) => string[],
  getCards: (id: string) => Card[],
  getTitle: (id: string) => string,
): ManuscriptSection[] {
  const sections: ManuscriptSection[] = []

  function walk(id: string, depth: number) {
    const cards = getCards(id)
    sections.push({
      id,
      title: getTitle(id),
      depth,
      cards: [...getSequence(cards), ...getUnassigned(cards)],
    })
    for (const child of getChildren(id)) walk(child, depth + 1)
  }

  walk(rootId, 0)
  return sections
}
