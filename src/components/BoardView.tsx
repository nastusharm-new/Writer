import { useEffect, useState } from 'react'
import { CloudView } from './CloudView'
import { TimelineView } from './TimelineView'
import { TabStrip } from './TabStrip'
import { PreviewBar } from './PreviewBar'
import { CardTabPane } from './CardTabPane'
import { cardTabTitle, timelinePositionLabel } from '../lib/timeline'
import { useCloudSimulation } from '../hooks/useCloudSimulation'
import { useElementSize } from '../hooks/useElementSize'
import type { Card, CardStatus } from '../types'
import type { CardPatch } from '../lib/dataStore'

interface Props {
  cards: Card[]
  addCard: (text: string, status?: CardStatus) => Promise<Card | undefined>
  patchCard: (id: string, patch: CardPatch) => void
  removeCard: (id: string) => void
}

interface OpenTab {
  key: string
  cardId: string | null // null while a fresh tab hasn't saved its first card yet
}

function makeTempKey() {
  return `new-${Math.random().toString(36).slice(2)}`
}

export function BoardView({ cards, addCard, patchCard, removeCard }: Props) {
  const [openTabs, setOpenTabs] = useState<OpenTab[]>(() =>
    cards.length === 0 ? [{ key: makeTempKey(), cardId: null }] : [],
  )
  const [activeKey, setActiveKey] = useState<string>(() => (cards.length === 0 ? openTabs[0].key : 'cloud'))
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // The simulation lives here, above every tab, so switching away and back
  // doesn't reset it — cards keep the positions they had (per the brief:
  // switching views is never a "recompute from scratch").
  const { ref: bodyRef, size } = useElementSize<HTMLDivElement>()
  const cloudSim = useCloudSimulation({ cards, width: size.width, height: size.height })

  useEffect(() => {
    if (activeKey === 'cloud') {
      cloudSim.resume()
    } else {
      cloudSim.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey])

  const openCardTab = (cardId: string) => {
    const existing = openTabs.find((t) => t.cardId === cardId)
    if (existing) {
      setActiveKey(existing.key)
      return
    }
    setOpenTabs((prev) => [...prev, { key: cardId, cardId }])
    setActiveKey(cardId)
  }

  const openNewTab = () => {
    const key = makeTempKey()
    setOpenTabs((prev) => [...prev, { key, cardId: null }])
    setActiveKey(key)
  }

  const closeTab = (key: string) => {
    setOpenTabs((prev) => prev.filter((t) => t.key !== key))
    if (activeKey === key) setActiveKey('cloud')
  }

  const handleTabCreated = (tempKey: string, created: Card) => {
    setOpenTabs((prev) => prev.map((t) => (t.key === tempKey ? { key: created.id, cardId: created.id } : t)))
    if (activeKey === tempKey) setActiveKey(created.id)
  }

  const handleDeleteCard = (id: string) => {
    removeCard(id)
    const tab = openTabs.find((t) => t.cardId === id)
    if (tab) closeTab(tab.key)
  }

  const cardTabs = openTabs.map((tab) => {
    const card = tab.cardId ? cards.find((c) => c.id === tab.cardId) : undefined
    return { key: tab.key, title: card ? cardTabTitle(card.text) : 'Без названия' }
  })

  const activeTab = openTabs.find((t) => t.key === activeKey)
  const activeCard = activeTab?.cardId ? cards.find((c) => c.id === activeTab.cardId) ?? null : null

  return (
    <div className="board">
      <div className="pane-header">
        <TabStrip
          activeKey={activeKey}
          onSelectCloud={() => setActiveKey('cloud')}
          onSelectTimeline={() => setActiveKey('timeline')}
          cardTabs={cardTabs}
          onSelectCard={setActiveKey}
          onCloseCard={closeTab}
          onNewTab={openNewTab}
        />
      </div>

      <div className="board-body" ref={bodyRef}>
        {activeKey === 'cloud' && (
          <CloudView
            cards={cards}
            size={size}
            positions={cloudSim.positions}
            beginDrag={cloudSim.beginDrag}
            dragTo={cloudSim.dragTo}
            endDrag={cloudSim.endDrag}
            releasePin={cloudSim.releasePin}
            onPatch={patchCard}
            onDelete={handleDeleteCard}
            onOpen={openCardTab}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            timelinePosition={(id) => timelinePositionLabel(cards, id)}
          />
        )}

        {activeKey === 'timeline' && (
          <TimelineView
            cards={cards}
            onPatch={patchCard}
            onDelete={handleDeleteCard}
            onOpen={openCardTab}
            hoveredId={hoveredId}
            onHover={setHoveredId}
          />
        )}

        {activeTab && (
          <CardTabPane
            key={activeTab.key}
            card={activeCard}
            onCreate={addCard}
            onPatch={patchCard}
            onDelete={handleDeleteCard}
            onCreated={(created) => handleTabCreated(activeTab.key, created)}
          />
        )}

        {activeKey === 'cloud' && (
          <PreviewBar cardCount={cards.length} onSwitchToTimeline={() => setActiveKey('timeline')} />
        )}
      </div>
    </div>
  )
}
