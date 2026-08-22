import { useCallback, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ProjectTreeNode } from '../hooks/useProjectTree'
import { TreeCardLeaf } from './TreeCardLeaf'
import { getSequence, getUnassigned } from '../lib/timeline'
import type { Card } from '../types'

interface Props {
  node: ProjectTreeNode
  depth: number
  activeId: string | null
  cardsByProject: Map<string, Card[]>
  activeCardId: string | null
  expanded: Set<string>
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  onSelectCard: (projectId: string, cardId: string) => void
  onAddChild: (parentId: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

// One row in the sidebar's project tree, rendering its own children —
// depth is unbounded, matching "part -> chapter -> scene -> ..." nesting.
// Below its sub-projects, it also lists its own cards as clickable leaves,
// and accepts a card dragged in from elsewhere in the tree (Sidebar's
// DndContext resolves the drop back to this row via its project id).
export function ProjectTreeItem({
  node,
  depth,
  activeId,
  cardsByProject,
  activeCardId,
  expanded,
  onToggle,
  onSelect,
  onSelectCard,
  onAddChild,
  onRename,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(node.project.title)
  const rawCards = cardsByProject.get(node.project.id) ?? []
  // Same order the timeline would show (sequence first, then whatever
  // hasn't been placed yet) — dragging a leaf to reorder it here reuses
  // manual_order, so the sidebar becomes another way to shape the same
  // sequence rather than a second, unrelated ordering.
  const cards = [...getSequence(rawCards), ...getUnassigned(rawCards)]
  const hasExpandable = node.children.length > 0 || cards.length > 0
  const isOpen = expanded.has(node.project.id)
  const isActive = activeId === node.project.id
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `project:${node.project.id}` })
  // A folder is draggable onto another folder to reparent it (Sidebar's
  // DndContext resolves the drop the same way it does for cards). The
  // drag listeners live on a dedicated handle rather than the whole row,
  // since the row also hosts click-to-select, double-click-to-rename, and
  // the add/delete buttons.
  const {
    attributes: dragAttributes,
    listeners: dragListeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({ id: `project-drag:${node.project.id}`, data: { projectId: node.project.id } })
  const setRowRef = useCallback(
    (el: HTMLDivElement | null) => {
      setDropRef(el)
      setDragRef(el)
    },
    [setDropRef, setDragRef],
  )

  const commitRename = () => {
    setEditing(false)
    const trimmed = draftTitle.trim()
    if (trimmed && trimmed !== node.project.title) {
      onRename(node.project.id, trimmed)
    } else {
      setDraftTitle(node.project.title)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') {
      setDraftTitle(node.project.title)
      setEditing(false)
    }
  }

  return (
    <div className="tree-node">
      <div
        ref={setRowRef}
        className={`tree-row ${isActive ? 'is-active' : ''} ${isOver ? 'is-drop-target' : ''} ${isDragging ? 'is-dragging' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={() => onSelect(node.project.id)}
      >
        <span
          className="tree-drag-handle"
          style={{ touchAction: 'none' }}
          title="Перетащить в другую папку"
          onClick={(e) => e.stopPropagation()}
          {...dragAttributes}
          {...dragListeners}
        >
          ⠿
        </span>
        <button
          type="button"
          className={`tree-toggle ${hasExpandable ? '' : 'is-empty'}`}
          onClick={(e) => {
            e.stopPropagation()
            if (hasExpandable) onToggle(node.project.id)
          }}
          tabIndex={hasExpandable ? 0 : -1}
          aria-label={isOpen ? 'Свернуть' : 'Развернуть'}
        >
          {hasExpandable ? (isOpen ? '▾' : '▸') : ''}
        </button>

        {editing ? (
          <input
            className="tree-rename-input"
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="tree-label"
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditing(true)
            }}
          >
            {node.project.title}
          </span>
        )}

        <span className="tree-row-actions">
          <button
            type="button"
            className="tree-action"
            title="Добавить внутрь"
            onClick={(e) => {
              e.stopPropagation()
              onAddChild(node.project.id)
              if (!isOpen) onToggle(node.project.id)
            }}
          >
            +
          </button>
          <button
            type="button"
            className="tree-action tree-action-delete"
            title="Удалить"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Удалить «${node.project.title}» вместе со всем содержимым?`)) {
                onDelete(node.project.id)
              }
            }}
          >
            ✕
          </button>
        </span>
      </div>

      {hasExpandable && isOpen && (
        <div className="tree-children">
          {/* This project's own cards before its sub-projects — what
              directly belongs here should read before the folders nested
              underneath it, not after. Sortable among themselves (see
              Sidebar's DndContext) so they can be reordered in place. */}
          <SortableContext items={cards.map((c) => `card:${c.id}`)} strategy={verticalListSortingStrategy}>
            {cards.map((card) => (
              <TreeCardLeaf
                key={card.id}
                card={card}
                projectId={node.project.id}
                depth={depth + 1}
                isActive={activeCardId === card.id}
                onSelect={() => onSelectCard(node.project.id, card.id)}
              />
            ))}
          </SortableContext>

          {node.children.map((child) => (
            <ProjectTreeItem
              key={child.project.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              cardsByProject={cardsByProject}
              activeCardId={activeCardId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              onSelectCard={onSelectCard}
              onAddChild={onAddChild}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
