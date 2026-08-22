import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CloudView } from './CloudView'
import { TimelineView } from './TimelineView'
import { TabStrip } from './TabStrip'
import { PreviewBar } from './PreviewBar'
import { CardTabPane } from './CardTabPane'
import { ArchivePanel } from './ArchivePanel'
import { cardTabTitle, timelinePositionLabel } from '../lib/timeline'
import { useCloudSimulation } from '../hooks/useCloudSimulation'
import { useElementSize } from '../hooks/useElementSize'
import { useArchive } from '../hooks/useArchive'
import type { Card, CardStatus } from '../types'
import type { CardPatch } from '../lib/dataStore'

interface Props {
  activeProjectId: string
  cards: Card[]
  // The active project's own cards plus every nested subgroup's — cloud
  // display only; tabs/timeline/CRUD stay scoped to `cards` alone.
  aggregatedCards: Card[]
  projectTitleById: Map<string, string>
  addCard: (text: string, status?: CardStatus, images?: string[]) => Promise<Card | undefined>
  patchCard: (id: string, patch: CardPatch) => void
  removeCard: (id: string) => void
  // Re-pulls the active project's cards from the store — needed after
  // restoring a card from the archive, which mutates it from outside the
  // optimistic `cards` list this pane otherwise trusts.
  refetchCards: () => void
  onOpenForeignCard: (projectId: string, cardId: string) => void
  // Set when a card was clicked in the sidebar tree — opens/focuses that
  // card's tab, whether or not it was already open.
  initialOpenCardId?: string | null
  onConsumedInitialCard?: () => void
  onActiveCardChange?: (id: string | null) => void
  onCompile: () => void
  // Root-to-active chain of project titles — shown as a persistent "where
  // am I" strip, since the sidebar alone stops being enough once a project
  // is nested a few levels deep or scrolled out of view.
  breadcrumbPath: string[]
  // A subgroup's parent project id, within the current aggregation — draws
  // the folder-to-folder edge in the cloud's node-link graph.
  groupParentById: Map<string, string>
  onNavigateToProject: (projectId: string) => void
}

interface OpenTab {
  key: string
  cardId: string | null // null while a fresh tab hasn't saved its first card yet
}

function makeTempKey() {
  return `new-${Math.random().toString(36).slice(2)}`
}

export function BoardView({
  activeProjectId,
  cards,
  aggregatedCards,
  projectTitleById,
  addCard,
  patchCard,
  removeCard,
  refetchCards,
  onOpenForeignCard,
  initialOpenCardId,
  onConsumedInitialCard,
  onActiveCardChange,
  onCompile,
  breadcrumbPath,
  groupParentById,
  onNavigateToProject,
}: Props) {
  const [openTabs, setOpenTabs] = useState<OpenTab[]>(() =>
    cards.length === 0 ? [{ key: makeTempKey(), cardId: null }] : [],
  )
  const [activeKey, setActiveKey] = useState<string>(() => (cards.length === 0 ? openTabs[0].key : 'cloud'))
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const archive = useArchive(activeProjectId, archiveOpen)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  // The simulation lives here, above every tab, so switching away and back
  // doesn't reset it — cards keep the positions they had (per the brief:
  // switching views is never a "recompute from scratch"). It runs over the
  // *aggregated* set so nested subgroups' cards get positioned too, each
  // drifting toward its own cluster around the active project's own cards.
  const { ref: bodyRef, size } = useElementSize<HTMLDivElement>()
  // Stable across renders unless the aggregated set actually changes —
  // otherwise a fresh closure every render would re-trigger the
  // simulation's node-sync effect (which itself calls setState) forever.
  const projectIdByCardId = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of aggregatedCards) map.set(c.id, c.project_id)
    return map
  }, [aggregatedCards])
  const groupOf = useCallback((id: string) => projectIdByCardId.get(id) ?? activeProjectId, [projectIdByCardId, activeProjectId])
  const groupParent = useCallback((id: string) => groupParentById.get(id), [groupParentById])
  const cloudSim = useCloudSimulation({
    cards: aggregatedCards,
    width: size.width,
    height: size.height,
    groupOf,
    centerGroup: activeProjectId,
    groupParent,
  })
  // The folder-to-parent-folder edges to actually draw, resolved against
  // whichever hubs the simulation currently has (a hub only exists once at
  // least one of its cards has made it into the aggregation).
  const hubEdges = useMemo(() => {
    const hubGroupIds = new Set(
      cloudSim.hubNodes.map((h) => h.groupId).filter((id): id is string => Boolean(id)),
    )
    const edges: { from: string; to: string }[] = []
    for (const groupId of hubGroupIds) {
      if (groupId === activeProjectId) continue
      const parentId = groupParentById.get(groupId)
      if (parentId && hubGroupIds.has(parentId)) edges.push({ from: groupId, to: parentId })
    }
    return edges
  }, [cloudSim.hubNodes, groupParentById, activeProjectId])

  useEffect(() => {
    if (activeKey === 'cloud') {
      cloudSim.resume()
    } else {
      cloudSim.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey])

  const openCardTab = (cardId: string) => {
    // The exists-check and the append must happen atomically against the
    // *latest* state, not a closed-over `openTabs` — otherwise two calls
    // in the same tick (StrictMode's double effect invocation, or two
    // rapid clicks) both see "not open yet" and both append, producing a
    // duplicate tab with the same key.
    setOpenTabs((prev) => (prev.some((t) => t.cardId === cardId) ? prev : [...prev, { key: cardId, cardId }]))
    setActiveKey(cardId)
  }

  // A card clicked in the sidebar tree — for the currently active project,
  // or one just switched to (this instance freshly mounted for it).
  useEffect(() => {
    if (!initialOpenCardId) return
    if (cards.some((c) => c.id === initialOpenCardId)) {
      openCardTab(initialOpenCardId)
    }
    onConsumedInitialCard?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOpenCardId])

  // A card whose tab is open here can leave this project without going
  // through handleDeleteCard — dragged onto a different group in the
  // sidebar tree. Close its tab rather than leaving it open with an
  // orphaned "Без названия" label pointing at a card that's moved on.
  useEffect(() => {
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.cardId === null || cards.some((c) => c.id === t.cardId))
      return next.length === prev.length ? prev : next
    })
  }, [cards])

  useEffect(() => {
    if (activeKey !== 'cloud' && activeKey !== 'timeline' && !openTabs.some((t) => t.key === activeKey)) {
      setActiveKey('cloud')
    }
  }, [openTabs, activeKey])

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
    showToast('Убрали пока в архив')
  }

  const handleRestoreCard = async (id: string) => {
    await archive.restore(id)
    refetchCards()
  }

  const cardTabs = openTabs.map((tab) => {
    const card = tab.cardId ? cards.find((c) => c.id === tab.cardId) : undefined
    return { key: tab.key, title: card ? cardTabTitle(card.text) : 'Без названия' }
  })

  const activeTab = openTabs.find((t) => t.key === activeKey)
  const activeCard = activeTab?.cardId ? cards.find((c) => c.id === activeTab.cardId) ?? null : null

  useEffect(() => {
    onActiveCardChange?.(activeTab?.cardId ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.cardId])

  return (
    <div className="board">
      <div className="pane-breadcrumb">
        {breadcrumbPath.map((title, i) => (
          <span key={i} className="pane-breadcrumb-item">
            {i > 0 && <span className="pane-breadcrumb-sep">›</span>}
            {title}
          </span>
        ))}
      </div>
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
        <button
          type="button"
          className="pane-archive-toggle"
          onClick={() => setArchiveOpen((v) => !v)}
          title="Удалённые карточки"
        >
          Архив
        </button>
        <button
          type="button"
          className="pane-compile"
          onClick={onCompile}
          title="Собрать проект и все вложенные группы в один текстовый документ"
        >
          ⬇ Документ
        </button>
      </div>

      <div className="board-body" ref={bodyRef}>
        {activeKey === 'cloud' && (
          <CloudView
            cards={aggregatedCards}
            activeProjectId={activeProjectId}
            projectTitleById={projectTitleById}
            hubNodes={cloudSim.hubNodes}
            hubEdges={hubEdges}
            size={size}
            positions={cloudSim.positions}
            beginDrag={cloudSim.beginDrag}
            dragTo={cloudSim.dragTo}
            endDrag={cloudSim.endDrag}
            releasePin={cloudSim.releasePin}
            onPatch={patchCard}
            onDelete={handleDeleteCard}
            onOpen={(cardId, projectId) => {
              if (projectId === activeProjectId) openCardTab(cardId)
              else onOpenForeignCard(projectId, cardId)
            }}
            onNavigateToProject={onNavigateToProject}
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

        {archiveOpen && (
          <ArchivePanel
            cards={archive.cards}
            loading={archive.loading}
            onRestore={handleRestoreCard}
            onDestroy={archive.destroy}
            onClose={() => setArchiveOpen(false)}
          />
        )}

        {toast && <div className="board-toast">{toast}</div>}
      </div>
    </div>
  )
}
