import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useStore from '../store/useStore'
import useApiKey from '../hooks/useApiKey'
import useAiProposalSync from '../hooks/useAiProposalSync'
import { streamClaude } from '../services/claudeApi'
import { buildSystemPrompt } from '../services/aiPrompts'
import AiSettings from './AiSettings'
import AiProposalCard from './AiProposalCard'

const MODEL = 'gemini-2.0-flash'

// AI assistant side panel. Replaces the properties panel when `aiPanelOpen`.
// Session-scoped: no transcript persistence, no key persistence beyond the
// tab. Streams Gemini responses as text via `streamClaude`.
export default function AiPanel() {
  const { t } = useTranslation()
  const closeAiPanel = useStore((s) => s.closeAiPanel)
  const pushToast = useStore((s) => s.pushToast)
  const walls = useStore((s) => s.walls)
  const furniture = useStore((s) => s.furniture)
  const roomMeta = useStore((s) => s.roomMeta)
  const underlay = useStore((s) => s.underlay)
  const projectSnap = useMemo(() => ({ walls, furniture, roomMeta, underlay }), [walls, furniture, roomMeta, underlay])

  const [apiKey, setApiKey] = useApiKey()
  const [showSettings, setShowSettings] = useState(!apiKey)
  const [messages, setMessages] = useState([]) // { role: 'user'|'assistant', content }
  const [prompt, setPrompt] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)
  const transcriptRef = useRef(null)

  // Watches `messages` for a ```json block, parses + validates after
  // streaming finishes, stores the diffed proposal in the store, and
  // hands back the helpers for the preview-card / copy-fallback UI.
  const {
    aiProposal, proposalError, jsonBlock, onApply, onDiscard, copyJson, clearError,
  } = useAiProposalSync(messages, streaming, pushToast)

  async function send(text) {
    const trimmed = text.trim()
    if (!trimmed) return
    if (!apiKey) { setShowSettings(true); return }
    setError(null)
    clearError()
    // A new turn invalidates any preview from the previous reply.
    if (aiProposal) onDiscard()
    const userMsg = { role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '' }])
    setPrompt('')
    setStreaming(true)
    try {
      const system = buildSystemPrompt(projectSnap)
      const turns = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }))
      let acc = ''
      for await (const chunk of streamClaude({ apiKey, model: MODEL, system, messages: turns })) {
        acc += chunk
        setMessages((prev) => {
          const next = prev.slice()
          next[next.length - 1] = { role: 'assistant', content: acc }
          return next
        })
        // Keep the bottom of the transcript visible as text arrives.
        queueMicrotask(() => transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight }))
      }
    } catch (e) {
      setError(e?.message ?? String(e))
    } finally {
      setStreaming(false)
    }
  }

  return (
    <aside data-tour="ai-panel" className="w-72 shrink-0 bg-gray-900 border-s border-gray-700 flex flex-col">
      <Header onClose={closeAiPanel} />
      {showSettings
        ? <AiSettings apiKey={apiKey} setApiKey={setApiKey} onDismiss={() => setShowSettings(false)} />
        : <KeyStatusBar onEdit={() => setShowSettings(true)} />}

      <div ref={transcriptRef} className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
        {messages.length === 0 && !error && <EmptyHint />}
        {messages.map((m, i) => <Message key={i} role={m.role} content={m.content} streaming={streaming && i === messages.length - 1} />)}
        {error && <div className="text-red-200 text-xs whitespace-pre-wrap bg-red-950/40 border border-red-800 rounded p-2">{error}</div>}
      </div>

      {aiProposal && !streaming && (
        <AiProposalCard proposal={aiProposal} onApply={onApply} onDiscard={onDiscard} />
      )}
      {!aiProposal && jsonBlock && !streaming && (
        <div className="px-3 py-2 border-t border-gray-700 flex items-center justify-between gap-2 text-xs">
          <span className="text-gray-400 truncate">
            {proposalError ? <span className="text-amber-300" title={proposalError}>{t('ai.cant_apply', { error: proposalError })}</span> : t('ai.json_detected')}
          </span>
          <button type="button" onClick={copyJson}
            className="shrink-0 text-xs px-2 py-1 rounded bg-blue-600 border border-blue-500 text-white hover:bg-blue-500">
            {t('ai.copy')}
          </button>
        </div>
      )}

      <div className="p-3 border-t border-gray-700 space-y-2">
        <button type="button"
          onClick={() => send('Analyze my current design. What is working? What is missing? What would you suggest? Be concrete.')}
          disabled={streaming || !apiKey}
          className="w-full text-xs px-2 py-1.5 rounded bg-gray-800 border border-gray-700 text-gray-200 hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed">
          {t('ai.analyze')}
        </button>
        <div className="flex gap-2">
          <textarea value={prompt}
            data-tour="ai-prompt"
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(prompt) } }}
            placeholder={apiKey ? t('ai.placeholder') : t('ai.placeholder_no_key')}
            disabled={!apiKey || streaming}
            rows={2}
            dir="ltr"
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-xs font-mono focus:border-blue-500 focus:outline-none resize-none disabled:opacity-50" />
          <button type="button" onClick={() => send(prompt)}
            disabled={!apiKey || streaming || !prompt.trim()}
            className="text-xs px-3 rounded bg-blue-600 border border-blue-500 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed">
            {streaming ? t('ai.sending') : t('ai.send')}
          </button>
        </div>
        {messages.length > 0 && !streaming && (
          <button type="button" onClick={() => { setMessages([]); setError(null) }}
            className="text-[10px] text-gray-500 hover:text-gray-300 underline">
            {t('ai.clear')}
          </button>
        )}
      </div>
    </aside>
  )
}

function Header({ onClose }) {
  const { t } = useTranslation()
  return (
    <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{t('ai.header')}</span>
      <button type="button" onClick={onClose}
        className="text-gray-500 hover:text-gray-200 text-base leading-none px-1">×</button>
    </div>
  )
}

function KeyStatusBar({ onEdit }) {
  const { t } = useTranslation()
  return (
    <div className="px-3 py-1.5 text-[10px] text-gray-500 border-b border-gray-800 flex justify-between items-center">
      <span>{t('ai.key_set')}</span>
      <button type="button" onClick={onEdit} className="text-gray-400 hover:text-gray-200 underline">{t('ai.edit_key')}</button>
    </div>
  )
}

function EmptyHint() {
  const { t } = useTranslation()
  return (
    <div className="text-gray-500 text-xs leading-relaxed">
      {t('ai.empty_hint')}
    </div>
  )
}

function Message({ role, content, streaming }) {
  const { t } = useTranslation()
  const roleLabel = role === 'user' ? t('ai.role_user') : t('ai.role_assistant')
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{roleLabel}</div>
      <div className={`whitespace-pre-wrap text-xs leading-relaxed ${role === 'user' ? 'text-gray-300' : 'text-gray-100'}`} dir="ltr">
        {content}{streaming && <span className="text-gray-500 animate-pulse"> ▍</span>}
      </div>
    </div>
  )
}
