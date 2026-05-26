import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import useStore from '../../store/useStore'
import { TOURS, OPTIONAL_TOUR_IDS } from './tourSteps'
import { useTargetRect } from './useTargetRect'
import TourSpotlight from './TourSpotlight'
import TourTooltip from './TourTooltip'

// Inline "take another tour?" card shown after the core tour finishes
function FollowupCard({ onStart, onClose }) {
  return (
    <div className="mt-3 border-t border-gray-700 pt-3">
      <p className="text-[11px] text-gray-400 mb-2">Want to explore more?</p>
      <div className="flex flex-col gap-1">
        {OPTIONAL_TOUR_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onStart(id)}
            className="text-left text-xs px-2 py-1.5 rounded border border-gray-700 bg-gray-800 text-gray-300 hover:border-blue-500 hover:text-white transition-colors"
          >
            {TOURS[id].label}
            <span className="text-gray-500 ml-1 text-[10px]">— {TOURS[id].description}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
      >
        Close
      </button>
    </div>
  )
}

// Missing-target fallback card shown when a step's selector finds nothing
function MissingCard({ step, onNext, onSkip }) {
  const toggle3d = useStore((s) => s.toggle3d)
  const toggleAiPanel = useStore((s) => s.toggleAiPanel)

  const autoFixActions = { toggle3d, toggleAiPanel }
  const fix = step.prerequisite?.autoFix ? autoFixActions[step.prerequisite.autoFix] : null

  return (
    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
      w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4
      pointer-events-auto"
      style={{ zIndex: 'inherit' }}
    >
      <p className="text-xs text-gray-400 mb-3">
        {step.prerequisite?.message ?? 'This element is not visible right now.'}
      </p>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onSkip} className="text-xs text-gray-500 hover:text-gray-300">Skip tour</button>
        {fix && (
          <button
            type="button"
            onClick={fix}
            className="text-xs px-3 py-1 rounded border border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-400"
          >
            {step.prerequisite.autoFix === 'toggle3d' ? 'Switch to 3D' : 'Open panel'}
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          className="text-xs px-3 py-1 rounded bg-blue-600 border border-blue-500 text-white hover:bg-blue-500"
        >
          Next →
        </button>
      </div>
    </div>
  )
}

const WELCOMED_KEY = 'interior-studio:welcomed'

export default function TourOverlay() {
  const tourActive      = useStore((s) => s.tourActive)
  const tourId          = useStore((s) => s.tourId)
  const stepIndex       = useStore((s) => s.stepIndex)
  const tourShowFollowup = useStore((s) => s.tourShowFollowup)
  const nextStep        = useStore((s) => s.nextStep)
  const prevStep        = useStore((s) => s.prevStep)
  const skipTour        = useStore((s) => s.skipTour)
  const startTour       = useStore((s) => s.startTour)

  const tour = tourActive ? TOURS[tourId] : null
  const step = tour ? tour.steps[stepIndex] : null
  const isLast = tour ? stepIndex === tour.steps.length - 1 : false

  const { rect, missing } = useTargetRect(step?.target ?? null)

  // Auto-launch the core tour on first ever visit when canvas is empty.
  // Uses a separate localStorage flag so it doesn't interfere with undo/persist.
  useEffect(() => {
    try {
      if (!localStorage.getItem(WELCOMED_KEY) && useStore.getState().walls.length === 0) {
        localStorage.setItem(WELCOMED_KEY, '1')
        startTour('core')
      }
    } catch {
      // localStorage unavailable (private browsing, etc.) — skip auto-launch
    }
  }, [startTour])

  // Keyboard navigation
  useEffect(() => {
    if (!tourActive) return
    const onKey = (e) => {
      if (e.key === 'Escape') skipTour()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') nextStep()
      else if (e.key === 'ArrowLeft') prevStep()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [tourActive, nextStep, prevStep, skipTour])

  if (!tourActive || !step) return null

  const showFollowupCard = tourShowFollowup && isLast && tourId === 'core'
  const noSpotlight = !step.target || step.placement === 'center'
  const spotlightRect = noSpotlight ? null : (missing ? null : rect)

  const overlay = (
    <div className="fixed inset-0" style={{ zIndex: 100, pointerEvents: 'none' }}>
      <TourSpotlight rect={spotlightRect} padding={step.padding ?? 8} />
      {missing && !noSpotlight
        ? (
          <MissingCard step={step} onNext={nextStep} onSkip={skipTour} />
        ) : (
          <TourTooltip
            step={step}
            rect={noSpotlight ? null : rect}
            stepIndex={stepIndex}
            totalSteps={tour.steps.length}
            onPrev={prevStep}
            onNext={nextStep}
            onSkip={skipTour}
            isLast={isLast}
          >
            {showFollowupCard && (
              <FollowupCard
                onStart={(id) => startTour(id)}
                onClose={skipTour}
              />
            )}
          </TourTooltip>
        )
      }
    </div>
  )

  return createPortal(overlay, document.body)
}
