import { useEffect, useState } from 'react'
import { MIN_SCALE, MAX_SCALE, ZOOM_STEP } from '../components/canvas/constants'

// Manages stage scale + pan position, wheel-zoom around cursor, and drag-pan.
// Returns:
//   view = { scale, x, y }
//   handleWheel        — bind to Konva Stage onWheel
//   handleStageDragEnd — bind to Konva Stage onDragEnd
//   recenterIfUnset(width, height) — centers origin once on first known size
export default function useViewport() {
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })

  function recenterIfUnset(width, height) {
    if (!width || !height) return
    setView((v) => (v.x === 0 && v.y === 0 ? { scale: 1, x: width / 2, y: height / 2 } : v))
  }

  function handleWheel(stageRef) {
    return (e) => {
      e.evt.preventDefault()
      const stage = stageRef.current
      if (!stage) return
      const pointer = stage.getPointerPosition()
      if (!pointer) return
      setView((v) => {
        const oldScale = v.scale
        const worldX = (pointer.x - v.x) / oldScale
        const worldY = (pointer.y - v.y) / oldScale
        let newScale = e.evt.deltaY > 0 ? oldScale / ZOOM_STEP : oldScale * ZOOM_STEP
        newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))
        return {
          scale: newScale,
          x: pointer.x - worldX * newScale,
          y: pointer.y - worldY * newScale,
        }
      })
    }
  }

  function handleStageDragEnd(e) {
    setView((v) => ({ ...v, x: e.target.x(), y: e.target.y() }))
  }

  return { view, recenterIfUnset, handleWheel, handleStageDragEnd }
}

export function clientToWorld(clientX, clientY, containerRect, view) {
  const canvasX = clientX - containerRect.left
  const canvasY = clientY - containerRect.top
  return {
    x: (canvasX - view.x) / view.scale,
    y: (canvasY - view.y) / view.scale,
  }
}

export function snapToGrid(p, gridSize) {
  return {
    x: Math.round(p.x / gridSize) * gridSize,
    y: Math.round(p.y / gridSize) * gridSize,
  }
}
