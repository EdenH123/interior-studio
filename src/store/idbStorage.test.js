import { describe, it, expect, beforeEach } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { idbStorage, __resetDbPromiseForTests } from './idbStorage'

// Fresh in-memory IndexedDB per test so state never leaks between cases.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  __resetDbPromiseForTests()
  localStorage.clear()
})

describe('idbStorage', () => {
  it('round-trips a value through setItem/getItem', async () => {
    await idbStorage.setItem('interior-studio', '{"state":{"walls":[1]}}')
    expect(await idbStorage.getItem('interior-studio')).toBe('{"state":{"walls":[1]}}')
  })

  it('returns null when the key is absent and no legacy data exists', async () => {
    expect(await idbStorage.getItem('interior-studio')).toBeNull()
  })

  it('removeItem deletes the value', async () => {
    await idbStorage.setItem('k', 'v')
    await idbStorage.removeItem('k')
    expect(await idbStorage.getItem('k')).toBeNull()
  })

  describe('localStorage → IndexedDB migration', () => {
    it('moves an existing localStorage payload into IndexedDB on first read', async () => {
      const legacy = '{"state":{"walls":[{"id":"w1"}]},"version":2}'
      localStorage.setItem('interior-studio', legacy)

      const read = await idbStorage.getItem('interior-studio')
      expect(read).toBe(legacy)

      // The legacy copy is cleared and the value now lives in IndexedDB.
      expect(localStorage.getItem('interior-studio')).toBeNull()
      __resetDbPromiseForTests()
      expect(await idbStorage.getItem('interior-studio')).toBe(legacy)
    })

    it('prefers the IndexedDB value over a stale localStorage copy', async () => {
      await idbStorage.setItem('interior-studio', 'idb-value')
      localStorage.setItem('interior-studio', 'stale-localstorage-value')
      expect(await idbStorage.getItem('interior-studio')).toBe('idb-value')
      // The IDB value wins, so localStorage is left untouched (not migrated).
      expect(localStorage.getItem('interior-studio')).toBe('stale-localstorage-value')
    })

    it('does not migrate when there is no legacy data', async () => {
      expect(await idbStorage.getItem('interior-studio')).toBeNull()
      expect(localStorage.getItem('interior-studio')).toBeNull()
    })
  })
})
