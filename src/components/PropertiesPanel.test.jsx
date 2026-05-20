import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import PropertiesPanel from './PropertiesPanel'

// Mock heavy sub-editors so the test focuses on routing, not sub-component details.
vi.mock('./canvas/WallProps',      () => ({ default: () => <div>WallProps</div> }))
vi.mock('./canvas/FurnitureProps', () => ({ default: () => <div>FurnitureProps</div> }))
vi.mock('./canvas/LightingProps',  () => ({ default: () => <div>LightingProps</div> }))
vi.mock('./canvas/OpeningProps',   () => ({ default: () => <div>OpeningProps</div> }))
vi.mock('./canvas/UnderlayProps',  () => ({ default: () => <div>UnderlayProps</div> }))
vi.mock('./canvas/MultiSelectProps', () => ({ default: () => <div>MultiSelectProps</div> }))
vi.mock('./canvas/roomDetection',  () => ({
  detectRooms: () => [],
  polygonAreaM2: () => 10,
}))

vi.mock('../store/useStore', () => ({ default: vi.fn() }))

import useStore from '../store/useStore'

const base = {
  selection: null, walls: [], furniture: [], roomMeta: {}, openings: [],
  underlay: null, calibration: null,
  updateRoomMeta: vi.fn(), updateWall: vi.fn(), updateFurniture: vi.fn(),
  updateOpening: vi.fn(), pushToast: vi.fn(),
  updateUnderlay: vi.fn(), clearUnderlay: vi.fn(), startCalibration: vi.fn(),
}

beforeEach(() => {
  vi.mocked(useStore).mockImplementation((sel) => sel(base))
})

describe('PropertiesPanel', () => {
  it('shows empty state when nothing is selected', () => {
    render(<PropertiesPanel />)
    expect(screen.getByText(/nothing selected/i)).toBeInTheDocument()
  })

  it('routes to WallProps when a wall is selected', () => {
    const wall = { id: 'w1', x1: 0, y1: 0, x2: 100, y2: 0 }
    vi.mocked(useStore).mockImplementation((sel) =>
      sel({ ...base, selection: { items: [{ kind: 'wall', id: 'w1' }] }, walls: [wall] }),
    )
    render(<PropertiesPanel />)
    expect(screen.getByText('WallProps')).toBeInTheDocument()
  })

  it('routes to FurnitureProps for regular furniture', () => {
    const item = { id: 'f1', type: 'sofa', x: 0, y: 0, rotation: 0, width: 2, depth: 0.9, height: 0.85, color: '#888' }
    vi.mocked(useStore).mockImplementation((sel) =>
      sel({ ...base, selection: { items: [{ kind: 'furniture', id: 'f1' }] }, furniture: [item] }),
    )
    render(<PropertiesPanel />)
    expect(screen.getByText('FurnitureProps')).toBeInTheDocument()
  })

  it('routes to LightingProps for lighting furniture', () => {
    const item = { id: 'l1', type: 'lighting:ceiling-lamp', x: 0, y: 0, rotation: 0, width: 0.4, depth: 0.4, height: 0.4, color: '#fff', lightType: 'point', intensity: 1, colorTemp: 3000, distance: 8, castShadow: true, on: true }
    vi.mocked(useStore).mockImplementation((sel) =>
      sel({ ...base, selection: { items: [{ kind: 'furniture', id: 'l1' }] }, furniture: [item] }),
    )
    render(<PropertiesPanel />)
    expect(screen.getByText('LightingProps')).toBeInTheDocument()
  })

  it('routes to OpeningProps when an opening is selected', () => {
    const wall = { id: 'w1', x1: 0, y1: 0, x2: 500, y2: 0 }
    const opening = { id: 'o1', type: 'door', wallId: 'w1', position: 0.5, width: 0.9, height: 2.1, sillHeight: 0 }
    vi.mocked(useStore).mockImplementation((sel) =>
      sel({ ...base,
        selection: { items: [{ kind: 'opening', id: 'o1' }] },
        walls: [wall], openings: [opening],
      }),
    )
    render(<PropertiesPanel />)
    expect(screen.getByText('OpeningProps')).toBeInTheDocument()
  })

  it('routes to MultiSelectProps when multiple items are selected', () => {
    const items = [
      { id: 'f1', type: 'sofa', x: 0, y: 0, rotation: 0, width: 2, depth: 0.9, height: 0.85, color: '#888' },
      { id: 'f2', type: 'chair', x: 100, y: 0, rotation: 0, width: 0.45, depth: 0.5, height: 0.85, color: '#999' },
    ]
    vi.mocked(useStore).mockImplementation((sel) =>
      sel({ ...base,
        selection: { items: [{ kind: 'furniture', id: 'f1' }, { kind: 'furniture', id: 'f2' }] },
        furniture: items,
      }),
    )
    render(<PropertiesPanel />)
    expect(screen.getByText('MultiSelectProps')).toBeInTheDocument()
  })
})
