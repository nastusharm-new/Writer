import { useEffect, useRef, useState } from 'react'

export function useElementSize<T extends HTMLElement>(fallback = { width: 900, height: 600 }) {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState(fallback)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setSize({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { ref, size }
}
