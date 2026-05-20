import { Line } from 'react-konva'

// Marks the active snap point near the cursor: a small outlined square for
// endpoints, an outlined diamond for midpoints. Counter-scaled so the marker
// stays a constant ~14 px on screen at any zoom. Cyan (#22d3ee) distinguishes
// the snap-in-progress from selection blue (#3b82f6).
export default function SnapIndicator({ point, scale }) {
  const r = 7 / scale
  const stroke = '#22d3ee'
  const sw = 1.5 / scale
  const shape =
    point.kind === 'endpoint'
      ? [point.x - r, point.y - r, point.x + r, point.y - r, point.x + r, point.y + r, point.x - r, point.y + r]
      : [point.x, point.y - r, point.x + r, point.y, point.x, point.y + r, point.x - r, point.y]
  return (
    <Line points={shape} closed stroke={stroke} strokeWidth={sw} fillEnabled={false} listening={false} />
  )
}
