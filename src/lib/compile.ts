import type { ManuscriptSection } from './manuscript'

// Formats an already-built manuscript (see manuscript.ts) as Markdown — a
// project/subgroup title becomes a heading at its depth, its cards follow
// as plain paragraphs in sequence order.
export function sectionsToMarkdown(sections: ManuscriptSection[]): string {
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

export function downloadBlob(filename: string, blob: Blob) {
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
