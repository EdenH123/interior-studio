import { Group, Line, Rect, Circle } from 'react-konva'
import { WORLD_HALF, PIXELS_PER_METER, formatMeters } from './constants'

const COLOR = '#22d3ee'

// Renders the two visible bits of calibration: an invisible full-canvas
// capture rect that collects clicks no matter what shape they land on, plus
// the cyan markers for any points placed so far. Lives in the topmost layer
// so it sits above everything else, even when shapes overlap.
export default function CalibrationOverlay({ calibration, scale, onPlace }) {
  if (!calibration) return null
  const r = 8 / scale
  return (
    <Group>
      <Rect
        x={-WORLD_HALF}
        y={-WORLD_HALF}
        width={WORLD_HALF * 2}
        height={WORLD_HALF * 2}
        fill="rgba(0, 0, 0, 0.001)" // listenable, effectively invisible
        onMouseDown={(e) => {
          if (e.evt.button !== 0) return
          e.cancelBubble = true
          const stage = e.target.getStage()
          const p = stage?.getRelativePointerPosition()
          if (p) onPlace?.(p)
        }}
      />
      {calibration.p1 && <Marker p={calibration.p1} r={r} scale={scale} />}
      {calibration.p2 && <Marker p={calibration.p2} r={r} scale={scale} />}
      {calibration.p1 && calibration.p2 && (
        <Line
          points={[calibration.p1.x, calibration.p1.y, calibration.p2.x, calibration.p2.y]}
          stroke={COLOR}
          strokeWidth={1.5 / scale}
          dash={[8 / scale, 4 / scale]}
          listening={false}
        />
      )}
    </Group>
  )
}

function Marker({ p, r, scale }) {
  const sw = 1.5 / scale
  return (
    <Group listening={false}>
      <Circle x={p.x} y={p.y} radius={r} stroke={COLOR} strokeWidth={sw} fillEnabled={false} />
      <Line points={[p.x - r, p.y, p.x + r, p.y]} stroke={COLOR} strokeWidth={sw} />
      <Line points={[p.x, p.y - r, p.x, p.y + r]} stroke={COLOR} strokeWidth={sw} />
    </Group>
  )
}

// Reusable helper exported for the HTML prompt component.
export function pixelDistanceMeters(p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y) / PIXELS_PER_METER
}

export { formatMeters }
