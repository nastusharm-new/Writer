import { useState } from 'react'
import type { FormEvent } from 'react'

interface Props {
  onAddCard: (text: string) => void
}

// Screen 5.1 — first run. No genre/template picker: the first thing the
// author does is write something down, not configure a project. Same
// writing-surface typography as the full-page card editor, so the very
// first thing you see already feels like the tool, not a form.
export function EmptyProjectScreen({ onAddCard }: Props) {
  const [text, setText] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    onAddCard(text)
    setText('')
  }

  return (
    <div className="empty-project">
      <div className="empty-project-inner">
        <h1>Не думай о структуре.</h1>
        <h1>Просто выгрузи, что в голове.</h1>
        <form onSubmit={submit} className="empty-project-form">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Мысль, сцена, факт, кусок диалога, шаг рецепта — что угодно…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e)
            }}
          />
          <button type="submit" disabled={!text.trim()}>
            Добавить карточку
          </button>
        </form>
      </div>
    </div>
  )
}
