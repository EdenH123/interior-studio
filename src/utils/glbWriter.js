// Browser-compatible GLB writer — mirrors the logic in
// scripts/generate-furniture-glbs.mjs but returns an ArrayBuffer
// (no Node.js Buffer / fs). Used by the in-app model composer.

// ─── geometry primitives ─────────────────────────────────────────────────────

export function boxPrim(x1, y1, z1, x2, y2, z2) {
  const p = [], n = []
  p.push(x2,y1,z1, x2,y2,z1, x2,y2,z2, x2,y1,z2); n.push(1,0,0, 1,0,0, 1,0,0, 1,0,0)
  p.push(x1,y1,z2, x1,y2,z2, x1,y2,z1, x1,y1,z1); n.push(-1,0,0,-1,0,0,-1,0,0,-1,0,0)
  p.push(x1,y2,z2, x2,y2,z2, x2,y2,z1, x1,y2,z1); n.push(0,1,0, 0,1,0, 0,1,0, 0,1,0)
  p.push(x1,y1,z1, x2,y1,z1, x2,y1,z2, x1,y1,z2); n.push(0,-1,0,0,-1,0,0,-1,0,0,-1,0)
  p.push(x2,y1,z2, x2,y2,z2, x1,y2,z2, x1,y1,z2); n.push(0,0,1, 0,0,1, 0,0,1, 0,0,1)
  p.push(x1,y1,z1, x1,y2,z1, x2,y2,z1, x2,y1,z1); n.push(0,0,-1,0,0,-1,0,0,-1,0,0,-1)
  const idx = []
  for (let f = 0; f < 6; f++) { const b = f*4; idx.push(b,b+1,b+2,b,b+2,b+3) }
  return { positions: p, normals: n, indices: idx }
}

export function cylPrim(cx, cz, y1, y2, r, segs = 8) {
  const p = [], n = [], idx = []
  const step = (2 * Math.PI) / segs
  const cos = Array.from({ length: segs + 1 }, (_, i) => Math.cos(i * step))
  const sin = Array.from({ length: segs + 1 }, (_, i) => Math.sin(i * step))

  for (let i = 0; i < segs; i++) {
    const b = p.length / 3
    p.push(cx+r*cos[i],y1,cz+r*sin[i], cx+r*cos[i+1],y1,cz+r*sin[i+1],
           cx+r*cos[i+1],y2,cz+r*sin[i+1], cx+r*cos[i],y2,cz+r*sin[i])
    n.push(cos[i],0,sin[i], cos[i+1],0,sin[i+1], cos[i+1],0,sin[i+1], cos[i],0,sin[i])
    idx.push(b,b+1,b+2,b,b+2,b+3)
  }
  const bc = p.length / 3
  p.push(cx,y1,cz); n.push(0,-1,0)
  for (let i = 0; i < segs; i++) { p.push(cx+r*cos[i],y1,cz+r*sin[i]); n.push(0,-1,0) }
  for (let i = 0; i < segs; i++) { idx.push(bc, bc+1+((i+1)%segs), bc+1+i) }

  const tc = p.length / 3
  p.push(cx,y2,cz); n.push(0,1,0)
  for (let i = 0; i < segs; i++) { p.push(cx+r*cos[i],y2,cz+r*sin[i]); n.push(0,1,0) }
  for (let i = 0; i < segs; i++) { idx.push(tc, tc+1+i, tc+1+((i+1)%segs)) }

  return { positions: p, normals: n, indices: idx }
}

function merge(parts) {
  const positions = [], normals = [], indices = []
  let offset = 0
  for (const pt of parts) {
    positions.push(...pt.positions)
    normals.push(...pt.normals)
    for (const i of pt.indices) indices.push(i + offset)
    offset += pt.positions.length / 3
  }
  return { positions, normals, indices }
}

// ─── hex → linear sRGB ────────────────────────────────────────────────────────
// GLTF baseColorFactor is linear sRGB; user color pickers give gamma-encoded hex.
export function hexToLinear(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const toL = (c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  return [toL(r), toL(g), toL(b)]
}

// ─── GLB serialiser ───────────────────────────────────────────────────────────
// groups: Array<{ parts: [{positions, normals, indices}], color: [r,g,b,a],
//                 roughness?, metallic?, name? }>
// Returns ArrayBuffer (binary GLB).
export function writeGLB(groups) {
  const primitives = [], materials = [], accessors = [], bufViews = [], chunks = []
  let byteOffset = 0

  for (const { parts, color, roughness = 0.80, metallic = 0.0, name } of groups) {
    const { positions, normals, indices } = merge(Array.isArray(parts) ? parts : [parts])

    const posF32 = new Float32Array(positions)
    const nrmF32 = new Float32Array(normals)
    const idxU16 = new Uint16Array(indices)
    const idxPad = (4 - (idxU16.byteLength % 4)) % 4

    const pMin = [Infinity, Infinity, Infinity], pMax = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < positions.length; i += 3)
      for (let c = 0; c < 3; c++) {
        pMin[c] = Math.min(pMin[c], positions[i+c])
        pMax[c] = Math.max(pMax[c], positions[i+c])
      }
    const r4 = (v) => Math.round(v * 10000) / 10000
    const vc = positions.length / 3, ic = indices.length

    const posAcc = accessors.length
    accessors.push({ bufferView: bufViews.length, componentType: 5126, count: vc, type: 'VEC3', min: pMin.map(r4), max: pMax.map(r4) })
    bufViews.push({ buffer: 0, byteOffset, byteLength: posF32.byteLength, target: 34962 })
    byteOffset += posF32.byteLength

    const nrmAcc = accessors.length
    accessors.push({ bufferView: bufViews.length, componentType: 5126, count: vc, type: 'VEC3' })
    bufViews.push({ buffer: 0, byteOffset, byteLength: nrmF32.byteLength, target: 34962 })
    byteOffset += nrmF32.byteLength

    const idxAcc = accessors.length
    accessors.push({ bufferView: bufViews.length, componentType: 5123, count: ic, type: 'SCALAR' })
    bufViews.push({ buffer: 0, byteOffset, byteLength: idxU16.byteLength, target: 34963 })
    byteOffset += idxU16.byteLength + idxPad

    const matName = name ?? `part${materials.length}`
    materials.push({ name: matName, pbrMetallicRoughness: { baseColorFactor: color, metallicFactor: metallic, roughnessFactor: roughness }, doubleSided: false })
    primitives.push({ attributes: { POSITION: posAcc, NORMAL: nrmAcc }, indices: idxAcc, material: materials.length - 1, mode: 4 })
    chunks.push({ posF32, nrmF32, idxU16, idxPad })
  }

  // Assemble binary buffer
  const bin = new Uint8Array(byteOffset)
  let off = 0
  for (const { posF32, nrmF32, idxU16, idxPad } of chunks) {
    bin.set(new Uint8Array(posF32.buffer), off); off += posF32.byteLength
    bin.set(new Uint8Array(nrmF32.buffer), off); off += nrmF32.byteLength
    bin.set(new Uint8Array(idxU16.buffer), off); off += idxU16.byteLength + idxPad
  }

  const gltfJson = {
    asset: { version: '2.0', generator: 'interior-studio-composer' },
    scenes: [{ nodes: [0] }], scene: 0,
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives }],
    materials, accessors, bufferViews: bufViews,
    buffers: [{ byteLength: byteOffset }],
  }

  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltfJson))
  const jsonPad = (jsonBytes.length + 3) & ~3
  const jsonChunk = new Uint8Array(jsonPad).fill(0x20)
  jsonChunk.set(jsonBytes)

  const totalLen = 12 + 8 + jsonPad + 8 + byteOffset
  const out = new ArrayBuffer(totalLen)
  const dv = new DataView(out)
  const u8 = new Uint8Array(out)
  let o = 0
  dv.setUint32(o, 0x46546C67, true); o += 4
  dv.setUint32(o, 2, true);          o += 4
  dv.setUint32(o, totalLen, true);   o += 4
  dv.setUint32(o, jsonPad, true);    o += 4
  dv.setUint32(o, 0x4E4F534A, true); o += 4
  u8.set(jsonChunk, o);              o += jsonPad
  dv.setUint32(o, byteOffset, true); o += 4
  dv.setUint32(o, 0x004E4942, true); o += 4
  u8.set(bin, o)
  return out
}
