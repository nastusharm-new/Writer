import { useEffect, useRef, useState } from 'react'

interface Props {
  onExportMarkdown: () => void
  onExportDocx: () => void
  onExportPdf: () => void
}

// The "⬇ Документ" button, now a small dropdown of formats rather than an
// instant single-format download.
export function ExportMenu({ onExportMarkdown, onExportDocx, onExportPdf }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onOutsidePointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', onOutsidePointerDown)
  }, [open])

  const pick = (fn: () => void) => {
    fn()
    setOpen(false)
  }

  return (
    <div className="export-menu" ref={ref}>
      <button
        type="button"
        className="pane-compile"
        onClick={() => setOpen((v) => !v)}
        title="Скачать проект и все вложенные группы одним документом"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ⬇ Документ
      </button>
      {open && (
        <div className="export-menu-list" role="menu">
          <button type="button" role="menuitem" onClick={() => pick(onExportMarkdown)}>
            Markdown (.md)
          </button>
          <button type="button" role="menuitem" onClick={() => pick(onExportDocx)}>
            Word (.docx)
          </button>
          <button type="button" role="menuitem" onClick={() => pick(onExportPdf)}>
            PDF (через печать)
          </button>
        </div>
      )}
    </div>
  )
}
