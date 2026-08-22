import { useMemo, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useProjectTree } from './hooks/useProjectTree'
import { useCards } from './hooks/useCards'
import { useAllCards } from './hooks/useAllCards'
import { collectDescendantIds } from './lib/projectTree'
import { AuthScreen } from './components/AuthScreen'
import { BoardView } from './components/BoardView'
import { Sidebar } from './components/Sidebar'
import type { Card } from './types'

function App() {
  const { user, loading: authLoading, signInWithEmail, signOut } = useAuth()

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
    deleteProject,
  } = useProjectTree(userId)
  const { cards, loading: cardsLoading, addCard, patchCard, removeCard } = useCards(activeProjectId ?? undefined)
  const cardsByProject = useAllCards(userId, activeProjectId, cards)

  // A card clicked in the sidebar tree, waiting to be opened as a tab once
  // its project is the active one (see BoardView's initialOpenCardId).
  const [pendingCardId, setPendingCardId] = useState<string | null>(null)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)

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

  if (treeLoading || !activeProjectId) {
    return <div className="app-loading">Загрузка…</div>
  }

  const handleSelectCard = (projectId: string, cardId: string) => {
    if (projectId !== activeProjectId) setActiveProjectId(projectId)
    setPendingCardId(cardId)
  }

  return (
    <div className="app-shell">
      <Sidebar
        tree={tree}
        activeProjectId={activeProjectId}
        cardsByProject={cardsByProject}
        activeCardId={activeCardId}
        onSelect={setActiveProjectId}
        onSelectCard={handleSelectCard}
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
            onOpenForeignCard={handleSelectCard}
            initialOpenCardId={pendingCardId}
            onConsumedInitialCard={() => setPendingCardId(null)}
            onActiveCardChange={setActiveCardId}
          />
        )}
      </main>
    </div>
  )
}

export default App
