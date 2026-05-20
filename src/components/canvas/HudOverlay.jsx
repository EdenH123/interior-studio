import { formatMeters } from './constants'

// Small floating chips shown over the 2D canvas: zoom % and cursor coords
// in meters (bottom-left) and a context-sensitive hint (bottom-right).
export default function HudOverlay({ view, cursor, drawing, spaceDown, selection, calibration }) {
  const hint = spaceDown
    ? 'pan'
    : calibration
      ? !calibration.p1
        ? 'click first calibration point · esc to cancel'
        : !calibration.p2
          ? 'click second calibration point · esc to cancel'
          : 'enter real distance to apply'
      : drawing
        ? 'click to extend · click same point or esc to end chain'
        : selection?.kind === 'furniture'
          ? 'drag to move · R/Shift+R rotate · del to remove'
          : selection?.kind === 'wall'
            ? 'del to remove wall'
            : selection?.kind === 'opening'
              ? 'drag along wall to reposition · edit size on the right · del to remove'
            : selection?.kind === 'room'
              ? 'edit name + floor material on the right'
              : selection?.kind === 'underlay'
                ? 'underlay selected · adjust on the right · drag to move (unlocked only)'
                : 'drag furniture from sidebar · click to start wall · right-click wall to delete · space+drag pan · wheel zoom'
  return (
    <div className="pointer-events-none absolute inset-0 text-[11px] text-gray-400 font-mono">
      <div className="absolute bottom-2 left-2 bg-gray-900/80 border border-gray-700 rounded px-2 py-1">
        zoom {(view.scale * 100).toFixed(0)}%
        {cursor && <> · {formatMeters(cursor.x)}, {formatMeters(cursor.y)}</>}
      </div>
      <div className="absolute bottom-2 right-2 bg-gray-900/80 border border-gray-700 rounded px-2 py-1">{hint}</div>
    </div>
  )
}
