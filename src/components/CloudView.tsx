import { useCallback, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CardTile } from './CardTile'
import { getSequence } from '../lib/timeline'
import type { SimNode } from '../hooks/useCloudSimulation'
import type { Card, CardStatus } from '../types'
import type { CardPatch } from '../lib/dataStore'

interface Props {
  cards: Card[]
  size: { width: number; height: number }
  positions: Map<string, SimNode>
  beginDrag: (id: string, x: number, y: number) => void
  dragTo: (id: string, x: number, y: number) => void
  endDrag: (id: string) => { fx: number; fy: number } | null
  releasePin: (id: string) => void
  onPatch: (id: string, patch: CardPatch) => void
  onDelete: (id: string) => void
  onOpen: (id: string) => void
  timelinePosition: (id: string) => string
  hoveredId: string | null
  onHover: (id: string | null) => void
}

// A pointer press only becomes a drag once it moves past this many pixels —
// below that it's a click, which opens the card editor instead of pinning
// the card in place.
const DRAG_THRESHOLD = 4

// Presentational: the d3-force simulation itself lives in BoardView (via
// useCloudSimulation) so it survives this component unmounting when the
// author switches to the timeline and back — see BoardView.tsx.
export function CloudView({
  cards,
  size,
  positions,
  beginDrag,
  dragTo,
  endDrag,
  releasePin,
  onPatch,
  onDelete,
  onOpen,
  timelinePosition,
  hoveredId,
  onHover,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const pressRef = useRef<{ id: string; startX: number; startY: number; dragging: boolean } | null>(null)

  const toLocal = useCallback((e: ReactPointerEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const press = pressRef.current
    if (!press) return
    const { x, y } = toLocal(e)
    if (!press.dragging) {
      const dx = e.clientX - press.startX
      const dy = e.clientY - press.startY
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      press.dragging = true
      beginDrag(press.id, x, y)
    }
    dragTo(press.id, x, y)
  }

  const finishPress = () => {
    const press = pressRef.current
    if (!press) return
    pressRef.current = null
    if (press.dragging) {
      const pinned = endDrag(press.id)
      if (pinned) onPatch(press.id, { fx: pinned.fx, fy: pinned.fy })
    } else {
      onOpen(press.id)
    }
  }

  const hoveredPos = hoveredId ? positions.get(hoveredId) : null
  const sequence = getSequence(cards)
  const threadPoints = sequence
    .map((c) => positions.get(c.id))
    .filter((p): p is SimNode => Boolean(p))

  return (
    <div
      className="cloud-canvas"
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPress}
    >
      {/* A faint thread through cards already placed in the timeline
          sequence — a sense of connectedness without manual link UI. */}
      {threadPoints.length > 1 && (
        <svg className="cloud-thread" width={size.width} height={size.height}>
          <polyline
            points={threadPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            className="cloud-thread-line"
          />
        </svg>
      )}

      {cards.map((card) => {
        const pos = positions.get(card.id)
        const x = pos?.x ?? size.width / 2
        const y = pos?.y ?? size.height / 2
        const isPinned = card.fx != null && card.fy != null
        return (
          <CardTile
            key={card.id}
            card={card}
            className={hoveredId === card.id ? 'is-hovered' : ''}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              touchAction: 'none',
            }}
            pinned={isPinned}
            onReleasePin={() => {
              releasePin(card.id)
              onPatch(card.id, { fx: null, fy: null })
            }}
            onHoverStart={() => onHover(card.id)}
            onHoverEnd={() => onHover(null)}
            onStatusChange={(status: CardStatus) => onPatch(card.id, { status })}
            onDelete={() => onDelete(card.id)}
            dragProps={{
              onPointerDown: (e: ReactPointerEvent) => {
                ;(e.target as Element).setPointerCapture?.(e.pointerId)
                pressRef.current = { id: card.id, startX: e.clientX, startY: e.clientY, dragging: false }
              },
              onPointerUp: finishPress,
            }}
          />
        )
      })}

      {/* Ghost preview: where this card would land if you switched to the timeline. */}
      <AnimatePresence>
        {hoveredId && hoveredPos && (
          <motion.div
            key="ghost-preview"
            className="cloud-ghost-preview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            style={{ left: hoveredPos.x, top: hoveredPos.y + 60 }}
          >
            <span className="ghost-arrow">↴</span> в таймлайне: {timelinePosition(hoveredId)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
