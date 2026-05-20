import { useEffect, useState } from 'react'
import { Image as KonvaImage } from 'react-konva'

// Floor-plan image underlay. Loads the data URL into an HTMLImageElement
// then passes it to Konva.Image. While unlocked the image is draggable and
// selectable; once locked (set after calibration) it's `listening={false}`
// so clicks pass through to wall drawing underneath. Selection in the
// locked state happens via the toolbar's "Underlay" button.
export default function Underlay({ underlay, selected, onSelect, onMove }) {
  const [img, setImg] = useState(null)
  useEffect(() => {
    if (!underlay?.dataUrl) { setImg(null); return }
    const el = new window.Image()
    el.onload = () => setImg(el)
    el.src = underlay.dataUrl
  }, [underlay?.dataUrl])

  if (!img || !underlay) return null

  const interactive = !underlay.locked
  return (
    <KonvaImage
      image={img}
      x={underlay.x}
      y={underlay.y}
      width={img.naturalWidth * underlay.scale}
      height={img.naturalHeight * underlay.scale}
      opacity={underlay.opacity}
      listening={interactive}
      draggable={interactive}
      onDragEnd={(e) => onMove?.({ x: e.target.x(), y: e.target.y() })}
      onMouseDown={(e) => {
        if (e.evt.button === 0) {
          e.cancelBubble = true
          onSelect?.()
        }
      }}
      stroke={selected ? '#3b82f6' : undefined}
      strokeWidth={selected ? 2 : 0}
    />
  )
}
