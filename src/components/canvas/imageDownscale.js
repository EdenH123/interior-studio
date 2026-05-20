// Downscales a data URL via an offscreen `<canvas>` so the resulting image
// fits inside the persisted-underlay budget.
//
// Returns a Promise resolving to:
//   { dataUrl, width, height, downscaled }
//
// `downscaled` is true only when the source image's long side exceeded
// `maxPx` and we re-encoded as JPEG. Smaller images pass through
// unchanged (preserves PNG transparency / lossless quality).

export const DEFAULT_MAX_PX = 2000
export const DEFAULT_QUALITY = 0.85

// 4 MB of base64 chars — comfortably below the ~5 MB localStorage cap
// once walls + furniture + roomMeta are also in the persisted payload.
export const QUOTA_WARN_BYTES = 4 * 1024 * 1024

export function downscaleDataUrl(dataUrl, maxPx = DEFAULT_MAX_PX, quality = DEFAULT_QUALITY) {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const longSide = Math.max(img.naturalWidth, img.naturalHeight)
      if (longSide <= maxPx) {
        resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight, downscaled: false })
        return
      }
      const ratio = maxPx / longSide
      const w = Math.max(1, Math.round(img.naturalWidth * ratio))
      const h = Math.max(1, Math.round(img.naturalHeight * ratio))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('2D canvas context unavailable'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      const out = canvas.toDataURL('image/jpeg', quality)
      resolve({ dataUrl: out, width: w, height: h, downscaled: true })
    }
    img.onerror = () => reject(new Error('Could not decode image'))
    img.src = dataUrl
  })
}
