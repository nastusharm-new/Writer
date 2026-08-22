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
  // A card pulled into view from a nested subgroup (see CloudView's
  // aggregated cloud): shown, clickable to jump to it, but not editable
  // from here — that belongs to its own project's tabs.
  readOnly?: boolean
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
  readOnly,
}: Props) {
  return (
    <motion.div
      ref={setNodeRef}
      layoutId={card.id}
      layout
      className={`card-tile status-${card.status} ${readOnly ? 'is-readonly' : ''} ${className ?? ''}`}
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
      {card.images.length > 0 && (
        <span className="card-tile-image-badge" title={`Изображений: ${card.images.length}`}>
          🖼 {card.images.length}
        </span>
      )}
      <p className="card-tile-text">{card.text}</p>
      <div className="card-tile-footer">
        <StatusPicker value={card.status} onChange={onStatusChange} size="compact" disabled={readOnly} />
        {!readOnly && (
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
        )}
      </div>
    </motion.div>
  )
}
