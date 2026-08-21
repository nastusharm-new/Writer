import { useAuth } from './hooks/useAuth'
import { useProject } from './hooks/useProject'
import { useCards } from './hooks/useCards'
import { AuthScreen } from './components/AuthScreen'
import { EmptyProjectScreen } from './components/EmptyProjectScreen'
import { BoardView } from './components/BoardView'

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
  const { project, loading: projectLoading } = useProject(userId)
  const { cards, loading: cardsLoading, addCard, patchCard, removeCard } = useCards(project?.id)

  if (projectLoading || cardsLoading || !project) {
    return <div className="app-loading">Загрузка…</div>
  }

  if (cards.length === 0) {
    return <EmptyProjectScreen onAddCard={addCard} />
  }

  return (
    <BoardView
      cards={cards}
      addCard={addCard}
      patchCard={patchCard}
      removeCard={removeCard}
      onSignOut={onSignOut}
    />
  )
}

export default App
