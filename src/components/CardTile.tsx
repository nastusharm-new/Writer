import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { MaturityDot } from './MaturityDot'
import { CARD_STATUSES, STATUS_LABEL, type Card, type CardStatus } from '../types'

interface Props {
  card: Card
  style: CSSProperties
  className?: string
  dragProps?: Record<string, unknown>
  setNodeRef?: (el: HTMLElement | null) => void
  onStatusChange: (status: CardStatus) => void
  onDelete: () => void
  onHoverStart?: () => void
  onHoverEnd?: () => void
  pinned?: boolean
  onReleasePin?: () => void
  footerExtra?: ReactNode
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
  onHoverStart,
  onHoverEnd,
  pinned,
  onReleasePin,
  footerExtra,
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
      onDoubleClick={pinned ? onReleasePin : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      {...dragProps}
    >
      <div className="card-tile-head">
        <MaturityDot status={card.status} />
        {pinned && (
          <span className="pin-indicator" title="Закреплено — двойной клик, чтобы отпустить">
            ●
          </span>
        )}
      </div>
      <p className="card-tile-text">{card.text}</p>
      <div className="card-tile-footer">
        <select
          value={card.status}
          onChange={(e) => onStatusChange(e.target.value as CardStatus)}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Статус зрелости"
        >
          {CARD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {footerExtra}
        <button
          type="button"
          className="card-tile-delete"
          onClick={onDelete}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Удалить карточку"
        >
          ✕
        </button>
      </div>
    </motion.div>
  )
}
