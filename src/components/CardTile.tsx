import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { StatusPicker } from './StatusPicker'
import type { Card, CardStatus } from '../types'

interface Props {
  card: Card
  style: CSSProperties
  className?: string
  dragProps?: Record<string, unknown>
  setNodeRef?: (el: HTMLElement | null) => void
  onStatusChange: (status: CardStatus) => void
  onDelete: () => void
  onOpen?: () => void
  onHoverStart?: () => void
  onHoverEnd?: () => void
  pinned?: boolean
  onReleasePin?: () => void
}

/**
 * The single card component rendered by both the cloud and timeline views.
 * `layoutId` lets Framer Motion animate a card smoothly between whatever
 * position each view computed for it, whether that's a d3-force coordinate
 * or a slot in the timeline strip.
 */
export function CardTile({
  card,
  style,
  className,
  dragProps,
  setNodeRef,
  onStatusChange,
  onDelete,
  onOpen,
  onHoverStart,
  onHoverEnd,
  pinned,
  onReleasePin,
}: Props) {
  return (
    <motion.div
      ref={setNodeRef}
      layoutId={card.id}
      layout
      className={`card-tile status-${card.status} ${className ?? ''}`}
      style={style}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      onClick={onOpen}
      onDoubleClick={pinned ? onReleasePin : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      {...dragProps}
    >
      {pinned && (
        <span className="pin-indicator" title="Закреплено — двойной клик, чтобы отпустить">
          ●
        </span>
      )}
      <p className="card-tile-text">{card.text}</p>
      <div className="card-tile-footer">
        <StatusPicker value={card.status} onChange={onStatusChange} size="compact" />
        <button
          type="button"
          className="card-tile-delete"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Удалить карточку"
        >
          ✕
        </button>
      </div>
    </motion.div>
  )
}
