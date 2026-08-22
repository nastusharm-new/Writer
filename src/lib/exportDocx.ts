import type { ManuscriptSection } from './manuscript'

export async function sectionsToDocxBlob(sections: ManuscriptSection[]): Promise<Blob> {
  // Dynamically imported so the docx library (and its non-trivial size)
  // only ever loads for someone who actually picks "Word" from the export
  // menu, instead of bloating every visitor's initial bundle.
  const { Document, HeadingLevel, Packer, Paragraph } = await import('docx')
  const headingByDepth = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ]

  const children: InstanceType<typeof Paragraph>[] = []

  for (const section of sections) {
    children.push(
      new Paragraph({
        text: section.title,
        heading: headingByDepth[Math.min(section.depth, headingByDepth.length - 1)],
      }),
    )
    for (const card of section.cards) {
      // A card's own line breaks become separate paragraphs — a blank
      // Word paragraph per newline reads as a real manuscript, not one
      // run-on block with literal \n characters in it.
      for (const line of card.text.split('\n')) {
        children.push(new Paragraph(line))
      }
      if (card.images.length > 0) {
        children.push(
          new Paragraph(`[+ ${card.images.length} изображени${card.images.length === 1 ? 'е' : 'я'}]`),
        )
      }
      children.push(new Paragraph('')) // spacer between cards
    }
  }

  const doc = new Document({ sections: [{ children }] })
  return Packer.toBlob(doc)
}
