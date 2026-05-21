import useStore from '../store/useStore'
import { GRID_SIZE } from '../components/canvas/constants'
import { clientToWorld, snapToGrid } from './useViewport'

export const CUSTOM_MODEL_DRAG_MIME = 'application/x-interior-studio-custom-model'

export default function useCustomModelDrop(containerRef, view) {
  const customModels       = useStore((s) => s.customModels)
  const addFurnitureWithSpec = useStore((s) => s.addFurnitureWithSpec)
  const setDragGhostPos    = useStore((s) => s.setDragGhostPos)
  const clearDragGhost     = useStore((s) => s.clearDragGhost)

  function worldAt(clientX, clientY) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return clientToWorld(clientX, clientY, rect, view)
  }

  return {
    onDragOver(e) {
      if (!e.dataTransfer.types.includes(CUSTOM_MODEL_DRAG_MIME)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      const p = snapToGrid(worldAt(e.clientX, e.clientY), GRID_SIZE)
      setDragGhostPos(p.x, p.y)
    },

    onDragLeave(e) {
      if (!containerRef.current?.contains(e.relatedTarget)) clearDragGhost()
    },

    onDrop(e) {
      const id = e.dataTransfer.getData(CUSTOM_MODEL_DRAG_MIME)
      if (!id) return
      e.preventDefault()
      clearDragGhost()
      const cm = customModels.find((m) => m.id === id)
      if (!cm) return
      const p = snapToGrid(worldAt(e.clientX, e.clientY), GRID_SIZE)
      addFurnitureWithSpec({
        type: 'custom',
        label: cm.label,
        width: cm.width,
        depth: cm.depth,
        height: cm.height,
        color: cm.color,
        customModelId: cm.id,
      }, p.x, p.y)
    },
  }
}
