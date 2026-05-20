import * as THREE from 'three'
import { KONVA_TO_THREE } from './threeMath'

const WALL_HEIGHT = 2.4
const DOOR_THICKNESS = 0.04
const DOOR_ANIM_MS = 300

// Builds / syncs door panel Groups for every door-type opening. Each Group's
// origin sits at the hinge (left edge of the opening in wall-local X); the
// door panel mesh is a child offset +width/2 along the group's local X.
// Rotating the group around its Y-axis swings the door open/closed.
//
// `doorAnims` is a live Map<id, anim> that tickDoorAnims reads every frame.
export function reconcileDoors(scene, walls, openings, meshMap, doorAnims) {
  const present = new Set()

  for (const o of openings) {
    if (o.type !== 'door') continue
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
    // Hinge at the left edge of the opening in wall-local X.
    const hingeLX = (o.position - 0.5) * length - o.width / 2
    // Wall centre in world space.
    const wallCX = (ax + bx) / 2
    const wallCZ = (az + bz) / 2
    // Convert hinge offset from wall-local to world (Three Y-rotation matrix).
    const hingeWX = wallCX + hingeLX * Math.cos(wallYaw)
    const hingeWZ = wallCZ - hingeLX * Math.sin(wallYaw)

    const closedAngle = wallYaw
    const openAngle = wallYaw + Math.PI / 2
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
      // Trigger animation when open state flips.
      const prev = group.userData.targetAngle
      if (prev !== targetAngle) {
        doorAnims.set(o.id, {
          group,
          startAngle: group.rotation.y,
          targetAngle,
          startTime: performance.now(),
        })
        group.userData.targetAngle = targetAngle
      }
    }

    group.position.set(hingeWX, 0, hingeWZ)
  }

  for (const [id, group] of meshMap) {
    if (!present.has(id)) {
      scene.remove(group)
      group.traverse((n) => {
        n.geometry?.dispose?.()
        n.material?.dispose?.()
      })
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
