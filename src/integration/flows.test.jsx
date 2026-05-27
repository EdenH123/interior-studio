// Integration tests — verify multi-slice and cross-component flows that unit
// tests don't cover. All tests use the real singleton store and reset it
// between cases. No Konva or Three rendering; Konva interaction-tests live in
// the canvas smoke tests; these focus on store + hook + component integration.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import useStore from '../store/useStore'
import { buildExportData, validateImport } from '../utils/projectIO'
import useFurnitureDrop from '../hooks/useFurnitureDrop'
import useOpeningDrop from '../hooks/useOpeningDrop'
import { FURNITURE_DRAG_MIME } from '../components/Sidebar'
import { OPENING_DRAG_MIME } from '../components/canvas/openingsCatalog'
import PropertiesPanel from '../components/PropertiesPanel'
import useDrawWalls from '../hooks/useDrawWalls'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetStore() {
  useStore.getState().loadProject({ walls: [], furniture: [], roomMeta: {}, openings: [], underlay: null })
  useStore.setState({
    show3d: false, toast: null, aiPanelOpen: false, aiProposal: null,
    // layers is persisted but not reset by loadProject; restore all-visible defaults
    layers: { walls: true, furniture: true, openings: true, rooms: true, underlay: true, grid: true },
  })
  useStore.temporal.getState().clear()
}

// ─── 1. Wall drawing flow ─────────────────────────────────────────────────────

describe('Wall drawing flow', () => {
  beforeEach(resetStore)

  it('addWall stores the correct endpoint coordinates', () => {
    useStore.getState().addWall(0, 0, 200, 0)
    const [wall] = useStore.getState().walls
    expect(wall).toMatchObject({ x1: 0, y1: 0, x2: 200, y2: 0 })
    expect(typeof wall.id).toBe('string')
    expect(wall.id).toHaveLength(6)
  })

  it('chained draw: setDrawStart + addWall produces connected walls', () => {
    const { addWall, setDrawStart } = useStore.getState()
    // Simulate: click (0,0), click (100,0) → wall 1; chain start moves to (100,0);
    // click (100,100) → wall 2.
    setDrawStart({ x: 0, y: 0 })
    addWall(0, 0, 100, 0)
    setDrawStart({ x: 100, y: 0 })
    addWall(100, 0, 100, 100)
    setDrawStart(null)

    const { walls, drawStart } = useStore.getState()
    expect(walls).toHaveLength(2)
    // The shared midpoint connects the two walls
    expect(walls[1].x1).toBe(walls[0].x2)
    expect(walls[1].y1).toBe(walls[0].y2)
    expect(drawStart).toBeNull()
  })

  it('setDrawStart(null) cancels a mid-draw (Esc equivalent)', () => {
    useStore.getState().setDrawStart({ x: 100, y: 100 })
    expect(useStore.getState().drawStart).not.toBeNull()
    useStore.getState().setDrawStart(null)
    expect(useStore.getState().drawStart).toBeNull()
    // No wall committed
    expect(useStore.getState().walls).toHaveLength(0)
  })

  it('removeWall clears the selection if the removed wall was selected', () => {
    useStore.getState().addWall(0, 0, 100, 0)
    const wallId = useStore.getState().walls[0].id
    useStore.getState().select('wall', wallId)
    expect(useStore.getState().selection?.items).toHaveLength(1)

    useStore.getState().removeWall(wallId)

    expect(useStore.getState().walls).toHaveLength(0)
    expect(useStore.getState().selection).toBeNull()
  })

  it('removeWall cascades: openings on that wall are removed too', () => {
    useStore.getState().addWall(0, 0, 500, 0)
    const wallId = useStore.getState().walls[0].id
    const result = useStore.getState().addOpening('door', wallId, 0.5)
    expect(result.ok).toBe(true)
    expect(useStore.getState().openings).toHaveLength(1)

    useStore.getState().removeWall(wallId)

    expect(useStore.getState().walls).toHaveLength(0)
    expect(useStore.getState().openings).toHaveLength(0)
  })
})

// ─── 2. Furniture drop flow ───────────────────────────────────────────────────

describe('Furniture drop flow', () => {
  beforeEach(resetStore)

  it('addFurniture stores the item with the correct type and catalog dimensions', () => {
    useStore.getState().addFurniture('sofa', 100, 200)
    const [item] = useStore.getState().furniture
    expect(item.type).toBe('sofa')
    expect(item.x).toBe(100)
    expect(item.y).toBe(200)
    expect(item.width).toBeGreaterThan(0)
    expect(item.depth).toBeGreaterThan(0)
    expect(item.height).toBeGreaterThan(0)
  })

  it('addFurniture auto-selects the new item', () => {
    useStore.getState().addFurniture('chair', 0, 0)
    const id = useStore.getState().furniture[0].id
    const { selection } = useStore.getState()
    expect(selection?.items).toHaveLength(1)
    expect(selection.items[0]).toMatchObject({ kind: 'furniture', id })
  })

  it('useFurnitureDrop.onDrop adds furniture at the snapped world position', () => {
    // containerRect at origin, identity view — world coords = client coords
    const containerRect = { left: 0, top: 0 }
    const view = { scale: 1, x: 0, y: 0 }

    const { result } = renderHook(() => {
      // useFurnitureDrop expects a React-style ref; use a plain object
      const ref = { current: { getBoundingClientRect: () => containerRect } }
      return useFurnitureDrop(ref, view)
    })

    act(() => {
      result.current.onDrop({
        dataTransfer: { getData: (t) => (t === FURNITURE_DRAG_MIME ? 'sofa' : '') },
        clientX: 150, // world x = 150; snap(150, 50) = 150
        clientY: 200, // world y = 200; snap(200, 50) = 200
        preventDefault: vi.fn(),
      })
    })

    const { furniture } = useStore.getState()
    expect(furniture).toHaveLength(1)
    expect(furniture[0].type).toBe('sofa')
    expect(furniture[0].x).toBe(150)
    expect(furniture[0].y).toBe(200)
  })

  // Regression: a window dropped while an upper level is active must snap to
  // the upper level's wall, not a ground-floor wall at the same 2D coords.
  it('useOpeningDrop only snaps to walls on the active level', () => {
    // Ground-floor wall and an upper-level wall at the SAME 2D coordinates.
    const ground = useStore.getState().activeLevel
    useStore.getState().addWall(0, 0, 400, 0) // gets ground levelId
    const groundWallId = useStore.getState().walls[0].id

    useStore.getState().addLevel()
    const upper = useStore.getState().levels.find((l) => l.id !== ground).id
    useStore.getState().setActiveLevel(upper)
    useStore.getState().addWall(0, 0, 400, 0) // gets upper levelId
    const upperWallId = useStore.getState().walls.find((w) => w.id !== groundWallId).id

    const view = { scale: 1, x: 0, y: 0 }
    const { result } = renderHook(() => {
      const ref = { current: { getBoundingClientRect: () => ({ left: 0, top: 0 }) } }
      return useOpeningDrop(ref, view)
    })

    act(() => {
      result.current.onDrop({
        dataTransfer: { getData: (t) => (t === OPENING_DRAG_MIME ? 'window' : ''), types: [OPENING_DRAG_MIME] },
        clientX: 200, clientY: 0, // on the wall line at the midpoint
        preventDefault: vi.fn(),
      })
    })

    const { openings } = useStore.getState()
    expect(openings).toHaveLength(1)
    expect(openings[0].wallId).toBe(upperWallId)
    expect(openings[0].levelId).toBe(upper)
  })
})

// ─── 3. Multi-select flow ─────────────────────────────────────────────────────

describe('Multi-select flow', () => {
  beforeEach(resetStore)

  it('setSelectionItems replaces the entire selection with multiple items', () => {
    useStore.getState().addWall(0, 0, 100, 0)
    useStore.getState().addFurniture('sofa', 200, 200)
    const { walls, furniture } = useStore.getState()

    useStore.getState().setSelectionItems([
      { kind: 'wall', id: walls[0].id },
      { kind: 'furniture', id: furniture[0].id },
    ])

    const { selection } = useStore.getState()
    expect(selection?.items).toHaveLength(2)
    expect(selection.items[0]).toMatchObject({ kind: 'wall', id: walls[0].id })
    expect(selection.items[1]).toMatchObject({ kind: 'furniture', id: furniture[0].id })
  })

  it('addToSelection toggles items in and out of the selection (Shift+click)', () => {
    useStore.getState().addWall(0, 0, 100, 0)
    useStore.getState().addWall(0, 0, 0, 100)
    const [w1, w2] = useStore.getState().walls

    useStore.getState().select('wall', w1.id)
    expect(useStore.getState().selection?.items).toHaveLength(1)

    // Shift+click w2 — adds it
    useStore.getState().addToSelection('wall', w2.id)
    expect(useStore.getState().selection?.items).toHaveLength(2)

    // Shift+click w1 again — removes it (toggle off)
    useStore.getState().addToSelection('wall', w1.id)
    expect(useStore.getState().selection?.items).toHaveLength(1)
    expect(useStore.getState().selection.items[0].id).toBe(w2.id)
  })

  it('multi-delete removes every selected item (Delete key equivalent)', () => {
    useStore.getState().addWall(0, 0, 100, 0)
    useStore.getState().addFurniture('sofa', 200, 200)
    const { walls, furniture } = useStore.getState()

    useStore.getState().setSelectionItems([
      { kind: 'wall', id: walls[0].id },
      { kind: 'furniture', id: furniture[0].id },
    ])

    // Reproduce what useCanvasKeyboard's Delete handler does
    const s = useStore.getState()
    for (const { kind, id } of s.selection.items) {
      if (kind === 'wall') s.removeWall(id)
      else if (kind === 'furniture') s.removeFurniture(id)
    }

    expect(useStore.getState().walls).toHaveLength(0)
    expect(useStore.getState().furniture).toHaveLength(0)
  })

  it('selectAll excludes items whose layer is hidden', () => {
    useStore.getState().addWall(0, 0, 100, 0)
    useStore.getState().addFurniture('sofa', 200, 200)

    useStore.getState().toggleLayer('walls') // hide walls
    useStore.getState().selectAll()

    const kinds = (useStore.getState().selection?.items ?? []).map((i) => i.kind)
    expect(kinds).not.toContain('wall')
    expect(kinds).toContain('furniture')
  })
})

// ─── 4. Calibration round-trip ────────────────────────────────────────────────

describe('Calibration round-trip', () => {
  beforeEach(resetStore)

  it('applyCalibration(2m) on 100px points keeps scale at 1 when already correct', () => {
    // 100 px at scale=1 with PIXELS_PER_METER=50 represents 2 m (100/50 = 2).
    // ratio = (2 * 50) / 100 = 1.0 — no change.
    useStore.getState().setUnderlay({
      dataUrl: 'data:image/png;base64,x', x: 0, y: 0, scale: 1, opacity: 1, locked: false,
    })
    useStore.getState().startCalibration()
    useStore.getState().setCalibrationPoint({ x: 0, y: 0 })
    useStore.getState().setCalibrationPoint({ x: 100, y: 0 })
    useStore.getState().applyCalibration(2)

    const { underlay, calibration } = useStore.getState()
    expect(underlay.scale).toBeCloseTo(1.0)
    expect(calibration).toBeNull()
    expect(underlay.locked).toBe(true)
  })

  it('applyCalibration(1m) on 100px points halves the scale', () => {
    // ratio = (1 * 50) / 100 = 0.5 → scale 1 → 0.5
    useStore.getState().setUnderlay({
      dataUrl: 'data:image/png;base64,x', x: 0, y: 0, scale: 1, opacity: 1, locked: false,
    })
    useStore.getState().startCalibration()
    useStore.getState().setCalibrationPoint({ x: 0, y: 0 })
    useStore.getState().setCalibrationPoint({ x: 100, y: 0 })
    useStore.getState().applyCalibration(1)

    const { underlay } = useStore.getState()
    expect(underlay.scale).toBeCloseTo(0.5)
    expect(underlay.locked).toBe(true)
  })
})

// ─── 5. AI proposal apply → undo ──────────────────────────────────────────────

describe('AI proposal apply → undo', () => {
  beforeEach(() => { resetStore(); vi.useFakeTimers() })
  afterEach(() => vi.useRealTimers())

  it('applyAiProposal replaces walls, furniture, and roomMeta atomically', () => {
    useStore.getState().addWall(0, 0, 100, 0)
    useStore.getState().addFurniture('sofa', 200, 200)

    useStore.getState().setAiProposal({
      proposed: {
        walls: [{ id: 'ai-wall', x1: 0, y1: 0, x2: 500, y2: 0 }],
        furniture: [],
        roomMeta: { 'r1': { name: 'Living Room' } },
      },
      diff: {},
    })
    useStore.getState().applyAiProposal()

    const s = useStore.getState()
    expect(s.walls).toEqual([{ id: 'ai-wall', x1: 0, y1: 0, x2: 500, y2: 0 }])
    expect(s.furniture).toHaveLength(0)
    expect(s.roomMeta['r1']?.name).toBe('Living Room')
    expect(s.aiProposal).toBeNull()
    expect(s.selection).toBeNull()
  })

  it('a single undo after applyAiProposal reverts walls and furniture together', () => {
    useStore.getState().addWall(0, 0, 100, 0)
    useStore.getState().addFurniture('sofa', 200, 200)
    vi.advanceTimersByTime(350)

    const originalWallId = useStore.getState().walls[0].id

    useStore.getState().setAiProposal({
      proposed: {
        walls: [{ id: 'ai-wall', x1: 0, y1: 0, x2: 500, y2: 0 }],
        furniture: [],
        roomMeta: {},
      },
      diff: {},
    })
    useStore.getState().applyAiProposal()
    vi.advanceTimersByTime(350)

    expect(useStore.getState().walls[0].id).toBe('ai-wall')
    expect(useStore.getState().furniture).toHaveLength(0)

    useStore.temporal.getState().undo()

    const s = useStore.getState()
    // Both walls and furniture are restored in a single undo step
    expect(s.walls[0].id).toBe(originalWallId)
    expect(s.furniture).toHaveLength(1)
    expect(s.furniture[0].type).toBe('sofa')
  })
})

// ─── 6. Layer visibility ──────────────────────────────────────────────────────

describe('Layer visibility', () => {
  beforeEach(resetStore)

  it('toggleLayer flips the named layer flag on and off', () => {
    expect(useStore.getState().layers.walls).toBe(true)
    useStore.getState().toggleLayer('walls')
    expect(useStore.getState().layers.walls).toBe(false)
    useStore.getState().toggleLayer('walls')
    expect(useStore.getState().layers.walls).toBe(true)
  })

  it('hidden layer items are excluded from select-all', () => {
    useStore.getState().addFurniture('sofa', 100, 100)
    useStore.getState().toggleLayer('furniture') // hide furniture

    useStore.getState().selectAll()

    const kinds = (useStore.getState().selection?.items ?? []).map((i) => i.kind)
    expect(kinds).not.toContain('furniture')
  })
})

// ─── 7. Persistence round-trip ───────────────────────────────────────────────

describe('Persistence round-trip', () => {
  beforeEach(() => { resetStore(); vi.useFakeTimers() })
  afterEach(() => vi.useRealTimers())

  it('loadProject restores walls, furniture, openings, roomMeta, and clears transient state', () => {
    const project = {
      walls: [{ id: 'w1', x1: 0, y1: 0, x2: 200, y2: 0 }],
      furniture: [{
        id: 'f1', type: 'chair', x: 50, y: 50, rotation: 0,
        width: 0.5, depth: 0.5, height: 0.9, color: '#999', model: null,
      }],
      openings: [{
        id: 'o1', type: 'door', wallId: 'w1', position: 0.5,
        width: 0.9, height: 2.1, sillHeight: 0, open: false,
      }],
      roomMeta: { 'abc': { name: 'Kitchen', floorMaterial: 'tile' } },
      underlay: null,
    }

    // Dirty transient state first
    useStore.getState().addWall(0, 0, 999, 0)
    useStore.getState().select('wall', useStore.getState().walls[0].id)
    useStore.getState().setDrawStart({ x: 50, y: 50 })

    useStore.getState().loadProject(project)

    const s = useStore.getState()
    expect(s.walls).toMatchObject(project.walls)
    expect(s.furniture).toMatchObject(project.furniture)
    expect(s.openings).toMatchObject(project.openings)
    expect(s.roomMeta).toEqual(project.roomMeta)
    // Transient state must be cleared
    expect(s.selection).toBeNull()
    expect(s.drawStart).toBeNull()
    expect(s.calibration).toBeNull()
  })

  it('after loadProject the user cannot undo past it', () => {
    useStore.getState().addWall(0, 0, 100, 0)
    vi.advanceTimersByTime(350)
    expect(useStore.temporal.getState().pastStates.length).toBeGreaterThan(0)

    // Load a fresh project and clear history (the pattern the app uses)
    useStore.getState().loadProject({ walls: [], furniture: [], openings: [], roomMeta: {} })
    useStore.temporal.getState().clear()

    expect(useStore.temporal.getState().pastStates.length).toBe(0)
    expect(useStore.getState().walls).toHaveLength(0)
  })
})

// ─── 8. Save/Open JSON round-trip ────────────────────────────────────────────

describe('Save/Open JSON round-trip', () => {
  beforeEach(resetStore)

  it('buildExportData → validateImport → loadProject restores the full state', () => {
    useStore.getState().addWall(0, 0, 200, 0)
    useStore.getState().addFurniture('dining-table', 300, 300)
    useStore.getState().updateRoomMeta('r1', { name: 'Dining Room' })

    const envelope = buildExportData(useStore.getState())
    const validated = validateImport(envelope)

    resetStore()
    useStore.getState().loadProject(validated)

    const s = useStore.getState()
    expect(s.walls).toHaveLength(1)
    expect(s.walls[0]).toMatchObject({ x1: 0, y1: 0, x2: 200, y2: 0 })
    expect(s.furniture).toHaveLength(1)
    expect(s.furniture[0].type).toBe('dining-table')
    expect(s.roomMeta['r1']?.name).toBe('Dining Room')
  })

  it('the export envelope carries format, version, exportedAt, and all data keys', () => {
    useStore.getState().addWall(0, 0, 100, 0)
    const envelope = buildExportData(useStore.getState())

    expect(envelope.format).toBe('interior-studio')
    expect(envelope.version).toBe(2)
    expect(typeof envelope.exportedAt).toBe('string')
    expect(envelope.data).toHaveProperty('walls')
    expect(envelope.data).toHaveProperty('furniture')
    expect(envelope.data).toHaveProperty('openings')
    expect(envelope.data).toHaveProperty('roomMeta')
    expect(envelope.data.walls).toHaveLength(1)
  })
})

// ─── 9. Multi-level migration ────────────────────────────────────────────────

describe('Multi-level migration', () => {
  beforeEach(resetStore)

  it('loadProject with no levels creates a default ground floor', () => {
    useStore.getState().loadProject({
      walls: [{ id: 'w1', x1: 0, y1: 0, x2: 100, y2: 0 }],
      furniture: [],
      openings: [],
    })
    const { levels, activeLevel } = useStore.getState()
    expect(levels).toHaveLength(1)
    expect(levels[0].id).toBe('L00000')
    expect(activeLevel).toBe('L00000')
  })

  it('loadProject assigns levelId to items that lack one', () => {
    useStore.getState().loadProject({
      walls: [{ id: 'w1', x1: 0, y1: 0, x2: 100, y2: 0 }],
      furniture: [{ id: 'f1', type: 'chair', x: 50, y: 50, rotation: 0, width: 0.45, depth: 0.5, height: 0.85, color: '#888', model: null }],
      openings: [{ id: 'o1', type: 'door', wallId: 'w1', position: 0.5, width: 0.9, height: 2.1, sillHeight: 0, open: false }],
    })
    const { walls, furniture, openings } = useStore.getState()
    expect(walls[0].levelId).toBe('L00000')
    expect(furniture[0].levelId).toBe('L00000')
    expect(openings[0].levelId).toBe('L00000')
  })

  it('loadProject preserves levelId that is already set', () => {
    useStore.getState().loadProject({
      walls: [{ id: 'w1', x1: 0, y1: 0, x2: 100, y2: 0, levelId: 'UPPER1' }],
      furniture: [],
      openings: [],
      levels: [
        { id: 'L00000', name: 'Ground', height: 2.7, order: 0 },
        { id: 'UPPER1', name: 'Floor 1', height: 2.7, order: 1 },
      ],
      activeLevel: 'UPPER1',
    })
    expect(useStore.getState().walls[0].levelId).toBe('UPPER1')
    expect(useStore.getState().activeLevel).toBe('UPPER1')
  })

  it('new walls get the active levelId', () => {
    useStore.getState().addLevel()
    const newLevelId = useStore.getState().levels[1].id
    useStore.getState().setActiveLevel(newLevelId)
    useStore.getState().addWall(0, 0, 100, 0)
    expect(useStore.getState().walls[0].levelId).toBe(newLevelId)
  })

  it('new furniture gets the active levelId', () => {
    useStore.getState().addLevel()
    const newLevelId = useStore.getState().levels[1].id
    useStore.getState().setActiveLevel(newLevelId)
    useStore.getState().addFurniture('chair', 50, 50)
    expect(useStore.getState().furniture[0].levelId).toBe(newLevelId)
  })

  it('buildExportData includes levels and activeLevel', () => {
    const envelope = buildExportData(useStore.getState())
    expect(envelope.data).toHaveProperty('levels')
    expect(envelope.data).toHaveProperty('activeLevel')
    expect(Array.isArray(envelope.data.levels)).toBe(true)
  })

  it('validateImport passes through levels from a v2 file', () => {
    const envelope = buildExportData(useStore.getState())
    const result = validateImport(envelope)
    expect(Array.isArray(result.levels)).toBe(true)
    expect(result.activeLevel).toBe('L00000')
  })

  it('validateImport accepts a v1 file (no levels field)', () => {
    const v1Envelope = {
      format: 'interior-studio',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { walls: [], furniture: [], openings: [], roomMeta: {}, underlay: null },
    }
    const result = validateImport(v1Envelope)
    expect(result.walls).toEqual([])
    expect(result.levels).toBeUndefined()
  })
})

// ─── 10. useDrawWalls — shape-click guard (Issue 2 fix) ──────────────────────

describe('useDrawWalls shape-click guard', () => {
  // Build a lightweight fake Konva stage ref + synthetic Konva event helper.
  function makeStage(pointerPos = { x: 100, y: 100 }) {
    const stage = { getRelativePointerPosition: () => pointerPos }
    return { current: stage }
  }

  function makeEvent(target, button = 0) {
    return { evt: { button }, target }
  }

  beforeEach(resetStore)

  it('ignores a shape click when no draw chain is active', () => {
    const stageRef = makeStage({ x: 50, y: 50 })
    const shapeTarget = {}  // not the stage — simulates clicking a Wall shape

    const { result } = renderHook(() => useDrawWalls(stageRef, 1, false))
    act(() => result.current(makeEvent(shapeTarget)))

    // drawStart should stay null; no wall committed
    expect(useStore.getState().drawStart).toBeNull()
    expect(useStore.getState().walls).toHaveLength(0)
  })

  it('commits a wall when a shape is clicked while a draw chain is active', () => {
    const stageRef = makeStage({ x: 200, y: 0 })
    const shapeTarget = {}  // simulates clicking a Wall shape at the snap point

    // Start the chain first (background click at origin)
    act(() => useStore.getState().setDrawStart({ x: 0, y: 0 }))
    expect(useStore.getState().drawStart).not.toBeNull()

    const { result } = renderHook(() => useDrawWalls(stageRef, 1, false))
    act(() => result.current(makeEvent(shapeTarget)))

    // Wall should be committed; drawStart advances to the new endpoint
    const { walls } = useStore.getState()
    expect(walls).toHaveLength(1)
    expect(walls[0]).toMatchObject({ x1: 0, y1: 0, x2: 200, y2: 0 })
  })

  it('background clicks still start the chain normally', () => {
    const stageRef = makeStage({ x: 50, y: 50 })
    const { result } = renderHook(() => useDrawWalls(stageRef, 1, false))
    act(() => result.current(makeEvent(stageRef.current)))

    expect(useStore.getState().drawStart).toEqual({ x: 50, y: 50 })
    expect(useStore.getState().walls).toHaveLength(0)
  })

  // A wall-body click (no chain active) starts a new chain projected onto the
  // wall — it must NOT bail like a generic shape click does.
  function makeWallTarget() {
    return { getAttr: (n) => (n === 'name' ? 'wall-body' : undefined) }
  }

  it('clicking an existing wall starts a chain projected onto that wall', () => {
    // Horizontal wall along y=0 from x=0 to x=200.
    act(() => useStore.getState().addWall(0, 0, 200, 0))

    // Cursor 30 px below the wall, away from endpoints/midpoint (no snap).
    const stageRef = makeStage({ x: 100, y: 30 })
    const { result } = renderHook(() => useDrawWalls(stageRef, 1, false, false))
    act(() => result.current(makeEvent(makeWallTarget())))

    // drawStart projects onto the wall (y collapses to 0); no wall committed yet.
    expect(useStore.getState().drawStart).toEqual({ x: 100, y: 0 })
    expect(useStore.getState().walls).toHaveLength(1)
  })

  it('a non-wall shape click still bails when no chain is active', () => {
    act(() => useStore.getState().addWall(0, 0, 200, 0))
    const stageRef = makeStage({ x: 100, y: 30 })
    // Shape with a different name (e.g. furniture) — should not start a draw.
    const furnitureTarget = { getAttr: (n) => (n === 'name' ? 'furniture' : undefined) }
    const { result } = renderHook(() => useDrawWalls(stageRef, 1, false, false))
    act(() => result.current(makeEvent(furnitureTarget)))

    expect(useStore.getState().drawStart).toBeNull()
  })
})

// ─── 10. PropertiesPanel routing with real store ──────────────────────────────

describe('PropertiesPanel routes to the correct editor (real store)', () => {
  beforeEach(resetStore)

  it('shows the wall editor when a wall is selected', () => {
    // 100 px wall = 2.00 m
    useStore.getState().addWall(0, 0, 100, 0)
    const wallId = useStore.getState().walls[0].id
    useStore.getState().select('wall', wallId)

    render(<PropertiesPanel />)

    expect(screen.getByRole('heading', { name: /wall/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('2.00')).toBeInTheDocument()
  })

  it('shows the furniture editor when a furniture item is selected', () => {
    useStore.getState().addFurniture('sofa', 100, 200)
    const id = useStore.getState().furniture[0].id
    useStore.getState().select('furniture', id)

    render(<PropertiesPanel />)

    expect(screen.getByRole('heading', { name: /sofa/i })).toBeInTheDocument()
  })

  it('shows the empty state when nothing is selected', () => {
    render(<PropertiesPanel />)
    expect(screen.getByText(/nothing selected/i)).toBeInTheDocument()
  })
})
