interface CardTabInfo {
  key: string
  title: string
}

interface Props {
  activeKey: string
  onSelectCloud: () => void
  onSelectTimeline: () => void
  cardTabs: CardTabInfo[]
  onSelectCard: (key: string) => void
  onCloseCard: (key: string) => void
  onNewTab: () => void
}

// Облако and Таймлайн are permanent, un-closable tabs onto the same
// project; every open card sits alongside them as its own closable tab,
// titled from its own first line.
export function TabStrip({
  activeKey,
  onSelectCloud,
  onSelectTimeline,
  cardTabs,
  onSelectCard,
  onCloseCard,
  onNewTab,
}: Props) {
  return (
    <div className="tab-strip" role="tablist" aria-label="Вкладки">
      <button
        type="button"
        role="tab"
        aria-selected={activeKey === 'cloud'}
        className={`tab ${activeKey === 'cloud' ? 'is-active' : ''}`}
        onClick={onSelectCloud}
      >
        Облако
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeKey === 'timeline'}
        className={`tab ${activeKey === 'timeline' ? 'is-active' : ''}`}
        onClick={onSelectTimeline}
      >
        Таймлайн
      </button>

      {cardTabs.map((tab) => (
        <span key={tab.key} className={`tab tab--card ${activeKey === tab.key ? 'is-active' : ''}`}>
          <button type="button" role="tab" aria-selected={activeKey === tab.key} onClick={() => onSelectCard(tab.key)}>
            {tab.title}
          </button>
          <button
            type="button"
            className="tab-close"
            aria-label="Закрыть вкладку"
            onClick={(e) => {
              e.stopPropagation()
              onCloseCard(tab.key)
            }}
          >
            ✕
          </button>
        </span>
      ))}

      <button type="button" className="tab-new" onClick={onNewTab} aria-label="Новая карточка">
        +
      </button>
    </div>
  )
}
