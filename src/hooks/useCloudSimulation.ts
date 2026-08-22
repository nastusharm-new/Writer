import { useEffect, useRef, useState, useCallback } from 'react'
import {
  forceSimulation,
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
  forceLink,
  type Simulation,
  type SimulationLinkDatum,
} from 'd3-force'
import type { Card } from '../types'

export interface SimNode {
  id: string
  x: number
  y: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

// Collision radius: cards are 152x108 rectangles, so a circle sized off the
// half-width alone still lets corners overlap along the diagonal — pad it
// toward the half-diagonal (~94) for breathing room between tiles.
export const CARD_RADIUS = 92

interface Options {
  cards: Card[]
  width: number
  height: number
  // Which project each card belongs to, so cards pulled in from nested
  // subgroups (see BoardView) drift toward their own cluster instead of
  // mixing uniformly with the active project's own cards.
  groupOf?: (cardId: string) => string
  // The group that should sit at dead center (usually the active project
  // itself) rather than being placed in the surrounding ring.
  centerGroup?: string
}

export interface ClusterAnchor {
  x: number
  y: number
}

// A minimal custom d3-force: nudges each node toward its group's anchor
// point every tick. Weak enough that forceManyBody/forceCollide still keep
// cards inside a cluster from overlapping — it only biases *where* those
// local clusters end up, it doesn't override the rest of the physics.
function forceCluster(getGroup: (id: string) => string, anchors: Map<string, ClusterAnchor>, strength: number) {
  let nodes: SimNode[] = []
  function force(alpha: number) {
    for (const n of nodes) {
      const anchor = anchors.get(getGroup(n.id))
      if (!anchor) continue
      n.vx = (n.vx ?? 0) + (anchor.x - n.x) * strength * alpha
      n.vy = (n.vy ?? 0) + (anchor.y - n.y) * strength * alpha
    }
  }
  force.initialize = (ns: SimNode[]) => {
    nodes = ns
  }
  return force
}

function computeClusterAnchors(
  groupIds: string[],
  centerGroup: string | undefined,
  width: number,
  height: number,
): Map<string, ClusterAnchor> {
  const anchors = new Map<string, ClusterAnchor>()
  const cx = width / 2
  const cy = height / 2
  const others = groupIds.filter((g) => g !== centerGroup)
  if (centerGroup) anchors.set(centerGroup, { x: cx, y: cy })
  const ringRadius = Math.max(220, Math.min(width, height) * 0.32)
  others.forEach((groupId, i) => {
    const angle = (i / Math.max(others.length, 1)) * Math.PI * 2 - Math.PI / 2
    anchors.set(groupId, { x: cx + Math.cos(angle) * ringRadius, y: cy + Math.sin(angle) * ringRadius })
  })
  return anchors
}

/**
 * Owns the d3-force simulation behind the "cloud" view.
 *
 * forceManyBody = cards repel each other; forceCollide = they never overlap;
 * forceX/forceY = a weak spring pulling everything toward the canvas
 * center, acting as a soft anchor rather than a hard boundary; forceLink is
 * wired up (empty for MVP) so manual card_links can drop in later without
 * restructuring the simulation.
 */
export function useCloudSimulation({ cards, width, height, groupOf, centerGroup }: Options) {
  const simRef = useRef<Simulation<SimNode, SimulationLinkDatum<SimNode>> | null>(null)
  const nodesRef = useRef<SimNode[]>([])
  const [positions, setPositions] = useState<Map<string, SimNode>>(new Map())
  const [clusterAnchors, setClusterAnchors] = useState<Map<string, ClusterAnchor>>(new Map())

  // Create the simulation once.
  useEffect(() => {
    const sim = forceSimulation<SimNode>([])
      .force('charge', forceManyBody().strength(-340))
      .force('collide', forceCollide<SimNode>(CARD_RADIUS).strength(1))
      .force('link', forceLink<SimNode, SimulationLinkDatum<SimNode>>([]).id((d) => d.id).distance(160))
      .force('x', forceX<SimNode>(width / 2).strength(0.015))
      .force('y', forceY<SimNode>(height / 2).strength(0.015))
      .alphaDecay(0.015)
      .on('tick', () => {
        setPositions(new Map(nodesRef.current.map((n) => [n.id, n])))
      })
    simRef.current = sim
    return () => {
      sim.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the center anchor in sync with canvas size.
  useEffect(() => {
    const sim = simRef.current
    if (!sim) return
    ;(sim.force('x') as ReturnType<typeof forceX<SimNode>>)?.x(width / 2)
    ;(sim.force('y') as ReturnType<typeof forceY<SimNode>>)?.y(height / 2)
  }, [width, height])

  // Sync nodes with the current card list, preserving positions of cards
  // that already have a node (including ones dragged/pinned earlier).
  useEffect(() => {
    const sim = simRef.current
    if (!sim) return
    const existing = new Map(nodesRef.current.map((n) => [n.id, n]))
    const nodes = cards.map((card) => {
      const prev = existing.get(card.id)
      if (prev) {
        // A pin coming from the backend (fx/fy set on the card) always wins.
        prev.fx = card.fx ?? prev.fx ?? null
        prev.fy = card.fy ?? prev.fy ?? null
        return prev
      }
      const angle = Math.random() * Math.PI * 2
      const radius = 40 + Math.random() * 120
      return {
        id: card.id,
        x: card.fx ?? width / 2 + Math.cos(angle) * radius,
        y: card.fy ?? height / 2 + Math.sin(angle) * radius,
        fx: card.fx ?? null,
        fy: card.fy ?? null,
      } satisfies SimNode
    })
    nodesRef.current = nodes
    sim.nodes(nodes)

    if (groupOf) {
      const groupIds = Array.from(new Set(cards.map((c) => groupOf(c.id))))
      const anchors = computeClusterAnchors(groupIds, centerGroup, width, height)
      sim.force('cluster', forceCluster(groupOf, anchors, 0.05))
      setClusterAnchors(anchors)
    } else {
      sim.force('cluster', null)
      setClusterAnchors(new Map())
    }

    sim.alpha(0.5).restart()
    setPositions(new Map(nodes.map((n) => [n.id, n])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.map((c) => c.id).join(','), width, height, groupOf, centerGroup])

  const pause = useCallback(() => {
    simRef.current?.stop()
  }, [])

  const resume = useCallback(() => {
    // Reheat gently rather than from scratch: existing x/y are preserved,
    // this just lets collisions settle if anything changed while paused.
    simRef.current?.alpha(0.15).restart()
  }, [])

  const beginDrag = useCallback((id: string, x: number, y: number) => {
    const node = nodesRef.current.find((n) => n.id === id)
    if (!node) return
    simRef.current?.alphaTarget(0.3).restart()
    node.fx = x
    node.fy = y
  }, [])

  const dragTo = useCallback((id: string, x: number, y: number) => {
    const node = nodesRef.current.find((n) => n.id === id)
    if (!node) return
    node.fx = x
    node.fy = y
  }, [])

  const endDrag = useCallback((id: string): { fx: number; fy: number } | null => {
    simRef.current?.alphaTarget(0)
    const node = nodesRef.current.find((n) => n.id === id)
    if (!node || node.fx == null || node.fy == null) return null
    return { fx: node.fx, fy: node.fy }
  }, [])

  const releasePin = useCallback((id: string) => {
    const node = nodesRef.current.find((n) => n.id === id)
    if (!node) return
    node.fx = null
    node.fy = null
    simRef.current?.alpha(0.4).restart()
  }, [])

  return { positions, clusterAnchors, pause, resume, beginDrag, dragTo, endDrag, releasePin }
}
