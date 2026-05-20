import { Group, Line } from 'react-konva'
import { GRID_SIZE, WORLD_HALF } from './constants'

export default function Grid() {
  const lines = []
  const minor = '#1f2937'
  const major = '#374151'
  const axis = '#4b5563'

  for (let x = -WORLD_HALF; x <= WORLD_HALF; x += GRID_SIZE) {
    const isMajor = x % (GRID_SIZE * 5) === 0
    lines.push(
      <Line
        key={`v${x}`}
        points={[x, -WORLD_HALF, x, WORLD_HALF]}
        stroke={x === 0 ? axis : isMajor ? major : minor}
        strokeWidth={x === 0 ? 1.5 : isMajor ? 1 : 0.5}
        listening={false}
      />,
    )
  }
  for (let y = -WORLD_HALF; y <= WORLD_HALF; y += GRID_SIZE) {
    const isMajor = y % (GRID_SIZE * 5) === 0
    lines.push(
      <Line
        key={`h${y}`}
        points={[-WORLD_HALF, y, WORLD_HALF, y]}
        stroke={y === 0 ? axis : isMajor ? major : minor}
        strokeWidth={y === 0 ? 1.5 : isMajor ? 1 : 0.5}
        listening={false}
      />,
    )
  }

  return <Group listening={false}>{lines}</Group>
}
