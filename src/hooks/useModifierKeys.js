import { useEffect, useState } from 'react'

// Tracks Shift and Alt key state globally. Returns { shiftDown, altDown }.
// Does NOT call preventDefault on Alt so browser menu shortcuts are unaffected.
// The effect is independent of useCanvasKeyboard so that any component can use it
// without duplicating the space-bar / undo / selection-shortcut logic.
export default function useModifierKeys() {
  const [shiftDown, setShiftDown] = useState(false)
  const [altDown, setAltDown] = useState(false)

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'Shift') setShiftDown(true)
      if (e.key === 'Alt')   setAltDown(true)
    }
    const up = (e) => {
      if (e.key === 'Shift') setShiftDown(false)
      if (e.key === 'Alt')   setAltDown(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  return { shiftDown, altDown }
}
