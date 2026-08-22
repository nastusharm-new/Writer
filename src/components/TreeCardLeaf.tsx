import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
// to move it there, or onto another card in the same list to reorder it
// among its siblings (see Sidebar's DndContext).
export function TreeCardLeaf({ card, projectId, depth, isActive, onSelect }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card:${card.id}`,
    data: { cardId: card.id, sourceProjectId: projectId },
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`tree-row tree-row--card ${isActive ? 'is-active' : ''} ${isDragging ? 'is-dragging' : ''}`}
      style={{
        paddingLeft: 8 + depth * 16,
        touchAction: 'none',
        transform: CSS.Transform.toString(transform),
        transition,
      }}
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
