import type { Project } from '../types'

// Every project id reachable from `rootId`, including `rootId` itself —
// used to aggregate a project's cloud with all its nested subgroups'
// cards rather than showing only what's directly attached to it.
export function collectDescendantIds(projects: Project[], rootId: string): string[] {
  const childrenOf = new Map<string, string[]>()
  for (const p of projects) {
    if (!p.parent_id) continue
    const list = childrenOf.get(p.parent_id)
    if (list) list.push(p.id)
    else childrenOf.set(p.parent_id, [p.id])
  }
  const result: string[] = []
  const stack = [rootId]
  while (stack.length > 0) {
    const id = stack.pop()!
    result.push(id)
    for (const childId of childrenOf.get(id) ?? []) stack.push(childId)
  }
  return result
}

// The chain from the tree's root down to `id` (inclusive) — used to show
// "where am I" as a breadcrumb, since the sidebar alone doesn't make that
// obvious once a project is several levels deep or scrolled out of view.
export function getAncestorPath(projects: Project[], id: string): Project[] {
  const byId = new Map(projects.map((p) => [p.id, p]))
  const path: Project[] = []
  let current = byId.get(id)
  while (current) {
    path.unshift(current)
    current = current.parent_id ? byId.get(current.parent_id) : undefined
  }
  return path
}
