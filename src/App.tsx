import { useAuth } from './hooks/useAuth'
import { useProjectTree } from './hooks/useProjectTree'
import { useCards } from './hooks/useCards'
import { AuthScreen } from './components/AuthScreen'
import { EmptyProjectScreen } from './components/EmptyProjectScreen'
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
    projects,
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

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null

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
        ) : cards.length === 0 ? (
          <EmptyProjectScreen key={activeProjectId} onAddCard={addCard} />
        ) : (
          <BoardView
            key={activeProjectId}
            projectTitle={activeProject?.title ?? ''}
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
