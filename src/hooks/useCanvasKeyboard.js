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
  const clearPendingPlacement = useStore((s) => s.clearPendingPlacement)
  const furniture = useStore((s) => s.furniture)
  const walls = useStore((s) => s.walls)
  const openings = useStore((s) => s.openings)
  const setClipboard = useStore((s) => s.setClipboard)
  const pasteClipboard = useStore((s) => s.pasteClipboard)
  const pushToast = useStore((s) => s.pushToast)
  const toggleShortcuts = useStore((s) => s.toggleShortcuts)

  useEffect(() => {
    const down = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space' && !e.repeat) { e.preventDefault(); setSpaceDown(true) }
      if (e.code === 'Escape') {
        clearPendingPlacement()
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

      // Copy
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !e.shiftKey) {
        e.preventDefault()
        const items = selectionItems(selection)
        if (items.length === 0) return
        const clipItems = []
        for (const { kind, id } of items) {
          if (kind === 'furniture') {
            const f = furniture.find((x) => x.id === id)
            if (f) clipItems.push({ kind: 'furniture', item: f })
          } else if (kind === 'wall') {
            const w = walls.find((x) => x.id === id)
            if (w) {
              clipItems.push({ kind: 'wall', item: w })
              // Also copy openings on this wall
              for (const o of openings.filter((x) => x.wallId === id)) {
                clipItems.push({ kind: 'opening', item: o })
              }
            }
          }
          // 'room' and 'opening' selections without a wall are skipped
        }
        if (clipItems.length > 0) {
          setClipboard(clipItems)
          pushToast(`Copied ${clipItems.filter((c) => c.kind !== 'opening').length} item(s)`, 'info')
        }
        return
      }

      // Paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && !e.shiftKey) {
        e.preventDefault()
        pasteClipboard()
        return
      }

      // Keyboard shortcuts cheat-sheet
      if (e.shiftKey && e.key === '?') {
        e.preventDefault()
        toggleShortcuts()
        return
      }
    }
    const up = (e) => { if (e.code === 'Space') setSpaceDown(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [selection, calibration, setDrawStart, clearSelection, removeWall, removeFurniture, removeOpening, rotateFurniture, cancelCalibration, selectAll, clearPendingPlacement, furniture, walls, openings, setClipboard, pasteClipboard, pushToast, toggleShortcuts])

  return spaceDown
}
