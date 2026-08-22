import type { ManuscriptSection } from './manuscript'

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function sectionsToHtml(sections: ManuscriptSection[]): string {
  return sections
    .map((section) => {
      const level = Math.min(section.depth + 1, 6)
      const heading = `<h${level}>${escapeHtml(section.title)}</h${level}>`
      const paragraphs = section.cards
        .map((card) => `<p>${escapeHtml(card.text).replace(/\n/g, '<br>')}</p>`)
        .join('\n')
      return `${heading}\n${paragraphs}`
    })
    .join('\n')
}

// No PDF library, no font embedding to get Cyrillic glyphs right — this
// opens a print-ready page in a new tab and hands off to the browser's own
// "Save as PDF" print destination, which renders with whatever fonts the
// system actually has and produces real, searchable text.
export function printManuscript(title: string, sections: ManuscriptSection[]) {
  const win = window.open('', '_blank')
  if (!win) {
    window.alert('Не удалось открыть окно печати — браузер заблокировал всплывающее окно.')
    return
  }

  const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Lora:ital,wght@0,400;0,600&display=swap" rel="stylesheet">
<style>
  @page { margin: 2.5cm 2cm; }
  body {
    font-family: 'Lora', Georgia, 'Iowan Old Style', serif;
    font-size: 13pt;
    line-height: 1.7;
    color: #100d09;
    max-width: 720px;
    margin: 0 auto;
    padding: 40px 20px;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 700;
    border-bottom: 1px solid #ddd6c4;
    padding-bottom: 8px;
    margin: 1.6em 0 0.8em;
    page-break-after: avoid;
  }
  p { margin: 0 0 1.1em; text-indent: 1.6em; orphans: 3; widows: 3; }
  p:first-of-type { text-indent: 0; }
</style>
</head>
<body>
${sectionsToHtml(sections)}
</body>
</html>`

  win.document.open()
  win.document.write(html)
  win.document.close()
  win.onload = () => {
    win.focus()
    win.print()
  }
}
