import { Group, Rect, Line, Text } from 'react-konva'
import { PIXELS_PER_METER } from './constants'

// 2D ghost of a staircase that arrives from the level below — drawn on the
// upper floor so you can see where the stairs land / their opening (the same
// footprint that's cut out of this floor in 3D). Dashed violet outline + a few
// tread lines + a label. Non-listening; purely a reference overlay.
const COLOR = '#a78bfa'

export default function StairArrivalGhost({ item, scale }) {
  const w = item.width * PIXELS_PER_METER
  const d = item.depth * PIXELS_PER_METER
  const sw = 1.5 / scale
  const treads = Math.max(3, Math.round(item.depth / 0.28)) // ~28 cm per tread

  const treadLines = []
  for (let i = 1; i < treads; i++) {
    const y = -d / 2 + (d / treads) * i
    treadLines.push(
      <Line key={i} points={[-w / 2, y, w / 2, y]} stroke={COLOR}
        strokeWidth={1 / scale} opacity={0.45} listening={false} />,
    )
  }

  return (
    <Group x={item.x} y={item.y} rotation={item.rotation} listening={false}>
      <Rect x={-w / 2} y={-d / 2} width={w} height={d}
        stroke={COLOR} strokeWidth={sw} dash={[6 / scale, 4 / scale]}
        fill="rgba(167,139,250,0.06)" />
      {treadLines}
      <Text text={`↑ ${item.label ?? 'stairs'}`}
        x={-w / 2} y={-d / 2 - 16 / scale} width={w} align="center"
        fontSize={11 / scale} fill={COLOR} listening={false} />
    </Group>
  )
}
