import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Sidebar from './Sidebar'
import { FURNITURE } from './canvas/furnitureCatalog'
import { OPENINGS } from './canvas/openingsCatalog'

vi.mock('../store/useStore', () => ({ default: vi.fn() }))

import useStore from '../store/useStore'

const base = {
  setDragGhostType: vi.fn(), clearDragGhost: vi.fn(),
  layers: { walls: true, furniture: true, openings: true, rooms: true, underlay: true, grid: true },
  toggleLayer: vi.fn(),
  levels: [{ id: 'L00000', name: 'Ground Floor', height: 2.7, order: 0 }],
  activeLevel: 'L00000',
  setActiveLevel: vi.fn(),
  addLevel: vi.fn(),
  removeLevel: vi.fn(),
  renameLevel: vi.fn(),
  setLevelHeight: vi.fn(),
}

beforeEach(() => {
  vi.mocked(useStore).mockImplementation((sel) => sel(base))
})

describe('Sidebar', () => {
  it('renders all furniture catalog items', () => {
    render(<Sidebar />)
    for (const item of FURNITURE) {
      expect(screen.getByText(item.label)).toBeInTheDocument()
    }
  })

  it('renders both opening types', () => {
    render(<Sidebar />)
    for (const o of OPENINGS) {
      expect(screen.getByText(o.label)).toBeInTheDocument()
    }
  })

  it('shows 47 non-lighting furniture items', () => {
    render(<Sidebar />)
    const furnitureItems = FURNITURE.filter((f) => !f.type.startsWith('lighting:'))
    expect(furnitureItems).toHaveLength(47)
  })

  it('shows 4 lighting items', () => {
    render(<Sidebar />)
    const lightingItems = FURNITURE.filter((f) => f.type.startsWith('lighting:'))
    expect(lightingItems).toHaveLength(4)
  })

  it('shows 2 opening items', () => {
    expect(OPENINGS).toHaveLength(2)
    render(<Sidebar />)
    expect(screen.getByText('Door')).toBeInTheDocument()
    expect(screen.getByText('Window')).toBeInTheDocument()
  })

  it('shows all category headings', () => {
    render(<Sidebar />)
    // 'Openings' appears in both the sidebar group and the Layers panel
    expect(screen.getAllByText('Openings').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Lighting').length).toBeGreaterThan(0)
  })
})
