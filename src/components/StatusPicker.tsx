import type { CSSProperties } from 'react'
import { CARD_STATUSES, STATUS_COLOR, STATUS_LABEL, type CardStatus } from '../types'

interface Props {
  value: CardStatus
  onChange: (status: CardStatus) => void
  disabled?: boolean
}

// A row of tappable, named status dots — the card editor's own maturity
// picker, where there's room to show and choose among all four. The small
// tile footer uses StatusSticker instead: one tag, not four dots to parse.
export function StatusPicker({ value, onChange, disabled }: Props) {
  return (
    <div className="status-picker">
      {CARD_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          className={`status-picker-dot ${value === s ? 'is-active' : ''}`}
          style={{ '--dot-color': STATUS_COLOR[s] } as CSSProperties}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            onChange(s)
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title={STATUS_LABEL[s]}
          aria-label={STATUS_LABEL[s]}
          aria-pressed={value === s}
        >
          <span className="status-picker-swatch" />
          <span className="status-picker-label">{STATUS_LABEL[s]}</span>
        </button>
      ))}
    </div>
  )
}
