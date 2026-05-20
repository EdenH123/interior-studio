import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { isLightingType } from './reconcileFurniture'

// ─── isLightingType ──────────────────────────────────────────────────────────
describe('isLightingType', () => {
  it('returns true for lighting: prefixed types', () => {
    expect(isLightingType('lighting:ceiling-lamp')).toBe(true)
    expect(isLightingType('lighting:floor-lamp')).toBe(true)
    expect(isLightingType('lighting:pendant')).toBe(true)
  })

  it('returns false for regular furniture types', () => {
    expect(isLightingType('sofa')).toBe(false)
    expect(isLightingType('desk')).toBe(false)
    expect(isLightingType('lamp')).toBe(false)
  })

  it('returns false for null/undefined', () => {
    expect(isLightingType(null)).toBe(false)
    expect(isLightingType(undefined)).toBe(false)
  })
})

// ─── reconcileFurniture light lifecycle (Three.js mocked) ───────────────────

vi.mock('three', async (importActual) => {
  const THREE = await importActual()
  class MockPointLight {
    constructor() {
      this.color       = { copy: vi.fn(), setRGB: vi.fn() }
      this.position    = { set: vi.fn() }
      this.intensity   = 0
      this.distance    = 0
      this.castShadow  = false
      this.isPointLight = true
      this.shadow      = { mapSize: { setScalar: vi.fn() } }
    }
  }
  class MockSpotLight {
    constructor() {
      this.color      = { copy: vi.fn(), setRGB: vi.fn() }
      this.position   = { set: vi.fn() }
      this.target     = { position: { set: vi.fn() }, parent: null }
      this.intensity  = 0
      this.distance   = 0
      this.angle      = 0
      this.penumbra   = 0
      this.decay      = 0
      this.castShadow = false
      this.isSpotLight = true
      this.shadow     = { mapSize: { setScalar: vi.fn() } }
    }
  }
  class MockGroup {
    constructor() {
      this.userData = {}
      this.children = []
      this.position = { set: vi.fn() }
      this.rotation = {}
    }
    add(child) { this.children.push(child) }
    remove(child) { this.children = this.children.filter((c) => c !== child) }
    traverse(fn) { fn(this); this.children.forEach((c) => c.traverse?.(fn)) }
  }
  class MockMesh extends MockGroup {
    constructor(geo, mat) {
      super()
      this.geometry  = geo ?? { dispose: vi.fn(), attributes: { position: { count: 24 } } }
      this.material  = mat ?? { dispose: vi.fn(), color: { set: vi.fn() } }
      this.isMesh    = true
      this.castShadow    = false
      this.receiveShadow = false
    }
  }
  class MockScene extends MockGroup {
    constructor() { super(); this._objects = new Set() }
    add(obj) { this._objects.add(obj) }
    remove(obj) { this._objects.delete(obj) }
  }
  class MockBoxGeometry {
    constructor() { this.attributes = { position: { count: 24 } }; this.dispose = vi.fn() }
  }
  class MockMeshStandardMaterial {
    constructor(opts) {
      Object.assign(this, opts)
      this.color   = { set: vi.fn() }
      this.dispose = vi.fn()
    }
  }
  class MockColor {
    set() { return this }
    setRGB() { return this }
    copy() { return this }
  }
  return {
    ...THREE,
    PointLight: MockPointLight,
    SpotLight: MockSpotLight,
    Group: MockGroup,
    Mesh: MockMesh,
    Scene: MockScene,
    BoxGeometry: MockBoxGeometry,
    MeshStandardMaterial: MockMeshStandardMaterial,
    Color: MockColor,
    MathUtils: { degToRad: (d) => (d * Math.PI) / 180 },
  }
})

vi.mock('./furnitureModels', () => ({
  isModelLoaded: () => false,
  cloneLoadedModel: () => null,
  loadFurnitureModel: vi.fn(),
  onceModelLoaded: () => () => {},
  fitToBox: vi.fn(),
}))
vi.mock('./selectionHighlight', () => ({ setObjectEmissive: vi.fn() }))
vi.mock('../canvas/furnitureMaterials', () => ({ furnitureColorFor: () => '#fff' }))
vi.mock('../../utils/colorTemp', () => ({
  kelvinToRgb: () => ({ r: 255, g: 220, b: 180 }),
}))

describe('reconcileFurniture — light lifecycle', () => {
  let reconcileFurniture, THREE_mock
  let scene, meshMap, lightMap

  beforeAll(async () => {
    THREE_mock         = await import('three')
    const mod          = await import('./reconcileFurniture')
    reconcileFurniture = mod.reconcileFurniture
  })

  beforeEach(() => {
    scene    = new THREE_mock.Scene()
    meshMap  = new Map()
    lightMap = new Map()
  })

  const makeLightItem = (id, type, lightType = 'point', on = true) => ({
    id, type,
    x: 250, y: 250, rotation: 0,
    width: 0.4, depth: 0.4, height: 0.4,
    color: '#fff', model: null,
    lightType, intensity: 1.0, colorTemp: 3000, distance: 8,
    castShadow: true, on,
  })

  it('creates a PointLight for a ceiling-lamp item', () => {
    reconcileFurniture(scene, [makeLightItem('l1', 'lighting:ceiling-lamp')], meshMap, lightMap, true)
    expect(lightMap.has('l1')).toBe(true)
    expect(lightMap.get('l1').isPointLight).toBe(true)
  })

  it('creates a SpotLight for a pendant item', () => {
    const item = { ...makeLightItem('p1', 'lighting:pendant'), lightType: 'spot', height: 0.65 }
    reconcileFurniture(scene, [item], meshMap, lightMap, true)
    expect(lightMap.get('p1').isSpotLight).toBe(true)
  })

  it('sets intensity to 0 when item.on is false', () => {
    reconcileFurniture(scene, [makeLightItem('l2', 'lighting:floor-lamp', 'point', false)], meshMap, lightMap, true)
    expect(lightMap.get('l2').intensity).toBe(0)
  })

  it('sets intensity to 0 when master lightsOn is false', () => {
    reconcileFurniture(scene, [makeLightItem('l3', 'lighting:table-lamp')], meshMap, lightMap, false)
    expect(lightMap.get('l3').intensity).toBe(0)
  })

  it('removes light from lightMap when item is deleted', () => {
    reconcileFurniture(scene, [makeLightItem('l4', 'lighting:ceiling-lamp')], meshMap, lightMap, true)
    expect(lightMap.has('l4')).toBe(true)
    reconcileFurniture(scene, [], meshMap, lightMap, true)
    expect(lightMap.has('l4')).toBe(false)
  })

  it('does not create a light for non-lighting furniture', () => {
    const sofa = {
      id: 's1', type: 'sofa',
      x: 100, y: 100, rotation: 0,
      width: 2, depth: 0.9, height: 0.85,
      color: '#444', model: null,
    }
    reconcileFurniture(scene, [sofa], meshMap, lightMap, true)
    expect(lightMap.has('s1')).toBe(false)
  })

  it('silences lights beyond the 8-light cap', () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      makeLightItem(`lx${i}`, 'lighting:ceiling-lamp'),
    )
    reconcileFurniture(scene, items, meshMap, lightMap, true)
    const active = [...lightMap.values()].filter((l) => l.intensity > 0)
    expect(active.length).toBe(8)
  })
})
