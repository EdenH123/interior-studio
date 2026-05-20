import { Group, Line } from 'react-konva'
import { WALL_THICKNESS } from './constants'
import { wallColorFor } from './wallMaterials'

// A wall is drawn as one Konva Line by default, or as N+1 segments around
// any openings on it. The caller (CanvasArea) computes segments via
// `wallSegmentsForRendering` and passes them in — Wall.jsx stays unaware
// of openings beyond knowing how to draw a list of segments.
//
// Selection + delete handlers live on the Group so clicks on any segment
// of the wall behave identically.
export default function Wall({ wall, segments, onContextMenu, onClick, selected }) {
  const stroke = selected ? '#3b82f6' : wallColorFor(wall)
  const sw = WALL_THICKNESS
  const hit = Math.max(WALL_THICKNESS, 16)

  // Single-segment fast path keeps the simple-wall render unchanged from
  // the pre-openings build — same hit area, same stroke params.
  const segs = segments && segments.length > 0
    ? segments
    : [{ x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2 }]

  return (
    <Group
      onContextMenu={(e) => { e.evt.preventDefault(); onContextMenu?.(wall.id) }}
      onClick={(e) => { if (e.evt.button === 0) onClick?.(wall.id) }}
    >
      {segs.map((s, i) => (
        <Line
          key={i}
          points={[s.x1, s.y1, s.x2, s.y2]}
          stroke={stroke} strokeWidth={sw} lineCap="square"
          hitStrokeWidth={hit}
        />
      ))}
    </Group>
  )
}
