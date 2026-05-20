import { useEffect, useState } from 'react'
import useStore from '../store/useStore'
import { selectionItems } from '../store/selectionHelpers'

// Wires global keyboard shortcuts for the canvas: space-to-pan, Esc cancel,
// Delete/Backspace remove all selected, R / Shift+R rotate selected furniture,
// Ctrl/Cmd+A select all visible items.
// Ignores key events that originate from form inputs.
//
// Returns `spaceDown` so the canvas can switch cursor + draggable mode.
export default function useCanvasKeyboard() {
  const [spaceDown, setSpaceDown] = useState(false)
  const selection = useStore((s) => s.selection)
  const calibration = useStore((s) => s.calibration)
  const setDrawStart = useStore((s) => s.setDrawStart)
  const clearSelection = useStore((s) => s.clearSelection)
  const removeWall = useStore((s) => s.removeWall)
  const removeFurniture = useStore((s) => s.removeFurniture)
  const removeOpening = useStore((s) => s.removeOpening)
  const rotateFurniture = useStore((s) => s.rotateFurniture)
  const cancelCalibration = useStore((s) => s.cancelCalibration)
  const selectAll = useStore((s) => s.selectAll)

  useEffect(() => {
    const down = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space' && !e.repeat) { e.preventDefault(); setSpaceDown(true) }
      if (e.code === 'Escape') {
        if (calibration) cancelCalibration()
        else { setDrawStart(null); clearSelection() }
      }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        // Delete every selected item. Walls cascade-remove their openings,
        // so if a wall and one of its openings are both selected the opening
        // removeOpening call is a safe no-op.
        selectionItems(selection).forEach(({ kind, id }) => {
          if (kind === 'wall') removeWall(id)
          else if (kind === 'furniture') removeFurniture(id)
          else if (kind === 'opening') removeOpening(id)
        })
      }
      if (e.key === 'r' || e.key === 'R') {
        selectionItems(selection)
          .filter((i) => i.kind === 'furniture')
          .forEach(({ id }) => rotateFurniture(id, e.shiftKey ? -15 : 15))
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        selectAll()
      }
      // Undo / redo — Cmd on macOS, Ctrl elsewhere. The input/textarea guard
      // above means Cmd+Z still hits native text-undo when typing in a field
      // (room name, calibration distance, wall length).
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        const t = useStore.temporal.getState()
        if (e.shiftKey) t.redo()
        else t.undo()
      }
    }
    const up = (e) => { if (e.code === 'Space') setSpaceDown(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [selection, calibration, setDrawStart, clearSelection, removeWall, removeFurniture, removeOpening, rotateFurniture, cancelCalibration, selectAll])

  return spaceDown
}
