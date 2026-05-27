import { Line, Circle } from 'react-konva'
import WallLengthLabel from './WallLengthLabel'

// The in-progress polygon while drawing (Area / Pool tools): committed
// segments, a dashed segment to the cursor, a translucent fill once it can
// close, and vertex dots. The first vertex turns cyan when clicking it would
// close the loop (≥3 points). Everything is non-listening so clicks reach the
// stage's point handler. Colors default to the area (lime) palette; pools pass
// a water-blue palette.
export default function AreaDraftPreview({
  draft, cursor, scale,
  fill = 'rgba(132,204,22,0.14)', stroke = '#84cc16', dotStroke = '#65a30d',
}) {
  if (!draft || draft.length === 0) return null
  const pts = draft.flatMap((p) => [p.x, p.y])
  const last = draft[draft.length - 1]
  const closeable = draft.length >= 3
  return (
    <>
      {closeable && (
        <Line points={pts} closed fill={fill} listening={false} />
      )}
      <Line points={pts} stroke={stroke} strokeWidth={2 / scale}
        dash={[6 / scale, 4 / scale]} listening={false} />
      {cursor && (
        <Line points={[last.x, last.y, cursor.x, cursor.y]} stroke={stroke}
          strokeWidth={1.5 / scale} dash={[4 / scale, 4 / scale]} opacity={0.6} listening={false} />
      )}
      {draft.map((p, i) => (
        <Circle key={i} x={p.x} y={p.y} radius={(i === 0 ? 5 : 3.5) / scale}
          fill={i === 0 && closeable ? '#22d3ee' : '#ffffff'}
          stroke={dotStroke} strokeWidth={1.5 / scale} listening={false} />
      ))}
      {/* Live per-side meter labels, like walls */}
      {draft.slice(1).map((p, i) => (
        <WallLengthLabel key={`seg-${i}`}
          wall={{ x1: draft[i].x, y1: draft[i].y, x2: p.x, y2: p.y }} scale={scale} />
      ))}
      {cursor && (
        <WallLengthLabel wall={{ x1: last.x, y1: last.y, x2: cursor.x, y2: cursor.y }} scale={scale} />
      )}
    </>
  )
}
