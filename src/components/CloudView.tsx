import { useCallback, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CardTile } from './CardTile'
import { useCloudSimulation } from '../hooks/useCloudSimulation'
import { useElementSize } from '../hooks/useElementSize'
import type { Card, CardStatus } from '../types'
import type { CardPatch } from '../lib/dataStore'

interface Props {
  cards: Card[]
  onPatch: (id: string, patch: CardPatch) => void
  onDelete: (id: string) => void
  timelinePosition: (id: string) => string
  hoveredId: string | null
  onHover: (id: string | null) => void
}

export function CloudView({ cards, onPatch, onDelete, timelinePosition, hoveredId, onHover }: Props) {
  const { ref, size } = useElementSize<HTMLDivElement>()
  const { positions, beginDrag, dragTo, endDrag, releasePin } = useCloudSimulation({
    cards,
    width: size.width,
    height: size.height,
    active: true,
  })
  const draggingId = useRef<string | null>(null)

  const toLocal = useCallback(
    (e: ReactPointerEvent) => {
      const rect = ref.current?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    },
    [ref],
  )

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const id = draggingId.current
    if (!id) return
    const { x, y } = toLocal(e)
    dragTo(id, x, y)
  }

  const handlePointerUp = (id: string) => {
    if (draggingId.current !== id) return
    draggingId.current = null
    const pinned = endDrag(id)
    if (pinned) onPatch(id, { fx: pinned.fx, fy: pinned.fy })
  }

  const hoveredPos = hoveredId ? positions.get(hoveredId) : null

  return (
    <div
      className="cloud-canvas"
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerUp={() => draggingId.current && handlePointerUp(draggingId.current)}
    >
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
                draggingId.current = card.id
                const { x: lx, y: ly } = toLocal(e)
                beginDrag(card.id, lx, ly)
              },
              onPointerUp: () => handlePointerUp(card.id),
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
