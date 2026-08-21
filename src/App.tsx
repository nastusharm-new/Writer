import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useProjectTree } from './hooks/useProjectTree'
import { useCards } from './hooks/useCards'
import { useAllCards } from './hooks/useAllCards'
import { AuthScreen } from './components/AuthScreen'
import { BoardView } from './components/BoardView'
import { Sidebar } from './components/Sidebar'

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
            cards={cards}
            addCard={addCard}
            patchCard={patchCard}
            removeCard={removeCard}
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
