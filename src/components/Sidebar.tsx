import { useEffect, useMemo, useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { NewProjectMenu } from './NewProjectMenu'
import { ProjectTreeItem } from './ProjectTreeItem'
import { cardTabTitle } from '../lib/timeline'
import { daysRemaining, getActiveLicense } from '../lib/license'
import type { ProjectTreeNode } from '../hooks/useProjectTree'
import type { Card } from '../types'

// A trial's remaining days, shown once at mount — only ever relevant on
// the desktop build, and only for a trial key (a lifetime key has no
// expiresAt, so this stays null for it).
function trialDaysLeft(): number | null {
  if (!isTauri()) return null
  const license = getActiveLicense()
  return license ? daysRemaining(license) : null
}

interface Props {
  tree: ProjectTreeNode[]
  activeProjectId: string | null
  cardsByProject: Map<string, Card[]>
  activeCardId: string | null
  // Root-to-active project ids — auto-expanded so the active project's own
  // cards (leaves under it) are never hidden behind a collapsed row.
  activeAncestorIds: string[]
  projectTitleById: Map<string, string>
  onSelect: (id: string) => void
  onSelectCard: (projectId: string, cardId: string) => void
  onMoveCard: (cardId: string, sourceProjectId: string, targetProjectId: string) => void
  onMoveProject: (projectId: string, targetParentId: string) => void
  // Dropped onto another card — reorders it among its siblings using the
  // same manual_order the timeline sequence uses, rather than the coarse
  // "somewhere in this project" a drop on the project row itself gives.
  onReorderCard: (cardId: string, sourceProjectId: string, targetProjectId: string, targetCardId: string) => void
  onAddChild: (parentId: string | null) => void
  onApplyTemplate: (parentId: string | null, templateId: string, variantId: string) => void
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
  projectTitleById,
  onSelect,
  onSelectCard,
  onMoveCard,
  onMoveProject,
  onReorderCard,
  onAddChild,
  onApplyTemplate,
  onRename,
  onDelete,
  onSignOut,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [trialLeft] = useState(trialDaysLeft)
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null)
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null)
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
    const data = event.active.data.current
    setDraggingCardId((data?.cardId as string) ?? null)
    setDraggingProjectId((data?.projectId as string) ?? null)
  }

  // Sortable card items and plain-droppable project rows share this one
  // DndContext — rect-center strategies don't reliably resolve a sortable
  // target once its container has few items, so prefer whatever's directly
  // under the pointer and only fall back to rect overlap.
  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) return pointerCollisions
    return rectIntersection(args)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingCardId(null)
    setDraggingProjectId(null)
    const { active, over } = event
    if (!over) return
    const overId = String(over.id)

    const cardId = active.data.current?.cardId as string | undefined
    const sourceProjectId = active.data.current?.sourceProjectId as string | undefined

    if (overId.startsWith('project:')) {
      const targetProjectId = overId.slice('project:'.length)
      if (cardId && sourceProjectId) {
        onMoveCard(cardId, sourceProjectId, targetProjectId)
        return
      }
      const draggedProjectId = active.data.current?.projectId as string | undefined
      if (draggedProjectId) onMoveProject(draggedProjectId, targetProjectId)
      return
    }

    if (overId.startsWith('card:') && cardId && sourceProjectId) {
      const targetCardId = overId.slice('card:'.length)
      if (targetCardId === cardId) return
      const targetCard = cardById.get(targetCardId)
      if (!targetCard) return
      onReorderCard(cardId, sourceProjectId, targetCard.project_id, targetCardId)
    }
  }

  const draggingCard = draggingCardId ? cardById.get(draggingCardId) : null
  const draggingProjectTitle = draggingProjectId ? projectTitleById.get(draggingProjectId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-title">Draft</span>
          <NewProjectMenu
            parentId={null}
            onCreateBlank={onAddChild}
            onApplyTemplate={onApplyTemplate}
            className="sidebar-add-root"
            label="+"
            title="Новый проект"
          />
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
              onApplyTemplate={onApplyTemplate}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>

        <div className="sidebar-footer">
          {trialLeft != null && (
            <span className="sidebar-trial-badge" title="Пробный период">
              {trialLeft === 0 ? 'Пробный период истекает сегодня' : `Пробный период: ${trialLeft} дн.`}
            </span>
          )}
          <button type="button" className="sidebar-signout" onClick={onSignOut}>
            Выйти
          </button>
        </div>
      </aside>

      <DragOverlay>
        {draggingCard && <div className="tree-drag-overlay">{cardTabTitle(draggingCard.text)}</div>}
        {draggingProjectTitle && <div className="tree-drag-overlay">{draggingProjectTitle}</div>}
      </DragOverlay>
    </DndContext>
  )
}
