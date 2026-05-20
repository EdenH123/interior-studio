import { useStore as useZustandStore } from 'zustand'
import useStore from '../store/useStore'

// Reactive read of the zundo temporal store. `pastStates` / `futureStates`
// drive the toolbar buttons' disabled state; `undo` / `redo` are stable
// action references on the temporal API.
export default function useUndoRedo() {
  const pastLen = useZustandStore(useStore.temporal, (s) => s.pastStates.length)
  const futureLen = useZustandStore(useStore.temporal, (s) => s.futureStates.length)
  const { undo, redo } = useStore.temporal.getState()
  return { canUndo: pastLen > 0, canRedo: futureLen > 0, undo, redo }
}
