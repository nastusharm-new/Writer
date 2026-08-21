import { STATUS_COLOR, STATUS_LABEL, type CardStatus } from '../types'

export function MaturityDot({ status, size = 9 }: { status: CardStatus; size?: number }) {
  return (
    <span
      className="maturity-dot"
      title={STATUS_LABEL[status]}
      aria-label={STATUS_LABEL[status]}
      style={{
        width: size,
        height: size,
        backgroundColor: STATUS_COLOR[status],
      }}
    />
  )
}
