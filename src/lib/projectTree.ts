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
