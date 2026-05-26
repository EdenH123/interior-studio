// Pure positioning math for the tooltip card.
// Returns { x, y, side } in viewport coordinates.

const ARROW_SIZE = 8   // px, half-size of the caret
const MARGIN = 12      // min distance from viewport edge

export function computeTooltipPosition({ rect, placement, tooltipW, tooltipH }) {
  const vw = window.innerWidth
  const vh = window.innerHeight

  if (!rect || placement === 'center') {
    return {
      x: vw / 2 - tooltipW / 2,
      y: vh / 2 - tooltipH / 2,
      side: 'center',
    }
  }

  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2

  // Space available on each side
  const space = {
    top:    rect.y,
    bottom: vh - (rect.y + rect.height),
    left:   rect.x,
    right:  vw - (rect.x + rect.width),
  }

  let side = placement
  if (placement === 'auto') {
    // Pick the side with most room that can fit the tooltip
    const fits = (s) => {
      if (s === 'top' || s === 'bottom') return space[s] >= tooltipH + ARROW_SIZE + MARGIN
      return space[s] >= tooltipW + ARROW_SIZE + MARGIN
    }
    const candidates = ['bottom', 'top', 'right', 'left']
    side = candidates.find(fits) ?? 'bottom'
  }

  let x, y
  const gap = ARROW_SIZE + 6

  if (side === 'bottom') {
    x = clamp(cx - tooltipW / 2, MARGIN, vw - tooltipW - MARGIN)
    y = rect.y + rect.height + gap
  } else if (side === 'top') {
    x = clamp(cx - tooltipW / 2, MARGIN, vw - tooltipW - MARGIN)
    y = rect.y - tooltipH - gap
  } else if (side === 'right') {
    x = rect.x + rect.width + gap
    y = clamp(cy - tooltipH / 2, MARGIN, vh - tooltipH - MARGIN)
  } else { // left
    x = rect.x - tooltipW - gap
    y = clamp(cy - tooltipH / 2, MARGIN, vh - tooltipH - MARGIN)
  }

  // Final viewport clamp
  x = clamp(x, MARGIN, vw - tooltipW - MARGIN)
  y = clamp(y, MARGIN, vh - tooltipH - MARGIN)

  return { x, y, side }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}
