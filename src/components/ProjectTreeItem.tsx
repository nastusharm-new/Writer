import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { ProjectTreeNode } from '../hooks/useProjectTree'

interface Props {
  node: ProjectTreeNode
  depth: number
  activeId: string | null
  expanded: Set<string>
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  onAddChild: (parentId: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

// One row in the sidebar's project tree, rendering its own children —
// depth is unbounded, matching "part -> chapter -> scene -> ..." nesting.
export function ProjectTreeItem({
  node,
  depth,
  activeId,
  expanded,
  onToggle,
  onSelect,
  onAddChild,
  onRename,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(node.project.title)
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.project.id)
  const isActive = activeId === node.project.id

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
        className={`tree-row ${isActive ? 'is-active' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={() => onSelect(node.project.id)}
      >
        <button
          type="button"
          className={`tree-toggle ${hasChildren ? '' : 'is-empty'}`}
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) onToggle(node.project.id)
          }}
          tabIndex={hasChildren ? 0 : -1}
          aria-label={isOpen ? 'Свернуть' : 'Развернуть'}
        >
          {hasChildren ? (isOpen ? '▾' : '▸') : ''}
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

      {hasChildren && isOpen && (
        <div className="tree-children">
          {node.children.map((child) => (
            <ProjectTreeItem
              key={child.project.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
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
