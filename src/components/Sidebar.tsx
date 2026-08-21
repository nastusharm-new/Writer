import { useState } from 'react'
import { ProjectTreeItem } from './ProjectTreeItem'
import type { ProjectTreeNode } from '../hooks/useProjectTree'
import type { Card } from '../types'

interface Props {
  tree: ProjectTreeNode[]
  activeProjectId: string | null
  cardsByProject: Map<string, Card[]>
  activeCardId: string | null
  onSelect: (id: string) => void
  onSelectCard: (projectId: string, cardId: string) => void
  onAddChild: (parentId: string | null) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onSignOut: () => void
}

// The left-hand project tree, Obsidian-style: an unbounded nesting of
// projects (parts / chapters / scenes, or whatever the author calls them —
// naming is free-form), each with its own cloud and timeline, and its own
// cards listed as clickable leaves underneath it.
export function Sidebar({
  tree,
  activeProjectId,
  cardsByProject,
  activeCardId,
  onSelect,
  onSelectCard,
  onAddChild,
  onRename,
  onDelete,
  onSignOut,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
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
  )
}
