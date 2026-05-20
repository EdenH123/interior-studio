// View / draw-flow state: 3D toggle and the mid-draw wall start point.
// Neither is persisted (window arrangement + mid-draw are session-local).
export const createViewSlice = (set) => ({
  show3d: false,
  toggle3d: () => set((s) => ({ show3d: !s.show3d })),

  drawStart: null,
  setDrawStart: (p) => set({ drawStart: p }),
})
