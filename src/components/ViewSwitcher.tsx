import type { ViewMode } from '../types'

interface Props {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}

export function ViewSwitcher({ mode, onChange }: Props) {
  return (
    <div className="view-switcher" role="tablist" aria-label="Вид">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'cloud'}
        className={mode === 'cloud' ? 'is-active' : ''}
        onClick={() => onChange('cloud')}
      >
        Облако
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'timeline'}
        className={mode === 'timeline' ? 'is-active' : ''}
        onClick={() => onChange('timeline')}
      >
        Таймлайн
      </button>
    </div>
  )
}
