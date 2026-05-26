import { useRef, useState, useEffect } from 'react'
import { computeTooltipPosition } from './tourPlacement'

const TOOLTIP_W = 320

// Arrow caret pointing from the tooltip toward the spotlight
function Arrow({ side, rect, tooltipX, tooltipY, tooltipH }) {
  if (side === 'center' || !rect) return null
  const size = 8
  const style = { position: 'absolute' }

  if (side === 'bottom') {
    const cx = rect.x + rect.width / 2
    style.top = -size
    style.left = clamp(cx - tooltipX - size, 8, TOOLTIP_W - 24)
    return <div style={{ ...style, borderLeft: `${size}px solid transparent`, borderRight: `${size}px solid transparent`, borderBottom: `${size}px solid #374151` }} />
  }
  if (side === 'top') {
    const cx = rect.x + rect.width / 2
    style.bottom = -size
    style.left = clamp(cx - tooltipX - size, 8, TOOLTIP_W - 24)
    return <div style={{ ...style, borderLeft: `${size}px solid transparent`, borderRight: `${size}px solid transparent`, borderTop: `${size}px solid #374151` }} />
  }
  if (side === 'right') {
    const cy = rect.y + rect.height / 2
    style.left = -size
    style.top = clamp(cy - tooltipY - size, 8, tooltipH - 24)
    return <div style={{ ...style, borderTop: `${size}px solid transparent`, borderBottom: `${size}px solid transparent`, borderRight: `${size}px solid #374151` }} />
  }
  if (side === 'left') {
    const cy = rect.y + rect.height / 2
    style.right = -size
    style.top = clamp(cy - tooltipY - size, 8, tooltipH - 24)
    return <div style={{ ...style, borderTop: `${size}px solid transparent`, borderBottom: `${size}px solid transparent`, borderLeft: `${size}px solid #374151` }} />
  }
  return null
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

export default function TourTooltip({
  step, rect, stepIndex, totalSteps,
  onPrev, onNext, onSkip, isLast, children,
}) {
  const cardRef = useRef(null)
  const [tooltipH, setTooltipH] = useState(180)

  useEffect(() => {
    if (cardRef.current) setTooltipH(cardRef.current.offsetHeight)
  })

  const { x, y, side } = computeTooltipPosition({
    rect,
    placement: step.placement,
    tooltipW: TOOLTIP_W,
    tooltipH,
  })

  return (
    <div
      ref={cardRef}
      className="fixed bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 text-gray-200 pointer-events-auto"
      style={{ left: x, top: y, width: TOOLTIP_W, zIndex: 'inherit' }}
    >
      <Arrow side={side} rect={rect} tooltipX={x} tooltipY={y} tooltipH={tooltipH} />

      <h3 className="text-sm font-semibold text-white mb-1">{step.title}</h3>
      <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap mb-3">{step.description}</p>

      {children}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500">{stepIndex + 1} / {totalSteps}</span>
          <button
            type="button"
            onClick={onSkip}
            className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            Skip tour
          </button>
        </div>
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={onPrev}
              className="text-xs px-3 py-1 rounded border border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500 transition-colors"
            >
              ← Back
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="text-xs px-3 py-1 rounded bg-blue-600 border border-blue-500 text-white hover:bg-blue-500 transition-colors"
          >
            {isLast ? 'Finish' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
