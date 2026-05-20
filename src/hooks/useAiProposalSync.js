import { useEffect, useState } from 'react'
import useStore from '../store/useStore'
import { extractJsonBlock } from '../services/aiPrompts'
import { validateProposedProject, diffProject } from '../services/aiApply'

// Watches the latest assistant message for a ```json block. When streaming
// finishes, parses + validates against the project schema and stores the
// diffed proposal in the store (so the canvas's DiffOverlay can render it).
// Exposes inline `proposalError` for invalid JSON, plus apply/discard
// helpers and a copyJson function for the malformed-JSON fallback path.
export default function useAiProposalSync(messages, streaming, pushToast) {
  const aiProposal = useStore((s) => s.aiProposal)
  const setAiProposal = useStore((s) => s.setAiProposal)
  const discardAiProposal = useStore((s) => s.discardAiProposal)
  const applyAiProposal = useStore((s) => s.applyAiProposal)
  const walls = useStore((s) => s.walls)
  const furniture = useStore((s) => s.furniture)
  const roomMeta = useStore((s) => s.roomMeta)

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && m.content)
  const jsonBlock = lastAssistant ? extractJsonBlock(lastAssistant.content) : null
  const [proposalError, setProposalError] = useState(null)

  useEffect(() => {
    if (streaming || !jsonBlock) return
    let parsed
    try { parsed = JSON.parse(jsonBlock) }
    catch (e) { setProposalError(`Couldn't parse JSON: ${e.message}`); return }
    const result = validateProposedProject(parsed)
    if (!result.ok) { setProposalError(`Schema check failed: ${result.error}`); return }
    setProposalError(null)
    setAiProposal({
      proposed: result.data,
      diff: diffProject({ walls, furniture, roomMeta }, result.data),
    })
  }, [streaming, jsonBlock, walls, furniture, roomMeta, setAiProposal])

  const onApply = () => {
    applyAiProposal()
    pushToast('Applied AI proposal. Ctrl/Cmd+Z to undo.', 'info')
  }

  const onDiscard = () => discardAiProposal()

  const copyJson = async () => {
    if (!jsonBlock) return
    try {
      await navigator.clipboard.writeText(jsonBlock)
      pushToast('Suggested JSON copied to clipboard.', 'info')
    } catch {
      pushToast('Could not copy to clipboard.', 'error')
    }
  }

  const clearError = () => setProposalError(null)

  return { aiProposal, proposalError, jsonBlock, onApply, onDiscard, copyJson, clearError }
}
