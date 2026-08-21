import { useState } from 'react'
import { CloudView } from './CloudView'
import { TimelineView } from './TimelineView'
import { ViewSwitcher } from './ViewSwitcher'
import { PreviewBar } from './PreviewBar'
import { AddCardBar } from './AddCardBar'
import { timelinePositionLabel } from '../lib/timeline'
import type { Card, ViewMode } from '../types'
import type { CardPatch } from '../lib/dataStore'

interface Props {
  cards: Card[]
  addCard: (text: string) => void
  patchCard: (id: string, patch: CardPatch) => void
  removeCard: (id: string) => void
  onSignOut: () => void
}

export function BoardView({ cards, addCard, patchCard, removeCard, onSignOut }: Props) {
  const [mode, setMode] = useState<ViewMode>('cloud')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className="board">
      <header className="board-header">
        <span className="board-title">Draft</span>
        <ViewSwitcher mode={mode} onChange={setMode} />
        <button type="button" className="board-signout" onClick={onSignOut}>
          Выйти
        </button>
      </header>

      <div className="board-body">
        {mode === 'cloud' ? (
          <CloudView
            cards={cards}
            onPatch={patchCard}
            onDelete={removeCard}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            timelinePosition={(id) => timelinePositionLabel(cards, id)}
          />
        ) : (
          <TimelineView
            cards={cards}
            onPatch={patchCard}
            onDelete={removeCard}
            hoveredId={hoveredId}
            onHover={setHoveredId}
          />
        )}
      </div>

      <AddCardBar onAdd={addCard} />

      {mode === 'cloud' && <PreviewBar cardCount={cards.length} onSwitchToTimeline={() => setMode('timeline')} />}
    </div>
  )
}
