import type { ManuscriptSection } from '../lib/manuscript'

interface Props {
  sections: ManuscriptSection[]
}

// The whole manuscript as continuous prose — no cards, no boxes, just the
// text in order, the way it'll actually read once it's a book. Read-only:
// editing still happens in each card's own tab.
export function TextView({ sections }: Props) {
  const isEmpty = sections.every((s) => s.cards.length === 0)

  return (
    <div className="text-view">
      <div className="text-page">
        {isEmpty ? (
          <p className="text-view-empty">Пока нечего читать — напишите хотя бы одну карточку.</p>
        ) : (
          sections.map(
            (section) =>
              section.cards.length > 0 && (
                <section key={section.id} className="text-section">
                  <h2
                    className="text-section-title"
                    style={{ fontSize: `${Math.max(15, 26 - section.depth * 3)}px` }}
                  >
                    {section.title}
                  </h2>
                  {section.cards.map((card) => (
                    <p key={card.id} className="text-paragraph">
                      {card.text}
                    </p>
                  ))}
                </section>
              ),
          )
        )}
      </div>
    </div>
  )
}
