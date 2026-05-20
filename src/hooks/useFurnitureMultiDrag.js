import { useRef } from 'react'
import { selectionItems } from '../store/selectionHelpers'
import useStore from '../store/useStore'

// Coordinates moving multiple selected furniture items together when one
// is dragged. Uses getState() in handlers so drag events always see the
// current selection and positions without stale-closure risk.
export default function useFurnitureMultiDrag() {
  // Snapshot of { id, draggedStart, allStarts } captured at drag-start.
  const dragRef = useRef(null)

  const onDragStart = (id, startPos) => {
    const { selection, furniture } = useStore.getState()
    const items = selectionItems(selection)
    if (!items.some((i) => i.kind === 'furniture' && i.id === id)) return
    const allStarts = items
      .filter((i) => i.kind === 'furniture')
      .map(({ id: fid }) => {
        const f = furniture.find((fi) => fi.id === fid)
        return f ? { id: fid, x: f.x, y: f.y } : null
      })
      .filter(Boolean)
    dragRef.current = { id, draggedStart: startPos, allStarts }
  }

  const onDragEnd = (id, newPos) => {
    const { updateFurniture } = useStore.getState()
    if (dragRef.current?.id === id && dragRef.current.allStarts.length > 1) {
      const { draggedStart, allStarts } = dragRef.current
      const dx = newPos.x - draggedStart.x
      const dy = newPos.y - draggedStart.y
      allStarts.forEach(({ id: fid, x, y }) => {
        updateFurniture(fid, fid === id ? newPos : { x: x + dx, y: y + dy })
      })
    } else {
      updateFurniture(id, newPos)
    }
    dragRef.current = null
  }

  return { onDragStart, onDragEnd }
}
