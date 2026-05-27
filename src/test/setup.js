// Vitest global setup. Loaded before every test file via vitest.config.js.

import '@testing-library/jest-dom/vitest'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../../public/locales/en/translation.json'

// Production loads translations over HTTP via i18next-http-backend, which
// can't run in jsdom. Initialise i18n synchronously from the bundled English
// resources so components rendered in tests get real strings from t(), not
// raw keys. initImmediate:false makes init resolve synchronously.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
    initImmediate: false,
  })
}

// jsdom in vitest does expose `window.localStorage` but not the bare global
// `localStorage` that Zustand's `persist` default storage reaches for.
// Stub a tiny in-memory implementation so persist works in tests; gets
// reset per-test by the consuming spec's beforeEach.
class MemoryStorage {
  constructor() { this.store = new Map() }
  getItem(k) { return this.store.has(k) ? this.store.get(k) : null }
  setItem(k, v) { this.store.set(k, String(v)) }
  removeItem(k) { this.store.delete(k) }
  clear() { this.store.clear() }
  get length() { return this.store.size }
  key(i) { return Array.from(this.store.keys())[i] ?? null }
}

// Force-assign even if jsdom set up a partial version — at least one env
// combo exposes a `localStorage` whose `setItem` isn't actually callable,
// which trips Zustand's persist middleware.
const local = new MemoryStorage()
const session = new MemoryStorage()
Object.defineProperty(globalThis, 'localStorage', { value: local, writable: true, configurable: true })
Object.defineProperty(globalThis, 'sessionStorage', { value: session, writable: true, configurable: true })
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: local, writable: true, configurable: true })
  Object.defineProperty(window, 'sessionStorage', { value: session, writable: true, configurable: true })
}
