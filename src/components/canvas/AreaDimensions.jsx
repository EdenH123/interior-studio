import WallLengthLabel from './WallLengthLabel'

// Floating per-side length labels for an outdoor area — one "X.XX m" chip on
// each polygon edge, exactly like walls. Each edge is fed to WallLengthLabel
// as a {x1,y1,x2,y2} segment so the formatting / perpendicular offset / flip
// logic is shared.
export default function AreaDimensions({ area, scale }) {
  const v = area.verts
  if (!v || v.length < 2) return null
  return v.map((p, i) => {
    const q = v[(i + 1) % v.length]
    return (
      <WallLengthLabel
        key={`${area.id}-edge-${i}`}
        wall={{ x1: p.x, y1: p.y, x2: q.x, y2: q.y }}
        scale={scale}
      />
    )
  })
}
