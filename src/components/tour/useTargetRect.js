import { useState, useEffect } from 'react'

// Resolves a CSS selector to a viewport-relative DOMRect.
// Re-measures on resize and scroll. Retries up to 4× at 100 ms for elements
// that appear asynchronously (e.g. after a state transition mounts a new panel).
export function useTargetRect(selector) {
  const [rect, setRect] = useState(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!selector) {
      setRect(null)
      setMissing(false)
      return
    }

    let cancelled = false
    let tries = 0

    function measure() {
      const el = document.querySelector(selector)
      if (el) {
        const r = el.getBoundingClientRect()
        if (!cancelled) {
          setRect({ x: r.left, y: r.top, width: r.width, height: r.height })
          setMissing(false)
        }
        return true
      }
      return false
    }

    function tryWithRetry() {
      if (cancelled) return
      if (measure()) return
      tries++
      if (tries < 4) setTimeout(tryWithRetry, 100)
      else if (!cancelled) setMissing(true)
    }

    tryWithRetry()

    const onLayout = () => measure()
    window.addEventListener('resize', onLayout)
    window.addEventListener('scroll', onLayout, { capture: true, passive: true })

    return () => {
      cancelled = true
      window.removeEventListener('resize', onLayout)
      window.removeEventListener('scroll', onLayout, { capture: true })
    }
  }, [selector])

  return { rect, missing }
}
