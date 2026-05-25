import { Group, Line, Path, Rect } from 'react-konva'

// All glyph components are rendered inside an Opening's rotated Group, so
// coordinates are in wall-local space: X is along the wall, Y is perpendicular
// (positive away from the room). widthPx is the opening footprint in pixels.

export function DoorGlyph({ widthPx, scale, selected, swingDir = 'left', openSide = 'front' }) {
  const half = widthPx / 2
  const stroke = selected ? '#3b82f6' : '#e5e7eb'
  const jamb = selected ? 2 / scale : 1.5 / scale
  const right = swingDir === 'right'
  const flip = openSide === 'back'
  // Panel extends toward front (-Y) or back (+Y) of wall
  const panelX = right ? half : -half
  const panelY = flip ? widthPx : -widthPx
  // Arc from opposite jamb sweeps to panel tip; sweep flag inverts with flip
  const arcData = right
    ? `M ${-half} 0 A ${widthPx} ${widthPx} 0 0 ${flip ? 0 : 1} ${half} ${panelY}`
    : `M ${half} 0 A ${widthPx} ${widthPx} 0 0 ${flip ? 1 : 0} ${-half} ${panelY}`
  return (
    <Group listening={false}>
      <Line points={[-half, -4 / scale, -half, 4 / scale]} stroke={stroke} strokeWidth={jamb} />
      <Line points={[half, -4 / scale, half, 4 / scale]} stroke={stroke} strokeWidth={jamb} />
      <Line points={[panelX, 0, panelX, panelY]} stroke={stroke} strokeWidth={jamb} />
      <Path data={arcData} stroke={stroke} strokeWidth={1 / scale} opacity={0.6} fill="" />
    </Group>
  )
}

export function DoubleDoorGlyph({ widthPx, scale, selected }) {
  const half = widthPx / 2
  const qtr = widthPx / 4
  const stroke = selected ? '#3b82f6' : '#e5e7eb'
  const sw = selected ? 2 / scale : 1.5 / scale
  const arcL = `M ${-half} 0 A ${qtr * 2} ${qtr * 2} 0 0 0 ${-half + qtr * 2} ${-qtr * 2}`
  const arcR = `M ${half} 0 A ${qtr * 2} ${qtr * 2} 0 0 1 ${half - qtr * 2} ${-qtr * 2}`
  return (
    <Group listening={false}>
      <Line points={[-half, -4 / scale, -half, 4 / scale]} stroke={stroke} strokeWidth={sw} />
      <Line points={[half, -4 / scale, half, 4 / scale]} stroke={stroke} strokeWidth={sw} />
      <Line points={[0, -4 / scale, 0, 4 / scale]} stroke={stroke} strokeWidth={sw * 0.6} />
      <Line points={[-half, 0, -half + qtr * 2, -qtr * 2]} stroke={stroke} strokeWidth={sw} />
      <Line points={[half, 0, half - qtr * 2, -qtr * 2]} stroke={stroke} strokeWidth={sw} />
      <Path data={arcL} stroke={stroke} strokeWidth={1 / scale} opacity={0.5} fill="" />
      <Path data={arcR} stroke={stroke} strokeWidth={1 / scale} opacity={0.5} fill="" />
    </Group>
  )
}

export function SlidingDoorGlyph({ widthPx, scale, selected }) {
  const half = widthPx / 2
  const stroke = selected ? '#3b82f6' : '#e5e7eb'
  const sw = selected ? 2 / scale : 1.5 / scale
  const arrow = 8 / scale
  return (
    <Group listening={false}>
      <Line points={[-half, -4 / scale, -half, 4 / scale]} stroke={stroke} strokeWidth={sw} />
      <Line points={[half, -4 / scale, half, 4 / scale]} stroke={stroke} strokeWidth={sw} />
      <Rect
        x={0} y={-5 / scale}
        width={half} height={10 / scale}
        stroke={stroke} strokeWidth={1.5 / scale}
        fill="rgba(255,255,255,0.06)"
      />
      <Line
        points={[-half + arrow, 0, half - arrow, 0]}
        stroke={stroke} strokeWidth={1 / scale}
        opacity={0.6}
      />
      <Line
        points={[half - arrow, 0, half - arrow * 2, -arrow * 0.6, half - arrow * 2, arrow * 0.6, half - arrow, 0]}
        closed fill={stroke} opacity={0.6}
      />
    </Group>
  )
}

export function WindowGlyph({ widthPx, scale, selected }) {
  const half = widthPx / 2
  const stroke = selected ? '#3b82f6' : '#a5b4fc'
  const sw = 1.5 / scale
  const offset = 4 / scale
  return (
    <Group listening={false}>
      <Line points={[-half, -offset, -half, offset]} stroke={stroke} strokeWidth={sw} />
      <Line points={[half, -offset, half, offset]} stroke={stroke} strokeWidth={sw} />
      <Line points={[-half, -offset / 2, half, -offset / 2]} stroke={stroke} strokeWidth={sw} />
      <Line points={[-half, offset / 2, half, offset / 2]} stroke={stroke} strokeWidth={sw} />
    </Group>
  )
}

export function FixedWindowGlyph({ widthPx, scale, selected }) {
  const half = widthPx / 2
  const stroke = selected ? '#3b82f6' : '#a5b4fc'
  const sw = 1.5 / scale
  const offset = 5 / scale
  return (
    <Group listening={false}>
      <Line points={[-half, -offset, -half, offset]} stroke={stroke} strokeWidth={sw} />
      <Line points={[half, -offset, half, offset]} stroke={stroke} strokeWidth={sw} />
      <Line points={[-half, -offset, half, -offset]} stroke={stroke} strokeWidth={sw} />
      <Line points={[-half, offset, half, offset]} stroke={stroke} strokeWidth={sw} />
      <Line points={[0, -offset, 0, offset]} stroke={stroke} strokeWidth={sw * 0.7} opacity={0.7} />
    </Group>
  )
}

export function CasementGlyph({ widthPx, scale, selected }) {
  const half = widthPx / 2
  const stroke = selected ? '#3b82f6' : '#a5b4fc'
  const sw = 1.5 / scale
  const offset = 5 / scale
  return (
    <Group listening={false}>
      <Line points={[-half, -offset, -half, offset]} stroke={stroke} strokeWidth={sw} />
      <Line points={[half, -offset, half, offset]} stroke={stroke} strokeWidth={sw} />
      <Line points={[-half, -offset, half, -offset]} stroke={stroke} strokeWidth={sw} />
      <Line points={[-half, offset, half, offset]} stroke={stroke} strokeWidth={sw} />
      <Line points={[-half, offset, half, -offset]} stroke={stroke} strokeWidth={sw * 0.6} opacity={0.8} />
    </Group>
  )
}

export function ArchedWindowGlyph({ widthPx, scale, selected }) {
  const half = widthPx / 2
  const stroke = selected ? '#3b82f6' : '#a5b4fc'
  const sw = 1.5 / scale
  const offset = 5 / scale
  const archData = `M ${-half} ${-offset} A ${half} ${half} 0 0 1 ${half} ${-offset}`
  return (
    <Group listening={false}>
      <Line points={[-half, -offset, -half, offset]} stroke={stroke} strokeWidth={sw} />
      <Line points={[half, -offset, half, offset]} stroke={stroke} strokeWidth={sw} />
      <Line points={[-half, offset, half, offset]} stroke={stroke} strokeWidth={sw} />
      <Path data={archData} stroke={stroke} strokeWidth={sw} fill="" />
      <Line points={[-half, -offset, half, -offset]} stroke={stroke} strokeWidth={sw * 0.4} opacity={0.4} />
    </Group>
  )
}
