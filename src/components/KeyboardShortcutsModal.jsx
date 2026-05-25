import useStore from '../store/useStore'

const SECTIONS = [
  {
    title: 'Canvas',
    rows: [
      ['Space + drag', 'Pan canvas'],
      ['Scroll', 'Zoom in / out'],
      ['Esc', 'Cancel / deselect all'],
      ['Delete / Backspace', 'Remove selected item(s)'],
      ['R', 'Rotate furniture 15° clockwise'],
      ['Shift + R', 'Rotate furniture 15° counter-clockwise'],
      ['Ctrl/⌘ + A', 'Select all items'],
      ['Ctrl/⌘ + C', 'Copy selected'],
      ['Ctrl/⌘ + V', 'Paste'],
      ['Ctrl/⌘ + Z', 'Undo'],
      ['Ctrl/⌘ + Shift + Z', 'Redo'],
      ['Shift + ?', 'Show this cheat-sheet'],
    ],
  },
  {
    title: '3D Walkthrough',
    rows: [
      ['W / A / S / D', 'Move forward / left / back / right'],
      ['Shift', 'Run (hold while moving)'],
      ['Space', 'Jump'],
      ['Esc', 'Exit walkthrough mode'],
    ],
  },
]

export default function KeyboardShortcutsModal() {
  const closeShortcuts = useStore((s) => s.closeShortcuts)

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
            Keyboard Shortcuts
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
                      <kbd className="font-mono text-[11px] text-gray-200 bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5 whitespace-nowrap">
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
          Press Esc or click outside to close
        </p>
      </div>
    </div>
  )
}
