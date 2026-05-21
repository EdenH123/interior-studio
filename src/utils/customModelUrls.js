// Module-level cache: customModelId → blobUrl.
// Blob URLs are created lazily from stored base64 data and live for the session.
const cache = new Map()

export function getCustomModelUrl(model) {
  if (cache.has(model.id)) return cache.get(model.id)
  // Chunked decode avoids call-stack overflow on large files.
  const bytes = base64ToBytes(model.glbData)
  const blob = new Blob([bytes.buffer], { type: 'model/gltf-binary' })
  const url = URL.createObjectURL(blob)
  cache.set(model.id, url)
  return url
}

export function revokeCustomModelUrl(id) {
  const url = cache.get(id)
  if (url) { URL.revokeObjectURL(url); cache.delete(id) }
}

function base64ToBytes(b64) {
  const CHUNK = 8192
  let binary = ''
  for (let i = 0; i < b64.length; i += CHUNK) {
    binary += atob(b64.slice(i, i + CHUNK))
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  const CHUNK = 8192
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}
