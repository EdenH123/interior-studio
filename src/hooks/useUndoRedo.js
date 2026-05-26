import { useStore as useZustandStore } from 'zustand'
import { useCallback } from 'react'
import useStore from '../store/useStore'

// Reactive read of the zundo temporal store. `pastStates` / `futureStates`
// drive the toolbar buttons' disabled state; `undo` / `redo` are wrapped
// in arrow functions so they're called with no arguments. Passing them
// directly as onClick handlers would invoke them with a SyntheticEvent as
// `steps`, which zundo passes to Array.splice — splice(NaN, NaN) returns []
// so nextState becomes undefined and the store crashes.
export default function useUndoRedo() {
  const pastLen = useZustandStore(useStore.temporal, (s) => s.pastStates.length)
  const futureLen = useZustandStore(useStore.temporal, (s) => s.futureStates.length)
  const undo = useCallback(() => useStore.temporal.getState().undo(), [])
  const redo = useCallback(() => useStore.temporal.getState().redo(), [])
  return { canUndo: pastLen > 0, canRedo: futureLen > 0, undo, redo }
}
