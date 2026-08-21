import { useCallback, useEffect, useRef, useState } from 'react'
import { StatusPicker } from './StatusPicker'
import type { Card, CardStatus } from '../types'
import type { CardPatch } from '../lib/dataStore'

interface Props {
  card: Card | null // null = a fresh, not-yet-saved tab
  onCreate: (text: string, status: CardStatus) => Promise<Card | undefined>
  onPatch: (id: string, patch: CardPatch) => void
  onDelete: (id: string) => void
  // Fires once a fresh tab's first keystroke has actually created the row,
  // so the tab bar can pick up the real id and the derived title.
  onCreated: (card: Card) => void
}

const AUTOSAVE_DELAY = 500

// The writing surface for one open card tab — embedded directly in the
// pane (no backdrop, no modal): the tab strip is what you close it with,
// not a button in here. Saves as you type, same as the old modal did.
export function CardTabPane({ card, onCreate, onPatch, onDelete, onCreated }: Props) {
  const [text, setText] = useState(card?.text ?? '')
  const [status, setStatus] = useState<CardStatus>(card?.status ?? 'spark')
  const idRef = useRef<string | null>(card?.id ?? null)
  // Mirrors of the latest state, so the unmount-flush below (which only
  // ever runs once, on this tab's own unmount) never reads a stale value.
  const textRef = useRef(text)
  const statusRef = useRef(status)
  textRef.current = text
  statusRef.current = status
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const commit = useCallback(async () => {
    const value = textRef.current
    const trimmed = value.trim()
    if (!trimmed) return
    if (!idRef.current) {
      const created = await onCreate(trimmed, statusRef.current)
      if (created) {
        idRef.current = created.id
        onCreated(created)
      }
    } else {
      onPatch(idRef.current, { text: value })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCreate, onPatch, onCreated])

  const commitRef = useRef(commit)
  commitRef.current = commit

  useEffect(() => {
    textareaRef.current?.focus()
    return () => {
      // Switching tabs (or closing this one) before the debounce fires
      // must not silently drop the last few keystrokes.
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        commitRef.current()
      }
    }
  }, [])

  const handleTextChange = (value: string) => {
    setText(value)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null
      commit()
    }, AUTOSAVE_DELAY)
  }

  const handleStatusChange = (next: CardStatus) => {
    setStatus(next)
    if (idRef.current) onPatch(idRef.current, { status: next })
  }

  const handleDelete = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (idRef.current) onDelete(idRef.current)
  }

  const isEmpty = !text.trim()

  return (
    <div className="card-pane">
      <div className="card-pane-topbar">
        <StatusPicker value={status} onChange={handleStatusChange} size="full" />
        {idRef.current && (
          <button type="button" className="card-pane-delete" onClick={handleDelete}>
            Удалить
          </button>
        )}
      </div>

      <div className="card-pane-body">
        {isEmpty && (
          <div className="card-pane-empty-hint">
            <h1>Не думай о структуре.</h1>
            <h1>Просто выгрузи, что в голове.</h1>
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="card-pane-textarea"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Мысль, сцена, факт, кусок диалога, шаг рецепта — что угодно…"
        />
      </div>
    </div>
  )
}
