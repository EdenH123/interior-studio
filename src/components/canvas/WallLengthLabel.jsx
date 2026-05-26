import { Text } from 'react-konva'
import { formatMeters, PIXELS_PER_METER } from './constants'

const MIN_VISIBLE_PX = PIXELS_PER_METER * 0.3   // hide labels on walls shorter than 0.3 m

export default function WallLengthLabel({ wall, scale }) {
  const dx = wall.x2 - wall.x1
  const dy = wall.y2 - wall.y1
  const len = Math.hypot(dx, dy)
  if (len < MIN_VISIBLE_PX) return null

  const mx = (wall.x1 + wall.x2) / 2
  const my = (wall.y1 + wall.y2) / 2

  // Angle of the wall; flip 180° if it would render the text upside-down
  // so labels stay readable regardless of draw direction.
  const angleRad = Math.atan2(dy, dx)
  let angleDeg = (angleRad * 180) / Math.PI
  let flipped = false
  if (angleDeg > 90 || angleDeg < -90) { angleDeg += 180; flipped = true }

  // Offset perpendicular to the wall, on the side opposite to where the
  // text would otherwise sit on top of the wall stroke.
  const perp = flipped ? angleRad + Math.PI / 2 : angleRad - Math.PI / 2
  const offsetPx = 14 / scale
  const ox = Math.cos(perp) * offsetPx
  const oy = Math.sin(perp) * offsetPx

  const fontSize = 11 / scale
  const boxWidth = 80 / scale

  return (
    <Text
      x={mx + ox}
      y={my + oy}
      text={formatMeters(len)}
      fontSize={fontSize}
      fill="#9ca3af"
      align="center"
      width={boxWidth}
      offsetX={boxWidth / 2}
      offsetY={fontSize / 2}
      rotation={angleDeg}
      listening={false}
    />
  )
}
