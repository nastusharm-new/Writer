import { useState } from 'react'
import type { FormEvent } from 'react'

interface Props {
  onAdd: (text: string) => void
}

export function AddCardBar({ onAdd }: Props) {
  const [text, setText] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    onAdd(text)
    setText('')
  }

  return (
    <form className="add-card-bar" onSubmit={submit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Новая карточка…"
      />
      <button type="submit" disabled={!text.trim()}>
        Добавить
      </button>
    </form>
  )
}
