import { useState, type CSSProperties, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CardTile } from './CardTile'
import { getSequence, getUnassigned } from '../lib/timeline'
import type { Card, CardStatus } from '../types'
import type { CardPatch } from '../lib/dataStore'

interface Props {
  cards: Card[]
  onPatch: (id: string, patch: CardPatch) => void
  onDelete: (id: string) => void
  hoveredId: string | null
  onHover: (id: string | null) => void
}

const SEQUENCE_ZONE = 'zone:sequence'
const UNASSIGNED_ZONE = 'zone:unassigned'

function DroppableZone({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  )
}

function TimelineCard({
  card,
  onPatch,
  onDelete,
  hoveredId,
  onHover,
}: {
  card: Card
  onPatch: (id: string, patch: CardPatch) => void
  onDelete: (id: string) => void
  hoveredId: string | null
  onHover: (id: string | null) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    touchAction: 'none',
    position: 'relative',
  }
  return (
    <CardTile
      card={card}
      style={style}
      setNodeRef={setNodeRef}
      dragProps={{ ...attributes, ...listeners }}
      className={hoveredId === card.id ? 'is-hovered' : ''}
      onStatusChange={(status: CardStatus) => onPatch(card.id, { status })}
      onDelete={() => onDelete(card.id)}
      onHoverStart={() => onHover(card.id)}
      onHoverEnd={() => onHover(null)}
    />
  )
}

export function TimelineView({ cards, onPatch, onDelete, hoveredId, onHover }: Props) {
  const sequence = getSequence(cards)
  const unassigned = getUnassigned(cards)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  function findContainer(id: string): 'sequence' | 'unassigned' | null {
    if (id === SEQUENCE_ZONE) return 'sequence'
    if (id === UNASSIGNED_ZONE) return 'unassigned'
    if (sequence.some((c) => c.id === id)) return 'sequence'
    if (unassigned.some((c) => c.id === id)) return 'unassigned'
    return null
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  // Cross-container sortable drag needs pointer-based collision detection —
  // rect-center strategies (closestCenter) don't reliably resolve when the
  // destination container is empty. Falls back to rectIntersection so a
  // fast drag that briefly leaves every droppable still resolves.
  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) return pointerCollisions
    return rectIntersection(args)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const activeCardId = String(active.id)
    const overId = String(over.id)
    const sourceContainer = findContainer(activeCardId)
    const destContainer = findContainer(overId)
    if (!sourceContainer || !destContainer) return

    // Reordering within the unordered zone has no persisted meaning in the
    // MVP data model — nothing to do.
    if (sourceContainer === 'unassigned' && destContainer === 'unassigned') return

    if (sourceContainer === 'sequence' && destContainer === 'sequence') {
      const oldIndex = sequence.findIndex((c) => c.id === activeCardId)
      const newIndex = overId === SEQUENCE_ZONE ? sequence.length - 1 : sequence.findIndex((c) => c.id === overId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return
      const reordered = arrayMove(sequence, oldIndex, newIndex)
      reordered.forEach((c, i) => {
        if (c.manual_order !== i) onPatch(c.id, { manual_order: i })
      })
      return
    }

    if (destContainer === 'sequence') {
      const withoutActive = sequence.filter((c) => c.id !== activeCardId)
      const overIndex = overId === SEQUENCE_ZONE ? -1 : withoutActive.findIndex((c) => c.id === overId)
      const insertAt = overIndex === -1 ? withoutActive.length : overIndex
      const movedCard = cards.find((c) => c.id === activeCardId)
      if (!movedCard) return
      const next = [...withoutActive.slice(0, insertAt), movedCard, ...withoutActive.slice(insertAt)]
      next.forEach((c, i) => onPatch(c.id, { manual_order: i }))
    } else {
      onPatch(activeCardId, { manual_order: null })
    }
  }

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="timeline-view">
        <div className="timeline-toolbar">
          <span className="timeline-toolbar-label">Сюжет</span>
          <div className="timeline-zoom">
            <button type="button" onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))} aria-label="Уменьшить">
              −
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))} aria-label="Увеличить">
              +
            </button>
          </div>
        </div>

        <div className="timeline-scroll">
          <SortableContext items={[...sequence.map((c) => c.id), SEQUENCE_ZONE]} strategy={horizontalListSortingStrategy}>
            <DroppableZone id={SEQUENCE_ZONE} className="timeline-sequence-track">
              <div className="timeline-sequence-inner" style={{ transform: `scale(${zoom})` }}>
                {sequence.length === 0 && (
                  <div className="timeline-empty-hint">Перетащи карточку сюда, чтобы начать выстраивать порядок</div>
                )}
                {sequence.map((card) => (
                  <TimelineCard
                    key={card.id}
                    card={card}
                    onPatch={onPatch}
                    onDelete={onDelete}
                    hoveredId={hoveredId}
                    onHover={onHover}
                  />
                ))}
              </div>
            </DroppableZone>
          </SortableContext>
        </div>

        <div className="timeline-unassigned-label">пока вне сюжета</div>
        <SortableContext items={[...unassigned.map((c) => c.id), UNASSIGNED_ZONE]} strategy={rectSortingStrategy}>
          <DroppableZone id={UNASSIGNED_ZONE} className="timeline-unassigned-track">
            {unassigned.length === 0 && (
              <div className="timeline-empty-hint timeline-empty-hint--muted">Пусто — всё уже в сюжете</div>
            )}
            {unassigned.map((card) => (
              <TimelineCard
                key={card.id}
                card={card}
                onPatch={onPatch}
                onDelete={onDelete}
                hoveredId={hoveredId}
                onHover={onHover}
              />
            ))}
          </DroppableZone>
        </SortableContext>
      </div>

      <DragOverlay>
        {activeCard ? (
          <CardTile
            card={activeCard}
            style={{ touchAction: 'none' }}
            className="is-drag-overlay"
            onStatusChange={() => {}}
            onDelete={() => {}}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
