import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import AiPanel from './AiPanel'

vi.mock('../store/useStore', () => ({ default: vi.fn() }))
vi.mock('../hooks/useApiKey', () => ({ default: vi.fn() }))
vi.mock('../hooks/useAiProposalSync', () => ({
  default: () => ({
    aiProposal: null, proposalError: null, jsonBlock: null,
    onApply: vi.fn(), onDiscard: vi.fn(), copyJson: vi.fn(), clearError: vi.fn(),
  }),
}))
vi.mock('../services/claudeApi', () => ({ streamClaude: vi.fn() }))
vi.mock('../services/aiPrompts', () => ({ buildSystemPrompt: () => 'system' }))
vi.mock('./AiSettings', () => ({
  default: ({ onSave }) => <div><input placeholder="API key" /><button onClick={onSave}>Save key</button></div>,
}))
vi.mock('./AiProposalCard', () => ({ default: () => <div>ProposalCard</div> }))

import useStore from '../store/useStore'
import useApiKey from '../hooks/useApiKey'

const base = {
  closeAiPanel: vi.fn(), pushToast: vi.fn(),
  walls: [], furniture: [], roomMeta: {}, underlay: null,
  aiProposal: null, setAiProposal: vi.fn(),
}

beforeEach(() => {
  vi.mocked(useStore).mockImplementation((sel) => sel(base))
})

describe('AiPanel', () => {
  it('shows API key input when no key is stored', () => {
    vi.mocked(useApiKey).mockReturnValue(['', vi.fn()])
    render(<AiPanel />)
    expect(screen.getByPlaceholderText('API key')).toBeInTheDocument()
  })

  it('shows chat interface when API key is present', () => {
    vi.mocked(useApiKey).mockReturnValue(['sk-test-key', vi.fn()])
    render(<AiPanel />)
    expect(screen.getByPlaceholderText(/ask anything/i)).toBeInTheDocument()
  })

  it('shows a send button in the chat view', () => {
    vi.mocked(useApiKey).mockReturnValue(['sk-test-key', vi.fn()])
    render(<AiPanel />)
    expect(screen.getByText('Send')).toBeInTheDocument()
  })
})
