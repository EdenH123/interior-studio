// Browser-side procedural GLB generation.
// Same box/cyl/merge math as the generate-*.mjs scripts, but produces a
// Blob URL instead of writing a file — usable directly by GLTFLoader.
//
// Conventions: X=[-W/2,W/2], Y=[0,H], Z=[-D/2,D/2]

// ─── primitives ──────────────────────────────────────────────────────────────

function box(x1, y1, z1, x2, y2, z2) {
  const p = [], n = []
  p.push(x2,y1,z1, x2,y2,z1, x2,y2,z2, x2,y1,z2); n.push(1,0,0, 1,0,0, 1,0,0, 1,0,0)
  p.push(x1,y1,z2, x1,y2,z2, x1,y2,z1, x1,y1,z1); n.push(-1,0,0, -1,0,0, -1,0,0, -1,0,0)
  p.push(x1,y2,z2, x2,y2,z2, x2,y2,z1, x1,y2,z1); n.push(0,1,0, 0,1,0, 0,1,0, 0,1,0)
  p.push(x1,y1,z1, x2,y1,z1, x2,y1,z2, x1,y1,z2); n.push(0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0)
  p.push(x2,y1,z2, x2,y2,z2, x1,y2,z2, x1,y1,z2); n.push(0,0,1, 0,0,1, 0,0,1, 0,0,1)
  p.push(x1,y1,z1, x1,y2,z1, x2,y2,z1, x2,y1,z1); n.push(0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1)
  const idx = []
  for (let f = 0; f < 6; f++) { const b = f*4; idx.push(b,b+1,b+2,b,b+2,b+3) }
  return { positions: p, normals: n, indices: idx }
}

function cyl(cx, cz, y1, y2, r, segs = 8) {
  const p = [], n = [], idx = []
  const step = (2 * Math.PI) / segs
  const cos = Array.from({ length: segs+1 }, (_,i) => Math.cos(i*step))
  const sin = Array.from({ length: segs+1 }, (_,i) => Math.sin(i*step))
  for (let i = 0; i < segs; i++) {
    const b = p.length/3
    p.push(cx+r*cos[i],y1,cz+r*sin[i], cx+r*cos[i+1],y1,cz+r*sin[i+1],
           cx+r*cos[i+1],y2,cz+r*sin[i+1], cx+r*cos[i],y2,cz+r*sin[i])
    n.push(cos[i],0,sin[i], cos[i+1],0,sin[i+1], cos[i+1],0,sin[i+1], cos[i],0,sin[i])
    idx.push(b,b+1,b+2, b,b+2,b+3)
  }
  const bc = p.length/3; p.push(cx,y1,cz); n.push(0,-1,0)
  for (let i=0;i<segs;i++){p.push(cx+r*cos[i],y1,cz+r*sin[i]);n.push(0,-1,0)}
  for (let i=0;i<segs;i++) idx.push(bc,bc+1+((i+1)%segs),bc+1+i)
  const tc = p.length/3; p.push(cx,y2,cz); n.push(0,1,0)
  for (let i=0;i<segs;i++){p.push(cx+r*cos[i],y2,cz+r*sin[i]);n.push(0,1,0)}
  for (let i=0;i<segs;i++) idx.push(tc,tc+1+i,tc+1+((i+1)%segs))
  return { positions: p, normals: n, indices: idx }
}

function merge(parts) {
  const positions=[], normals=[], indices=[]
  let off=0
  for (const p of parts) {
    positions.push(...p.positions); normals.push(...p.normals)
    for (const i of p.indices) indices.push(i+off)
    off += p.positions.length/3
  }
  return { positions, normals, indices }
}

// ─── GLB binary builder ───────────────────────────────────────────────────────

function buildGLBBlob(parts, color = [0.72, 0.65, 0.57]) {
  const { positions, normals, indices } = merge(Array.isArray(parts) ? parts : [parts])
  const posF32 = new Float32Array(positions)
  const nrmF32 = new Float32Array(normals)
  const idxU16 = new Uint16Array(indices)
  const posBytes = posF32.byteLength, nrmBytes = nrmF32.byteLength, idxBytes = idxU16.byteLength
  const binLen = posBytes + nrmBytes + idxBytes

  const bin = new Uint8Array(binLen)
  bin.set(new Uint8Array(posF32.buffer), 0)
  bin.set(new Uint8Array(nrmF32.buffer), posBytes)
  bin.set(new Uint8Array(idxU16.buffer), posBytes + nrmBytes)

  const pMin=[Infinity,Infinity,Infinity], pMax=[-Infinity,-Infinity,-Infinity]
  for (let i=0;i<positions.length;i+=3) for (let c=0;c<3;c++) {
    pMin[c]=Math.min(pMin[c],positions[i+c]); pMax[c]=Math.max(pMax[c],positions[i+c])
  }
  const r4 = (v) => Math.round(v*10000)/10000
  const vc = positions.length/3, ic = indices.length

  const gltf = {
    asset: { version:'2.0', generator:'interior-studio-browser' },
    scenes:[{nodes:[0]}], scene:0, nodes:[{mesh:0}],
    meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1},indices:2,material:0,mode:4}]}],
    materials:[{pbrMetallicRoughness:{baseColorFactor:[...color,1],metallicFactor:0,roughnessFactor:0.75},doubleSided:false}],
    accessors:[
      {bufferView:0,componentType:5126,count:vc,type:'VEC3',min:pMin.map(r4),max:pMax.map(r4)},
      {bufferView:1,componentType:5126,count:vc,type:'VEC3'},
      {bufferView:2,componentType:5123,count:ic,type:'SCALAR'},
    ],
    bufferViews:[
      {buffer:0,byteOffset:0,byteLength:posBytes,target:34962},
      {buffer:0,byteOffset:posBytes,byteLength:nrmBytes,target:34962},
      {buffer:0,byteOffset:posBytes+nrmBytes,byteLength:idxBytes,target:34963},
    ],
    buffers:[{byteLength:binLen}],
  }

  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltf))
  const jsonPad   = (jsonBytes.length+3)&~3
  const totalLen  = 12 + 8 + jsonPad + 8 + binLen
  const buf = new ArrayBuffer(totalLen)
  const dv  = new DataView(buf)
  const u8  = new Uint8Array(buf)
  let o = 0
  dv.setUint32(o,0x46546C67,true);o+=4; dv.setUint32(o,2,true);o+=4; dv.setUint32(o,totalLen,true);o+=4
  dv.setUint32(o,jsonPad,true);o+=4;    dv.setUint32(o,0x4E4F534A,true);o+=4
  u8.set(jsonBytes,o); u8.fill(0x20,o+jsonBytes.length,o+jsonPad); o+=jsonPad
  dv.setUint32(o,binLen,true);o+=4;     dv.setUint32(o,0x004E4942,true);o+=4
  u8.set(bin,o)
  return new Blob([buf],{type:'model/gltf-binary'})
}

// ─── furniture templates ──────────────────────────────────────────────────────
// Each takes (w, d, h) in metres and returns parts array + default color.

function sofaParts(w, d, h) {
  const arm = Math.min(0.09, w * 0.07)
  const sh  = h * 0.54   // seat height
  return [
    box(-w/2,0,-d/2, w/2,sh*0.55,d/2),                       // base
    box(-w/2+arm,sh*0.55,-d/2+d*0.02, w/2-arm,sh,d/2),      // seat cushion
    box(-w/2,sh,-d/2, w/2,h,-d/2+d*0.28),                    // back cushion
    box(-w/2,sh*0.55,-d/2, -w/2+arm,h*0.82,d/2),             // left arm
    box(w/2-arm,sh*0.55,-d/2, w/2,h*0.82,d/2),               // right arm
  ]
}

function armchairParts(w, d, h) { return sofaParts(w, d, h) }

function bedParts(w, d, h) {
  return [
    box(-w/2,0,-d/2, w/2,h*0.25,d/2),                        // base
    box(-w/2,0,-d/2, w/2,h,-d/2+d*0.055),                    // headboard
    box(-w/2,0,d/2-d*0.045, w/2,h*0.44,d/2),                 // footboard
    box(-w/2,h*0.25,-d/2+d*0.055, w/2,h*0.38,d/2-d*0.045),  // mattress
  ]
}

function wardrobeParts(w, d, h) {
  const t = Math.min(0.018, d*0.04)
  return [
    box(-w/2,0,-d/2, w/2,h,d/2),                             // carcass
    box(-w/2+t,t,d/2-t, 0,h-t,d/2),                          // left door
    box(0,t,d/2-t, w/2-t,h-t,d/2),                           // right door
    box(-w/2+t+w*0.09,h*0.47,d/2, -w/2+t+w*0.03,h*0.53,d/2+t*2),  // L handle
    box(w/2-t-w*0.09,h*0.47,d/2, w/2-t-w*0.03,h*0.53,d/2+t*2),    // R handle
    cyl(0,0,h*0.28,h*0.72,Math.min(0.007,w*0.004),6),        // hanging rod
  ]
}

function shelvingParts(w, d, h) {
  const t = Math.min(0.018, h*0.012)
  const num = Math.max(2, Math.round(h/0.33))
  const parts = [
    box(-w/2,0,-d/2, w/2,t,d/2),
    box(-w/2,h-t,-d/2, w/2,h,d/2),
    box(-w/2,t,-d/2, -w/2+t,h-t,d/2),
    box(w/2-t,t,-d/2, w/2,h-t,d/2),
    box(-w/2,0,-d/2, w/2,h,-d/2+t),
  ]
  const step = (h-2*t)/(num+1)
  for (let i=1;i<=num;i++) {
    const y = t+i*step
    parts.push(box(-w/2+t,y,-d/2+t, w/2-t,y+t,d/2))
  }
  return parts
}

function cabinetParts(w, d, h) {
  const n = Math.max(2,Math.round(h/0.19))
  const t = 0.016
  const parts = [box(-w/2,0,-d/2, w/2,h,d/2)]
  const dh = (h-2*t)/n
  for (let i=0;i<n;i++) {
    const y1=t+i*dh+0.004, y2=y1+dh-0.008
    parts.push(box(-w/2+t,y1,d/2-t, w/2-t,y2,d/2))
    parts.push(box(-w*0.06,y1+(y2-y1)*0.38,d/2, w*0.06,y1+(y2-y1)*0.62,d/2+t*2))
  }
  return parts
}

function tableParts(w, d, h) {
  const tt = Math.min(0.04,h*0.055)
  const lr = Math.min(0.025,w*0.022)
  const li = Math.max(lr*2,Math.min(0.08,w*0.07))
  return [
    box(-w/2,h-tt,-d/2, w/2,h,d/2),
    cyl(-w/2+li,-d/2+li,0,h-tt,lr,6), cyl(w/2-li,-d/2+li,0,h-tt,lr,6),
    cyl(-w/2+li, d/2-li,0,h-tt,lr,6), cyl(w/2-li, d/2-li,0,h-tt,lr,6),
  ]
}

function stoolParts(w, d, h) {
  const r = Math.min(w,d)/2
  return [
    cyl(0,0,h*0.82,h,r*0.88,12),
    cyl(0,0,0.04,h*0.82,r*0.08,8),
    box(-r*0.65,0,-r*0.06,r*0.65,0.045,r*0.06),
    box(-r*0.06,0,-r*0.65,r*0.06,0.045,r*0.65),
  ]
}

// ─── public API ──────────────────────────────────────────────────────────────

export const TEMPLATES = {
  sofa:      { label: 'Sofa / Couch',        color: [0.65,0.58,0.44], hex: '#c8b896', fn: sofaParts },
  armchair:  { label: 'Armchair',            color: [0.65,0.58,0.44], hex: '#c8b896', fn: armchairParts },
  bed:       { label: 'Bed',                 color: [0.74,0.68,0.58], hex: '#c4ae90', fn: bedParts },
  wardrobe:  { label: 'Wardrobe / Cabinet',  color: [0.90,0.89,0.87], hex: '#e8e4de', fn: wardrobeParts },
  shelving:  { label: 'Shelving / Bookcase', color: [0.70,0.50,0.22], hex: '#b07c38', fn: shelvingParts },
  cabinet:   { label: 'Drawer unit',         color: [0.90,0.89,0.87], hex: '#e8e4de', fn: cabinetParts },
  table:     { label: 'Table / Desk',        color: [0.52,0.38,0.14], hex: '#845c20', fn: tableParts },
  stool:     { label: 'Stool / Chair',       color: [0.52,0.38,0.14], hex: '#845c20', fn: stoolParts },
}

// Generates a GLB Blob URL for the given template + dimensions (metres).
// The caller must call URL.revokeObjectURL(url) when the item is removed.
export function generateModelBlobUrl(templateKey, w, d, h) {
  const tmpl = TEMPLATES[templateKey]
  if (!tmpl) return null
  try {
    const parts = tmpl.fn(w, d, h)
    const blob  = buildGLBBlob(parts, tmpl.color)
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}
