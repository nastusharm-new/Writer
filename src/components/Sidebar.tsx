import { useEffect, useMemo, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { ProjectTreeItem } from './ProjectTreeItem'
import { cardTabTitle } from '../lib/timeline'
import type { ProjectTreeNode } from '../hooks/useProjectTree'
import type { Card } from '../types'

interface Props {
  tree: ProjectTreeNode[]
  activeProjectId: string | null
  cardsByProject: Map<string, Card[]>
  activeCardId: string | null
  // Root-to-active project ids — auto-expanded so the active project's own
  // cards (leaves under it) are never hidden behind a collapsed row.
  activeAncestorIds: string[]
  onSelect: (id: string) => void
  onSelectCard: (projectId: string, cardId: string) => void
  onMoveCard: (cardId: string, sourceProjectId: string, targetProjectId: string) => void
  onAddChild: (parentId: string | null) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onSignOut: () => void
}

// The left-hand project tree, Obsidian-style: an unbounded nesting of
// projects (parts / chapters / scenes, or whatever the author calls them —
// naming is free-form), each with its own cloud and timeline, and its own
// cards listed as clickable, draggable leaves underneath it.
export function Sidebar({
  tree,
  activeProjectId,
  cardsByProject,
  activeCardId,
  activeAncestorIds,
  onSelect,
  onSelectCard,
  onMoveCard,
  onAddChild,
  onRename,
  onDelete,
  onSignOut,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  // Whichever project is active (and everything above it) should always be
  // open — its own cards render as leaves underneath it, and a collapsed
  // row made them look like they didn't exist at all.
  const ancestorKey = activeAncestorIds.join(',')
  useEffect(() => {
    if (!ancestorKey) return
    setExpanded((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const id of ancestorKey.split(',')) {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [ancestorKey])

  const cardById = useMemo(() => {
    const map = new Map<string, Card>()
    for (const list of cardsByProject.values()) {
      for (const card of list) map.set(card.id, card)
    }
    return map
  }, [cardsByProject])

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingCardId((event.active.data.current?.cardId as string) ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingCardId(null)
    const { active, over } = event
    if (!over) return
    const cardId = active.data.current?.cardId as string | undefined
    const sourceProjectId = active.data.current?.sourceProjectId as string | undefined
    const overId = String(over.id)
    if (!cardId || !sourceProjectId || !overId.startsWith('project:')) return
    onMoveCard(cardId, sourceProjectId, overId.slice('project:'.length))
  }

  const draggingCard = draggingCardId ? cardById.get(draggingCardId) : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-title">Draft</span>
          <button
            type="button"
            className="sidebar-add-root"
            onClick={() => onAddChild(null)}
            aria-label="Новый проект"
            title="Новый проект"
          >
            +
          </button>
        </div>

        <div className="sidebar-tree">
          {tree.map((node) => (
            <ProjectTreeItem
              key={node.project.id}
              node={node}
              depth={0}
              activeId={activeProjectId}
              cardsByProject={cardsByProject}
              activeCardId={activeCardId}
              expanded={expanded}
              onToggle={toggle}
              onSelect={onSelect}
              onSelectCard={onSelectCard}
              onAddChild={onAddChild}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>

        <div className="sidebar-footer">
          <button type="button" className="sidebar-signout" onClick={onSignOut}>
            Выйти
          </button>
        </div>
      </aside>

      <DragOverlay>
        {draggingCard && <div className="tree-drag-overlay">{cardTabTitle(draggingCard.text)}</div>}
      </DragOverlay>
    </DndContext>
  )
}
