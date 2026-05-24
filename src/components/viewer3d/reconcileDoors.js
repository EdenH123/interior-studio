import * as THREE from 'three'
import { KONVA_TO_THREE } from './threeMath'
import { WALL_THICKNESS } from '../canvas/constants'
import { getDoorTexture } from './proceduralTextures'

const DOOR_THICKNESS = 0.04
const DEFAULT_WALL_HALF = (WALL_THICKNESS * KONVA_TO_THREE) / 2  // 0.1 m
const DOOR_ANIM_MS   = 300
const WIN_FT = 0.055  // window frame bar thickness (m)
const WIN_FD = 0.13   // window frame depth through wall (m)
const CASING_WIDTH = 0.07   // visible trim width around opening (m)
const CASING_DEPTH = 0.018  // how far the casing sticks out from the wall face (m)
const CASING_COLOR = 0xa8896a

const DEFAULT_DOOR_COLOR   = 0xc8a97e  // warm wood
const DEFAULT_WINDOW_COLOR = 0xf0ece6  // off-white frame

function hexToInt(hex) {
  if (!hex) return null
  return parseInt(hex.replace('#', ''), 16)
}

// Builds the wood casing (jambs + header) that wraps a door opening on
// both sides of the wall. Without this, the doorway is invisible in 3D:
// the CSG-cut hole is there but it's hidden behind the door panel from
// the room side, so the wall reads as solid. The casing makes the
// opening obvious from any angle.
function buildDoorCasing(w, h, wallHalfThick) {
  const group = new THREE.Group()
  const CT = CASING_WIDTH
  const CD = CASING_DEPTH
  const mat = new THREE.MeshStandardMaterial({ color: CASING_COLOR, roughness: 0.7, metalness: 0 })

  const mk = (geo) => {
    const m = new THREE.Mesh(geo, mat)
    m.castShadow = true
    m.receiveShadow = true
    return m
  }

  for (const side of [1, -1]) {
    const z = side * (wallHalfThick + CD / 2)
    const top   = mk(new THREE.BoxGeometry(w + 2 * CT, CT, CD))
    const left  = mk(new THREE.BoxGeometry(CT, h + CT, CD))
    const right = mk(new THREE.BoxGeometry(CT, h + CT, CD))
    top.position.set(0,             h + CT / 2,     z)
    left.position.set(-w / 2 - CT / 2,  (h + CT) / 2, z)
    right.position.set(w / 2 + CT / 2,  (h + CT) / 2, z)
    group.add(top, left, right)
  }
  return group
}

// Returns the material for a door panel given the opening's material id
// and tint color. Material ids: 'painted' (flat colour, default),
// 'wood' (procedural vertical wood grain), 'glass' (frosted glass for
// sliding doors).
function buildPanelMaterial(materialId, color) {
  if (materialId === 'wood') {
    const tex = getDoorTexture()
    return new THREE.MeshStandardMaterial({
      map: tex, color: 0xffffff, roughness: 0.65, metalness: 0,
    })
  }
  if (materialId === 'glass') {
    return new THREE.MeshPhysicalMaterial({
      color: 0xd9e6ec, roughness: 0.05, metalness: 0,
      transmission: 0.85, thickness: 0.04, opacity: 1, transparent: true,
    })
  }
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0 })
}

function buildWindowFrame(w, h, frameColor = DEFAULT_WINDOW_COLOR) {
  const FT = WIN_FT, FD = WIN_FD
  const group = new THREE.Group()

  const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.55, metalness: 0 })
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xb8d8e8, transparent: true, opacity: 0.28,
    roughness: 0.05, metalness: 0.12, depthWrite: false,
  })

  const mk = (geo, mat, shadow = true) => {
    const m = new THREE.Mesh(geo, mat)
    if (shadow) { m.castShadow = true; m.receiveShadow = true }
    return m
  }

  const left  = mk(new THREE.BoxGeometry(FT, h, FD), frameMat)
  const right = mk(new THREE.BoxGeometry(FT, h, FD), frameMat)
  const top   = mk(new THREE.BoxGeometry(w, FT, FD), frameMat)
  const sill  = mk(new THREE.BoxGeometry(w + 0.08, FT * 1.8, FD + 0.07), frameMat)
  const midBar = mk(new THREE.BoxGeometry(w - 2 * FT, FT * 0.7, FD), frameMat)

  left.position.set(-w / 2 + FT / 2,  h / 2, 0)
  right.position.set(w / 2 - FT / 2,  h / 2, 0)
  top.position.set(0,                  h - FT / 2, 0)
  sill.position.set(0,                 FT * 0.9, 0)
  midBar.position.set(0,               h / 2, 0)

  const paneH = (h - 2 * FT - FT * 0.7) / 2
  const glassW = w - 2 * FT
  const lowerGlass = mk(new THREE.BoxGeometry(glassW, paneH, 0.006), glassMat, false)
  const upperGlass = mk(new THREE.BoxGeometry(glassW, paneH, 0.006), glassMat, false)
  lowerGlass.position.set(0, FT + paneH / 2, 0)
  upperGlass.position.set(0, FT + paneH + FT * 0.7 + paneH / 2, 0)
  lowerGlass.renderOrder = 1
  upperGlass.renderOrder = 1

  group.add(left, right, top, sill, midBar, lowerGlass, upperGlass)
  return group
}

// Double door: group centred on the opening.
// Left panel pivot at -w/2, right panel pivot at +w/2.
// Each panel's mesh extends inward (toward centre) so they fill the opening when closed.
// When open: left panel rotates -π/2, right panel +π/2 — both swing into the +Z side (room).
function buildDoubleDoor(w, h, panelColor = DEFAULT_DOOR_COLOR, materialId = 'painted') {
  const group = new THREE.Group()
  const panelMat = buildPanelMaterial(materialId, panelColor)

  const makePanel = (pivotX, meshOffsetX) => {
    const panel = new THREE.Group()
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w / 2, h - 0.01, DOOR_THICKNESS), panelMat)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.position.set(meshOffsetX, (h - 0.01) / 2, 0)
    panel.add(mesh)
    panel.position.x = pivotX
    return panel
  }

  // Left panel: pivot at -w/2, mesh center at +w/4 from pivot (fills left half when closed)
  // Right panel: pivot at +w/2, mesh center at -w/4 from pivot (fills right half when closed)
  const leftPanel  = makePanel(-w / 2,  w / 4)
  const rightPanel = makePanel( w / 2, -w / 4)
  group.add(leftPanel, rightPanel)
  group.userData.leftPanel  = leftPanel
  group.userData.rightPanel = rightPanel
  return group
}

// wallHalfThick: half of the wall depth in Three.js metres.
// The panel rides on the room-side (+Z) wall face so it stays visible
// when slid open instead of clipping into the solid wall.
function buildSlidingDoor(w, h, wallHalfThick, panelColor = DEFAULT_DOOR_COLOR, materialId = 'painted') {
  const group = new THREE.Group()
  const panelMat = buildPanelMaterial(materialId, panelColor)
  const panel = new THREE.Mesh(new THREE.BoxGeometry(w, h - 0.01, DOOR_THICKNESS), panelMat)
  panel.castShadow = true
  panel.receiveShadow = true
  // Position panel so its back face sits flush with the wall's room-side face.
  panel.position.set(0, (h - 0.01) / 2, wallHalfThick + DOOR_THICKNESS / 2)
  group.add(panel)

  // Thin overhead track — visible even when panel is fully open to the side.
  const trackMat = new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.4, metalness: 0.6 })
  const track = new THREE.Mesh(new THREE.BoxGeometry(w * 2.2, 0.018, 0.025), trackMat)
  track.position.set(0, h + 0.009, wallHalfThick + 0.012)
  group.add(track)

  return group
}

function disposeMeshes(group) {
  group.traverse((n) => {
    n.geometry?.dispose?.()
    if (n.material) {
      if (Array.isArray(n.material)) n.material.forEach((m) => m.dispose())
      else n.material.dispose()
    }
  })
}

// opts: { levelOffsets?: Map<id,metres>, activeLevelId?: string, solo?: bool }
export function reconcileDoors(scene, walls, openings, meshMap, doorAnims, opts = {}) {
  const present = new Set()

  for (const o of openings) {
    if (!o.type.startsWith('door') && !o.type.startsWith('window')) continue
    const wall = walls.find((w) => w.id === o.wallId)
    if (!wall) continue

    present.add(o.id)

    const ax = wall.x1 * KONVA_TO_THREE
    const az = wall.y1 * KONVA_TO_THREE
    const bx = wall.x2 * KONVA_TO_THREE
    const bz = wall.y2 * KONVA_TO_THREE
    const length = Math.hypot(bx - ax, bz - az)
    if (length < 0.001) continue

    const wallYaw = -Math.atan2(bz - az, bx - ax)
    const cosYaw  = Math.cos(wallYaw)
    const sinYaw  = Math.sin(wallYaw)
    const wallCX  = (ax + bx) / 2
    const wallCZ  = (az + bz) / 2
    const yOffset = opts.levelOffsets?.get(wall.levelId) ?? 0
    const visible = !opts.solo || !wall.levelId || wall.levelId === opts.activeLevelId

    // Centre of the opening in world XZ
    const centerLX = (o.position - 0.5) * length
    const openCX   = wallCX + centerLX * cosYaw
    const openCZ   = wallCZ - centerLX * sinYaw

    const doorColor   = hexToInt(o.color) ?? DEFAULT_DOOR_COLOR
    const windowColor = hexToInt(o.color) ?? DEFAULT_WINDOW_COLOR
    const materialId  = o.material ?? 'painted'
    const matFp = `${o.color ?? ''}:${materialId}`
    const wallHalfThick = (wall.thickness ?? (WALL_THICKNESS * KONVA_TO_THREE)) / 2

    // Casing (jambs + header) for door openings. Static — sits at the opening
    // centre, oriented with the wall, regardless of door open/close state.
    if (o.type.startsWith('door')) {
      const casingKey = `${o.id}:casing`
      present.add(casingKey)
      let casing = meshMap.get(casingKey)
      const casingFp = `${o.width.toFixed(3)}:${o.height.toFixed(3)}:${wallHalfThick.toFixed(3)}`
      if (!casing || casing.userData.casingFp !== casingFp) {
        if (casing) { scene.remove(casing); disposeMeshes(casing) }
        casing = buildDoorCasing(o.width, o.height, wallHalfThick)
        casing.userData.kind = 'door-casing'
        casing.userData.id = o.id
        casing.userData.casingFp = casingFp
        scene.add(casing)
        meshMap.set(casingKey, casing)
      }
      casing.position.set(openCX, yOffset, openCZ)
      casing.rotation.y = wallYaw
      casing.visible = visible
    }

    if (o.type === 'door') {
      // Hinge at the left edge of the opening.
      const hingeLX = centerLX - o.width / 2
      const hingeWX = wallCX + hingeLX * cosYaw
      const hingeWZ = wallCZ - hingeLX * sinYaw

      const closedAngle = wallYaw
      const openAngle   = wallYaw + Math.PI / 2
      const targetAngle = o.open ? openAngle : closedAngle

      let group = meshMap.get(o.id)
      if (!group) {
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(o.width, o.height, DOOR_THICKNESS),
          buildPanelMaterial(materialId, doorColor),
        )
        panel.position.set(o.width / 2, o.height / 2, 0)
        panel.castShadow = true
        panel.receiveShadow = true

        group = new THREE.Group()
        group.userData.kind = 'door'
        group.userData.id = o.id
        group.userData.matFp = matFp
        group.add(panel)
        group.rotation.y = targetAngle
        group.userData.targetAngle = targetAngle
        scene.add(group)
        meshMap.set(o.id, group)
      } else {
        if (group.userData.matFp !== matFp) {
          const panel = group.children[0]
          if (panel?.material) { panel.material.dispose(); panel.material = buildPanelMaterial(materialId, doorColor) }
          group.userData.matFp = matFp
        }
        const prev = group.userData.targetAngle
        if (prev !== targetAngle) {
          doorAnims.set(o.id, { group, startAngle: group.rotation.y, targetAngle, startTime: performance.now() })
          group.userData.targetAngle = targetAngle
        }
      }
      group.position.set(hingeWX, yOffset, hingeWZ)
      group.visible = visible

    } else if (o.type === 'door-double') {
      // Group centred on the opening. Each panel pivots from its outer edge.
      // Open: left panel -π/2, right panel +π/2 (both swing into the +Z / room side).
      const targetLeft  = o.open ? -Math.PI / 2 : 0
      const targetRight = o.open ?  Math.PI / 2 : 0

      let group = meshMap.get(o.id)
      if (!group || group.userData.matFp !== matFp ||
          group.userData.width !== o.width || group.userData.height !== o.height) {
        if (group) { scene.remove(group); disposeMeshes(group); doorAnims.delete(o.id) }
        group = buildDoubleDoor(o.width, o.height, doorColor, materialId)
        group.userData.kind   = 'door'
        group.userData.id     = o.id
        group.userData.matFp  = matFp
        group.userData.width  = o.width
        group.userData.height = o.height
        group.userData.leftPanel.rotation.y  = targetLeft
        group.userData.rightPanel.rotation.y = targetRight
        group.userData.targetLeft  = targetLeft
        group.userData.targetRight = targetRight
        scene.add(group)
        meshMap.set(o.id, group)
      } else {
        const prevL = group.userData.targetLeft  ?? 0
        const prevR = group.userData.targetRight ?? 0
        if (prevL !== targetLeft || prevR !== targetRight) {
          doorAnims.set(o.id, {
            kind: 'double',
            leftPanel:   group.userData.leftPanel,
            rightPanel:  group.userData.rightPanel,
            startLeft:   group.userData.leftPanel.rotation.y,
            targetLeft,
            startRight:  group.userData.rightPanel.rotation.y,
            targetRight,
            startTime: performance.now(),
          })
          group.userData.targetLeft  = targetLeft
          group.userData.targetRight = targetRight
        }
      }
      group.position.set(openCX, yOffset, openCZ)
      group.rotation.y = wallYaw
      group.visible = visible

    } else if (o.type === 'door-sliding') {
      // Closed: panel centred on the opening, riding the room-side wall face.
      // Open: panel slid one full width along the wall (same face, different position).
      const slideX = o.open ? o.width * cosYaw : 0
      const slideZ = o.open ? -o.width * sinYaw : 0
      const targetX = openCX + slideX
      const targetZ = openCZ + slideZ

      let group = meshMap.get(o.id)
      if (!group || group.userData.matFp !== matFp ||
          group.userData.width !== o.width || group.userData.height !== o.height ||
          group.userData.wallHalfThick !== wallHalfThick) {
        if (group) { scene.remove(group); disposeMeshes(group); doorAnims.delete(o.id) }
        group = buildSlidingDoor(o.width, o.height, wallHalfThick, doorColor, materialId)
        group.userData.wallHalfThick = wallHalfThick
        group.userData.kind   = 'door'
        group.userData.id     = o.id
        group.userData.matFp  = matFp
        group.userData.width  = o.width
        group.userData.height = o.height
        group.userData.targetX = targetX
        group.userData.targetZ = targetZ
        group.position.set(targetX, yOffset, targetZ)
        scene.add(group)
        meshMap.set(o.id, group)
      } else {
        const prevX = group.userData.targetX
        const prevZ = group.userData.targetZ
        if (prevX !== targetX || prevZ !== targetZ) {
          doorAnims.set(o.id, {
            kind: 'slide',
            group,
            startX: group.position.x,
            startZ: group.position.z,
            targetX,
            targetZ,
            startTime: performance.now(),
          })
          group.userData.targetX = targetX
          group.userData.targetZ = targetZ
        }
      }
      group.rotation.y = wallYaw
      group.visible = visible

    } else {
      // All window-* types: raised by sill height, centred on opening.
      const sillH = o.sillHeight ?? 0.9

      let group = meshMap.get(o.id)
      if (!group || group.userData.matFp !== matFp ||
          group.userData.width !== o.width || group.userData.height !== o.height) {
        if (group) { scene.remove(group); disposeMeshes(group) }
        group = buildWindowFrame(o.width, o.height, windowColor)
        group.userData.kind   = 'window'
        group.userData.id     = o.id
        group.userData.matFp  = matFp
        group.userData.width  = o.width
        group.userData.height = o.height
        scene.add(group)
        meshMap.set(o.id, group)
      }
      group.position.set(openCX, yOffset + sillH, openCZ)
      group.rotation.y = wallYaw
      group.visible = visible
    }
  }

  for (const [id, group] of meshMap) {
    if (!present.has(id)) {
      scene.remove(group)
      disposeMeshes(group)
      meshMap.delete(id)
      doorAnims.delete(id)
    }
  }
}

export function tickDoorAnims(doorAnims) {
  const now = performance.now()
  for (const [id, anim] of doorAnims) {
    const t = Math.min(1, (now - anim.startTime) / DOOR_ANIM_MS)
    const s = t * t * (3 - 2 * t) // smoothstep
    if (anim.kind === 'double') {
      anim.leftPanel.rotation.y  = anim.startLeft  + (anim.targetLeft  - anim.startLeft)  * s
      anim.rightPanel.rotation.y = anim.startRight + (anim.targetRight - anim.startRight) * s
    } else if (anim.kind === 'slide') {
      anim.group.position.x = anim.startX + (anim.targetX - anim.startX) * s
      anim.group.position.z = anim.startZ + (anim.targetZ - anim.startZ) * s
    } else {
      anim.group.rotation.y = anim.startAngle + (anim.targetAngle - anim.startAngle) * s
    }
    if (t >= 1) doorAnims.delete(id)
  }
}
