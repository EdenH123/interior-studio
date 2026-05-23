import * as THREE from 'three'

// Module-level texture cache. Cloned textures share the same GPU source.
const _cache = new Map()

function buildTexture(drawFn, w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  drawFn(canvas.getContext('2d'), w, h)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

function getBase(key, drawFn, w, h) {
  if (!_cache.has(key)) _cache.set(key, buildTexture(drawFn, w, h))
  return _cache.get(key)
}

// ── wall canvas drawers ──────────────────────────────────────────────────────

function drawBrick(ctx, W, H) {
  ctx.fillStyle = '#9a8070'
  ctx.fillRect(0, 0, W, H)
  const bW = 118, bH = 52, gap = 8
  const tones = ['#c8714e', '#be6845', '#d47855', '#c46e4a', '#ca7352']
  for (let row = 0; row * (bH + gap) < H + bH; row++) {
    const offset = row % 2 === 0 ? 0 : (bW + gap) / 2
    const y = row * (bH + gap)
    for (let col = -1; col * (bW + gap) + offset < W + bW; col++) {
      const x = Math.floor(col * (bW + gap) + offset)
      const tone = tones[(row * 3 + col + 16) % tones.length]
      ctx.fillStyle = tone
      ctx.fillRect(x + gap / 2, y + gap / 2, bW, bH)
      ctx.fillStyle = 'rgba(0,0,0,0.10)'
      ctx.fillRect(x + gap / 2 + bW - 4, y + gap / 2, 4, bH)
      ctx.fillRect(x + gap / 2, y + gap / 2 + bH - 3, bW - 4, 3)
    }
  }
}

function drawStone(ctx, W, H) {
  ctx.fillStyle = '#8a8880'
  ctx.fillRect(0, 0, W, H)
  const blocks = [
    [8, 8, 220, 100], [236, 8, 268, 100],
    [8, 116, 140, 100], [156, 116, 180, 100], [344, 116, 160, 100],
    [8, 224, 300, 100], [316, 224, 188, 100],
  ]
  const tones = ['#b8b4ae', '#c4c0ba', '#aea8a0', '#c8c4be', '#b4b0aa']
  blocks.forEach(([x, y, w, h], i) => {
    ctx.fillStyle = tones[i % tones.length]
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = 'rgba(0,0,0,0.08)'
    ctx.fillRect(x + w - 4, y, 4, h)
    ctx.fillRect(x, y + h - 3, w, 3)
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fillRect(x, y, w, 2)
    ctx.fillRect(x, y, 2, h)
  })
}

function drawWoodPanel(ctx, W, H) {
  ctx.fillStyle = '#c4a46e'
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 24; i++) {
    const x = (i / 24) * W + Math.sin(i * 1.7) * 6
    ctx.strokeStyle = `rgba(70,40,10,${0.05 + (i % 3) * 0.03})`
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(x, 0)
    for (let y = 0; y <= H; y += 12) {
      ctx.lineTo(x + Math.sin(y * 0.04 + i * 0.9) * 3, y)
    }
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.fillRect(W - 3, 0, 3, H)
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.fillRect(0, 0, 2, H)
}

function drawConcreteWall(ctx, W, H) {
  ctx.fillStyle = '#8a8c8e'
  ctx.fillRect(0, 0, W, H)
  // Seeded-looking noise via systematic offset rects
  for (let x = 0; x < W; x += 3) {
    for (let y = 0; y < H; y += 3) {
      const v = Math.sin(x * 7.3 + y * 13.7) * 0.5 + 0.5
      const a = (v - 0.5) * 0.08
      if (Math.abs(a) > 0.01) {
        ctx.fillStyle = a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`
        ctx.fillRect(x, y, 2, 1)
      }
    }
  }
}

// ── floor canvas drawers ─────────────────────────────────────────────────────

function drawFloorWood(ctx, W, H) {
  ctx.fillStyle = '#c4a46e'
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 28; i++) {
    const y = (i / 28) * H + Math.sin(i * 2.1) * 2
    ctx.strokeStyle = `rgba(70,40,10,${0.04 + Math.sin(i * 1.3 + 1) * 0.02 + 0.02})`
    ctx.lineWidth = 0.6
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= W; x += 16) {
      ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 1.2)
    }
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(0, H - 4, W, 4)
  ctx.fillRect(W - 3, 0, 3, H)
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  ctx.fillRect(0, 0, W, 2)
}

function drawTile(ctx, W, H) {
  ctx.fillStyle = '#c8c4be'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#9a9890'
  ctx.fillRect(0, 0, W, 4)
  ctx.fillRect(0, H - 4, W, 4)
  ctx.fillRect(0, 0, 4, H)
  ctx.fillRect(W - 4, 0, 4, H)
  const grad = ctx.createLinearGradient(4, 4, W - 4, H - 4)
  grad.addColorStop(0, 'rgba(255,255,255,0.12)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.05)')
  ctx.fillStyle = grad
  ctx.fillRect(4, 4, W - 8, H - 8)
}

function drawMarble(ctx, W, H) {
  ctx.fillStyle = '#e8e4de'
  ctx.fillRect(0, 0, W, H)
  const drawVein = (x0, y0, x1, y1, color, lw, alpha) => {
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = color
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    const mx = (x0 + x1) / 2 + Math.sin(x0 * 0.01) * W * 0.3
    const my = (y0 + y1) / 2 + Math.cos(y0 * 0.01) * H * 0.3
    ctx.quadraticCurveTo(mx, my, x1, y1)
    ctx.stroke()
    ctx.restore()
  }
  const veins = [
    [20, 40, 480, 200, '#9090a8', 1.5, 0.4],
    [0, 300, 512, 100, '#9898b0', 0.8, 0.3],
    [100, 0, 400, 512, '#888898', 1.2, 0.35],
    [50, 512, 460, 0, '#a0a0b8', 0.5, 0.25],
    [0, 150, 512, 350, '#8888a0', 0.4, 0.2],
    [200, 0, 300, 512, '#909090', 0.6, 0.15],
  ]
  veins.forEach(v => drawVein(...v))
}

function drawFloorConcrete(ctx, W, H) {
  ctx.fillStyle = '#787880'
  ctx.fillRect(0, 0, W, H)
  for (let x = 0; x < W; x += 3) {
    for (let y = 0; y < H; y += 3) {
      const v = Math.sin(x * 5.1 + y * 11.3) * 0.5 + 0.5
      const a = (v - 0.5) * 0.1
      if (Math.abs(a) > 0.01) {
        ctx.fillStyle = a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`
        ctx.fillRect(x, y, 2, 1)
      }
    }
  }
}

function drawCarpet(ctx, W, H) {
  ctx.fillStyle = '#b4645f'
  ctx.fillRect(0, 0, W, H)
  for (let x = 0; x < W; x += 4) {
    for (let y = 0; y < H; y += 4) {
      const p = (x + y) % 8
      if (p === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.05)'
        ctx.fillRect(x, y, 2, 2)
      } else if (p === 4) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)'
        ctx.fillRect(x, y, 2, 2)
      }
    }
  }
}

// ── texture configs ──────────────────────────────────────────────────────────
// worldW/worldH: physical size in metres that one texture tile represents.
// selfColored: if true, texture provides its own color (material.color = white).
//              if false, material.color tints the texture.

const WALL_CONFIGS = {
  'struct-brick':    { drawFn: drawBrick,       w: 512, h: 256, worldW: 0.45, worldH: 0.15, roughness: 1.0,  selfColored: true  },
  'struct-stone':    { drawFn: drawStone,       w: 512, h: 336, worldW: 0.50, worldH: 0.35, roughness: 0.95, selfColored: true  },
  'wood-panel':      { drawFn: drawWoodPanel,   w: 256, h: 512, worldW: 0.15, worldH: 1.0,  roughness: 0.6,  selfColored: false },
  'struct-concrete': { drawFn: drawConcreteWall,w: 256, h: 256, worldW: 1.0,  worldH: 1.0,  roughness: 0.95, selfColored: true  },
}

const FLOOR_CONFIGS = {
  '_wood':    { drawFn: drawFloorWood,    w: 256, h: 256, worldW: 0.12, worldH: 0.8, roughness: 0.5,  selfColored: false },
  'tile':     { drawFn: drawTile,         w: 256, h: 256, worldW: 0.6,  worldH: 0.6, roughness: 0.3,  selfColored: true  },
  'marble':   { drawFn: drawMarble,       w: 512, h: 512, worldW: 0.6,  worldH: 0.6, roughness: 0.2,  selfColored: true  },
  'concrete': { drawFn: drawFloorConcrete,w: 256, h: 256, worldW: 1.0,  worldH: 1.0, roughness: 0.95, selfColored: true  },
  'carpet':   { drawFn: drawCarpet,       w: 128, h: 128, worldW: 0.5,  worldH: 0.5, roughness: 1.0,  selfColored: false },
}

// ── public API ───────────────────────────────────────────────────────────────

export function getWallTextureInfo(materialId) {
  return WALL_CONFIGS[materialId] ?? null
}

export function getFloorTextureInfo(materialId) {
  if (!materialId) return null
  const key = materialId.startsWith('wood-') ? '_wood' : materialId
  return FLOOR_CONFIGS[key] ?? null
}

// Returns a cloned texture with repeat set for the given wall dimensions.
// Clones share the GPU source so there is no redundant upload.
export function getWallTexture(materialId, lengthM, heightM) {
  const cfg = WALL_CONFIGS[materialId]
  if (!cfg) return null
  const base = getBase(`wall:${materialId}`, cfg.drawFn, cfg.w, cfg.h)
  const tex = base.clone()
  tex.repeat.set(lengthM / cfg.worldW, heightM / cfg.worldH)
  tex.needsUpdate = true
  return { map: tex, roughness: cfg.roughness, selfColored: cfg.selfColored }
}

// Returns a texture with repeat set for ShapeGeometry (UVs in Three units = metres).
export function getFloorTexture(materialId) {
  if (!materialId) return null
  const key = materialId.startsWith('wood-') ? '_wood' : materialId
  const cfg = FLOOR_CONFIGS[key]
  if (!cfg) return null
  const base = getBase(`floor:${key}`, cfg.drawFn, cfg.w, cfg.h)
  const tex = base.clone()
  tex.repeat.set(1 / cfg.worldW, 1 / cfg.worldH)
  tex.needsUpdate = true
  return { map: tex, roughness: cfg.roughness, selfColored: cfg.selfColored }
}
