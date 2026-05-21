import * as THREE from 'three'
import { LoopSubdivision } from 'three-subdivide'
import { konvaToFloor, konvaRotationToThreeY } from './threeMath'
import {
  isModelLoaded, cloneLoadedModel, loadFurnitureModel, onceModelLoaded, fitToBox,
} from './furnitureModels'
import { setObjectEmissive } from './selectionHighlight'
import { furnitureColorFor, furnitureMaterialPropsFor } from '../canvas/furnitureMaterials'
import { kelvinToRgb } from '../../utils/colorTemp'
import { buildStairsGeometry } from './stairsGeometry'
import { buildRailingGeometry, buildStairRailingGeometry, buildSpiralRailingGeometry } from './railingGeometry'

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
    const yOff = f.wallMounted ? (f.mountHeight ?? 1.2) : lightYOffset(f.type, f.height)
    // tintColor is non-null only when the user has explicitly set a material
    // override — it's null when the piece uses its catalog default color so
    // the GLB's authored materials are left untouched.
    const tintColor    = f.material ? color : null
    const tintMatProps = furnitureMaterialPropsFor(f)  // { roughness, metallic, fabricOnly } | null
    const partColors   = f.partColors ?? {}
    const partColorsKey = JSON.stringify(partColors)

    let group = meshMap.get(f.id)
    if (!group) {
      group = new THREE.Group()
      group.userData.kind = 'furniture'
      group.userData.id = f.id
      group.userData.type = f.type
      group.userData.dims = { width: f.width, depth: f.depth, height: f.height }
      group.userData.color = color
      group.userData.tintColor    = tintColor
      group.userData.tintMatProps = tintMatProps
      group.userData.partColors   = partColors
      group.userData.partColorsKey = partColorsKey
      group.userData.modelUrl = f.model ?? null
      group.userData.stairStyle   = f.stairStyle   ?? null
      group.userData.railingStyle = f.railingStyle ?? null
      group.userData.addRailing   = f.addRailing   ?? false
      group.userData.railingType  = f.railingType  ?? 'wood'
      scene.add(group)
      meshMap.set(f.id, group)
      if (group.userData.modelUrl) populateModelOrSchedule(group)
      else populateBoxFallback(group)
    } else {
      const d = group.userData.dims
      const dimsChanged = !d || d.width !== f.width || d.depth !== f.depth || d.height !== f.height
      const glassChanged = Boolean(group.userData.tintMatProps?.isGlass) !== Boolean(tintMatProps?.isGlass)
      const tintChanged = group.userData.tintColor !== tintColor
        || group.userData.tintMatProps?.roughness !== tintMatProps?.roughness
        || glassChanged
      const partColorsChanged = group.userData.partColorsKey !== partColorsKey
      const stairStyleChanged = group.userData.stairStyle !== (f.stairStyle ?? null)
      const railingChanged    = group.userData.addRailing  !== (f.addRailing  ?? false)
                             || group.userData.railingType !== (f.railingType  ?? 'wood')
      group.userData.dims = { width: f.width, depth: f.depth, height: f.height }
      group.userData.tintColor    = tintColor
      group.userData.tintMatProps = tintMatProps
      group.userData.partColors   = partColors
      group.userData.partColorsKey = partColorsKey
      group.userData.stairStyle   = f.stairStyle  ?? null
      group.userData.addRailing   = f.addRailing  ?? false
      group.userData.railingType  = f.railingType ?? 'wood'
      if (dimsChanged || stairStyleChanged || railingChanged || ((tintChanged || partColorsChanged) && group.userData.childKind === 'model')) {
        group.userData.color = color
        rebuildChild(group)
      } else if (group.userData.childKind === 'box') {
        if (group.userData.color !== color || glassChanged) {
          group.userData.color = color
          populateBoxFallback(group)
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
      if (group.userData.modelUrl?.startsWith('blob:')) URL.revokeObjectURL(group.userData.modelUrl)
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

// Colors and material properties per railing type.
const RAILING_COLOR = { wood: '#8b6914', metal: '#374151', cable: '#374151', glass: '#b8d4e8' }

function populateBoxFallback(group) {
  clearChildren(group)
  const { width, depth, height } = group.userData.dims
  const stairStyle   = group.userData.stairStyle
  const railingStyle = group.userData.railingStyle
  const addRailing   = group.userData.addRailing
  const railingType  = group.userData.railingType ?? 'wood'
  const isStairs     = stairStyle != null
  const isRailing    = railingStyle != null

  let geo
  if (isStairs) {
    geo = buildStairsGeometry(width, depth, height, { style: stairStyle })
  } else if (isRailing) {
    geo = buildRailingGeometry(width, height, railingStyle)
  } else {
    let boxGeo = new THREE.BoxGeometry(width, height, depth)
    const subdivided = LoopSubdivision.modify(boxGeo, 1)
    boxGeo.dispose()
    geo = subdivided
  }

  const props   = group.userData.tintMatProps
  const isGlass = props?.isGlass ?? false
  const mat = isGlass
    ? new THREE.MeshPhysicalMaterial({
        color:        new THREE.Color(group.userData.color ?? '#ddeef5'),
        transmission: props.transmission ?? 0.92,
        roughness:    props.roughness    ?? 0.03,
        metalness:    props.metalness    ?? 0.05,
        transparent: true,
        opacity:      props.opacity      ?? 0.15,
        depthWrite: false,
      })
    : new THREE.MeshStandardMaterial({ color: new THREE.Color(group.userData.color ?? '#888') })

  const mesh = new THREE.Mesh(geo, mat)
  // Stairs + railings span y=[0..height]; boxes are centred so lift by height/2.
  if (!isStairs && !isRailing) mesh.position.y = height / 2
  mesh.castShadow    = !isGlass
  mesh.receiveShadow = true
  mesh.renderOrder   = isGlass ? 1 : 0
  group.add(mesh)

  // Stair railing — second child mesh with its own material.
  if (isStairs && addRailing) {
    addStairRailingMesh(group, width, depth, height, stairStyle, railingType)
  }

  group.userData.childKind = 'box'
}

function addStairRailingMesh(group, W, D, H, stairStyle, railType) {
  const NUM_STEPS = 12
  const railGeo = stairStyle === 'spiral'
    ? buildSpiralRailingGeometry(W, D, H, NUM_STEPS, railType)
    : buildStairRailingGeometry(W, D, H, NUM_STEPS, railType)

  const color = RAILING_COLOR[railType] ?? '#888888'
  let railMat
  if (railType === 'glass') {
    railMat = new THREE.MeshPhysicalMaterial({
      color:        new THREE.Color(color),
      transmission: 0.88,
      roughness:    0.04,
      metalness:    0.02,
      transparent:  true,
      opacity:      0.20,
      depthWrite:   false,
    })
  } else {
    railMat = new THREE.MeshStandardMaterial({
      color:     new THREE.Color(color),
      roughness: railType === 'wood' ? 0.85 : 0.30,
      metalness: (railType === 'metal' || railType === 'cable') ? 0.55 : 0.0,
    })
  }
  const railMesh = new THREE.Mesh(railGeo, railMat)
  railMesh.castShadow    = railType !== 'glass'
  railMesh.receiveShadow = true
  if (railType === 'glass') railMesh.renderOrder = 1
  group.add(railMesh)
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
  applyPartTints(group)
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

// Applies per-part colors (by material name) and/or a global tint to GLB meshes.
// Per-part colors take priority. Global tint (from material override) applies to
// remaining parts (respecting fabricOnly). No color change if neither is set.
function applyPartTints(group) {
  const globalColor = group.userData.tintColor
  const partColors  = group.userData.partColors ?? {}
  const props       = group.userData.tintMatProps
  const fabricOnly  = props?.fabricOnly ?? false
  const isGlass     = props?.isGlass ?? false

  group.traverse((node) => {
    if (node === group || !node.isMesh) return
    const mats    = Array.isArray(node.material) ? node.material : [node.material]
    const isArray = Array.isArray(node.material)

    for (let i = 0; i < mats.length; i++) {
      const mat = mats[i]
      if (!mat.isMeshStandardMaterial && !mat.isMeshPhysicalMaterial) continue

      if (isGlass) {
        // Replace with a physical transmission material.
        const glassMat = new THREE.MeshPhysicalMaterial({
          color:        new THREE.Color(globalColor ?? '#ddeef5'),
          transmission: props.transmission ?? 0.92,
          roughness:    props.roughness    ?? 0.03,
          metalness:    props.metalness    ?? 0.05,
          transparent:  true,
          opacity:      props.opacity      ?? 0.15,
          depthWrite:   false,
        })
        if (isArray) node.material[i] = glassMat
        else         node.material    = glassMat
        mat.dispose()
        node.renderOrder = 1
        node.castShadow  = false
        continue
      }

      const partColor = mat.name ? (partColors[mat.name] ?? null) : null
      if (partColor) {
        mat.color.set(partColor)
        if (props?.roughness != null) mat.roughness = props.roughness
        if (props?.metallic  != null) mat.metalness = props.metallic
      } else if (globalColor) {
        if (fabricOnly && (mat.roughness < 0.70 || mat.metalness > 0.1)) continue
        mat.color.set(globalColor)
        if (props?.roughness != null) mat.roughness = props.roughness
        if (props?.metallic  != null) mat.metalness = props.metallic
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
