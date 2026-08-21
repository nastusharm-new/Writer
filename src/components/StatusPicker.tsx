import type { CSSProperties } from 'react'
import { CARD_STATUSES, STATUS_COLOR, STATUS_LABEL, type CardStatus } from '../types'

interface Props {
  value: CardStatus
  onChange: (status: CardStatus) => void
  size?: 'compact' | 'full'
}

// A row of tappable status dots — replaces the native <select> that made the
// card footer look like a form control instead of a writing tool.
export function StatusPicker({ value, onChange, size = 'full' }: Props) {
  return (
    <div className={`status-picker status-picker--${size}`}>
      {CARD_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          className={`status-picker-dot ${value === s ? 'is-active' : ''}`}
          style={{ '--dot-color': STATUS_COLOR[s] } as CSSProperties}
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
          {size === 'full' && <span className="status-picker-label">{STATUS_LABEL[s]}</span>}
        </button>
      ))}
    </div>
  )
}
