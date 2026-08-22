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
  // A small "hub" node standing in for a project/folder, rather than an
  // actual card — see below.
  isHub?: boolean
  groupId?: string
}

type SimLink = SimulationLinkDatum<SimNode>

// Collision radius: cards are 152x108 rectangles, so a circle sized off the
// half-width alone still lets corners overlap along the diagonal — pad it
// toward the half-diagonal (~94) for breathing room between tiles.
export const CARD_RADIUS = 92
export const HUB_RADIUS = 22

interface Options {
  cards: Card[]
  width: number
  height: number
  // Which project each card belongs to, so cards pulled in from nested
  // subgroups (see BoardView) drift toward their own hub instead of
  // mixing uniformly with the active project's own cards.
  groupOf?: (cardId: string) => string
  // The group that should sit pinned at dead center (the active project).
  centerGroup?: string
  // A subgroup's parent group, when that parent is also part of the
  // current aggregation — draws the folder-to-folder link that makes the
  // nesting itself visible, not just each card's own group.
  groupParent?: (groupId: string) => string | undefined
}

export function hubId(groupId: string) {
  return `hub:${groupId}`
}

/**
 * Owns the d3-force simulation behind the "cloud" view — a node-link graph
 * in the spirit of Obsidian's graph view rather than an abstract scatter:
 * every card links to a small hub node standing in for its project/folder,
 * and a nested subfolder's hub links to its parent's hub. Dependencies
 * (what belongs to what) are then a literal drawn line, not something you
 * have to infer from proximity or a background shape.
 *
 * forceManyBody = nodes repel each other; forceCollide = they never
 * overlap (hubs and cards use different radii); forceLink pulls each card
 * toward its hub and each hub toward its parent hub; the active project's
 * hub is pinned at dead center so the rest of the graph has a stable point
 * to hang off of.
 */
export function useCloudSimulation({ cards, width, height, groupOf, centerGroup, groupParent }: Options) {
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null)
  const nodesRef = useRef<SimNode[]>([])
  const [positions, setPositions] = useState<Map<string, SimNode>>(new Map())
  const [hubNodes, setHubNodes] = useState<SimNode[]>([])

  // Create the simulation once.
  useEffect(() => {
    const sim = forceSimulation<SimNode>([])
      .force('charge', forceManyBody<SimNode>().strength((d) => (d.isHub ? -180 : -340)))
      .force(
        'collide',
        forceCollide<SimNode>((d) => (d.isHub ? HUB_RADIUS : CARD_RADIUS)).strength(1),
      )
      .force(
        'link',
        forceLink<SimNode, SimLink>([])
          .id((d) => d.id)
          // Both link kinds target a hub, so distinguish by the *source*:
          // a hub-to-parent-hub link (source is itself a hub) sits further
          // out than a plain card-to-hub link.
          .distance((l) => ((l.source as SimNode).isHub ? 210 : 130))
          .strength((l) => ((l.source as SimNode).isHub ? 0.8 : 0.5)),
      )
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
    // The center hub is pinned outright (not just nudged) so the rest of
    // the graph has a fixed point to hang off of.
    if (centerGroup) {
      const hub = nodesRef.current.find((n) => n.id === hubId(centerGroup))
      if (hub) {
        hub.fx = width / 2
        hub.fy = height / 2
      }
    }
  }, [width, height, centerGroup])

  // Sync nodes with the current card list, preserving positions of nodes
  // that already exist (including ones dragged/pinned earlier).
  useEffect(() => {
    const sim = simRef.current
    if (!sim) return
    const existing = new Map(nodesRef.current.map((n) => [n.id, n]))

    const place = (id: string, isHub: boolean, groupId: string | undefined, fx: number | null, fy: number | null) => {
      const prev = existing.get(id)
      if (prev) {
        prev.fx = fx ?? prev.fx ?? null
        prev.fy = fy ?? prev.fy ?? null
        return prev
      }
      const angle = Math.random() * Math.PI * 2
      const radius = 40 + Math.random() * 120
      return {
        id,
        isHub,
        groupId,
        x: fx ?? width / 2 + Math.cos(angle) * radius,
        y: fy ?? height / 2 + Math.sin(angle) * radius,
        fx: fx ?? null,
        fy: fy ?? null,
      } satisfies SimNode
    }

    const cardNodes = cards.map((card) => place(card.id, false, undefined, card.fx, card.fy))

    const groupIds = groupOf ? Array.from(new Set(cards.map((c) => groupOf(c.id)))) : []
    const hubs = groupIds.map((groupId) => {
      const pinned = groupId === centerGroup ? { x: width / 2, y: height / 2 } : null
      return place(hubId(groupId), true, groupId, pinned?.x ?? null, pinned?.y ?? null)
    })

    const nodes = [...hubs, ...cardNodes]
    nodesRef.current = nodes
    sim.nodes(nodes)
    setHubNodes(hubs)

    // Every card links to its own group's hub; every non-center hub also
    // links to its parent group's hub, when that parent has a hub in this
    // same aggregation — this is the line that makes "this folder lives
    // inside that folder" visible, not just "this card lives in that
    // folder".
    const links: SimLink[] = []
    if (groupOf) {
      for (const card of cards) {
        links.push({ source: card.id, target: hubId(groupOf(card.id)) })
      }
    }
    const hubIds = new Set(groupIds)
    for (const groupId of groupIds) {
      if (groupId === centerGroup) continue
      const parentId = groupParent?.(groupId)
      if (parentId && hubIds.has(parentId)) {
        links.push({ source: hubId(groupId), target: hubId(parentId) })
      }
    }
    ;(sim.force('link') as ReturnType<typeof forceLink<SimNode, SimLink>>)?.links(links)

    sim.alpha(0.5).restart()
    setPositions(new Map(nodes.map((n) => [n.id, n])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.map((c) => c.id).join(','), width, height, groupOf, centerGroup, groupParent])

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

  return { positions, hubNodes, pause, resume, beginDrag, dragTo, endDrag, releasePin }
}
