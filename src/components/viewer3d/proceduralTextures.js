import * as THREE from 'three'

const _cache = new Map()

// ── noise utilities ──────────────────────────────────────────────────────────

function hash2(x, y) {
  let h = (Math.imul(x | 0, 1664525) + Math.imul(y | 0, 1013904223)) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0
  return (h >>> 0) / 0xffffffff
}

function smoothstep(t) { return t * t * (3 - 2 * t) }

function valueNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = smoothstep(x - ix), fy = smoothstep(y - iy)
  const a = hash2(ix, iy), b = hash2(ix + 1, iy)
  const c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1)
  return a + (b - a) * fx + (c - a) * fy + (d - a + b - a - (d - a) + (d - b)) * fx * fy
}

function fbm(x, y, oct = 5) {
  let v = 0, amp = 0.5, freq = 1, sum = 0
  for (let i = 0; i < oct; i++) {
    v += valueNoise(x * freq, y * freq) * amp
    sum += amp; amp *= 0.5; freq *= 2.1
  }
  return v / sum
}

function buildTexture(drawFn, w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
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

// ── wall textures ────────────────────────────────────────────────────────────

function drawBrick(ctx, W, H) {
  // Mortar: sandy warm grey
  ctx.fillStyle = '#b8a898'
  ctx.fillRect(0, 0, W, H)

  const bW = 112, bH = 46, gap = 10
  const palette = ['#c06040', '#b85232', '#c86848', '#be5c3c', '#c46840', '#a84c30', '#cc6e50']

  const rows = Math.ceil(H / (bH + gap)) + 2
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? 0 : (bW + gap) / 2
    const baseY = row * (bH + gap)
    const cols = Math.ceil((W + bW) / (bW + gap)) + 2
    for (let col = -1; col < cols; col++) {
      const bx = Math.floor(col * (bW + gap) + offset) + gap / 2
      const by = baseY + gap / 2
      const idx = (row * 7 + col * 3 + 19) % palette.length
      ctx.fillStyle = palette[idx]
      ctx.fillRect(bx, by, bW, bH)

      // fbm surface variation per brick
      const n = fbm(bx * 0.015, by * 0.015) - 0.5
      ctx.fillStyle = n > 0
        ? `rgba(255,220,180,${n * 0.28})`
        : `rgba(20,0,0,${-n * 0.32})`
      ctx.fillRect(bx, by, bW, bH)

      // Horizontal firing scratches
      for (let s = 1; s < 4; s++) {
        const sy = by + bH * s * 0.22 + hash2(bx + s, row) * 5 - 2
        ctx.fillStyle = `rgba(0,0,0,${0.04 + hash2(s, row * 2) * 0.04})`
        ctx.fillRect(bx + 3, Math.round(sy), bW - 6, 1)
      }

      // Top-edge highlight (brick catches light)
      ctx.fillStyle = 'rgba(255,255,255,0.14)'
      ctx.fillRect(bx, by, bW, 2)

      // Bottom mortar shadow gradient
      ctx.fillStyle = 'rgba(50,30,20,0.28)'
      ctx.fillRect(bx, by + bH, bW, gap)
      ctx.fillStyle = 'rgba(50,30,20,0.10)'
      ctx.fillRect(bx, by + bH - 1, bW, 1)

      // Left/right vertical mortar
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      ctx.fillRect(bx - gap / 2, by, gap / 2, bH + gap)

      // Corner micro-chips (dark triangles)
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 5, by); ctx.lineTo(bx, by + 4); ctx.closePath(); ctx.fill()
      ctx.beginPath(); ctx.moveTo(bx + bW, by); ctx.lineTo(bx + bW - 5, by); ctx.lineTo(bx + bW, by + 4); ctx.closePath(); ctx.fill()
    }
  }
}

function drawBrickRoughness(ctx, W, H) {
  // Bright = smooth (mortar), dark = rough (brick faces)
  ctx.fillStyle = '#888888'  // mid rough base
  ctx.fillRect(0, 0, W, H)
  const bW = 112, bH = 46, gap = 10
  const rows = Math.ceil(H / (bH + gap)) + 2
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? 0 : (bW + gap) / 2
    const baseY = row * (bH + gap)
    const cols = Math.ceil((W + bW) / (bW + gap)) + 2
    for (let col = -1; col < cols; col++) {
      const bx = Math.floor(col * (bW + gap) + offset) + gap / 2
      const by = baseY + gap / 2
      // Brick surface is rough (dark in roughness map = less rough? No — in three.js roughness map:
      // white pixel → roughness = roughness value, black → 0. We want bricks rough, mortar smooth.
      // So bricks = white (full roughness), mortar = grey (less rough).
      ctx.fillStyle = '#e0e0e0'  // bricks are rough
      ctx.fillRect(bx, by, bW, bH)
      // fbm for variation on brick face
      const n = fbm(bx * 0.02, by * 0.02)
      ctx.fillStyle = n > 0.5 ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)'
      ctx.fillRect(bx, by, bW, bH)
    }
  }
  // Mortar lines remain at the grey base (slightly smoother)
}

function drawStone(ctx, W, H) {
  // Sandstone base
  ctx.fillStyle = '#9a9488'
  ctx.fillRect(0, 0, W, H)

  let blockId = 0
  const gap = 8
  const blockTones = [148, 160, 170, 155, 165, 145, 175]
  const minH = 90, maxH = 140

  let y = gap
  while (y < H + maxH) {
    const rowH = minH + Math.round(hash2(blockId * 5, 1) * (maxH - minH))
    let x = gap
    while (x < W + 80) {
      const blkW = 110 + Math.round(hash2(blockId * 7, 2) * 180)
      const aw = Math.min(blkW, W - x + gap * 2)
      const bx = x, by = y, bw = aw - gap, bh = rowH - gap
      if (bw < 20) { x += blkW; blockId++; continue }

      const tone = blockTones[blockId % blockTones.length]
      ctx.fillStyle = `rgb(${tone},${tone - 6},${tone - 14})`
      ctx.fillRect(bx, by, bw, bh)

      // Surface fbm
      for (let px = 0; px < bw; px += 4) {
        for (let py2 = 0; py2 < bh; py2 += 4) {
          const n = fbm((bx + px) * 0.006, (by + py2) * 0.006) - 0.5
          if (Math.abs(n) > 0.03) {
            ctx.fillStyle = n > 0 ? `rgba(255,255,255,${n * 0.14})` : `rgba(0,0,0,${-n * 0.16})`
            ctx.fillRect(bx + px, by + py2, 4, 4)
          }
        }
      }

      // Bevel edges — top/left light, bottom/right shadow
      ctx.fillStyle = 'rgba(255,255,255,0.14)'
      ctx.fillRect(bx, by, bw, 3)
      ctx.fillRect(bx, by, 3, bh)
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      ctx.fillRect(bx, by + bh - 4, bw, 4)
      ctx.fillRect(bx + bw - 4, by, 4, bh)
      // Mortar gap shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.fillRect(bx + bw, by, gap, bh + gap)
      ctx.fillRect(bx, by + bh, bw + gap, gap)

      x += blkW; blockId++
    }
    y += rowH
  }
}

function drawWoodPanel(ctx, W, H) {
  const numPlanks = 6
  const plankW = W / numPlanks
  const tones = ['#b88c5c', '#c29464', '#a87c4c', '#bc9060', '#a88054', '#c0925e']

  for (let p = 0; p < numPlanks + 1; p++) {
    const px = p * plankW
    const tone = tones[p % tones.length]
    ctx.fillStyle = tone
    ctx.fillRect(px, 0, plankW - 1.5, H)

    // Dense vertical grain
    const grainCount = 28
    for (let g = 0; g < grainCount; g++) {
      const gx = px + (g / grainCount) * (plankW - 2) + hash2(g, p) * 5 - 2
      const a = 0.04 + hash2(g * 3, p) * 0.07
      ctx.strokeStyle = `rgba(50,24,6,${a})`
      ctx.lineWidth = 0.7 + hash2(g, p * 2) * 0.5
      ctx.beginPath(); ctx.moveTo(gx, 0)
      for (let y = 0; y <= H; y += 6) {
        ctx.lineTo(gx + Math.sin(y * 0.045 + g * 1.4 + p * 0.9) * 2.5, y)
      }
      ctx.stroke()
    }

    // Knot with concentric rings
    if (hash2(p * 3, 11) > 0.45) {
      const kx = px + plankW * (0.3 + hash2(p, 7) * 0.4)
      const ky = H * (0.15 + hash2(p, 3) * 0.7)
      const kr = 9 + hash2(p, 13) * 14
      for (let ring = 4; ring >= 0; ring--) {
        const r2 = kr * (0.5 + ring * 0.28)
        const a = ring === 0 ? 0.7 : 0.08 + ring * 0.04
        ctx.fillStyle = `rgba(40,18,4,${a})`
        ctx.beginPath()
        ctx.ellipse(kx, ky, r2 * 0.65, r2, hash2(p, ring) * 0.4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Joint: dark gap + highlight
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.fillRect(px + plankW - 1.5, 0, 1.5, H)
    ctx.fillStyle = 'rgba(255,255,255,0.09)'
    ctx.fillRect(px, 0, 1, H)
  }
}

function drawConcreteWall(ctx, W, H) {
  ctx.fillStyle = '#8c8e96'
  ctx.fillRect(0, 0, W, H)

  // Multi-scale fbm noise for aggregate look
  for (let x = 0; x < W; x += 2) {
    for (let y = 0; y < H; y += 2) {
      const n = fbm(x / W * 4, y / H * 4) - 0.5
      const a = n * 0.18
      if (Math.abs(a) > 0.005) {
        ctx.fillStyle = a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`
        ctx.fillRect(x, y, 2, 2)
      }
    }
  }

  // Formwork seam lines
  ctx.strokeStyle = 'rgba(0,0,0,0.14)'
  ctx.lineWidth = 1.5
  for (let py = H * 0.5; py < H; py += H * 0.5) {
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.09)'
  for (let px = W * 0.5; px < W; px += W * 0.5) {
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke()
  }

  // Tie-hole impressions + aggregate pitting
  for (let i = 0; i < 40; i++) {
    const px = hash2(i, 44) * W, py = hash2(i, 55) * H
    const pr = 1 + hash2(i, 66) * 2.5
    ctx.fillStyle = `rgba(0,0,0,${0.12 + hash2(i, 77) * 0.18})`
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.beginPath(); ctx.arc(px - 0.5, py - 0.6, pr * 0.5, 0, Math.PI * 2); ctx.fill()
  }
}

// ── floor textures ───────────────────────────────────────────────────────────

function drawFloorWood(ctx, W, H) {
  const plankH = 55  // ~11cm plank
  const numPlanks = Math.ceil(H / plankH) + 2
  const tones = [
    '#c8a068', '#c09460', '#bc9462', '#b88858', '#c4986a',
    '#b07e50', '#ca9e6c', '#bc9060', '#c6a26e',
  ]

  for (let p = 0; p < numPlanks; p++) {
    const py = p * plankH
    const tone = tones[(p * 4 + 7) % tones.length]
    ctx.fillStyle = tone
    ctx.fillRect(0, py, W, plankH - 2)

    // Dense grain (vertical lines across plank width)
    for (let g = 0; g < 52; g++) {
      const gx = (g / 52) * W + hash2(g, p) * 8 - 4
      const a = 0.028 + hash2(g * 2, p) * 0.055
      ctx.strokeStyle = `rgba(50,25,7,${a})`
      ctx.lineWidth = 0.6 + hash2(g * 5, p) * 0.5
      ctx.beginPath(); ctx.moveTo(gx, py)
      for (let y = py; y <= py + plankH - 2; y += 5) {
        ctx.lineTo(gx + Math.sin(y * 0.055 + g * 1.6) * 1.8, y)
      }
      ctx.stroke()
    }

    // Knot (about 30% of planks)
    if (hash2(p * 5, 17) > 0.7) {
      const kx = W * (0.08 + hash2(p, 4) * 0.84)
      const ky = py + plankH * 0.35 + hash2(p, 9) * plankH * 0.3
      const kr = 8 + hash2(p, 11) * 16
      for (let ring = 4; ring >= 0; ring--) {
        const r = kr * (0.4 + ring * 0.26)
        const a = ring === 0 ? 0.72 : 0.05 + ring * 0.045
        ctx.fillStyle = `rgba(42,18,4,${a})`
        ctx.beginPath()
        ctx.ellipse(kx, ky, r * 0.65, r, 0.08, 0, Math.PI * 2)
        ctx.fill()
      }
      // Grain distortion around knot
      ctx.strokeStyle = 'rgba(55,28,8,0.18)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(kx, ky, kr * 1.1, kr * 1.6, 0.08, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Plank joint — dark gap top, thin gap bottom
    ctx.fillStyle = 'rgba(0,0,0,0.30)'
    ctx.fillRect(0, py + plankH - 2, W, 2)
    ctx.fillStyle = 'rgba(255,255,255,0.10)'
    ctx.fillRect(0, py, W, 1)
  }

  // End-grain perpendicular cuts (plank length joints)
  const numEndJoints = 5
  for (let j = 0; j < numEndJoints; j++) {
    const jx = Math.round((j / numEndJoints + 0.08 + hash2(j, 88) * 0.12) * W)
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.fillRect(jx - 1, 0, 2, H)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.fillRect(jx + 1, 0, 1, H)
  }
}

function drawFloorWoodRoughness(ctx, W, H) {
  // Polished planks are smooth mid-surface, rougher at joints/knots
  ctx.fillStyle = '#505050'  // smooth polished mid-tone
  ctx.fillRect(0, 0, W, H)
  const plankH = 55
  const numPlanks = Math.ceil(H / plankH) + 2
  for (let p = 0; p < numPlanks; p++) {
    const py = p * plankH
    // Plank joint = rough (white)
    ctx.fillStyle = '#cccccc'
    ctx.fillRect(0, py + plankH - 2, W, 2)
    // Knot = rough
    if (hash2(p * 5, 17) > 0.7) {
      const kx = W * (0.08 + hash2(p, 4) * 0.84)
      const ky = py + plankH * 0.35 + hash2(p, 9) * plankH * 0.3
      const kr = (8 + hash2(p, 11) * 16) * 1.5
      ctx.fillStyle = '#aaaaaa'
      ctx.beginPath()
      ctx.ellipse(kx, ky, kr * 0.65, kr, 0.08, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // End joints
  for (let j = 0; j < 5; j++) {
    const jx = Math.round((j / 5 + 0.08 + hash2(j, 88) * 0.12) * W)
    ctx.fillStyle = '#aaaaaa'
    ctx.fillRect(jx - 1, 0, 2, H)
  }
}

function drawTile(ctx, W, H) {
  const grout = 9
  const g2 = grout / 2

  // Grout — slightly warm grey
  ctx.fillStyle = '#b0aca6'
  ctx.fillRect(0, 0, W, H)

  const tileX = g2, tileY = g2
  const tileW = W - grout, tileH = H - grout

  // Porcelain base — slight warm off-white
  const baseR = 208 + Math.round(hash2(g2 | 0, g2 | 0) * 24)
  ctx.fillStyle = `rgb(${baseR},${baseR - 2},${baseR - 5})`
  ctx.fillRect(tileX, tileY, tileW, tileH)

  // Subtle surface clouding via fbm
  for (let x = 0; x < tileW; x += 3) {
    for (let y = 0; y < tileH; y += 3) {
      const n = fbm(x / tileW * 5, y / tileH * 5) - 0.5
      const a = n * 0.09
      if (Math.abs(a) > 0.005) {
        ctx.fillStyle = a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a * 0.6})`
        ctx.fillRect(tileX + x, tileY + y, 3, 3)
      }
    }
  }

  // Specular reflection band — off-center, mimics light from upper-left
  const sGrad = ctx.createRadialGradient(
    tileX + tileW * 0.28, tileY + tileH * 0.26, 0,
    tileX + tileW * 0.5, tileY + tileH * 0.5, tileW * 0.72,
  )
  sGrad.addColorStop(0, 'rgba(255,255,255,0.22)')
  sGrad.addColorStop(0.55, 'rgba(255,255,255,0.04)')
  sGrad.addColorStop(1, 'rgba(0,0,0,0.03)')
  ctx.fillStyle = sGrad
  ctx.fillRect(tileX, tileY, tileW, tileH)

  // Grout channel shadows — inner edge darker
  ctx.fillStyle = 'rgba(0,0,0,0.14)'
  ctx.fillRect(tileX, tileY, tileW, 3)           // top inner
  ctx.fillRect(tileX, tileY, 3, tileH)           // left inner
  ctx.fillStyle = 'rgba(255,255,255,0.10)'
  ctx.fillRect(tileX, tileY + tileH - 2, tileW, 2) // bottom inner
  ctx.fillRect(tileX + tileW - 2, tileY, 2, tileH) // right inner
}

function drawMarble(ctx, W, H) {
  // Carrara marble — white/cream with blue-grey veins
  ctx.fillStyle = '#ece8e2'
  ctx.fillRect(0, 0, W, H)

  // Background clouding (large-scale variation)
  for (let x = 0; x < W; x += 4) {
    for (let y = 0; y < H; y += 4) {
      const n = fbm(x / W * 2.5, y / H * 2.5, 4) - 0.5
      const a = n * 0.10
      if (Math.abs(a) > 0.005) {
        ctx.fillStyle = a > 0 ? `rgba(255,255,255,${a})` : `rgba(30,25,20,${-a})`
        ctx.fillRect(x, y, 4, 4)
      }
    }
  }

  function vein(x0, y0, x1, y1, cx1, cy1, cx2, cy2, color, lw, alpha) {
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = color
    ctx.lineWidth = lw
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x1, y1)
    ctx.stroke()
    // Branch
    if (lw > 0.9) {
      ctx.lineWidth = lw * 0.38
      ctx.globalAlpha = alpha * 0.48
      const bMidX = (cx1 + cx2) / 2
      const bMidY = (cy1 + cy2) / 2
      ctx.beginPath()
      ctx.moveTo(bMidX, bMidY)
      ctx.quadraticCurveTo(
        bMidX + (x1 - x0) * 0.18 + 40, bMidY + (y1 - y0) * 0.12 - 35,
        bMidX + (x1 - x0) * 0.35 + 70, bMidY + (y1 - y0) * 0.28 + 55,
      )
      ctx.stroke()
    }
    ctx.restore()
  }

  // Primary structural veins
  vein(  0, H*0.30,  W, H*0.55, W*0.22, H*0.28, W*0.72, H*0.52, '#8484a8', 2.8, 0.55)
  vein(W*0.18, 0,    W*0.82, H, W*0.60, H*0.38, W*0.45, H*0.68, '#7878a0', 2.2, 0.48)
  vein(  0, H*0.68,  W, H*0.22, W*0.35, H*0.60, W*0.65, H*0.38, '#9090b0', 1.9, 0.42)
  // Secondary veins
  vein(  0, H*0.12,  W, H*0.82, W*0.50, H*0.25, W*0.40, H*0.60, '#9898b8', 1.1, 0.32)
  vein(W*0.05, H,    W*0.95, 0, W*0.55, H*0.65, W*0.60, H*0.30, '#8888a4', 0.9, 0.28)
  vein(  0, H*0.50,  W, H*0.42, W*0.30, H*0.55, W*0.65, H*0.48, '#a0a0bc', 0.6, 0.22)
  // Hairline fractures
  vein(W*0.40, 0,    W*0.55, H, W*0.46, H*0.40, W*0.60, H*0.65, '#9898b0', 0.4, 0.18)
  vein(  0, H*0.85,  W, H*0.65, W*0.25, H*0.80, W*0.70, H*0.68, '#a4a4bc', 0.4, 0.16)
  vein(W*0.60, 0,    W*0.30, H, W*0.55, H*0.35, W*0.42, H*0.65, '#8c8ca8', 0.35, 0.14)

  // Crystal specks (bright calcite inclusions)
  for (let i = 0; i < 120; i++) {
    const sx = hash2(i, 10) * W, sy = hash2(i, 20) * H
    const sr = 0.5 + hash2(i, 30) * 1.8
    const sa = 0.12 + hash2(i, 40) * 0.30
    ctx.fillStyle = `rgba(255,255,255,${sa})`
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill()
  }
}

function drawMarbleRoughness(ctx, W, H) {
  // Polished marble is very smooth overall; veins slightly rougher
  ctx.fillStyle = '#282828'  // very smooth base (low roughness)
  ctx.fillRect(0, 0, W, H)

  // Vein paths are slightly rougher
  function veinRough(x0, y0, x1, y1, cx1, cy1, cx2, cy2, lw) {
    ctx.strokeStyle = '#585858'
    ctx.lineWidth = lw * 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x1, y1)
    ctx.stroke()
  }
  veinRough(  0, H*0.30,  W, H*0.55, W*0.22, H*0.28, W*0.72, H*0.52, 3)
  veinRough(W*0.18, 0,    W*0.82, H, W*0.60, H*0.38, W*0.45, H*0.68, 2.5)
  veinRough(  0, H*0.68,  W, H*0.22, W*0.35, H*0.60, W*0.65, H*0.38, 2)
  veinRough(  0, H*0.12,  W, H*0.82, W*0.50, H*0.25, W*0.40, H*0.60, 1.5)
  veinRough(W*0.05, H,    W*0.95, 0, W*0.55, H*0.65, W*0.60, H*0.30, 1.2)
}

function drawFloorConcrete(ctx, W, H) {
  // Polished industrial concrete
  ctx.fillStyle = '#6a6c76'
  ctx.fillRect(0, 0, W, H)

  for (let x = 0; x < W; x += 2) {
    for (let y = 0; y < H; y += 2) {
      const n = fbm(x / W * 6, y / H * 6) - 0.5
      const a = n * 0.16
      if (Math.abs(a) > 0.005) {
        ctx.fillStyle = a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`
        ctx.fillRect(x, y, 2, 2)
      }
    }
  }

  // Saw-cut expansion joints
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'
  ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke()
  // Highlight edge on joints
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(W / 2 + 2, 0); ctx.lineTo(W / 2 + 2, H); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, H / 2 + 2); ctx.lineTo(W, H / 2 + 2); ctx.stroke()

  // Aggregate pitting
  for (let i = 0; i < 55; i++) {
    const px = hash2(i, 100) * W, py = hash2(i, 101) * H
    const pr = 1 + hash2(i, 102) * 2
    ctx.fillStyle = `rgba(0,0,0,${0.14 + hash2(i, 103) * 0.16})`
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.09)'
    ctx.beginPath(); ctx.arc(px - 0.5, py - 0.5, pr * 0.5, 0, Math.PI * 2); ctx.fill()
  }
}

function drawCarpet(ctx, W, H) {
  // Loop-pile carpet — warm mid-tone with fine weave
  ctx.fillStyle = '#8a7468'
  ctx.fillRect(0, 0, W, H)

  // Loop pile grid: small raised dots
  const cell = 4
  for (let x = 0; x < W; x += cell) {
    for (let y = 0; y < H; y += cell) {
      const n = hash2(x, y)
      // Alternate dark/light in the weave
      const a = n > 0.5 ? 0.10 : 0.05
      ctx.fillStyle = n > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`
      ctx.fillRect(x, y, cell - 1, cell - 1)
      // Tiny specular on loop tops
      if (n > 0.75) {
        ctx.fillStyle = 'rgba(255,255,255,0.14)'
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }

  // Directional sheen — simulates pile direction
  const sheen = ctx.createLinearGradient(0, 0, W * 0.7, H)
  sheen.addColorStop(0, 'rgba(255,255,255,0.07)')
  sheen.addColorStop(0.45, 'rgba(0,0,0,0)')
  sheen.addColorStop(1, 'rgba(0,0,0,0.07)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, W, H)
}

// ── texture configs ──────────────────────────────────────────────────────────

const WALL_CONFIGS = {
  'struct-brick':    { drawFn: drawBrick,        roughFn: drawBrickRoughness,  w: 512, h: 256, worldW: 0.45, worldH: 0.15, roughness: 0.92, metalness: 0.0,  selfColored: true  },
  'struct-stone':    { drawFn: drawStone,         roughFn: null,                w: 768, h: 512, worldW: 0.55, worldH: 0.40, roughness: 0.90, metalness: 0.0,  selfColored: true  },
  'wood-panel':      { drawFn: drawWoodPanel,     roughFn: null,                w: 256, h: 512, worldW: 0.15, worldH: 1.0,  roughness: 0.55, metalness: 0.0,  selfColored: false },
  'struct-concrete': { drawFn: drawConcreteWall,  roughFn: null,                w: 512, h: 512, worldW: 1.0,  worldH: 1.0,  roughness: 0.90, metalness: 0.0,  selfColored: true  },
}

const FLOOR_CONFIGS = {
  '_wood':    { drawFn: drawFloorWood,    roughFn: drawFloorWoodRoughness, w: 512, h: 256, worldW: 0.15, worldH: 0.8,  roughness: 0.45, metalness: 0.0, selfColored: false },
  'tile':     { drawFn: drawTile,          roughFn: null,                   w: 256, h: 256, worldW: 0.6,  worldH: 0.6,  roughness: 0.22, metalness: 0.03, selfColored: true  },
  'marble':   { drawFn: drawMarble,        roughFn: drawMarbleRoughness,    w: 1024, h: 1024, worldW: 0.8,  worldH: 0.8,  roughness: 0.18, metalness: 0.04, selfColored: true  },
  'concrete': { drawFn: drawFloorConcrete, roughFn: null,                   w: 512, h: 512, worldW: 1.0,  worldH: 1.0,  roughness: 0.88, metalness: 0.0, selfColored: true  },
  'carpet':   { drawFn: drawCarpet,        roughFn: null,                   w: 128, h: 128, worldW: 0.4,  worldH: 0.4,  roughness: 1.0,  metalness: 0.0, selfColored: false },
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

export function getWallTexture(materialId, lengthM, heightM) {
  const cfg = WALL_CONFIGS[materialId]
  if (!cfg) return null
  const base = getBase(`wall:${materialId}`, cfg.drawFn, cfg.w, cfg.h)
  const tex = base.clone()
  tex.repeat.set(lengthM / cfg.worldW, heightM / cfg.worldH)
  tex.needsUpdate = true
  let roughnessMap = null
  if (cfg.roughFn) {
    const roughBase = getBase(`wall:${materialId}:rough`, cfg.roughFn, cfg.w, cfg.h)
    roughnessMap = roughBase.clone()
    roughnessMap.repeat.set(lengthM / cfg.worldW, heightM / cfg.worldH)
    roughnessMap.needsUpdate = true
  }
  return { map: tex, roughnessMap, roughness: cfg.roughness, metalness: cfg.metalness ?? 0, selfColored: cfg.selfColored }
}

export function getFloorTexture(materialId) {
  if (!materialId) return null
  const key = materialId.startsWith('wood-') ? '_wood' : materialId
  const cfg = FLOOR_CONFIGS[key]
  if (!cfg) return null
  const base = getBase(`floor:${key}`, cfg.drawFn, cfg.w, cfg.h)
  const tex = base.clone()
  tex.repeat.set(1 / cfg.worldW, 1 / cfg.worldH)
  tex.needsUpdate = true
  let roughnessMap = null
  if (cfg.roughFn) {
    const roughBase = getBase(`floor:${key}:rough`, cfg.roughFn, cfg.w, cfg.h)
    roughnessMap = roughBase.clone()
    roughnessMap.repeat.set(1 / cfg.worldW, 1 / cfg.worldH)
    roughnessMap.needsUpdate = true
  }
  return { map: tex, roughnessMap, roughness: cfg.roughness, metalness: cfg.metalness ?? 0, selfColored: cfg.selfColored }
}

function drawDoorWood(ctx, W, H) {
  ctx.fillStyle = '#b88a5a'
  ctx.fillRect(0, 0, W, H)
  // Vertical grain
  for (let i = 0; i < 22; i++) {
    const x = (i / 22) * W + Math.sin(i * 1.9) * 5
    const a = 0.05 + (i % 4) * 0.025
    ctx.strokeStyle = `rgba(55,26,6,${a})`
    ctx.lineWidth = 0.9
    ctx.beginPath(); ctx.moveTo(x, 0)
    for (let y = 0; y <= H; y += 7) {
      ctx.lineTo(x + Math.sin(y * 0.032 + i * 0.75) * 2.5, y)
    }
    ctx.stroke()
  }
  // Knots
  for (let i = 0; i < 3; i++) {
    const cx = ((i * 137 + 40) % W)
    const cy = ((i * 217 + 60) % H)
    for (let ring = 3; ring >= 0; ring--) {
      const r = (12 + ring * 5)
      ctx.fillStyle = `rgba(44,20,5,${ring === 0 ? 0.6 : 0.07 + ring * 0.04})`
      ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.7, r, 0.1, 0, Math.PI * 2); ctx.fill()
    }
  }
}

export function getDoorTexture() {
  const base = getBase('door:wood', drawDoorWood, 256, 512)
  const tex = base.clone()
  tex.needsUpdate = true
  return tex
}
