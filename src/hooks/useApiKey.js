import { useEffect, useState } from 'react'

// Google Gemini API key storage — sessionStorage only, never localStorage.
// sessionStorage is scoped to a single tab and cleared on close; localStorage
// would persist the key indefinitely on disk. Tab-scoped is the bare minimum
// for a browser-side key.
//
// Returns [key, setKey] with the same shape as useState. The setter
// writes-through to sessionStorage.

const STORAGE_KEY = 'interior-studio:gemini-api-key'

function read() {
  try { return sessionStorage.getItem(STORAGE_KEY) ?? '' } catch { return '' }
}

export default function useApiKey() {
  const [key, setKeyState] = useState(read)

  // Pick up changes from other tabs / debug tools (rare, but free).
  useEffect(() => {
    const onStorage = (e) => { if (e.key === STORAGE_KEY) setKeyState(e.newValue ?? '') }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setKey = (next) => {
    setKeyState(next)
    try {
      if (next) sessionStorage.setItem(STORAGE_KEY, next)
      else sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* sessionStorage can throw in private modes; UI continues working in-memory */
    }
  }

  return [key, setKey]
}
