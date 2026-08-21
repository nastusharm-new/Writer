import type { ViewMode } from '../types'

interface Props {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}

// Reads as a small tab strip — Облако and Таймлайн are two views onto the
// same project's cards, switchable without losing either one's state.
export function ViewSwitcher({ mode, onChange }: Props) {
  return (
    <div className="tab-strip" role="tablist" aria-label="Вид">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'cloud'}
        className={`tab ${mode === 'cloud' ? 'is-active' : ''}`}
        onClick={() => onChange('cloud')}
      >
        Облако
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'timeline'}
        className={`tab ${mode === 'timeline' ? 'is-active' : ''}`}
        onClick={() => onChange('timeline')}
      >
        Таймлайн
      </button>
    </div>
  )
}
