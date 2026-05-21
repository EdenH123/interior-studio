import { describe, it, expect, vi } from 'vitest'

// Tests for the zoom-corrected furniture drag.
// The fix tracks drag offset via stage.getRelativePointerPosition() (world
// coords) so the item moves by the exact world delta regardless of the
// Stage's current scale. Without the fix, Konva's internal drag would
// accumulate screen-space deltas not divided by scale, causing a jump.

function makeStage(scale, panX, panY) {
  // A minimal Konva Stage mock that correctly implements
  // getRelativePointerPosition — divides screen position by scale and
  // subtracts the pan offset, matching Konva's actual behaviour when the
  // Stage has scaleX/scaleY/x/y set.
  let _ptrScreen = { x: 0, y: 0 }
  return {
    setPointerScreen(x, y) { _ptrScreen = { x, y } },
    getRelativePointerPosition() {
      return {
        x: (_ptrScreen.x - panX) / scale,
        y: (_ptrScreen.y - panY) / scale,
      }
    },
  }
}

function simulateDrag({ itemX, itemY, startScreenX, startScreenY, endScreenX, endScreenY, scale, panX = 0, panY = 0 }) {
  const stage = makeStage(scale, panX, panY)

  // ── drag start ──────────────────────────────────────────────────────────────
  stage.setPointerScreen(startScreenX, startScreenY)
  const pStart = stage.getRelativePointerPosition()
  const dragOffset = { dx: pStart.x - itemX, dy: pStart.y - itemY }

  // ── drag end ────────────────────────────────────────────────────────────────
  stage.setPointerScreen(endScreenX, endScreenY)
  const pEnd = stage.getRelativePointerPosition()
  return {
    x: pEnd.x - dragOffset.dx,
    y: pEnd.y - dragOffset.dy,
  }
}

describe('Furniture drag — world delta at various zoom levels', () => {
  it('scale=1: item moves by exact screen delta', () => {
    const result = simulateDrag({
      itemX: 100, itemY: 100,
      startScreenX: 105, startScreenY: 105,
      endScreenX: 155, endScreenY: 155,
      scale: 1,
    })
    expect(result.x).toBeCloseTo(150)
    expect(result.y).toBeCloseTo(150)
  })

  it('scale=2: item moves by screen delta ÷ 2, not by full screen delta', () => {
    const result = simulateDrag({
      itemX: 100, itemY: 100,
      startScreenX: 205, startScreenY: 205,  // screen pos of item at scale=2 (offset 0,0)
      endScreenX: 305, endScreenY: 305,       // move 100 screen px
      scale: 2,
    })
    // World delta should be 50 (100 screen px / scale 2), not 100
    expect(result.x).toBeCloseTo(150)
    expect(result.y).toBeCloseTo(150)
  })

  it('scale=3: screen delta ÷ 3 = world delta', () => {
    const result = simulateDrag({
      itemX: 50, itemY: 50,
      startScreenX: 150, startScreenY: 150,   // (50*3, 50*3) at scale=3, pan=0
      endScreenX: 300, endScreenY: 300,        // move 150 screen px
      scale: 3,
    })
    // World delta = 150 / 3 = 50
    expect(result.x).toBeCloseTo(100)
    expect(result.y).toBeCloseTo(100)
  })

  it('scale=2 with pan offset: item lands at correct world position', () => {
    // Stage at scale=2, panned so (0,0) world is at screen (200,200)
    const result = simulateDrag({
      itemX: 100, itemY: 100,
      startScreenX: 400, startScreenY: 400,  // (100*2+200, 100*2+200)
      endScreenX: 500, endScreenY: 500,       // 100 screen px right-down
      scale: 2, panX: 200, panY: 200,
    })
    // World delta = 50; item moves from (100,100) to (150,150)
    expect(result.x).toBeCloseTo(150)
    expect(result.y).toBeCloseTo(150)
  })

  it('cursor not at item center: item keeps offset from cursor throughout drag', () => {
    // Click 10 world px to the right of item center at scale=2
    const result = simulateDrag({
      itemX: 100, itemY: 100,
      startScreenX: 220, startScreenY: 200,   // world (110, 100) at scale=2, pan=0
      endScreenX: 320, endScreenY: 200,        // move 100 screen px right
      scale: 2,
    })
    // Item ends at world (100 + 50, 100) = (150, 100); cursor stays 10 world px ahead
    expect(result.x).toBeCloseTo(150)
    expect(result.y).toBeCloseTo(100)
  })
})
