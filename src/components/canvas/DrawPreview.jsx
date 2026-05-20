import { Line, Circle } from 'react-konva'
import DimensionLabel from './DimensionLabel'
import { WALL_THICKNESS } from './constants'

// The dashed-blue preview wall + start/end dots + live dimension label
// shown while the user is mid-draw. Strokes/markers are counter-scaled so
// they stay visually constant at any zoom.
export default function DrawPreview({ start, end, scale }) {
  return (
    <>
      <Line points={[start.x, start.y, end.x, end.y]}
        stroke="#3b82f6" strokeWidth={WALL_THICKNESS}
        dash={[10 / scale, 6 / scale]} lineCap="square" listening={false} />
      <Circle x={start.x} y={start.y} radius={5 / scale} fill="#3b82f6" listening={false} />
      <Circle x={end.x} y={end.y} radius={5 / scale} fill="#3b82f6" listening={false} />
      <DimensionLabel x1={start.x} y1={start.y} x2={end.x} y2={end.y} scale={scale} />
    </>
  )
}
