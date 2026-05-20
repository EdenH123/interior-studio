// Global lighting settings shared between the 3D viewer and the toolbar.
// Persisted via the main store's `partialize`.
export const createLightingSlice = (set) => ({
  lighting: {
    lightsOn: true,       // master switch for all placed lights
    timeOfDay: 12,        // 0–24, drives the directional sun arc
    ambientStrength: 0.4, // 0–1 fill light multiplier
  },
  setLightsOn: (on) =>
    set((s) => ({ lighting: { ...s.lighting, lightsOn: on } })),
  setTimeOfDay: (t) =>
    set((s) => ({ lighting: { ...s.lighting, timeOfDay: t } })),
  setAmbientStrength: (v) =>
    set((s) => ({ lighting: { ...s.lighting, ambientStrength: v } })),
})
