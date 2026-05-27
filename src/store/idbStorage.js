// IndexedDB-backed StateStorage for Zustand `persist`. localStorage caps at
// ~5 MB per origin and fails the *entire* write on quota overflow, so one
// oversized underlay image or custom GLB could lose the whole project.
// IndexedDB has no practical size cap, so the project's binary blobs persist
// safely.
//
// Hand-rolled (no runtime dependency). Shape matches Zustand's StateStorage:
// getItem / setItem / removeItem, each returning a Promise. Wrap with
// createJSONStorage(() => idbStorage) — persist handles the async hydration.

const DB_NAME = 'interior-studio'
const STORE_NAME = 'kv'
const DB_VERSION = 1

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function withStore(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const req = fn(tx.objectStore(STORE_NAME))
        tx.oncomplete = () => resolve(req.result)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      }),
  )
}

const idbGet = (key) => withStore('readonly', (s) => s.get(key))
const idbSet = (key, value) => withStore('readwrite', (s) => s.put(value, key))
const idbDel = (key) => withStore('readwrite', (s) => s.delete(key))

// Reads any pre-existing localStorage payload, copies it into IndexedDB, and
// clears the localStorage copy — so an existing user's saved project moves
// over on first load with zero loss. Runs only when IndexedDB has nothing yet.
async function migrateFromLocalStorage(name) {
  try {
    if (typeof localStorage === 'undefined') return null
    const legacy = localStorage.getItem(name)
    if (legacy == null) return null
    await idbSet(name, legacy)
    localStorage.removeItem(name)
    return legacy
  } catch {
    // localStorage blocked (private mode, etc.) — nothing to migrate.
    return null
  }
}

export const idbStorage = {
  async getItem(name) {
    const existing = await idbGet(name)
    if (existing != null) return existing
    return migrateFromLocalStorage(name)
  },
  async setItem(name, value) {
    await idbSet(name, value)
  },
  async removeItem(name) {
    await idbDel(name)
  },
}

// Test-only: drop the cached connection so a fresh fake-indexeddb per test is
// picked up. No-op in production usage.
export function __resetDbPromiseForTests() {
  dbPromise = null
}
