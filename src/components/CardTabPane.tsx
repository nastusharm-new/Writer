import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, DragEvent } from 'react'
import { StatusPicker } from './StatusPicker'
import { RecipeCard } from './RecipeCard'
import { fileToDataUri } from '../lib/images'
import { parseRecipeCard } from '../lib/recipeFormat'
import type { Card, CardStatus } from '../types'
import type { CardPatch } from '../lib/dataStore'

interface Props {
  card: Card | null // null = a fresh, not-yet-saved tab
  onCreate: (text: string, status: CardStatus, images?: string[]) => Promise<Card | undefined>
  onPatch: (id: string, patch: CardPatch) => void
  onDelete: (id: string) => void
  // Fires once a fresh tab's first keystroke has actually created the row,
  // so the tab bar can pick up the real id and the derived title.
  onCreated: (card: Card) => void
}

const AUTOSAVE_DELAY = 500

function imageFilesFrom(items: DataTransferItemList | undefined, files: FileList | undefined): File[] {
  const fromFiles = Array.from(files ?? []).filter((f) => f.type.startsWith('image/'))
  if (fromFiles.length > 0) return fromFiles
  return Array.from(items ?? [])
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((f): f is File => Boolean(f))
}

// The writing surface for one open card tab — embedded directly in the
// pane (no backdrop, no modal): the tab strip is what you close it with,
// not a button in here. Saves as you type, same as the old modal did.
export function CardTabPane({ card, onCreate, onPatch, onDelete, onCreated }: Props) {
  const [text, setText] = useState(card?.text ?? '')
  const [status, setStatus] = useState<CardStatus>(card?.status ?? 'spark')
  const [images, setImages] = useState<string[]>(card?.images ?? [])
  const [isDragOver, setIsDragOver] = useState(false)
  // A formatted, read-only view of the same text — useful for a card
  // written in a known shape (right now, just recipes; see
  // lib/recipeFormat.ts) that reads better laid out than as raw text.
  // Explicit toggle rather than switching on blur: much simpler to get
  // right than reconciling with the autosave/cursor logic below.
  const [previewMode, setPreviewMode] = useState(false)
  const idRef = useRef<string | null>(card?.id ?? null)
  // Mirrors of the latest state, so the unmount-flush below (which only
  // ever runs once, on this tab's own unmount) never reads a stale value.
  const textRef = useRef(text)
  const statusRef = useRef(status)
  const imagesRef = useRef(images)
  textRef.current = text
  statusRef.current = status
  imagesRef.current = images
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const commit = useCallback(async () => {
    const value = textRef.current
    const trimmed = value.trim()
    if (!trimmed && imagesRef.current.length === 0) return
    if (!idRef.current) {
      const created = await onCreate(trimmed, statusRef.current, imagesRef.current)
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
    const el = textareaRef.current
    if (el) {
      // A plain .focus() drops the cursor at position 0, not the end of
      // whatever text is already there. That's invisible for a genuinely
      // blank tab, but this effect also re-runs on every remount — and a
      // fresh tab's first autosave swaps its temp key for the real card
      // id, which *is* a remount. Without this, the very next keystroke
      // after the first word lands at the start of the text instead of
      // continuing it.
      el.focus()
      const end = el.value.length
      el.setSelectionRange(end, end)
    }
    return () => {
      // Switching tabs (or closing this one) before the debounce fires
      // must not silently drop the last few keystrokes.
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        commitRef.current()
      }
    }
  }, [])

  // Coming back from preview mode into the textarea should land the
  // cursor at the end, same reasoning as the mount effect above — this
  // one just also fires on the preview -> edit transition, not only on
  // mount.
  useEffect(() => {
    if (previewMode) return
    const el = textareaRef.current
    if (el) {
      el.focus()
      const end = el.value.length
      el.setSelectionRange(end, end)
    }
  }, [previewMode])

  const togglePreview = () => {
    if (!previewMode && saveTimer.current) {
      // Flush the pending autosave immediately rather than leaving it
      // debounced — switching to preview is a natural "I'm done typing
      // for now" moment.
      clearTimeout(saveTimer.current)
      saveTimer.current = null
      commit()
    }
    setPreviewMode((v) => !v)
  }

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

  // Images save immediately (no debounce — they're discrete add/remove
  // events, not keystrokes) and, unlike text, can bring a brand-new tab's
  // card into existence on their own: a sketch pasted before a word is
  // typed still needs somewhere to live.
  const commitImages = useCallback(
    async (next: string[]) => {
      imagesRef.current = next
      if (idRef.current) {
        onPatch(idRef.current, { images: next })
        return
      }
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      await commitRef.current()
    },
    [onPatch],
  )

  const addImages = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      const uris = await Promise.all(files.map(fileToDataUri))
      // Committing (which can synchronously update the parent, e.g. a
      // fresh tab's onCreated) must happen outside the setState updater —
      // updaters run during React's render phase, and another component
      // can't be updated from there.
      const next = [...imagesRef.current, ...uris]
      setImages(next)
      commitImages(next)
    },
    [commitImages],
  )

  const removeImage = (index: number) => {
    const next = imagesRef.current.filter((_, i) => i !== index)
    setImages(next)
    commitImages(next)
  }

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = imageFilesFrom(e.clipboardData?.items, undefined)
    if (files.length === 0) return
    e.preventDefault()
    addImages(files)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (Array.from(e.dataTransfer?.types ?? []).includes('Files')) {
      e.preventDefault()
      setIsDragOver(true)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    setIsDragOver(false)
    const files = imageFilesFrom(e.dataTransfer?.items, e.dataTransfer?.files)
    if (files.length === 0) return
    e.preventDefault()
    addImages(files)
  }

  const handleDelete = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (idRef.current) onDelete(idRef.current)
  }

  const isEmpty = !text.trim()
  const recipe = !isEmpty && previewMode ? parseRecipeCard(text) : null

  return (
    <div className="card-pane">
      <div className="card-pane-topbar">
        <StatusPicker value={status} onChange={handleStatusChange} />
        <div className="card-pane-topbar-actions">
          {!isEmpty && (
            <button type="button" className="card-pane-preview-toggle" onClick={togglePreview}>
              {previewMode ? 'Редактировать' : 'Просмотр'}
            </button>
          )}
          {idRef.current && (
            <button type="button" className="card-pane-delete" onClick={handleDelete}>
              Удалить
            </button>
          )}
        </div>
      </div>

      <div
        className={`card-pane-body ${isDragOver ? 'is-drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {isEmpty && images.length === 0 && (
          <div className="card-pane-empty-hint">
            <h1>Не думай о структуре.</h1>
            <h1>Просто выгрузи, что в голове.</h1>
          </div>
        )}
        {images.length > 0 && (
          <div className="card-pane-images">
            {images.map((src, i) => (
              <div key={i} className="card-pane-image">
                <img src={src} alt="" onClick={() => window.open(src, '_blank')} />
                <button
                  type="button"
                  className="card-pane-image-remove"
                  onClick={() => removeImage(i)}
                  aria-label="Удалить изображение"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {previewMode && !isEmpty ? (
          <div className="card-pane-preview" onClick={togglePreview} title="Нажмите, чтобы редактировать">
            {recipe ? <RecipeCard recipe={recipe} /> : <p className="card-pane-preview-text">{text}</p>}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="card-pane-textarea"
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onPaste={handlePaste}
            placeholder="Мысль, сцена, факт, кусок диалога, шаг рецепта — что угодно… Изображение можно вставить (Ctrl+V) или перетащить сюда."
          />
        )}
      </div>
    </div>
  )
}
