import { Group, Line, Text } from 'react-konva'
import useStore from '../../store/useStore'

// Renders one detected room. The polygon's fill is driven by the assigned
// floor material (or a default tint when none is set). `listening` toggles
// click selection — the parent passes `false` while the user is mid-draw so
// rooms don't swallow chain-extending clicks.
//
// onMouseDown does NOT cancel bubbling so clicks inside the room also reach
// the Stage's wall-drawing handler (useDrawWalls), enabling interior walls.
// Selection is handled by onClick (fires after onMouseDown) but skipped if
// drawing was just started.
export default function Room({ room, selected, fill, listening, scale, onSelect, onShiftSelect, name }) {
  const points = room.verts.flatMap((v) => [v.x, v.y])
  return (
    <Group>
      <Line
        name="room-fill"
        points={points}
        closed
        fill={fill}
        stroke={selected ? '#3b82f6' : undefined}
        strokeWidth={selected ? 2 / scale : 0}
        listening={listening}
        onClick={(e) => {
          if (e.evt.button === 0) {
            // Skip selection if useDrawWalls just set drawStart on this same click
            if (useStore.getState().drawStart) return
            if (e.evt.shiftKey) onShiftSelect?.(room.id)
            else onSelect?.(room.id)
          }
        }}
      />
      {name && (
        <Text
          text={name}
          x={room.centroid.x - 200}
          y={room.centroid.y - 8 / scale}
          width={400}
          align="center"
          fontSize={14 / scale}
          fontStyle="bold"
          fill="#f8fafc"
          opacity={0.85}
          listening={false}
        />
      )}
    </Group>
  )
}
