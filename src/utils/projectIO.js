// Save / load helpers for `.studio.json` project files plus the small
// browser primitives the toolbar uses for downloads. Pure: no React, no
// Konva, no Zustand. The store is the caller's responsibility — pass in
// the relevant slices for `buildExportData`, and feed `validateImport`'s
// result to the store's `loadProject` action.

export const FORMAT = 'interior-studio'
export const VERSION = 2

// Wraps the current persistable state slices in the versioned envelope.
// Mirrors the `partialize` slice in useStore.js — keeping these in sync
// is part of bumping the persisted schema.
export function buildExportData(state) {
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      walls: state.walls,
      openings: state.openings,
      furniture: state.furniture,
      roomMeta: state.roomMeta,
      underlay: state.underlay,
      levels: state.levels,
      activeLevel: state.activeLevel,
    },
  }
}

// Throws on anything that can't be safely fed into the store. Returns a
// normalised data slice on success. Light shape checks only — full type
// validation lives in the store and the components that consume the data.
export function validateImport(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Not a valid project file.')
  if (raw.format !== FORMAT) throw new Error('This is not a .studio.json project file.')
  if (raw.version !== VERSION && raw.version !== 1) {
    throw new Error(`Unsupported project version ${raw.version}. This app reads version ${VERSION}.`)
  }
  if (!raw.data || typeof raw.data !== 'object') throw new Error('Project file is missing its data section.')

  const { walls, openings, furniture, roomMeta, underlay, levels, activeLevel } = raw.data
  return {
    walls: Array.isArray(walls) ? walls : [],
    openings: Array.isArray(openings) ? openings : [],
    furniture: Array.isArray(furniture) ? furniture : [],
    roomMeta: roomMeta && typeof roomMeta === 'object' ? roomMeta : {},
    underlay: underlay && typeof underlay === 'object' ? underlay : null,
    levels: Array.isArray(levels) ? levels : undefined,
    activeLevel: typeof activeLevel === 'string' ? activeLevel : undefined,
  }
}

// `2026-05-20T08-30-45` — filesystem-safe and human-readable.
export function timestampForFilename() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  triggerDownload(filename, url)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadDataUrl(filename, dataUrl) {
  triggerDownload(filename, dataUrl)
}

function triggerDownload(filename, href) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// Async file reader → text → JSON.parse. Throws on any failure so the
// caller can show a single toast for "couldn't read that file".
export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try { resolve(JSON.parse(reader.result)) } catch (e) { reject(e) }
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsText(file)
  })
}
