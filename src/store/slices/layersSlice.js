// Layer-visibility state. Persisted so the panel stays between reloads.
// Not tracked by zundo — layer toggles are a view preference, not an
// undoable design decision.
export const createLayersSlice = (set) => ({
  layers: {
    walls: true,
    furniture: true,
    openings: true,
    rooms: true,
    underlay: true,
    grid: true,
  },
  toggleLayer: (name) =>
    set((s) => ({ layers: { ...s.layers, [name]: !s.layers[name] } })),
})
