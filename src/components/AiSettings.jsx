import { useTranslation } from 'react-i18next'

// Settings strip for the AI panel — Google Gemini API key input. The key
// lives in `sessionStorage` only (per `useApiKey.js`); never written to
// localStorage and not included in project exports.
// Get a free key at https://aistudio.google.com/app/apikey
export default function AiSettings({ apiKey, setApiKey, onDismiss }) {
  const { t } = useTranslation()
  return (
    <div className="p-3 border-b border-gray-700 bg-amber-950/30">
      <p className="text-[11px] text-amber-200 mb-2 leading-snug">{t('ai_settings.warning')}</p>
      <label className="block">
        <span className="text-gray-400 text-[10px] uppercase tracking-wider">{t('ai_settings.label')}</span>
        <input type="password" value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="AIza..."
          spellCheck={false} autoComplete="off"
          className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-xs font-mono focus:border-blue-500 focus:outline-none"
        />
      </label>
      <div className="flex gap-2 mt-2 justify-end">
        {apiKey && (
          <button type="button" onClick={() => setApiKey('')}
            className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:border-red-500 hover:text-red-300">
            {t('ai_settings.clear')}
          </button>
        )}
        <button type="button" onClick={onDismiss} disabled={!apiKey}
          className="text-xs px-2 py-1 rounded bg-blue-600 border border-blue-500 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed">
          {t('ai_settings.done')}
        </button>
      </div>
    </div>
  )
}
