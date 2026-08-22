import type { Card, Project } from '../types'
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

// Convenience wrapper for callers that already have the full project list
// (parent_id-based) rather than BoardView's aggregation-map shape — used by
// the export flow (App.tsx), which fetches a fresh snapshot of every card
// rather than trusting the sidebar's cache.
export function manuscriptFromProjects(
  projects: Project[],
  cardsByProject: Map<string, Card[]>,
  rootId: string,
): ManuscriptSection[] {
  const childrenOf = new Map<string, string[]>()
  for (const p of projects) {
    if (!p.parent_id) continue
    const list = childrenOf.get(p.parent_id)
    if (list) list.push(p.id)
    else childrenOf.set(p.parent_id, [p.id])
  }
  const byId = new Map(projects.map((p) => [p.id, p]))
  return buildManuscript(
    rootId,
    (id) => childrenOf.get(id) ?? [],
    (id) => cardsByProject.get(id) ?? [],
    (id) => byId.get(id)?.title ?? 'Без названия',
  )
}
