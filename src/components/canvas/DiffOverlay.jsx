import { Group, Line, Rect } from 'react-konva'
import { PIXELS_PER_METER, WALL_THICKNESS } from './constants'

// Visual diff for an active AI proposal. Painted as a separate Konva
// layer (or part of one) over the regular walls + furniture rendering.
//
// Colour key (matches the AI proposal card chips):
//   • green  — additions (rendered as ghosts where they'd land)
//   • amber  — modifications (highlighted on the existing item)
//   • red    — removals (highlighted on the existing item)
//
// listening={false} everywhere — the overlay is informational; clicks
// must continue to reach the underlying walls/furniture/rooms.
const ADD = '#22c55e'    // green-500
const MOD = '#f59e0b'    // amber-500
const REM = '#ef4444'    // red-500

export default function DiffOverlay({ diff, scale }) {
  if (!diff) return null
  const lw = Math.max(2, WALL_THICKNESS) / scale
  const fw = 2.5 / scale
  const dash = [10 / scale, 6 / scale]

  return (
    <Group listening={false}>
      {/* Removed walls */}
      {diff.walls.removed.map((w) => (
        <Line key={`wrem-${w.id}`} points={[w.x1, w.y1, w.x2, w.y2]}
          stroke={REM} strokeWidth={lw} lineCap="square" opacity={0.7} dash={dash} />
      ))}
      {/* Modified walls (highlight current geometry; new geometry will appear after apply) */}
      {diff.walls.modified.map((w) => (
        <Line key={`wmod-${w.id}`} points={[w.x1, w.y1, w.x2, w.y2]}
          stroke={MOD} strokeWidth={lw} lineCap="square" opacity={0.7} />
      ))}
      {/* Added walls — ghost in their proposed location */}
      {diff.walls.added.map((w) => (
        <Line key={`wadd-${w.id}`} points={[w.x1, w.y1, w.x2, w.y2]}
          stroke={ADD} strokeWidth={lw} lineCap="square" opacity={0.85} dash={dash} />
      ))}

      {/* Furniture footprints — rectangles centred on item position */}
      {diff.furniture.removed.map((f) => (
        <FurnFootprint key={`frem-${f.id}`} f={f} stroke={REM} dash={dash} sw={fw} />
      ))}
      {diff.furniture.modified.map((f) => (
        <FurnFootprint key={`fmod-${f.id}`} f={f} stroke={MOD} sw={fw} />
      ))}
      {diff.furniture.added.map((f) => (
        <FurnFootprint key={`fadd-${f.id}`} f={f} stroke={ADD} fill={`${ADD}33`} dash={dash} sw={fw} />
      ))}
    </Group>
  )
}

function FurnFootprint({ f, stroke, fill, dash, sw }) {
  const w = f.width * PIXELS_PER_METER
  const d = f.depth * PIXELS_PER_METER
  // `offsetX`/`offsetY` set the rotation pivot at the rect's centre so
  // rotation rotates around (f.x, f.y) — same convention as Furniture.jsx.
  return (
    <Rect
      x={f.x} y={f.y}
      width={w} height={d}
      offsetX={w / 2} offsetY={d / 2}
      rotation={f.rotation ?? 0}
      stroke={stroke} strokeWidth={sw} fill={fill} dash={dash}
      listening={false}
    />
  )
}
