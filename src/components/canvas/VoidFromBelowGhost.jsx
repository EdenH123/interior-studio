import { Group, Line, Text } from 'react-konva'

// 2D ghost of a void on the level directly below — drawn on the upper floor
// so you can see where the slab is cut and the space below opens up here
// (the same hole that's actually cut in 3D). Dashed purple outline + label.
const COLOR = '#a78bfa'

export default function VoidFromBelowGhost({ item, scale }) {
  const v = item.verts
  if (!v || v.length < 3) return null
  const pts = v.flatMap((p) => [p.x, p.y])
  // Centroid for the label.
  const n = v.length
  const cx = v.reduce((s, p) => s + p.x, 0) / n
  const cy = v.reduce((s, p) => s + p.y, 0) / n
  return (
    <Group listening={false}>
      <Line points={pts} closed
        stroke={COLOR} strokeWidth={1.5 / scale}
        dash={[6 / scale, 4 / scale]}
        fill="rgba(167,139,250,0.06)" />
      <Text text={`↓ ${item.name || 'open below'}`}
        x={cx - 80} y={cy - 7 / scale} width={160} align="center"
        fontSize={11 / scale} fill={COLOR} />
    </Group>
  )
}
