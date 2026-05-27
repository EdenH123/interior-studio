import { useTranslation } from 'react-i18next'
import useStore from '../store/useStore'

export default function KeyboardShortcutsModal() {
  const { t } = useTranslation()
  const closeShortcuts = useStore((s) => s.closeShortcuts)

  const SECTIONS = [
    {
      title: t('shortcuts.canvas'),
      rows: [
        ['Space', t('shortcuts.shortcut_toggle_tool')],
        ['D', t('shortcuts.shortcut_toggle_3d')],
        ['Scroll', t('shortcuts.shortcut_zoom')],
        ['Esc', t('shortcuts.shortcut_cancel')],
        ['Delete / Backspace', t('shortcuts.shortcut_delete')],
        ['R', t('shortcuts.shortcut_rotate_cw')],
        ['Shift + R', t('shortcuts.shortcut_rotate_ccw')],
        ['Ctrl/⌘ + A', t('shortcuts.shortcut_select_all')],
        ['Ctrl/⌘ + C', t('shortcuts.shortcut_copy')],
        ['Ctrl/⌘ + V', t('shortcuts.shortcut_paste')],
        ['Ctrl/⌘ + Z', t('shortcuts.shortcut_undo')],
        ['Ctrl/⌘ + Shift + Z', t('shortcuts.shortcut_redo')],
        ['Shift + ?', t('shortcuts.shortcut_shortcuts')],
      ],
    },
    {
      title: t('shortcuts.walkthrough_3d'),
      rows: [
        ['W / A / S / D', t('shortcuts.shortcut_move')],
        ['Shift', t('shortcuts.shortcut_run')],
        ['Space', t('shortcuts.shortcut_jump')],
        ['Esc', t('shortcuts.shortcut_exit_walk')],
      ],
    },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={closeShortcuts}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-[480px] max-h-[80vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-300">
            {t('shortcuts.title')}
          </h2>
          <button
            onClick={closeShortcuts}
            className="text-gray-500 hover:text-gray-200 text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-5 last:mb-0">
            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">
              {section.title}
            </div>
            <table className="w-full border-collapse">
              <tbody>
                {section.rows.map(([key, desc]) => (
                  <tr key={key} className="border-t border-gray-800 first:border-t-0">
                    <td className="py-1.5 pr-4 w-48">
                      <kbd className="font-mono text-[11px] text-gray-200 bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5 whitespace-nowrap" dir="ltr">
                        {key}
                      </kbd>
                    </td>
                    <td className="py-1.5 text-xs text-gray-400">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <p className="mt-4 text-[10px] text-gray-600 font-mono">
          {t('shortcuts.close_hint')}
        </p>
      </div>
    </div>
  )
}
