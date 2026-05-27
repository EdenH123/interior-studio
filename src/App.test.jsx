import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import useStore from './store/useStore'

// Mock the heavy children so we exercise only App's own wiring (the global
// keyboard hook). Crucially CanvasArea is a plain stub here — so if the D
// shortcut still works it must be App mounting useCanvasKeyboard, not CanvasArea.
vi.mock('./components/viewer3d/Viewer3D', () => ({ default: () => <div>Viewer3D</div> }))
vi.mock('./components/CanvasArea', () => ({ default: () => <div>CanvasArea</div> }))
vi.mock('./components/Sidebar', () => ({ default: () => <div>Sidebar</div> }))
vi.mock('./components/Toolbar', () => ({ default: () => <div>Toolbar</div> }))
vi.mock('./components/PropertiesPanel', () => ({ default: () => <div>PropertiesPanel</div> }))
vi.mock('./components/AiPanel', () => ({ default: () => <div>AiPanel</div> }))
vi.mock('./components/Toast', () => ({ default: () => <div>Toast</div> }))
vi.mock('./components/KeyboardShortcutsModal', () => ({ default: () => <div>Shortcuts</div> }))
vi.mock('./components/tour/TourOverlay', () => ({ default: () => <div>Tour</div> }))
vi.mock('./hooks/useLanguageSync', () => ({ default: () => {} }))

import App from './App'

describe('App mounts global keyboard shortcuts (work in 2D and 3D)', () => {
  beforeEach(() => {
    useStore.setState({ show3d: false, walkthrough: false })
  })

  it('D toggles into 3D from the 2D view', () => {
    render(<App />)
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' })))
    expect(useStore.getState().show3d).toBe(true)
  })

  it('D toggles back to 2D from the 3D view (CanvasArea unmounted)', () => {
    useStore.setState({ show3d: true })
    render(<App />)
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' })))
    expect(useStore.getState().show3d).toBe(false)
  })
})
