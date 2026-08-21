export type CardStatus = 'spark' | 'draft' | 'rough' | 'done'

export const CARD_STATUSES: CardStatus[] = ['spark', 'draft', 'rough', 'done']

export const STATUS_LABEL: Record<CardStatus, string> = {
  spark: 'искра',
  draft: 'черновик',
  rough: 'набросок',
  done: 'готово',
}

// Colors for the maturity dot indicator. Kept as a single source of truth
// so the cloud and timeline views always agree on what a status looks like.
export const STATUS_COLOR: Record<CardStatus, string> = {
  spark: '#f5b942',
  draft: '#5aa9e6',
  rough: '#9b7fe0',
  done: '#4cd08a',
}

export interface Project {
  id: string
  user_id: string
  title: string
}

export interface Card {
  id: string
  project_id: string
  text: string
  status: CardStatus
  created_at: string
  manual_order: number | null
  fx: number | null
  fy: number | null
}

export type CardLinkType = 'sequence'

export interface CardLink {
  card_id: string
  linked_card_id: string
  type: CardLinkType
}

export type ViewMode = 'cloud' | 'timeline'
