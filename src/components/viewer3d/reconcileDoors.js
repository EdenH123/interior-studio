import * as THREE from 'three'
import { KONVA_TO_THREE } from './threeMath'

const DOOR_THICKNESS = 0.04
const DOOR_ANIM_MS   = 300
const WIN_FT = 0.055  // window frame bar thickness (m)
const WIN_FD = 0.13   // window frame depth through wall (m)

function buildWindowFrame(w, h) {
  const FT = WIN_FT, FD = WIN_FD
  const group = new THREE.Group()

  const frameMat = new THREE.MeshStandardMaterial({ color: 0xf0ece6, roughness: 0.55, metalness: 0 })
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xb8d8e8, transparent: true, opacity: 0.28,
    roughness: 0.05, metalness: 0.12, depthWrite: false,
  })

  const mk = (geo, mat, shadow = true) => {
    const m = new THREE.Mesh(geo, mat)
    if (shadow) { m.castShadow = true; m.receiveShadow = true }
    return m
  }

  // 4 frame bars around the opening
  const left  = mk(new THREE.BoxGeometry(FT, h, FD), frameMat)
  const right = mk(new THREE.BoxGeometry(FT, h, FD), frameMat)
  const top   = mk(new THREE.BoxGeometry(w, FT, FD), frameMat)
  // Sill: slightly wider and deeper than frame — gives a realistic ledge
  const sill  = mk(new THREE.BoxGeometry(w + 0.08, FT * 1.8, FD + 0.07), frameMat)
  // Horizontal glazing bar at mid-height — splits glass into two panes
  const midBar = mk(new THREE.BoxGeometry(w - 2 * FT, FT * 0.7, FD), frameMat)

  left.position.set(-w / 2 + FT / 2,  h / 2, 0)
  right.position.set(w / 2 - FT / 2,  h / 2, 0)
  top.position.set(0,                  h - FT / 2, 0)
  sill.position.set(0,                 FT * 0.9, 0)
  midBar.position.set(0,               h / 2, 0)

  // Two glass panes — lower and upper, separated by the mid-bar
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

function buildDoubleDoor(w, h) {
  const group = new THREE.Group()
  const panelMat = new THREE.MeshStandardMaterial({ color: 0xc8a97e, roughness: 0.8, metalness: 0 })

  const makePanel = (hinge, openSign) => {
    const panel = new THREE.Group()
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w / 2, h - 0.01, DOOR_THICKNESS), panelMat)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.position.set(openSign * w / 4, (h - 0.01) / 2, 0)
    panel.add(mesh)
    panel.position.x = hinge
    return panel
  }

  const leftPanel  = makePanel(-w / 2, 1)
  const rightPanel = makePanel( w / 2, -1)
  group.add(leftPanel, rightPanel)
  group.userData.leftPanel  = leftPanel
  group.userData.rightPanel = rightPanel
  return group
}

function buildSlidingDoor(w, h) {
  const group = new THREE.Group()
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0xc8a97e, roughness: 0.8, metalness: 0, transparent: true, opacity: 0.85,
  })
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h - 0.01, DOOR_THICKNESS), panelMat)
  mesh.castShadow = true
  mesh.position.set(w * 0.35, (h - 0.01) / 2, 0)
  group.add(mesh)
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

// Builds / syncs door panel Groups and window frame Groups for all openings.
// `doorAnims` is a live Map<id, anim> that tickDoorAnims reads every frame.
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
    const wallCX  = (ax + bx) / 2
    const wallCZ  = (az + bz) / 2
    const yOffset = opts.levelOffsets?.get(wall.levelId) ?? 0
    const visible = !opts.solo || !wall.levelId || wall.levelId === opts.activeLevelId

    if (o.type === 'door') {
      // Hinge at the left edge of the opening in wall-local X.
      const hingeLX = (o.position - 0.5) * length - o.width / 2
      const hingeWX = wallCX + hingeLX * Math.cos(wallYaw)
      const hingeWZ = wallCZ - hingeLX * Math.sin(wallYaw)

      const closedAngle = wallYaw
      const openAngle   = wallYaw + Math.PI / 2
      const targetAngle = o.open ? openAngle : closedAngle

      let group = meshMap.get(o.id)
      if (!group) {
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(o.width, o.height, DOOR_THICKNESS),
          new THREE.MeshStandardMaterial({ color: 0xc8a97e, roughness: 0.8, metalness: 0.0 }),
        )
        panel.position.set(o.width / 2, o.height / 2, 0)
        panel.castShadow = true
        panel.receiveShadow = true

        group = new THREE.Group()
        group.userData.kind = 'door'
        group.userData.id = o.id
        group.add(panel)
        group.rotation.y = targetAngle
        group.userData.targetAngle = targetAngle
        scene.add(group)
        meshMap.set(o.id, group)
      } else {
        const prev = group.userData.targetAngle
        if (prev !== targetAngle) {
          doorAnims.set(o.id, { group, startAngle: group.rotation.y, targetAngle, startTime: performance.now() })
          group.userData.targetAngle = targetAngle
        }
      }
      group.position.set(hingeWX, yOffset, hingeWZ)
      group.visible = visible

    } else if (o.type === 'door-double') {
      // Double door: two panels, each half-width, animated together like a hinged door.
      const hingeLX = (o.position - 0.5) * length - o.width / 2
      const hingeWX = wallCX + hingeLX * Math.cos(wallYaw)
      const hingeWZ = wallCZ - hingeLX * Math.sin(wallYaw)
      const closedAngle = wallYaw
      const openAngle   = wallYaw + Math.PI / 2
      const targetAngle = o.open ? openAngle : closedAngle

      let group = meshMap.get(o.id)
      if (!group) {
        group = buildDoubleDoor(o.width, o.height)
        group.userData.kind = 'door'
        group.userData.id = o.id
        group.rotation.y = targetAngle
        group.userData.targetAngle = targetAngle
        scene.add(group)
        meshMap.set(o.id, group)
      } else {
        const prev = group.userData.targetAngle
        if (prev !== targetAngle) {
          doorAnims.set(o.id, { group, startAngle: group.rotation.y, targetAngle, startTime: performance.now() })
          group.userData.targetAngle = targetAngle
        }
      }
      group.position.set(hingeWX, yOffset, hingeWZ)
      group.visible = visible

    } else if (o.type === 'door-sliding') {
      // Sliding door: static panel shown partially slid open, no animation.
      const centerLX = (o.position - 0.5) * length
      const doorWX   = wallCX + centerLX * Math.cos(wallYaw)
      const doorWZ   = wallCZ - centerLX * Math.sin(wallYaw)

      let group = meshMap.get(o.id)
      if (!group || group.userData.width !== o.width || group.userData.height !== o.height) {
        if (group) { scene.remove(group); disposeMeshes(group) }
        group = buildSlidingDoor(o.width, o.height)
        group.userData.kind   = 'door'
        group.userData.id     = o.id
        group.userData.width  = o.width
        group.userData.height = o.height
        scene.add(group)
        meshMap.set(o.id, group)
      }
      group.position.set(doorWX, yOffset, doorWZ)
      group.rotation.y = wallYaw
      group.visible    = visible

    } else {
      // All window-* types: centered on o.position along the wall, raised by sill height.
      const centerLX = (o.position - 0.5) * length
      const winWX    = wallCX + centerLX * Math.cos(wallYaw)
      const winWZ    = wallCZ - centerLX * Math.sin(wallYaw)
      const sillH    = o.sillHeight ?? 0.9

      let group = meshMap.get(o.id)
      if (!group || group.userData.width !== o.width || group.userData.height !== o.height) {
        if (group) { scene.remove(group); disposeMeshes(group) }
        group = buildWindowFrame(o.width, o.height)
        group.userData.kind   = 'window'
        group.userData.id     = o.id
        group.userData.width  = o.width
        group.userData.height = o.height
        scene.add(group)
        meshMap.set(o.id, group)
      }
      group.position.set(winWX, yOffset + sillH, winWZ)
      group.rotation.y = wallYaw
      group.visible    = visible
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
    anim.group.rotation.y = anim.startAngle + (anim.targetAngle - anim.startAngle) * s
    if (t >= 1) doorAnims.delete(id)
  }
}
