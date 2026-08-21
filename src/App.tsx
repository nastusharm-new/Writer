import { useAuth } from './hooks/useAuth'
import { useProjectTree } from './hooks/useProjectTree'
import { useCards } from './hooks/useCards'
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

  if (treeLoading || !activeProjectId) {
    return <div className="app-loading">Загрузка…</div>
  }

  return (
    <div className="app-shell">
      <Sidebar
        tree={tree}
        activeProjectId={activeProjectId}
        onSelect={setActiveProjectId}
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
          />
        )}
      </main>
    </div>
  )
}

export default App
