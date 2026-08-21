import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { CloudView } from './CloudView'
import { TimelineView } from './TimelineView'
import { ViewSwitcher } from './ViewSwitcher'
import { PreviewBar } from './PreviewBar'
import { CardEditor } from './CardEditor'
import { timelinePositionLabel } from '../lib/timeline'
import { useCloudSimulation } from '../hooks/useCloudSimulation'
import { useElementSize } from '../hooks/useElementSize'
import type { Card, CardStatus, ViewMode } from '../types'
import type { CardPatch } from '../lib/dataStore'

interface Props {
  cards: Card[]
  addCard: (text: string, status?: CardStatus) => Promise<Card | undefined>
  patchCard: (id: string, patch: CardPatch) => void
  removeCard: (id: string) => void
  onSignOut: () => void
}

export function BoardView({ cards, addCard, patchCard, removeCard, onSignOut }: Props) {
  const [mode, setMode] = useState<ViewMode>('cloud')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  // null = editor closed, 'new' = composing a fresh card, otherwise the id
  // of the card currently open in the full-page editor.
  const [editingId, setEditingId] = useState<'new' | string | null>(null)

  // The simulation lives here, above both views, so switching to the
  // timeline and back doesn't reset it — cards keep the positions they had
  // (per the brief: switching views is never a "recompute from scratch").
  const { ref: bodyRef, size } = useElementSize<HTMLDivElement>()
  const cloudSim = useCloudSimulation({ cards, width: size.width, height: size.height })

  useEffect(() => {
    if (mode === 'cloud') {
      cloudSim.resume()
    } else {
      cloudSim.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const editingCard = editingId && editingId !== 'new' ? cards.find((c) => c.id === editingId) ?? null : null

  return (
    <div className="board">
      <header className="board-header">
        <span className="board-title">Draft</span>
        <ViewSwitcher mode={mode} onChange={setMode} />
        <button type="button" className="board-signout" onClick={onSignOut}>
          Выйти
        </button>
      </header>

      <div className="board-body" ref={bodyRef}>
        {mode === 'cloud' ? (
          <CloudView
            cards={cards}
            size={size}
            positions={cloudSim.positions}
            beginDrag={cloudSim.beginDrag}
            dragTo={cloudSim.dragTo}
            endDrag={cloudSim.endDrag}
            releasePin={cloudSim.releasePin}
            onPatch={patchCard}
            onDelete={removeCard}
            onOpen={setEditingId}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            timelinePosition={(id) => timelinePositionLabel(cards, id)}
          />
        ) : (
          <TimelineView
            cards={cards}
            onPatch={patchCard}
            onDelete={removeCard}
            onOpen={setEditingId}
            hoveredId={hoveredId}
            onHover={setHoveredId}
          />
        )}

        <button
          type="button"
          className="board-add-fab"
          onClick={() => setEditingId('new')}
          aria-label="Новая карточка"
        >
          +
        </button>

        {mode === 'cloud' && <PreviewBar cardCount={cards.length} onSwitchToTimeline={() => setMode('timeline')} />}
      </div>

      <AnimatePresence>
        {editingId && (
          <CardEditor
            card={editingCard}
            onCreate={addCard}
            onPatch={patchCard}
            onDelete={removeCard}
            onClose={() => setEditingId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
