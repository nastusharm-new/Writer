import { cardTabTitle } from '../lib/timeline'
import { STATUS_COLOR } from '../types'
import type { Card } from '../types'

interface Props {
  cards: Card[]
  loading: boolean
  onRestore: (id: string) => void
  onDestroy: (id: string) => void
  onClose: () => void
}

// A deleted card doesn't disappear — it lands here. Slides in over the
// board rather than replacing it, so restoring one is a single click away
// from wherever you were.
export function ArchivePanel({ cards, loading, onRestore, onDestroy, onClose }: Props) {
  return (
    <div className="archive-panel">
      <div className="archive-panel-header">
        <span>Архив</span>
        <button type="button" className="archive-panel-close" onClick={onClose} aria-label="Закрыть архив">
          ✕
        </button>
      </div>

      {loading ? (
        <div className="archive-panel-empty">Загрузка…</div>
      ) : cards.length === 0 ? (
        <div className="archive-panel-empty">Пусто — удалённые карточки будут появляться здесь.</div>
      ) : (
        <ul className="archive-list">
          {cards.map((card) => (
            <li key={card.id} className="archive-item">
              <div className="archive-item-row">
                <span className="archive-item-dot" style={{ background: STATUS_COLOR[card.status] }} />
                <span className="archive-item-title">{cardTabTitle(card.text)}</span>
              </div>
              <div className="archive-item-actions">
                <button type="button" className="archive-item-restore" onClick={() => onRestore(card.id)}>
                  Восстановить
                </button>
                <button
                  type="button"
                  className="archive-item-destroy"
                  onClick={() => {
                    if (confirm('Удалить карточку навсегда? Это необратимо.')) onDestroy(card.id)
                  }}
                >
                  Удалить навсегда
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
