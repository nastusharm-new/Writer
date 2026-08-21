import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { StatusPicker } from './StatusPicker'
import type { Card, CardStatus } from '../types'
import type { CardPatch } from '../lib/dataStore'

interface Props {
  card: Card | null // null = composing a brand new card
  onCreate: (text: string, status: CardStatus) => Promise<Card | undefined>
  onPatch: (id: string, patch: CardPatch) => void
  onDelete: (id: string) => void
  onClose: () => void
}

const AUTOSAVE_DELAY = 500

// A full-page writing surface — for both a new card and editing an existing
// one — replacing the single-line "terminal-style" add bar. Saves as you
// type (debounced), the way a notes app does, rather than requiring an
// explicit submit.
export function CardEditor({ card, onCreate, onPatch, onDelete, onClose }: Props) {
  const [text, setText] = useState(card?.text ?? '')
  const [status, setStatus] = useState<CardStatus>(card?.status ?? 'spark')
  const idRef = useRef<string | null>(card?.id ?? null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    textareaRef.current?.focus()
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const commit = useCallback(
    async (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) return
      if (!idRef.current) {
        const created = await onCreate(trimmed, status)
        if (created) idRef.current = created.id
      } else {
        onPatch(idRef.current, { text: value })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onCreate, onPatch],
  )

  const handleTextChange = (value: string) => {
    setText(value)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => commit(value), AUTOSAVE_DELAY)
  }

  const handleStatusChange = (next: CardStatus) => {
    setStatus(next)
    if (idRef.current) onPatch(idRef.current, { status: next })
  }

  const flushAndClose = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    commit(text)
    onClose()
  }

  const handleDelete = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (idRef.current) onDelete(idRef.current)
    onClose()
  }

  return (
    <motion.div
      className="card-editor-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={flushAndClose}
    >
      <motion.div
        className="card-editor"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-editor-topbar">
          <StatusPicker value={status} onChange={handleStatusChange} size="full" />
          <div className="card-editor-topbar-actions">
            {idRef.current && (
              <button type="button" className="card-editor-delete" onClick={handleDelete}>
                Удалить
              </button>
            )}
            <button type="button" className="card-editor-close" onClick={flushAndClose} aria-label="Закрыть">
              Готово
            </button>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          className="card-editor-textarea"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') flushAndClose()
          }}
          placeholder="Мысль, сцена, факт, кусок диалога, шаг рецепта — что угодно…"
        />
        <div className="card-editor-hint">Esc — закрыть · сохраняется автоматически, пока пишешь</div>
      </motion.div>
    </motion.div>
  )
}
