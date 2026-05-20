// Walkthrough (first-person) camera mode. NOT persisted — always boots in
// orbit mode. NOT in undo history — it's a viewport preference, not design data.
export const createWalkthroughSlice = (set) => ({
  walkthrough: false,
  setWalkthrough: (on) => set({ walkthrough: !!on }),
  toggleWalkthrough: () => set((s) => ({ walkthrough: !s.walkthrough })),
})
