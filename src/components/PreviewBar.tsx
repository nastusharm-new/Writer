import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  cardCount: number
  onSwitchToTimeline: () => void
}

// A gentle nudge, not a modal: once there's enough on the canvas to make a
// timeline meaningful, offer a one-tap peek at it. Dismissible, and never
// blocks the cloud.
export function PreviewBar({ cardCount, onSwitchToTimeline }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const visible = !dismissed && cardCount >= 3

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="preview-bar"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25 }}
        >
          <span>
            Уже {cardCount} {cardCount === 1 ? 'карточка' : 'карточек'} — глянуть, как это выглядит в таймлайне?
          </span>
          <div className="preview-bar-actions">
            <button type="button" className="preview-bar-primary" onClick={onSwitchToTimeline}>
              Посмотреть таймлайн
            </button>
            <button
              type="button"
              className="preview-bar-dismiss"
              onClick={() => setDismissed(true)}
              aria-label="Скрыть подсказку"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
