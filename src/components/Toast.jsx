import { useEffect } from 'react'
import useStore from '../store/useStore'

const TOAST_TTL_MS = 6000

const KIND_CLASSES = {
  info:  'bg-gray-900 border-gray-700 text-gray-200',
  warn:  'bg-amber-950 border-amber-700 text-amber-100',
  error: 'bg-red-950 border-red-700 text-red-100',
}

// Single transient notification anchored to the bottom-center of the
// viewport. Auto-dismisses after TOAST_TTL_MS, or on click.
export default function Toast() {
  const toast = useStore((s) => s.toast)
  const dismiss = useStore((s) => s.dismissToast)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(dismiss, TOAST_TTL_MS)
    return () => clearTimeout(t)
  }, [toast?.id, dismiss])

  if (!toast) return null
  const cls = KIND_CLASSES[toast.kind] ?? KIND_CLASSES.info
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className={`pointer-events-auto px-4 py-2 rounded-md border text-sm shadow-lg max-w-md ${cls}`}>
        <span>{toast.message}</span>
        <button type="button" onClick={dismiss}
          className="ml-3 text-[11px] uppercase tracking-wider opacity-70 hover:opacity-100">
          dismiss
        </button>
      </div>
    </div>
  )
}
