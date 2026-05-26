import { useTranslation } from 'react-i18next'
import { totalChangeCount } from '../services/aiApply'

// Preview card shown above the AI panel's prompt input when Claude's last
// reply contains a valid project-state JSON block. Shows the add/modify/
// remove counts per slice, plus Apply (one history step) and Discard
// (drops the preview, leaves transcript intact).
export default function AiProposalCard({ proposal, onApply, onDiscard }) {
  const { t } = useTranslation()
  const total = totalChangeCount(proposal.diff)
  if (total === 0) return (
    <div className="px-3 py-2 border-t border-gray-700 text-[11px] text-gray-500">
      {t('ai_proposal.no_changes')}
      <button type="button" onClick={onDiscard}
        className="ml-2 text-gray-400 hover:text-gray-200 underline">{t('ai_proposal.dismiss')}</button>
    </div>
  )
  return (
    <div className="px-3 py-2 border-t border-gray-700 bg-blue-950/30 space-y-2">
      <div className="text-[11px] text-blue-100 font-semibold uppercase tracking-wider">{t('ai_proposal.preview')}</div>
      <SliceCounts label={t('ai_proposal.walls')}     d={proposal.diff.walls} />
      <SliceCounts label={t('ai_proposal.furniture')} d={proposal.diff.furniture} />
      <SliceCounts label={t('ai_proposal.rooms')}     d={proposal.diff.roomMeta} />
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onApply}
          className="flex-1 text-xs px-2 py-1.5 rounded bg-blue-600 border border-blue-500 text-white hover:bg-blue-500">
          {t('ai_proposal.apply')}
        </button>
        <button type="button" onClick={onDiscard}
          className="text-xs px-2 py-1.5 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-500">
          {t('ai_proposal.discard')}
        </button>
      </div>
      <p className="text-[10px] text-gray-400 leading-snug">
        {t('ai_proposal.undo_hint', { key: 'Ctrl/Cmd+Z' })}
      </p>
    </div>
  )
}

function SliceCounts({ label, d }) {
  const { t } = useTranslation()
  const a = d.added.length, m = d.modified.length, r = d.removed.length
  if (a + m + r === 0) return (
    <div className="text-[11px] text-gray-500 flex justify-between">
      <span>{label}</span><span className="font-mono">{t('ai_proposal.no_change')}</span>
    </div>
  )
  return (
    <div className="text-[11px] flex justify-between items-center gap-2">
      <span className="text-gray-300">{label}</span>
      <span className="font-mono">
        {a > 0 && <span className="text-green-300">+{a}</span>}
        {a > 0 && (m > 0 || r > 0) && <span className="text-gray-600"> · </span>}
        {m > 0 && <span className="text-amber-300">~{m}</span>}
        {m > 0 && r > 0 && <span className="text-gray-600"> · </span>}
        {r > 0 && <span className="text-red-300">-{r}</span>}
      </span>
    </div>
  )
}
