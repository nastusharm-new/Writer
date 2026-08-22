import { useDraggable } from '@dnd-kit/core'
import { cardTabTitle } from '../lib/timeline'
import { STATUS_COLOR } from '../types'
import type { Card } from '../types'

interface Props {
  card: Card
  projectId: string
  depth: number
  isActive: boolean
  onSelect: () => void
}

// A card leaf in the sidebar tree — draggable onto a different project row
// to move it there (see Sidebar's DndContext).
export function TreeCardLeaf({ card, projectId, depth, isActive, onSelect }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `card:${card.id}`,
    data: { cardId: card.id, sourceProjectId: projectId },
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`tree-row tree-row--card ${isActive ? 'is-active' : ''} ${isDragging ? 'is-dragging' : ''}`}
      style={{ paddingLeft: 8 + depth * 16, touchAction: 'none' }}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <span className="tree-toggle is-empty" />
      <span className="tree-card-dot" style={{ background: STATUS_COLOR[card.status] }} />
      <span className="tree-label">{cardTabTitle(card.text)}</span>
    </button>
  )
}
