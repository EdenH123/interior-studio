import * as THREE from 'three'

export function buildStairsGeometry(width, depth, height, numSteps = 12) {
  const stepH = height / numSteps
  const stepD = depth / numSteps

  const positions = []
  const normals = []
  const indices = []
  let vi = 0  // vertex index counter

  // Add a quad face (4 vertices → 2 triangles)
  function addFace(pts, nx, ny, nz) {
    for (const [x, y, z] of pts) { positions.push(x, y, z); normals.push(nx, ny, nz) }
    indices.push(vi, vi+1, vi+2,  vi, vi+2, vi+3)
    vi += 4
  }

  const hw = width / 2

  for (let i = 0; i < numSteps; i++) {
    const z0 = -depth / 2 + i * stepD
    const z1 = z0 + stepD
    const y0 = 0
    const y1 = (i + 1) * stepH

    // top face
    addFace([[-hw,y1,z0],[hw,y1,z0],[hw,y1,z1],[-hw,y1,z1]], 0,1,0)
    // front face (z1 side — the riser face visible when climbing)
    addFace([[-hw,y0,z1],[hw,y0,z1],[hw,y1,z1],[-hw,y1,z1]], 0,0,1)
    // back face
    addFace([[hw,y0,z0],[-hw,y0,z0],[-hw,y1,z0],[hw,y1,z0]], 0,0,-1)
    // bottom face
    addFace([[-hw,y0,z1],[hw,y0,z1],[hw,y0,z0],[-hw,y0,z0]], 0,-1,0)
    // right face (+x)
    addFace([[hw,y0,z0],[hw,y0,z1],[hw,y1,z1],[hw,y1,z0]], 1,0,0)
    // left face (-x)
    addFace([[-hw,y0,z1],[-hw,y0,z0],[-hw,y1,z0],[-hw,y1,z1]], -1,0,0)
  }

  const geo = new THREE.BufferGeometry()
  geo.setIndex(indices)
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  return geo
}
