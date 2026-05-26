import { TOURS } from '../../components/tour/tourSteps'

export const createTourSlice = (set) => ({
  tourActive: false,
  tourId: null,
  stepIndex: 0,
  tourMenuOpen: false,
  tourShowFollowup: false,

  startTour: (tourId) => set({
    tourActive: true,
    tourId,
    stepIndex: 0,
    tourMenuOpen: false,
    tourShowFollowup: false,
  }),

  nextStep: () => set((s) => {
    const tour = TOURS[s.tourId]
    if (!tour) return s
    const next = s.stepIndex + 1
    if (next >= tour.steps.length) {
      return s.tourId === 'core'
        ? { tourShowFollowup: true }
        : { tourActive: false, tourId: null, stepIndex: 0, tourShowFollowup: false }
    }
    return { stepIndex: next }
  }),

  prevStep: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),

  skipTour: () => set({
    tourActive: false,
    tourId: null,
    stepIndex: 0,
    tourMenuOpen: false,
    tourShowFollowup: false,
  }),

  goToStep: (i) => set({ stepIndex: i, tourShowFollowup: false }),

  toggleTourMenu: () => set((s) => ({ tourMenuOpen: !s.tourMenuOpen })),
  closeTourMenu: () => set({ tourMenuOpen: false }),
  dismissTourFollowup: () => set({ tourShowFollowup: false }),
})
