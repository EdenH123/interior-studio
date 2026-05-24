import { Line, Circle, Text } from 'react-konva'
import DimensionLabel from './DimensionLabel'
import { WALL_THICKNESS } from './constants'

// The dashed-blue preview wall + start/end dots + live dimension label
// shown while the user is mid-draw. Strokes/markers are counter-scaled so
// they stay visually constant at any zoom. An angle readout (cyan) shows the
// current wall direction in degrees.
export default function DrawPreview({ start, end, scale }) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const angleDeg = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360)
  const mx = (start.x + end.x) / 2
  const my = (start.y + end.y) / 2

  return (
    <>
      <Line points={[start.x, start.y, end.x, end.y]}
        stroke="#3b82f6" strokeWidth={WALL_THICKNESS}
        dash={[10 / scale, 6 / scale]} lineCap="square" listening={false} />
      <Circle x={start.x} y={start.y} radius={5 / scale} fill="#3b82f6" listening={false} />
      <Circle x={end.x} y={end.y} radius={5 / scale} fill="#3b82f6" listening={false} />
      <DimensionLabel x1={start.x} y1={start.y} x2={end.x} y2={end.y} scale={scale} />
      <Text
        x={mx} y={my + 18 / scale}
        text={`${angleDeg}°`}
        fontSize={11 / scale}
        fill="#22d3ee"
        align="center"
        offsetX={12 / scale}
        listening={false}
      />
    </>
  )
}
