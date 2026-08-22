import type { Card, Project } from '../types'
import { buildManuscript } from './manuscript'

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

// Walks a project and every nested subgroup depth-first (see
// buildManuscript) and formats it as plain text — the manuscript read top
// to bottom, the way the author has actually arranged it so far.
export function compileToText(projects: Project[], cardsByProject: Map<string, Card[]>, rootId: string): string {
  const children = childrenByParent(projects)
  const byId = new Map(projects.map((p) => [p.id, p]))
  const sections = buildManuscript(
    rootId,
    (id) => (children.get(id) ?? []).map((p) => p.id),
    (id) => cardsByProject.get(id) ?? [],
    (id) => byId.get(id)?.title ?? 'Без названия',
  )

  const lines: string[] = []
  for (const section of sections) {
    lines.push(`${'#'.repeat(Math.min(section.depth + 1, 6))} ${section.title}`, '')
    for (const card of section.cards) {
      lines.push(card.text.trim())
      if (card.images.length > 0) {
        lines.push(`[+ ${card.images.length} изображени${card.images.length === 1 ? 'е' : 'я'}]`)
      }
      lines.push('')
    }
  }
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
