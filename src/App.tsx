import { useMemo, useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { useAuth } from './hooks/useAuth'
import { useProjectTree } from './hooks/useProjectTree'
import { useCards } from './hooks/useCards'
import { useAllCards } from './hooks/useAllCards'
import { collectDescendantIds, getAncestorPath } from './lib/projectTree'
import { sectionsToMarkdown, downloadBlob } from './lib/compile'
import { sectionsToDocxBlob } from './lib/exportDocx'
import { printManuscript } from './lib/exportPdf'
import { manuscriptFromProjects } from './lib/manuscript'
import { getSequence, getUnassigned } from './lib/timeline'
import { dataStore } from './lib/dataStore'
import { getStoredLicense } from './lib/license'
import { AuthScreen } from './components/AuthScreen'
import { LicenseGate } from './components/LicenseGate'
import { BoardView } from './components/BoardView'
import { Sidebar } from './components/Sidebar'
import type { Card } from './types'

// The license gate only exists in the desktop build — the hosted web app
// has never charged anyone and shouldn't suddenly start demanding a key.
const requiresLicense = isTauri()

function App() {
  const [licensed, setLicensed] = useState(() => !requiresLicense || getStoredLicense() != null)
  const { user, loading: authLoading, signInWithEmail, signOut } = useAuth()

  if (!licensed) {
    return <LicenseGate onActivated={() => setLicensed(true)} />
  }

  if (authLoading) {
    return <div className="app-loading">Загрузка…</div>
  }

  if (!user) {
    return <AuthScreen signInWithEmail={signInWithEmail} />
  }

  return <Workspace userId={user.id} onSignOut={signOut} />
}

function Workspace({ userId, onSignOut }: { userId: string; onSignOut: () => void }) {
  const {
    tree,
    projects,
    loading: treeLoading,
    activeProjectId,
    setActiveProjectId,
    addProject,
    renameProject,
    moveProject,
    deleteProject,
  } = useProjectTree(userId)
  const {
    cards,
    loading: cardsLoading,
    addCard,
    patchCard,
    removeCard,
    refetch: refetchActiveCards,
  } = useCards(activeProjectId ?? undefined)
  const { cardsByProject, refetch: refetchAllCards } = useAllCards(userId, activeProjectId, cards)

  // A card clicked in the sidebar tree, waiting to be opened as a tab once
  // its project is the active one (see BoardView's initialOpenCardId).
  const [pendingCardId, setPendingCardId] = useState<string | null>(null)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  // Which of Cloud/Timeline was last chosen — lives above BoardView's
  // per-project remount so navigating to a different project (sidebar,
  // cloud hub, timeline structure link) keeps the current view instead of
  // always landing back on Cloud.
  const [viewMode, setViewMode] = useState<'cloud' | 'timeline' | 'text'>('cloud')

  // The active project's cloud aggregates every nested subgroup's cards
  // too (a "часть" or "сцена" is a project of its own, but its cards still
  // belong visually to the whole it's part of) — everything else in the
  // app (tabs, timeline, CRUD) stays scoped to the active project alone.
  const descendantIds = useMemo(
    () => (activeProjectId ? collectDescendantIds(projects, activeProjectId) : []),
    [projects, activeProjectId],
  )
  const aggregatedCards = useMemo(() => {
    // Keyed by id: guards against the same card briefly appearing under two
    // entries while cardsByProject and activeProjectId settle after a
    // project switch (the live overlay and the snapshot can overlap for
    // one render).
    const byId = new Map<string, Card>()
    for (const id of descendantIds) {
      for (const card of cardsByProject.get(id) ?? []) byId.set(card.id, card)
    }
    return Array.from(byId.values())
  }, [cardsByProject, descendantIds])
  const projectTitleById = useMemo(() => new Map(projects.map((p) => [p.id, p.title])), [projects])
  // "Where am I" — the sidebar alone doesn't make this obvious once a
  // project is nested a few levels deep or the tree is scrolled away.
  const activeAncestors = useMemo(
    () => (activeProjectId ? getAncestorPath(projects, activeProjectId) : []),
    [projects, activeProjectId],
  )
  const breadcrumbPath = useMemo(() => activeAncestors.map((p) => p.title), [activeAncestors])
  // Ids to auto-expand in the sidebar tree — otherwise the active project's
  // own cards (rendered as leaves under it) stay hidden behind a collapsed
  // row nobody thought to click.
  const activeAncestorIds = useMemo(() => activeAncestors.map((p) => p.id), [activeAncestors])
  // A subgroup's parent project id, scoped to the current aggregation —
  // used by the cloud's node-link graph to draw the folder-to-folder edge
  // (a subfolder's hub to its parent's hub), not just card-to-folder ones.
  const groupParentById = useMemo(() => {
    const idSet = new Set(descendantIds)
    const map = new Map<string, string>()
    for (const id of descendantIds) {
      const project = projects.find((p) => p.id === id)
      if (project?.parent_id && idSet.has(project.parent_id)) map.set(id, project.parent_id)
    }
    return map
  }, [projects, descendantIds])

  if (treeLoading || !activeProjectId) {
    return <div className="app-loading">Загрузка…</div>
  }

  const handleSelectCard = (projectId: string, cardId: string) => {
    if (projectId !== activeProjectId) setActiveProjectId(projectId)
    setPendingCardId(cardId)
  }

  // Bundles the active project and everything nested under it into one
  // manuscript — fetches every card fresh rather than relying on the
  // sidebar's snapshot, which excludes the active project's own cards.
  const buildExportSections = async () => {
    const fresh = await dataStore.listCardsForUser(userId)
    const cardsByProjectFresh = new Map<string, Card[]>()
    for (const card of fresh) {
      const list = cardsByProjectFresh.get(card.project_id)
      if (list) list.push(card)
      else cardsByProjectFresh.set(card.project_id, [card])
    }
    return manuscriptFromProjects(projects, cardsByProjectFresh, activeProjectId)
  }

  const handleExportMarkdown = async () => {
    const sections = await buildExportSections()
    const title = projectTitleById.get(activeProjectId) ?? 'draft'
    downloadBlob(`${title}.md`, new Blob([sectionsToMarkdown(sections)], { type: 'text/markdown;charset=utf-8' }))
  }

  const handleExportDocx = async () => {
    const sections = await buildExportSections()
    const title = projectTitleById.get(activeProjectId) ?? 'draft'
    downloadBlob(`${title}.docx`, await sectionsToDocxBlob(sections))
  }

  const handleExportPdf = async () => {
    const sections = await buildExportSections()
    const title = projectTitleById.get(activeProjectId) ?? 'draft'
    printManuscript(title, sections)
  }

  // Dragging a folder row onto another folder in the sidebar — reparents
  // it, as long as that doesn't drop it onto itself or one of its own
  // descendants (which would either be a no-op or create a cycle).
  const handleMoveProject = (projectId: string, targetParentId: string) => {
    const invalidTargets = collectDescendantIds(projects, projectId)
    if (invalidTargets.includes(targetParentId)) return
    moveProject(projectId, targetParentId)
  }

  // Dragging a card leaf onto a different project row in the sidebar.
  const handleMoveCard = async (cardId: string, sourceProjectId: string, targetProjectId: string) => {
    if (sourceProjectId === targetProjectId) return
    await dataStore.moveCard(cardId, targetProjectId)
    // The active project's `cards` is a live optimistic list, independent
    // of the sidebar's snapshot — refetch whichever side(s) this move
    // actually touched so both stay correct.
    if (sourceProjectId === activeProjectId || targetProjectId === activeProjectId) {
      refetchActiveCards()
    }
    refetchAllCards()
  }

  // Dragging a card leaf onto another card — reorders it in among its
  // siblings using manual_order, the same field the timeline sequence
  // reads. Uses whichever card list is live (the active project's) or the
  // sidebar's recent snapshot for everything else.
  const handleReorderCard = async (
    cardId: string,
    sourceProjectId: string,
    targetProjectId: string,
    targetCardId: string,
  ) => {
    const cardsOf = (projectId: string) => (projectId === activeProjectId ? cards : cardsByProject.get(projectId) ?? [])
    const draggedCard = cardsOf(sourceProjectId).find((c) => c.id === cardId)
    if (!draggedCard) return
    const ordered = [...getSequence(cardsOf(targetProjectId)), ...getUnassigned(cardsOf(targetProjectId))].filter(
      (c) => c.id !== cardId,
    )
    const insertAt = ordered.findIndex((c) => c.id === targetCardId)
    const at = insertAt === -1 ? ordered.length : insertAt
    const next = [...ordered.slice(0, at), draggedCard, ...ordered.slice(at)]

    if (sourceProjectId !== targetProjectId) {
      await dataStore.moveCard(cardId, targetProjectId)
    }
    await Promise.all(
      next
        .map((c, i) => ({ c, i }))
        .filter(({ c, i }) => c.manual_order !== i)
        .map(({ c, i }) => dataStore.updateCard(c.id, { manual_order: i })),
    )

    if (sourceProjectId === activeProjectId || targetProjectId === activeProjectId) {
      refetchActiveCards()
    }
    refetchAllCards()
  }

  return (
    <div className="app-shell">
      <Sidebar
        tree={tree}
        activeProjectId={activeProjectId}
        cardsByProject={cardsByProject}
        activeCardId={activeCardId}
        activeAncestorIds={activeAncestorIds}
        projectTitleById={projectTitleById}
        onSelect={setActiveProjectId}
        onSelectCard={handleSelectCard}
        onMoveCard={handleMoveCard}
        onMoveProject={handleMoveProject}
        onReorderCard={handleReorderCard}
        onAddChild={(parentId) => addProject(parentId, 'Без названия')}
        onRename={renameProject}
        onDelete={deleteProject}
        onSignOut={onSignOut}
      />
      <main className="app-main">
        {cardsLoading ? (
          <div className="app-loading">Загрузка…</div>
        ) : (
          <BoardView
            key={activeProjectId}
            activeProjectId={activeProjectId}
            cards={cards}
            aggregatedCards={aggregatedCards}
            projectTitleById={projectTitleById}
            addCard={addCard}
            patchCard={patchCard}
            removeCard={removeCard}
            refetchCards={refetchActiveCards}
            onOpenForeignCard={handleSelectCard}
            initialOpenCardId={pendingCardId}
            onConsumedInitialCard={() => setPendingCardId(null)}
            onActiveCardChange={setActiveCardId}
            onExportMarkdown={handleExportMarkdown}
            onExportDocx={handleExportDocx}
            onExportPdf={handleExportPdf}
            breadcrumbPath={breadcrumbPath}
            groupParentById={groupParentById}
            onNavigateToProject={setActiveProjectId}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        )}
      </main>
    </div>
  )
}

export default App
