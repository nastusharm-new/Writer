import type { CSSProperties } from 'react'
import { CARD_STATUSES, STATUS_COLOR, STATUS_LABEL, type CardStatus } from '../types'

interface Props {
  value: CardStatus
  onChange: (status: CardStatus) => void
  disabled?: boolean
}

// One colored tag showing the card's current maturity — replaces the row
// of four dots that made every tile look like a form control nobody could
// read at a glance. Click cycles to the next status; the full picker (all
// four, named) still lives in the card's own editor where there's room to
// actually choose.
export function StatusSticker({ value, onChange, disabled }: Props) {
  const cycle = () => {
    const index = CARD_STATUSES.indexOf(value)
    onChange(CARD_STATUSES[(index + 1) % CARD_STATUSES.length])
  }

  return (
    <button
      type="button"
      className="status-sticker"
      style={{ '--sticker-color': STATUS_COLOR[value] } as CSSProperties}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        cycle()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      title={disabled ? STATUS_LABEL[value] : `${STATUS_LABEL[value]} — нажмите, чтобы изменить`}
    >
      {STATUS_LABEL[value]}
    </button>
  )
}
