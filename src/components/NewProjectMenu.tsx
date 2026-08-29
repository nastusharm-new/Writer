import { useEffect, useRef, useState } from 'react'
import { PROJECT_TEMPLATES } from '../lib/templates'

interface Props {
  parentId: string | null
  onCreateBlank: (parentId: string | null) => void
  onApplyTemplate: (parentId: string | null, templateId: string, variantId: string) => void
  className: string
  label: string
  title: string
}

// The "+" button in the sidebar — root and per-folder alike. A blank
// project is still one click (the common case stays exactly as fast as
// before); templates are additional options in the same dropdown, each
// pre-filling a folder structure and a few example cards to show the
// intended shape rather than starting from nothing.
export function NewProjectMenu({ parentId, onCreateBlank, onApplyTemplate, className, label, title }: Props) {
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

  return (
    <div className="new-project-menu" ref={ref}>
      <button
        type="button"
        className={className}
        title={title}
        aria-label={title}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        {label}
      </button>
      {open && (
        <div className="new-project-menu-list" role="menu" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCreateBlank(parentId)
              setOpen(false)
            }}
          >
            Пустой проект
          </button>
          {PROJECT_TEMPLATES.map((template) => (
            <div key={template.id} className="new-project-menu-group">
              <div className="new-project-menu-group-label" title={template.description}>
                {template.title}
              </div>
              {template.variants.map((variant) => (
                <button
                  type="button"
                  role="menuitem"
                  key={variant.id}
                  onClick={() => {
                    onApplyTemplate(parentId, template.id, variant.id)
                    setOpen(false)
                  }}
                >
                  {variant.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
