import { Group, Rect, Text } from 'react-konva'
import { formatMeters } from './constants'

export default function DimensionLabel({ x1, y1, x2, y2, scale = 1 }) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len < 1) return null

  const mid = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
  const label = formatMeters(len)
  const fontSize = 14 / scale
  const padX = 6 / scale
  const padY = 3 / scale
  const w = label.length * fontSize * 0.6 + padX * 2
  const h = fontSize + padY * 2
  const offset = 18 / scale
  const normal = { x: -dy / len, y: dx / len }
  const cx = mid.x + normal.x * offset
  const cy = mid.y + normal.y * offset

  return (
    <Group listening={false} x={cx - w / 2} y={cy - h / 2}>
      <Rect
        width={w}
        height={h}
        fill="rgba(17, 24, 39, 0.92)"
        stroke="#3b82f6"
        strokeWidth={1 / scale}
        cornerRadius={3 / scale}
      />
      <Text
        text={label}
        fontSize={fontSize}
        fill="#f3f4f6"
        width={w}
        height={h}
        align="center"
        verticalAlign="middle"
      />
    </Group>
  )
}
