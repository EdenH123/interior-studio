// Full-screen SVG overlay. Dims everything except the target rect cutout.
// Uses an SVG mask so the cutout has rounded corners without seams.
export default function TourSpotlight({ rect, padding = 8, radius = 8 }) {
  const w = window.innerWidth
  const h = window.innerHeight

  // No cutout — just full dim
  if (!rect) {
    return (
      <svg
        className="fixed inset-0 pointer-events-auto"
        style={{ zIndex: 'inherit' }}
        width={w} height={h}
      >
        <rect width={w} height={h} fill="rgba(0,0,0,0.65)" />
      </svg>
    )
  }

  const cx = rect.x - padding
  const cy = rect.y - padding
  const cw = rect.width + padding * 2
  const ch = rect.height + padding * 2

  return (
    <svg
      className="fixed inset-0 pointer-events-auto"
      style={{ zIndex: 'inherit' }}
      width={w} height={h}
    >
      <defs>
        <mask id="tour-mask">
          <rect width={w} height={h} fill="white" />
          <rect x={cx} y={cy} width={cw} height={ch} rx={radius} ry={radius} fill="black" />
        </mask>
      </defs>
      {/* Dimming layer with cutout */}
      <rect width={w} height={h} fill="rgba(0,0,0,0.65)" mask="url(#tour-mask)" />
      {/* Blue outline around the spotlight */}
      <rect
        x={cx - 1} y={cy - 1} width={cw + 2} height={ch + 2}
        rx={radius + 1} ry={radius + 1}
        fill="none" stroke="#3b82f6" strokeWidth={2} opacity={0.8}
      />
    </svg>
  )
}
