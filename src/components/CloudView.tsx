import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CardTile } from './CardTile'
import { getSequence } from '../lib/timeline'
import { hubId, type SimNode } from '../hooks/useCloudSimulation'
import type { Card, CardStatus } from '../types'
import type { CardPatch } from '../lib/dataStore'

interface Props {
  cards: Card[] // the active project's own cards + every nested subgroup's
  activeProjectId: string
  projectTitleById: Map<string, string>
  // One per project feeding this cloud (the active project plus every
  // nested subgroup) — a small node standing in for that folder, the way
  // Obsidian's graph view uses a node per note.
  hubNodes: SimNode[]
  // Folder-to-parent-folder pairs, drawn as a line between their hubs —
  // this is what makes the nesting itself visible, not just which card
  // belongs to which folder.
  hubEdges: { from: string; to: string }[]
  size: { width: number; height: number }
  positions: Map<string, SimNode>
  beginDrag: (id: string, x: number, y: number) => void
  dragTo: (id: string, x: number, y: number) => void
  endDrag: (id: string) => { fx: number; fy: number } | null
  releasePin: (id: string) => void
  onPatch: (id: string, patch: CardPatch) => void
  onDelete: (id: string) => void
  onOpen: (cardId: string, projectId: string) => void
  // Clicking a subgroup's hub jumps straight to that project, without
  // opening any particular card (unlike onOpen).
  onNavigateToProject: (projectId: string) => void
  timelinePosition: (id: string) => string
  hoveredId: string | null
  onHover: (id: string | null) => void
}

// A pointer press only becomes a drag once it moves past this many pixels —
// below that it's a click, which opens the card editor instead of pinning
// the card in place.
const DRAG_THRESHOLD = 4
const MIN_ZOOM = 0.3
const MAX_ZOOM = 2.5

// Presentational: the d3-force simulation itself lives in BoardView (via
// useCloudSimulation) so it survives this component unmounting when the
// author switches to the timeline and back — see BoardView.tsx.
export function CloudView({
  cards,
  activeProjectId,
  projectTitleById,
  hubNodes,
  hubEdges,
  size,
  positions,
  beginDrag,
  dragTo,
  endDrag,
  releasePin,
  onPatch,
  onDelete,
  onOpen,
  onNavigateToProject,
  timelinePosition,
  hoveredId,
  onHover,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const pressRef = useRef<{ id: string; startX: number; startY: number; dragging: boolean } | null>(null)
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
  const panRef = useRef<{ startX: number; startY: number; viewX: number; viewY: number } | null>(null)

  // Screen (client) coordinates -> simulation space, accounting for the
  // current pan/zoom transform applied to the inner layer.
  const toLocal = useCallback(
    (clientX: number, clientY: number) => {
      const rect = ref.current?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      return {
        x: (clientX - rect.left - view.x) / view.scale,
        y: (clientY - rect.top - view.y) / view.scale,
      }
    },
    [view],
  )

  // React attaches onWheel as a passive listener, so preventDefault() there
  // is a no-op (and logs a warning) — zooming on wheel needs a real DOM
  // listener registered with { passive: false }.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const pointerX = e.clientX - rect.left
      const pointerY = e.clientY - rect.top
      setView((v) => {
        const nextScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.scale * (1 - e.deltaY * 0.001)))
        const simX = (pointerX - v.x) / v.scale
        const simY = (pointerY - v.y) / v.scale
        return { scale: nextScale, x: pointerX - simX * nextScale, y: pointerY - simY * nextScale }
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const handleBackgroundPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Only pan when the empty canvas itself was hit — not a card (which
    // starts its own drag) and not UI chrome sitting on top of the canvas
    // (zoom buttons and the like).
    if ((e.target as HTMLElement).closest('.card-tile, button, .cloud-hub')) return
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    panRef.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y }
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current) {
      const pan = panRef.current
      setView((v) => ({ ...v, x: pan.viewX + (e.clientX - pan.startX), y: pan.viewY + (e.clientY - pan.startY) }))
      return
    }
    const press = pressRef.current
    if (!press) return
    const { x, y } = toLocal(e.clientX, e.clientY)
    if (!press.dragging) {
      const dx = e.clientX - press.startX
      const dy = e.clientY - press.startY
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      press.dragging = true
      beginDrag(press.id, x, y)
    }
    dragTo(press.id, x, y)
  }

  const finishPress = () => {
    panRef.current = null
    const press = pressRef.current
    if (!press) return
    pressRef.current = null
    if (press.dragging) {
      const pinned = endDrag(press.id)
      if (pinned) onPatch(press.id, { fx: pinned.fx, fy: pinned.fy })
    } else {
      onOpen(press.id, activeProjectId)
    }
  }

  const ownCards = cards.filter((c) => c.project_id === activeProjectId)
  const hoveredPos = hoveredId ? positions.get(hoveredId) : null
  const hoveredIsOwn = hoveredId ? ownCards.some((c) => c.id === hoveredId) : false
  const sequence = getSequence(ownCards)
  const threadPoints = sequence
    .map((c) => positions.get(c.id))
    .filter((p): p is SimNode => Boolean(p))

  // Every card's line to its own folder's hub, plus every folder hub's
  // line to its parent folder's hub — literal edges, Obsidian-graph style,
  // so "what belongs to what" is a drawn line rather than something you
  // have to infer from proximity or a background shape.
  const cardEdges = cards
    .map((card) => {
      const from = positions.get(card.id)
      const to = positions.get(hubId(card.project_id))
      return from && to ? { from, to } : null
    })
    .filter((e): e is { from: SimNode; to: SimNode } => Boolean(e))
  const folderEdges = hubEdges
    .map(({ from, to }) => {
      const fromPos = positions.get(hubId(from))
      const toPos = positions.get(hubId(to))
      return fromPos && toPos ? { from: fromPos, to: toPos } : null
    })
    .filter((e): e is { from: SimNode; to: SimNode } => Boolean(e))

  return (
    <div
      className="cloud-canvas"
      ref={ref}
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPress}
    >
      <div
        className="cloud-canvas-layer"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
      >
        {/* A faint thread through cards already placed in the timeline
            sequence — a sense of connectedness without manual link UI. */}
        {threadPoints.length > 1 && (
          <svg className="cloud-thread" width={size.width} height={size.height}>
            <polyline
              points={threadPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              className="cloud-thread-line"
            />
          </svg>
        )}

        {/* Structure, drawn as edges rather than an inferred boundary: a
            card's line to its own folder, and a subfolder's line to its
            parent folder. */}
        {(cardEdges.length > 0 || folderEdges.length > 0) && (
          <svg className="cloud-links" width={size.width} height={size.height}>
            {cardEdges.map((e, i) => (
              <line key={`c${i}`} x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} className="cloud-link-line" />
            ))}
            {folderEdges.map((e, i) => (
              <line
                key={`f${i}`}
                x1={e.from.x}
                y1={e.from.y}
                x2={e.to.x}
                y2={e.to.y}
                className="cloud-link-line cloud-link-line--folder"
              />
            ))}
          </svg>
        )}

        {hubNodes.map((hub) => {
          const pos = positions.get(hub.id)
          if (!pos || !hub.groupId) return null
          const isActive = hub.groupId === activeProjectId
          return (
            <button
              key={hub.id}
              type="button"
              className={`cloud-hub ${isActive ? 'is-active' : ''}`}
              style={{ left: pos.x, top: pos.y }}
              onClick={() => {
                if (!isActive) onNavigateToProject(hub.groupId!)
              }}
              disabled={isActive}
            >
              <span className="cloud-hub-dot" />
              <span className="cloud-hub-label">{projectTitleById.get(hub.groupId) ?? 'Без названия'}</span>
            </button>
          )
        })}

        {cards.map((card) => {
          const pos = positions.get(card.id)
          const x = pos?.x ?? size.width / 2
          const y = pos?.y ?? size.height / 2
          const isOwn = card.project_id === activeProjectId
          const isPinned = isOwn && card.fx != null && card.fy != null
          return (
            <CardTile
              key={card.id}
              card={card}
              className={`${hoveredId === card.id ? 'is-hovered' : ''} ${isOwn ? '' : 'is-foreign'}`}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: 'translate(-50%, -50%)',
                touchAction: 'none',
              }}
              readOnly={!isOwn}
              pinned={isPinned}
              onReleasePin={
                isOwn
                  ? () => {
                      releasePin(card.id)
                      onPatch(card.id, { fx: null, fy: null })
                    }
                  : undefined
              }
              onHoverStart={() => onHover(card.id)}
              onHoverEnd={() => onHover(null)}
              onStatusChange={isOwn ? (status: CardStatus) => onPatch(card.id, { status }) : () => {}}
              onDelete={isOwn ? () => onDelete(card.id) : () => {}}
              onOpen={isOwn ? undefined : () => onOpen(card.id, card.project_id)}
              dragProps={
                isOwn
                  ? {
                      onPointerDown: (e: ReactPointerEvent) => {
                        ;(e.target as Element).setPointerCapture?.(e.pointerId)
                        pressRef.current = { id: card.id, startX: e.clientX, startY: e.clientY, dragging: false }
                      },
                      onPointerUp: finishPress,
                    }
                  : undefined
              }
            />
          )
        })}
      </div>

      {/* Ghost preview: where this card would land if you switched to the timeline. */}
      <AnimatePresence>
        {hoveredId && hoveredPos && hoveredIsOwn && (
          <motion.div
            key="ghost-preview"
            className="cloud-ghost-preview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            style={{
              left: hoveredPos.x * view.scale + view.x,
              top: hoveredPos.y * view.scale + view.y + 60 * view.scale,
            }}
          >
            <span className="ghost-arrow">↴</span> в таймлайне: {timelinePosition(hoveredId)}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="cloud-zoom">
        <button type="button" onClick={() => setView((v) => ({ ...v, scale: Math.max(MIN_ZOOM, v.scale - 0.15) }))} aria-label="Уменьшить">
          −
        </button>
        <span>{Math.round(view.scale * 100)}%</span>
        <button type="button" onClick={() => setView((v) => ({ ...v, scale: Math.min(MAX_ZOOM, v.scale + 0.15) }))} aria-label="Увеличить">
          +
        </button>
      </div>
    </div>
  )
}
