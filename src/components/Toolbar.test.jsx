import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Toolbar from './Toolbar'

vi.mock('../store/useStore', () => ({ default: vi.fn() }))
vi.mock('../hooks/useProjectIO', () => ({
  default: () => ({
    exportPng: vi.fn(), exportPdf: vi.fn(), exportJson: vi.fn(), openJson: vi.fn(),
    importInputRef: { current: null }, handleImportFile: vi.fn(),
  }),
}))
vi.mock('../hooks/useUndoRedo', () => ({
  default: () => ({ canUndo: false, canRedo: false, undo: vi.fn(), redo: vi.fn() }),
}))

import useStore from '../store/useStore'

const base = {
  show3d: false, toggle3d: vi.fn(),
  walkthrough: false, toggleWalkthrough: vi.fn(),
  aiPanelOpen: false, toggleAiPanel: vi.fn(),
  underlay: null, setUnderlay: vi.fn(),
  select: vi.fn(), pushToast: vi.fn(),
}

beforeEach(() => {
  vi.mocked(useStore).mockImplementation((sel) => sel(base))
})

describe('Toolbar', () => {
  it('renders core buttons', () => {
    render(<Toolbar />)
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Export PNG')).toBeInTheDocument()
    expect(screen.getByText('AI')).toBeInTheDocument()
  })

  it('shows 3D button labelled "3D" when off', () => {
    render(<Toolbar />)
    expect(screen.getByText('3D')).toBeInTheDocument()
  })

  it('hides Walk button when 3D is off', () => {
    render(<Toolbar />)
    expect(screen.queryByText('Walk')).not.toBeInTheDocument()
  })

  it('shows Walk button when 3D is on', () => {
    vi.mocked(useStore).mockImplementation((sel) => sel({ ...base, show3d: true }))
    render(<Toolbar />)
    expect(screen.getByText('Walk')).toBeInTheDocument()
  })

  it('shows "← 2D" button when 3D is active', () => {
    vi.mocked(useStore).mockImplementation((sel) => sel({ ...base, show3d: true }))
    render(<Toolbar />)
    expect(screen.getByText('← 2D')).toBeInTheDocument()
  })

  it('renders undo and redo buttons', () => {
    render(<Toolbar />)
    expect(screen.getByTitle('Undo (Ctrl/Cmd+Z)')).toBeInTheDocument()
    expect(screen.getByTitle('Redo (Ctrl/Cmd+Shift+Z)')).toBeInTheDocument()
  })

  it('renders Export PDF button', () => {
    render(<Toolbar />)
    expect(screen.getByText('Export PDF')).toBeInTheDocument()
  })
})
