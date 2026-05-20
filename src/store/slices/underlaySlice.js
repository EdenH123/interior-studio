import { PIXELS_PER_METER } from '../../components/canvas/constants'

// The floor-plan underlay image plus its two-click calibration flow.
// `underlay` is persisted (base64 data URL survives reload); `calibration`
// is transient and excluded from `partialize` in the composer.
//
// `applyCalibration` math: the pixel distance between the two clicks is
// rescaled to `distanceMeters * PIXELS_PER_METER` canvas pixels. The
// image's origin shifts so `p1` stays fixed in world coords.
export const createUnderlaySlice = (set) => ({
  underlay: null,
  setUnderlay: (u) => set({ underlay: u }),
  updateUnderlay: (patch) =>
    set((s) => ({ underlay: s.underlay ? { ...s.underlay, ...patch } : null })),
  clearUnderlay: () =>
    set((s) => ({
      underlay: null,
      calibration: null,
      selection: s.selection?.kind === 'underlay' ? null : s.selection,
    })),

  calibration: null,
  startCalibration: () => set({ calibration: { p1: null, p2: null } }),
  cancelCalibration: () => set({ calibration: null }),
  setCalibrationPoint: (p) =>
    set((s) => {
      if (!s.calibration) return s
      if (!s.calibration.p1) return { calibration: { ...s.calibration, p1: p } }
      if (!s.calibration.p2) return { calibration: { ...s.calibration, p2: p } }
      return s
    }),
  applyCalibration: (distanceMeters) =>
    set((s) => {
      const u = s.underlay
      const c = s.calibration
      if (!u || !c?.p1 || !c?.p2 || !(distanceMeters > 0)) return s
      const d = Math.hypot(c.p2.x - c.p1.x, c.p2.y - c.p1.y)
      if (d < 1) return { calibration: null }
      const ratio = (distanceMeters * PIXELS_PER_METER) / d
      return {
        underlay: {
          ...u,
          scale: u.scale * ratio,
          x: c.p1.x - (c.p1.x - u.x) * ratio,
          y: c.p1.y - (c.p1.y - u.y) * ratio,
          locked: true,
        },
        calibration: null,
      }
    }),
})
