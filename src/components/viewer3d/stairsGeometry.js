import * as THREE from 'three'

// ─── shared helpers ───────────────────────────────────────────────────────────

function addFace(positions, normals, indices, pts, nx, ny, nz) {
  const base = positions.length / 3
  for (const [x, y, z] of pts) { positions.push(x, y, z); normals.push(nx, ny, nz) }
  indices.push(base, base+1, base+2,  base, base+2, base+3)
}

function build(positions, normals, indices) {
  const geo = new THREE.BufferGeometry()
  geo.setIndex(indices)
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals,   3))
  return geo
}

// ─── public API ──────────────────────────────────────────────────────────────

// opts.style   — 'standard' (default) | 'floating' | 'spiral'
// opts.numSteps — number of steps (default 12)
// Backward-compatible: passing a number as 4th arg = numSteps (old signature).
export function buildStairsGeometry(width, depth, height, opts = {}) {
  const numSteps = typeof opts === 'number' ? opts : (opts.numSteps ?? 12)
  const style    = typeof opts === 'number' ? 'standard' : (opts.style ?? 'standard')
  if (style === 'spiral') return buildSpiralStairs(width, depth, height, numSteps)
  return buildLinearStairs(width, depth, height, numSteps, style)
}

// ─── straight / floating stairs ──────────────────────────────────────────────

function buildLinearStairs(W, D, H, N, style) {
  const stepH  = H / N
  const stepD  = D / N
  const hw     = W / 2
  const FLOAT  = style === 'floating'
  const treadT = FLOAT ? 0.04 : 0   // tread slab thickness for floating
  const NOSING = 0.02                // tread overhang over riser

  const positions = [], normals = [], indices = []
  const f = (...a) => addFace(positions, normals, indices, ...a)

  for (let i = 0; i < N; i++) {
    const z0   = -D/2 + i * stepD
    const z1   = z0 + stepD
    const y0   = i * stepH
    const y1   = (i + 1) * stepH
    const zNose = Math.max(-D/2, z0 - NOSING)   // nosing overhang

    // ── tread top ────────────────────────────────────────────────────────────
    f([[-hw,y1,zNose],[hw,y1,zNose],[hw,y1,z1],[-hw,y1,z1]], 0,1,0)

    if (FLOAT) {
      // Floating: thick tread slab — underside + front nose + back edge
      f([[-hw,y1-treadT,z1],[hw,y1-treadT,z1],[hw,y1-treadT,zNose],[-hw,y1-treadT,zNose]], 0,-1,0)
      f([[-hw,y1-treadT,zNose],[hw,y1-treadT,zNose],[hw,y1,zNose],[-hw,y1,zNose]], 0,0,-1)
      f([[-hw,y1,z1],[hw,y1,z1],[hw,y1-treadT,z1],[-hw,y1-treadT,z1]], 0,0,1)
      // Left + right edges of tread
      f([[-hw,y1-treadT,zNose],[-hw,y1,zNose],[-hw,y1,z1],[-hw,y1-treadT,z1]], -1,0,0)
      f([[hw,y1,zNose],[hw,y1-treadT,zNose],[hw,y1-treadT,z1],[hw,y1,z1]], 1,0,0)
    } else {
      // Standard: riser + infill sides per step
      f([[-hw,y0,z0],[hw,y0,z0],[hw,y1,z0],[-hw,y1,z0]], 0,0,-1)  // riser (front)
      f([[hw,y0,z0],[hw,y0,z1],[hw,y1,z1],[hw,y1,z0]], 1,0,0)      // right side
      f([[-hw,y0,z1],[-hw,y0,z0],[-hw,y1,z0],[-hw,y1,z1]], -1,0,0) // left side
      // Underside of tread (visible from below on open stairs or under landing)
      f([[-hw,y0,z1],[hw,y0,z1],[hw,y0,z0],[-hw,y0,z0]], 0,-1,0)
    }
  }

  if (!FLOAT) {
    // Close the back of the topmost step
    const yTop = H, zBack = D/2
    f([[hw,0,zBack],[hw,yTop,zBack],[-hw,yTop,zBack],[-hw,0,zBack]], 0,0,1)

    addStringers(W, D, H, positions, normals, indices)
  }

  return build(positions, normals, indices)
}

// ── side stringers ────────────────────────────────────────────────────────────
// Each stringer is a diagonal slab running from the base to the top of stairs,
// sitting above the tread nosing line.

function addStringers(W, D, H, positions, normals, indices) {
  const sl   = Math.sqrt(D * D + H * H)
  // Perpendicular unit vector above the slope (in YZ plane):
  // slope dir = (H, D) → above-perp (CW 90°) = (D, -H) / sl
  const py   =  D / sl   // Y component of above-slope perp
  const pz   = -H / sl   // Z component
  const SHT  = 0.18      // stringer height above nosing
  const ST   = 0.04      // stringer thickness (in X)

  // Corner YZ coords (relative to stair front z=-D/2, y=0)
  const Ay = 0,         Az = -D/2
  const By = H,         Bz =  D/2
  const Cy = H+SHT*py,  Cz = D/2 + SHT*pz
  const Dy = SHT*py,    Dz = -D/2 + SHT*pz

  const f = (...a) => addFace(positions, normals, indices, ...a)

  for (const [sx, ix, onx] of [[-W/2, -W/2+ST, -1], [W/2, W/2-ST, 1]]) {
    // Outer face (facing outward in X)
    f([[sx,Ay,Az],[sx,By,Bz],[sx,Cy,Cz],[sx,Dy,Dz]], onx,0,0)
    // Inner face
    f([[ix,Dy,Dz],[ix,Cy,Cz],[ix,By,Bz],[ix,Ay,Az]], -onx,0,0)
    // Top face (above slope, normal = perpAbove)
    f([[sx,Dy,Dz],[sx,Cy,Cz],[ix,Cy,Cz],[ix,Dy,Dz]], 0,py,pz)
    // Bottom face (along slope, normal = -perpAbove)
    f([[ix,Ay,Az],[ix,By,Bz],[sx,By,Bz],[sx,Ay,Az]], 0,-py,-pz)
    // Front face (toward base, normal along -slope)
    f([[sx,Ay,Az],[sx,Dy,Dz],[ix,Dy,Dz],[ix,Ay,Az]], 0,-H/sl,-D/sl)
    // Back face (toward top, normal along +slope)
    f([[ix,By,Bz],[ix,Cy,Cz],[sx,Cy,Cz],[sx,By,Bz]], 0,H/sl,D/sl)
  }
}

// ─── spiral stairs ────────────────────────────────────────────────────────────

function buildSpiralStairs(W, D, H, N) {
  const radius  = Math.min(W, D) / 2
  const rPole   = Math.min(0.18, radius * 0.2)  // central column radius
  const rOuter  = radius
  const stepH   = H / N
  const stepAng = (2 * Math.PI) / N
  const SEGS    = 3    // arc segments per step (3 = straight-sided wedge approx)

  const positions = [], normals = [], indices = []
  const f = (...a) => addFace(positions, normals, indices, ...a)

  for (let i = 0; i < N; i++) {
    const a1 = i * stepAng
    const a2 = a1 + stepAng
    const yBot = i * stepH
    const yTop = yBot + stepH

    // Sub-divide the arc so it looks smoother
    for (let s = 0; s < SEGS; s++) {
      const sa1 = a1 + s * stepAng / SEGS
      const sa2 = a1 + (s + 1) * stepAng / SEGS

      const c1i = Math.cos(sa1), s1i = Math.sin(sa1)
      const c2i = Math.cos(sa2), s2i = Math.sin(sa2)

      // Tread top (horizontal)
      f([
        [rPole*c1i, yTop, rPole*s1i],
        [rOuter*c1i, yTop, rOuter*s1i],
        [rOuter*c2i, yTop, rOuter*s2i],
        [rPole*c2i, yTop, rPole*s2i],
      ], 0, 1, 0)

      // Tread underside
      f([
        [rPole*c2i, yBot, rPole*s2i],
        [rOuter*c2i, yBot, rOuter*s2i],
        [rOuter*c1i, yBot, rOuter*s1i],
        [rPole*c1i, yBot, rPole*s1i],
      ], 0, -1, 0)

      // Outer arc face (riser / outer edge)
      f([
        [rOuter*c1i, yBot, rOuter*s1i],
        [rOuter*c2i, yBot, rOuter*s2i],
        [rOuter*c2i, yTop, rOuter*s2i],
        [rOuter*c1i, yTop, rOuter*s1i],
      ], (c1i+c2i)/2, 0, (s1i+s2i)/2)  // outward normal approx

      // Inner face (pole side)
      f([
        [rPole*c2i, yBot, rPole*s2i],
        [rPole*c1i, yBot, rPole*s1i],
        [rPole*c1i, yTop, rPole*s1i],
        [rPole*c2i, yTop, rPole*s2i],
      ], -(c1i+c2i)/2, 0, -(s1i+s2i)/2)
    }

    // Leading edge face (the "riser" of spiral step — front radial face)
    const ca1 = Math.cos(a1), sa1r = Math.sin(a1)
    f([
      [rPole*ca1, yBot, rPole*sa1r],
      [rOuter*ca1, yBot, rOuter*sa1r],
      [rOuter*ca1, yTop, rOuter*sa1r],
      [rPole*ca1, yTop, rPole*sa1r],
    ], -Math.sin(a1), 0, Math.cos(a1))
  }

  // Central column (pole) — 8-sided cylinder
  addCylinder(0, 0, rPole, H, 8, positions, normals, indices)
  // Flat cap at top
  addCircleCap(0, H, rPole, 8, true, positions, normals, indices)

  return build(positions, normals, indices)
}

function addCylinder(cx, cz, r, h, segs, positions, normals, indices) {
  const f = (...a) => addFace(positions, normals, indices, ...a)
  for (let i = 0; i < segs; i++) {
    const a1 = (i / segs) * Math.PI * 2
    const a2 = ((i + 1) / segs) * Math.PI * 2
    const c1 = Math.cos(a1), s1 = Math.sin(a1)
    const c2 = Math.cos(a2), s2 = Math.sin(a2)
    const nx = (c1 + c2) / 2, nz = (s1 + s2) / 2
    f([
      [cx + r*c1, 0, cz + r*s1],
      [cx + r*c2, 0, cz + r*s2],
      [cx + r*c2, h, cz + r*s2],
      [cx + r*c1, h, cz + r*s1],
    ], nx, 0, nz)
  }
}

function addCircleCap(cx, y, r, segs, up, positions, normals, indices) {
  const base = positions.length / 3
  const ny = up ? 1 : -1
  positions.push(cx, y, 0)   // center vertex
  normals.push(0, ny, 0)
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2
    positions.push(cx + r * Math.cos(a), y, r * Math.sin(a))
    normals.push(0, ny, 0)
  }
  for (let i = 0; i < segs; i++) {
    if (up) indices.push(base, base + 1 + i, base + 2 + i)
    else    indices.push(base, base + 2 + i, base + 1 + i)
  }
}
