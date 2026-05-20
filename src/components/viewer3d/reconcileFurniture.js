import * as THREE from 'three'
import { konvaToFloor, konvaRotationToThreeY } from './threeMath'
import {
  isModelLoaded, cloneLoadedModel, loadFurnitureModel, onceModelLoaded, fitToBox,
} from './furnitureModels'
import { setObjectEmissive } from './selectionHighlight'
import { furnitureColorFor } from '../canvas/furnitureMaterials'
import { kelvinToRgb } from '../../utils/colorTemp'
import { buildStairsGeometry } from './stairsGeometry'

const WALL_HEIGHT = 2.4  // metres — matches sceneReconcilers
const MAX_LIGHTS  = 8    // hard cap on active Three.js lights for performance

// True for any type in the 'lighting:' namespace.
export function isLightingType(type) {
  return typeof type === 'string' && type.startsWith('lighting:')
}

// Y position of the Group origin for each light category.
// Ceiling-mounted items flush against the ceiling; floor/table items sit at y=0.
function lightYOffset(type, height) {
  if (type === 'lighting:ceiling-lamp' || type === 'lighting:pendant') {
    return Math.max(0, WALL_HEIGHT - height)
  }
  return 0
}

// Y coordinate (world space) where the Three.js light source sits.
function lightSourceY(type, yOffset, height) {
  if (type === 'lighting:ceiling-lamp') return yOffset           // at shade bottom
  if (type === 'lighting:pendant')      return yOffset           // at shade bottom
  if (type === 'lighting:floor-lamp')   return yOffset + height * 0.9   // near shade
  return yOffset + height * 0.7                                  // table-lamp mid-shade
}

// ─── main export ─────────────────────────────────────────────────────────────

// `lightMap`  — Map<furnitureId, THREE.Light> owned by useThree.
// `lightsOn`  — global master switch from the lighting slice.
// `opts`      — { levelOffsets?: Map<id,metres>, activeLevelId?: string, solo?: bool }
//
// Furniture meshes are wrapped in a `THREE.Group` so we can swap the visual
// (BoxGeometry fallback ↔ loaded GLB) without recreating the addressable
// scene object that picking and selection-highlight reference.
export function reconcileFurniture(scene, furniture, meshMap, lightMap = new Map(), lightsOn = true, opts = {}) {
  const present = new Set()

  // Count currently-on lighting items to enforce the cap.
  let activeLightCount = 0
  for (const f of furniture) {
    if (isLightingType(f.type) && lightsOn && f.on !== false) activeLightCount++
  }

  let assignedCount = 0

  for (const f of furniture) {
    present.add(f.id)
    const pos = konvaToFloor(f.x, f.y)
    const color = furnitureColorFor(f)

    // ── mesh group ──────────────────────────────────────────────────────────
    // Wall-mounted items use mountHeight (bottom of item above floor level).
    // Lighting items use their ceiling/floor offset. Everything else: 0.
    const yOff = f.wallMounted ? (f.mountHeight ?? 0) : lightYOffset(f.type, f.height)
    // tintColor is non-null only when the user has explicitly set a material
    // override — it's null when the piece uses its catalog default color so
    // the GLB's authored materials are left untouched.
    const tintColor = f.material ? color : null

    let group = meshMap.get(f.id)
    if (!group) {
      group = new THREE.Group()
      group.userData.kind = 'furniture'
      group.userData.id = f.id
      group.userData.type = f.type
      group.userData.dims = { width: f.width, depth: f.depth, height: f.height }
      group.userData.color = color
      group.userData.tintColor = tintColor
      group.userData.modelUrl = f.model ?? null
      scene.add(group)
      meshMap.set(f.id, group)
      if (group.userData.modelUrl) populateModelOrSchedule(group)
      else populateBoxFallback(group)
    } else {
      const d = group.userData.dims
      const dimsChanged = !d || d.width !== f.width || d.depth !== f.depth || d.height !== f.height
      const tintChanged = group.userData.tintColor !== tintColor
      group.userData.dims = { width: f.width, depth: f.depth, height: f.height }
      group.userData.tintColor = tintColor
      if (dimsChanged || (tintChanged && group.userData.childKind === 'model')) {
        group.userData.color = color
        rebuildChild(group)
      } else if (group.userData.childKind === 'box') {
        if (group.userData.color !== color) {
          group.userData.color = color
          const box = group.children[0]
          if (box?.material) box.material.color.set(color)
        }
      }
    }
    const floorY = opts.levelOffsets?.get(f.levelId) ?? 0
    group.position.set(pos.x, floorY + yOff, pos.z)
    group.rotation.y = konvaRotationToThreeY(f.rotation)
    group.visible = !opts.solo || !f.levelId || f.levelId === opts.activeLevelId

    // ── Three.js light (lighting items only) ────────────────────────────────
    if (isLightingType(f.type)) {
      const intensity = f.intensity ?? 1.0
      const colorTemp = f.colorTemp ?? 3000
      const distance  = f.distance ?? 5
      const itemOn    = f.on !== false && lightsOn
      const { r, g, b } = kelvinToRgb(colorTemp)
      const lightColor = new THREE.Color(r / 255, g / 255, b / 255)

      // Enforce cap: items beyond MAX_LIGHTS are silenced (not removed).
      const withinCap = !itemOn || assignedCount < MAX_LIGHTS
      const effectiveIntensity = itemOn && withinCap ? intensity : 0
      if (itemOn) assignedCount++

      let light = lightMap.get(f.id)
      if (!light) {
        light = f.lightType === 'spot'
          ? buildSpotLight(scene)
          : new THREE.PointLight()
        light.castShadow = false  // set below
        light.shadow.mapSize.setScalar(512)
        scene.add(light)
        lightMap.set(f.id, light)
      }

      const srcY = lightSourceY(f.type, yOff, f.height)
      light.position.set(pos.x, srcY, pos.z)
      light.color.copy(lightColor)
      light.intensity = effectiveIntensity
      light.distance  = distance
      light.castShadow = (f.castShadow !== false) && itemOn

      if (light.isSpotLight) {
        light.target.position.set(pos.x, 0, pos.z)
        // SpotLight.target must be in the scene to affect direction.
        if (!light.target.parent) scene.add(light.target)
      }
    }
  }

  // ── remove stale entries ──────────────────────────────────────────────────
  for (const [id, group] of meshMap) {
    if (!present.has(id)) {
      group.userData.cancelLoad?.()
      scene.remove(group)
      disposeSubtree(group)
      meshMap.delete(id)
    }
  }
  for (const [id, light] of lightMap) {
    if (!present.has(id)) {
      if (light.isSpotLight && light.target?.parent) scene.remove(light.target)
      scene.remove(light)
      lightMap.delete(id)
    }
  }
}

// ─── private helpers ─────────────────────────────────────────────────────────

function buildSpotLight(scene) {
  const light = new THREE.SpotLight()
  light.angle    = THREE.MathUtils.degToRad(30)
  light.penumbra = 0.2
  light.decay    = 2
  return light
}

function populateBoxFallback(group) {
  clearChildren(group)
  const { width, depth, height } = group.userData.dims
  const isStairs = group.userData.type === 'stairs'
  const geo = isStairs
    ? buildStairsGeometry(width, depth, height)
    : new THREE.BoxGeometry(width, height, depth)
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: new THREE.Color(group.userData.color ?? '#888') }),
  )
  // Stairs geometry spans y=[0..height]; boxes are centred so lift by height/2.
  if (!isStairs) mesh.position.y = height / 2
  mesh.castShadow    = true
  mesh.receiveShadow = true
  group.add(mesh)
  group.userData.childKind = 'box'
}

function populateModelOrSchedule(group) {
  const url = group.userData.modelUrl
  if (isModelLoaded(url)) { populateLoadedModel(group); return }
  populateBoxFallback(group)
  loadFurnitureModel(url)
  group.userData.cancelLoad = onceModelLoaded(url, (loaded) => {
    if (!loaded) return
    if (group.userData.modelUrl !== url) return
    populateLoadedModel(group)
  })
}

function populateLoadedModel(group) {
  clearChildren(group)
  const clone = cloneLoadedModel(group.userData.modelUrl)
  if (!clone) { populateBoxFallback(group); return }
  const { width, depth, height } = group.userData.dims
  fitToBox(clone, width, depth, height)
  clone.traverse((node) => {
    if (node.isMesh) { node.castShadow = true; node.receiveShadow = true }
  })
  group.add(clone)
  group.userData.childKind = 'model'
  applyTint(group)
  if (group.userData.highlighted) setObjectEmissive(clone, true)
}

function rebuildChild(group) {
  if (group.userData.childKind === 'model' && group.userData.modelUrl) populateLoadedModel(group)
  else populateBoxFallback(group)
}

function clearChildren(group) {
  for (const child of [...group.children]) {
    group.remove(child)
    disposeSubtree(child)
  }
}

// Tints every MeshStandardMaterial in the group's model child with the
// override color stored in userData.tintColor. No-op when tintColor is null
// (keeps the GLB's authored colors). Materials were already cloned per-instance
// by cloneLoadedModel so changing one group's tint is isolated.
function applyTint(group) {
  const color = group.userData.tintColor
  if (!color) return
  group.traverse((node) => {
    if (node === group) return
    if (node.isMesh) {
      const mats = Array.isArray(node.material) ? node.material : [node.material]
      for (const mat of mats) {
        if (mat.isMeshStandardMaterial) mat.color.set(color)
      }
    }
  })
}

function disposeSubtree(obj) {
  obj.traverse?.((node) => {
    node.geometry?.dispose?.()
    if (node.material) {
      if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose())
      else node.material.dispose()
    }
  })
}
