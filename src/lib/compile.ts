import type { Card, Project } from '../types'
import { getSequence, getUnassigned } from './timeline'

function childrenByParent(projects: Project[]): Map<string, Project[]> {
  const map = new Map<string, Project[]>()
  for (const p of projects) {
    if (!p.parent_id) continue
    const list = map.get(p.parent_id)
    if (list) list.push(p)
    else map.set(p.parent_id, [p])
  }
  return map
}

// Walks a project and every nested subgroup depth-first, laying out each
// one's cards in the same order the timeline would (sequence first, then
// whatever hasn't been placed yet) — the manuscript read top to bottom, the
// way the author has actually arranged it so far.
export function compileToText(projects: Project[], cardsByProject: Map<string, Card[]>, rootId: string): string {
  const children = childrenByParent(projects)
  const byId = new Map(projects.map((p) => [p.id, p]))
  const lines: string[] = []

  function walk(projectId: string, depth: number) {
    const project = byId.get(projectId)
    if (!project) return
    lines.push(`${'#'.repeat(Math.min(depth + 1, 6))} ${project.title}`, '')

    const cards = cardsByProject.get(projectId) ?? []
    for (const card of [...getSequence(cards), ...getUnassigned(cards)]) {
      lines.push(card.text.trim(), '')
    }

    for (const child of children.get(projectId) ?? []) {
      walk(child.id, depth + 1)
    }
  }

  walk(rootId, 0)
  return `${lines.join('\n').trim()}\n`
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoking immediately can race with the browser reading the anchor's
  // `download` attribute for the save-as filename — defer it a beat.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
