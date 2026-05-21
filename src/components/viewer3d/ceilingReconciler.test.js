import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as THREE from 'three'

// We test the ceiling reconciler by mocking the THREE scene and checking that
// meshes are added/positioned/removed correctly.

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual }
})

// Import after mocking
import { reconcileCeilings } from './sceneReconcilers'
import { computeStairHolesForRooms } from './stairFloorHoles'
import { computeLevelOffsets } from '../../store/slices/levelsSlice'

const K2T = 0.02

function makeRoom(id, verts, levelId = 'L00000') {
  return { id, verts, levelId, ceilingStairHoles: [] }
}

function makeLevel(id, height = 2.7, order = 0) {
  return { id, height, order }
}

function makeScene() {
  const objects = []
  return {
    add: (o) => objects.push(o),
    remove: (o) => { const i = objects.indexOf(o); if (i >= 0) objects.splice(i, 1) },
    objects,
  }
}

const simpleRoom = makeRoom('L00000:abc', [
  { x: 0, y: 0 }, { x: 500, y: 0 },
  { x: 500, y: 300 }, { x: 0, y: 300 },
])

describe('reconcileCeilings', () => {
  it('adds a ceiling mesh per room', () => {
    const scene = makeScene()
    const meshMap = new Map()
    const levels = [makeLevel('L00000', 2.7)]
    const offsets = computeLevelOffsets(levels)

    reconcileCeilings(scene, [simpleRoom], meshMap, () => '#ffffff', offsets, levels, { visible: true })
    expect(meshMap.size).toBe(1)
    expect(scene.objects.length).toBe(1)
  })

  it('positions ceiling at levelOffset + levelHeight', () => {
    const scene = makeScene()
    const meshMap = new Map()
    const levels = [makeLevel('L00000', 3.0)]
    const offsets = computeLevelOffsets(levels)  // L00000 → 0

    reconcileCeilings(scene, [simpleRoom], meshMap, () => '#ffffff', offsets, levels, { visible: true })
    const mesh = [...meshMap.values()][0]
    // y = 0 (offset) + 3.0 (height) + small ceiling offset
    expect(mesh.position.y).toBeCloseTo(3.0, 1)
  })

  it('hides all meshes when visible=false', () => {
    const scene = makeScene()
    const meshMap = new Map()
    const levels = [makeLevel('L00000', 2.7)]
    const offsets = computeLevelOffsets(levels)

    // First call adds
    reconcileCeilings(scene, [simpleRoom], meshMap, () => '#fff', offsets, levels, { visible: true })
    expect(scene.objects.length).toBe(1)

    // Second call with visible=false removes all
    reconcileCeilings(scene, [simpleRoom], meshMap, () => '#fff', offsets, levels, { visible: false })
    expect(scene.objects.length).toBe(0)
    expect(meshMap.size).toBe(0)
  })

  it('updates ceiling color when material changes', () => {
    const scene = makeScene()
    const meshMap = new Map()
    const levels = [makeLevel('L00000', 2.7)]
    const offsets = computeLevelOffsets(levels)

    reconcileCeilings(scene, [simpleRoom], meshMap, () => '#ffffff', offsets, levels, { visible: true })
    const mesh = [...meshMap.values()][0]
    expect(mesh.userData.color).toBe('#ffffff')

    reconcileCeilings(scene, [simpleRoom], meshMap, () => '#cccccc', offsets, levels, { visible: true })
    expect(mesh.userData.color).toBe('#cccccc')
  })

  it('removes mesh when room disappears', () => {
    const scene = makeScene()
    const meshMap = new Map()
    const levels = [makeLevel('L00000', 2.7)]
    const offsets = computeLevelOffsets(levels)

    reconcileCeilings(scene, [simpleRoom], meshMap, () => '#fff', offsets, levels, { visible: true })
    expect(meshMap.size).toBe(1)

    reconcileCeilings(scene, [], meshMap, () => '#fff', offsets, levels, { visible: true })
    expect(meshMap.size).toBe(0)
    expect(scene.objects.length).toBe(0)
  })
})

describe('stair hole reciprocity', () => {
  // The stair footprint that arrives at level N+1 (floor hole) should have the
  // same shape as the one that departs level N (ceiling hole), because it's
  // the same physical stair.

  const ground = makeLevel('L0', 2.7, 0)
  const upper  = makeLevel('L1', 2.7, 1)
  const levels = [ground, upper]

  const groundRoom = makeRoom('L0:room', [
    { x: 0, y: 0 }, { x: 1000, y: 0 },
    { x: 1000, y: 800 }, { x: 0, y: 800 },
  ], 'L0')

  const upperRoom = makeRoom('L1:room', [
    { x: 0, y: 0 }, { x: 1000, y: 0 },
    { x: 1000, y: 800 }, { x: 0, y: 800 },
  ], 'L1')

  // A stair that sits on the ground floor (levelId=L0) and goes up to L1.
  const stair = {
    id: 's1', type: 'stairs', x: 500, y: 400,
    width: 4, depth: 8, rotation: 0,
    levelId: 'L0', toLevel: 'L1',
  }

  it('floor hole on upper level has same shape as ceiling hole on ground level', () => {
    // Floor holes: stairs arriving at upper level
    const floorHoles = computeStairHolesForRooms(
      [upperRoom],
      [stair],
    )

    // Ceiling holes: same stairs departing from ground level
    // (uses same stair footprint, just queried against ground rooms)
    const ceilHoles = computeStairHolesForRooms(
      [groundRoom],
      [stair],
    )

    const floorCorners = floorHoles.get('L1:room')
    const ceilCorners  = ceilHoles.get('L0:room')

    expect(floorCorners).toBeDefined()
    expect(ceilCorners).toBeDefined()
    expect(floorCorners.length).toBe(1)
    expect(ceilCorners.length).toBe(1)

    // Each hole is 4 corners; both should be identical (same stair footprint).
    const f = floorCorners[0]
    const c = ceilCorners[0]
    expect(f.length).toBe(4)
    expect(c.length).toBe(4)
    for (let i = 0; i < 4; i++) {
      expect(f[i].x).toBeCloseTo(c[i].x, 3)
      expect(f[i].y).toBeCloseTo(c[i].y, 3)
    }
  })
})
