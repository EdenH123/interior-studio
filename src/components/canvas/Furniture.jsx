import { Group, Rect, Text, Line } from 'react-konva'
import { PIXELS_PER_METER } from './constants'
import { furnitureColorFor } from './furnitureMaterials'

const SELECTION_COLOR = '#3b82f6'

export default function Furniture({ item, selected, scale, onSelect, onDragEnd, onContextMenu }) {
  const w = item.width * PIXELS_PER_METER
  const d = item.depth * PIXELS_PER_METER
  const fill = furnitureColorFor(item)
  const stroke = selected ? SELECTION_COLOR : '#0f172a'
  const strokeWidth = selected ? 2 / scale : 1 / scale
  const fontSize = 11 / scale

  return (
    <Group
      x={item.x}
      y={item.y}
      rotation={item.rotation}
      draggable
      onDragEnd={(e) => {
        onDragEnd?.(item.id, { x: e.target.x(), y: e.target.y() })
      }}
      onMouseDown={(e) => {
        if (e.evt.button === 0) {
          e.cancelBubble = true
          onSelect?.(item.id)
        }
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault()
        e.cancelBubble = true
        onContextMenu?.(item.id)
      }}
    >
      <Rect
        x={-w / 2}
        y={-d / 2}
        width={w}
        height={d}
        fill={fill}
        opacity={0.85}
        stroke={stroke}
        strokeWidth={strokeWidth}
        cornerRadius={3 / scale}
      />
      {/* Front-edge tick so rotation is visible */}
      <Line
        points={[-w / 2 + 4 / scale, d / 2 - 4 / scale, w / 2 - 4 / scale, d / 2 - 4 / scale]}
        stroke="#f8fafc"
        strokeWidth={1.5 / scale}
        opacity={0.6}
        listening={false}
      />
      <Text
        text={item.type}
        fontSize={fontSize}
        fill="#f8fafc"
        x={-w / 2}
        y={-fontSize / 2}
        width={w}
        align="center"
        listening={false}
      />
    </Group>
  )
}
