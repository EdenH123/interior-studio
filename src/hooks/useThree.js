import { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import useStore from '../store/useStore'
import {
  reconcileWalls, reconcileFurniture, reconcileRooms, reconcileCeilings, disposeAll,
} from '../components/viewer3d/sceneReconcilers'
import { reconcileDoors, tickDoorAnims } from '../components/viewer3d/reconcileDoors'
import { applySelectionHighlight } from '../components/viewer3d/selectionHighlight'
import { attachPicking } from '../components/viewer3d/picking'
import { attachFurnitureDrag } from '../components/viewer3d/furnitureDrag'
import { detectRooms } from '../components/canvas/roomDetection'
import { getFloorMaterial, resolveFloorMaterialId } from '../components/canvas/floorMaterials'
import { kelvinToRgb } from '../utils/colorTemp'
import { isLightingType } from '../components/viewer3d/reconcileFurniture'
import { computeLevelOffsets } from '../store/slices/levelsSlice'
import { computeStairHolesForRooms } from '../components/viewer3d/stairFloorHoles'
import { DEFAULT_CEILING_COLOR, getCeilingMaterial, resolveCeilingMaterialId } from '../components/canvas/ceilingMaterials'
import { getCustomModelUrl } from '../utils/customModelUrls'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { registerSceneExport } from '../components/viewer3d/sceneExportHandle'

const CAMERA_FOV = 60
const FLOOR_SIZE = 100
const DEFAULT_FLOOR_COLOR = '#4b5563'
const MAX_LIGHTS = 8

// Converts normalised 0-24 h to a sun position + colour on an east-west arc.
function applySunForTime(sunLight, t) {
  // Elevation angle: 0 at midnight (below horizon), peaks at noon.
  const elevAngle = Math.PI * (t / 24) - Math.PI / 2   // -PI/2..PI/2
  const elevation = Math.sin(elevAngle)                 // -1..1
  const dist = 20

  // Azimuth sweeps east (−X) at dawn, overhead at noon, west (+X) at dusk.
  const azimuth = Math.PI * (t / 12 - 1)               // -PI..PI
  sunLight.position.set(
    Math.cos(azimuth) * dist,
    Math.max(0.05, elevation) * 18,
    Math.sin(azimuth) * dist * 0.5,
  )

  // Colour temperature: warm orange at dawn/dusk, cool white at noon.
  const normalised = Math.max(0, elevation)
  const kelvin = 2500 + normalised * 4000
  const { r, g, b } = kelvinToRgb(kelvin)
  sunLight.color.setRGB(r / 255, g / 255, b / 255)
  sunLight.intensity = Math.max(0, elevation) * 2.0
}

// Single owner of the Three.js scene. `containerRef` is a ref pointing at the
// DOM element the renderer will be mounted into. Scene, camera, renderer, and
// controls are instantiated exactly once per mount (kept in a ref so React
// renders don't recreate them) and disposed on unmount. Walls and furniture
// in the Zustand store sync into the scene via one-way useEffect reconcilers.
export default function useThree(containerRef) {
  const stateRef    = useRef(null)
  const wallMeshes    = useRef(new Map())
  const furnMeshes    = useRef(new Map())
  const roomMeshes    = useRef(new Map())
  const ceilingMeshes = useRef(new Map())
  const doorMeshes    = useRef(new Map())
  const doorAnims   = useRef(new Map())
  const lightMap    = useRef(new Map())
  const sunRef      = useRef(null)
  const ambientRef  = useRef(null)

  const walls       = useStore((s) => s.walls)
  const openings    = useStore((s) => s.openings)
  const furniture     = useStore((s) => s.furniture)
  const customModels  = useStore((s) => s.customModels)
  const roomMeta    = useStore((s) => s.roomMeta)
  const selection   = useStore((s) => s.selection)
  const lighting    = useStore((s) => s.lighting)
  const levels      = useStore((s) => s.levels)
  const activeLevel = useStore((s) => s.activeLevel)
  const solo3d          = useStore((s) => s.solo3d)
  const xrayCeiling     = useStore((s) => s.xrayCeiling)
  const ceilingsVisible = useStore((s) => s.ceilingsVisible)
  const layers          = useStore((s) => s.layers)
  const select          = useStore((s) => s.select)
  const clearSelection  = useStore((s) => s.clearSelection)
  const toggleDoorOpen   = useStore((s) => s.toggleDoorOpen)
  const toggleWindowOpen = useStore((s) => s.toggleWindowOpen)
  const pushToast        = useStore((s) => s.pushToast)

  // ── mount / unmount ─────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container || stateRef.current) return

    const width  = container.clientWidth  || 1
    const height = container.clientHeight || 1

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b1220)

    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, 0.1, 1000)
    camera.position.set(6, 5, 6)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap
    // Physically-correct tone mapping — ACES Filmic gives the best PBR look.
    renderer.toneMapping         = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.outputColorSpace    = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    // IBL environment map via RoomEnvironment — gives GLB materials realistic
    // reflections without an HDRI file. Baked into a PMREM cube.
    const pmrem = new THREE.PMREMGenerator(renderer)
    pmrem.compileEquirectangularShader()
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTexture
    pmrem.dispose()

    // Ambient fill — intensity driven by lighting.ambientStrength.
    // With ACESFilmic + IBL the scene is brighter overall; scale factor reduced.
    const ambient = new THREE.AmbientLight(0xffffff, lighting.ambientStrength * 1.0)
    ambientRef.current = ambient
    scene.add(ambient)

    // Sun / directional light — position driven by lighting.timeOfDay.
    const sun = new THREE.DirectionalLight(0xffffff, 1.5)
    sun.castShadow = true
    sun.shadow.mapSize.setScalar(2048)
    sun.shadow.camera.near   = 0.1
    sun.shadow.camera.far    = 200
    sun.shadow.camera.left   = -30
    sun.shadow.camera.right  = 30
    sun.shadow.camera.top    = 30
    sun.shadow.camera.bottom = -30
    sun.shadow.bias       = -0.0003
    sun.shadow.normalBias =  0.02
    applySunForTime(sun, lighting.timeOfDay)
    sunRef.current = sun
    scene.add(sun)

    // Floor + grid.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE),
      new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.6,
        metalness: 0.1,
        side: THREE.DoubleSide,
      }),
    )
    floor.rotation.x    = -Math.PI / 2
    floor.position.y    = -0.001
    floor.receiveShadow = true
    scene.add(floor)
    scene.add(new THREE.GridHelper(FLOOR_SIZE, FLOOR_SIZE, 0x374151, 0x1f2937))

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping  = true
    controls.zoomSpeed      = 0.8   // slightly slower than default to match 2D wheel feel
    controls.panSpeed       = 0.8
    controls.minDistance    = 1.5   // ~75 Konva px ≈ close zoom limit
    controls.maxDistance    = 80    // ~4000 Konva px ≈ far zoom limit
    controls.target.set(0, 1, 0)
    controls.update()

    const tick = () => {
      stateRef.current.raf = requestAnimationFrame(tick)
      stateRef.current.onFrame?.()
      tickDoorAnims(doorAnims.current)
      // Skip OrbitControls.update during walkthrough — damping would fight
      // PointerLockControls and prevent mouselook from working.
      if (!stateRef.current.onFrame) controls.update()
      renderer.render(scene, camera)
    }

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (!width || !height) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    })
    ro.observe(container)

    const detachPicking = attachPicking(
      renderer, camera,
      [wallMeshes.current, furnMeshes.current, roomMeshes.current, doorMeshes.current],
      { onSelect: select, onClear: clearSelection, onToggleDoor: toggleDoorOpen, onToggleWindow: toggleWindowOpen },
    )

    const detachDragging = attachFurnitureDrag(
      renderer, camera, furnMeshes.current, controls,
      {
        onDragEnd: (id, x, y) => useStore.getState().updateFurniture(id, { x, y }),
        getSelection: () => useStore.getState().selection,
        isAllowed: () => !stateRef.current?.onFrame,  // disabled during walkthrough
      },
    )

    stateRef.current = { scene, camera, renderer, controls, ro, raf: 0, detachPicking, detachDragging, onFrame: null }

    // Register the GLB export function so Toolbar can trigger it without prop-threading.
    registerSceneExport(() => {
      const exporter = new GLTFExporter()
      const group = new THREE.Group()
      for (const mesh of wallMeshes.current.values()) group.add(mesh.clone())
      for (const mesh of furnMeshes.current.values()) group.add(mesh.clone())
      for (const mesh of roomMeshes.current.values()) group.add(mesh.clone())
      for (const mesh of doorMeshes.current.values()) group.add(mesh.clone())
      return new Promise((resolve, reject) => {
        exporter.parse(group, resolve, reject, { binary: true })
      })
    })

    // doorAnims is read directly by the tick closure; no slot needed on stateRef.
    tick()

    return () => {
      const s = stateRef.current
      if (!s) return
      cancelAnimationFrame(s.raf)
      s.ro.disconnect()
      s.detachPicking()
      s.detachDragging?.()
      s.controls.dispose()
      disposeAll(s.scene, wallMeshes.current)
      disposeAll(s.scene, furnMeshes.current)
      disposeAll(s.scene, roomMeshes.current)
      disposeAll(s.scene, ceilingMeshes.current)
      disposeAll(s.scene, doorMeshes.current)
      for (const [, light] of lightMap.current) {
        if (light.isSpotLight && light.target?.parent) s.scene.remove(light.target)
        s.scene.remove(light)
      }
      lightMap.current.clear()
      s.renderer.dispose()
      if (s.renderer.domElement.parentNode) {
        s.renderer.domElement.parentNode.removeChild(s.renderer.domElement)
      }
      registerSceneExport(null)
      stateRef.current = null
    }
  }, [containerRef, select, clearSelection, toggleDoorOpen, toggleWindowOpen])   // lighting not in deps — initial values only

  // ── walls ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!stateRef.current) return
    const levelOffsets = computeLevelOffsets(levels)
    const levelHeights = new Map(levels.map((lv) => [lv.id, lv.height]))
    reconcileWalls(stateRef.current.scene, walls, openings, wallMeshes.current, {
      levelOffsets, levelHeights, activeLevelId: activeLevel, solo: solo3d, xray: xrayCeiling,
    })
    // Apply layer visibility after reconciling (walls layer controls wall meshes)
    if (!layers.walls) {
      for (const m of wallMeshes.current.values()) m.visible = false
    }
  }, [walls, openings, levels, activeLevel, solo3d, xrayCeiling, layers])

  // ── doors ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!stateRef.current) return
    const levelOffsets = computeLevelOffsets(levels)
    reconcileDoors(stateRef.current.scene, walls, openings, doorMeshes.current, doorAnims.current, {
      levelOffsets, activeLevelId: activeLevel, solo: solo3d,
    })
    // Door panels are openings; hide if either walls or openings layer is off
    if (!layers.walls || !layers.openings) {
      for (const m of doorMeshes.current.values()) m.visible = false
    }
  }, [walls, openings, levels, activeLevel, solo3d, layers])

  // ── furniture + lights ───────────────────────────────────────────────────────
  // Resolve custom-model blob URLs (created lazily from stored base64).
  // Stable blob URL strings mean reconcileFurniture sees no change on re-renders.
  const resolvedFurniture = useMemo(() => {
    if (!customModels.length) return furniture
    return furniture.map((f) => {
      if (!f.customModelId) return f
      const cm = customModels.find((m) => m.id === f.customModelId)
      return cm ? { ...f, model: getCustomModelUrl(cm) } : f
    })
  }, [furniture, customModels])

  useEffect(() => {
    if (!stateRef.current) return
    const levelOffsets = computeLevelOffsets(levels)
    const levelHeights = new Map(levels.map((lv) => [lv.id, lv.height]))
    reconcileFurniture(
      stateRef.current.scene, resolvedFurniture, furnMeshes.current,
      lightMap.current, lighting.lightsOn,
      { levelOffsets, levelHeights, activeLevelId: activeLevel, solo: solo3d },
    )
    // Apply layer visibility after reconciling
    if (!layers.furniture) {
      for (const m of furnMeshes.current.values()) m.visible = false
    }
  }, [resolvedFurniture, lighting.lightsOn, levels, activeLevel, solo3d, layers])

  // ── rooms + ceilings ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!stateRef.current) return
    const levelOffsets = computeLevelOffsets(levels)
    // Detect rooms per-level; prefix ids with levelId so each level's rooms
    // are keyed independently in the mesh map.
    // Floor stair holes: cut where stairs ARRIVE (stair.toLevel === lv.id).
    // Ceiling stair holes: cut where stairs DEPART (stair.levelId === lv.id).
    const sortedLevels = [...levels].sort((a, b) => a.order - b.order)
    const allRooms = levels.flatMap((lv) => {
      const lvWalls = walls.filter((w) => (w.levelId ?? activeLevel) === lv.id)
      const lvRooms = detectRooms(lvWalls).map((r) => ({ ...r, id: `${lv.id}:${r.id}`, levelId: lv.id }))
      const isStairItem = (f) => f.stairStyle != null || f.type === 'stairs'
      // Derive "arrives at lv" — use stored toLevel when set; fall back to
      // level-order when toLevel is null (stair placed before the floor existed).
      const stairArrivesAt = (f) => {
        if (f.toLevel != null) return f.toLevel === lv.id
        const fromIdx = sortedLevels.findIndex((l) => l.id === (f.levelId ?? activeLevel))
        return fromIdx >= 0 && fromIdx + 1 < sortedLevels.length && sortedLevels[fromIdx + 1].id === lv.id
      }
      const arrivingStairs  = furniture.filter((f) => isStairItem(f) && stairArrivesAt(f))
      const departingStairs = furniture.filter(
        (f) => isStairItem(f) && (f.levelId ?? activeLevel) === lv.id,
      )
      const floorHolesMap   = arrivingStairs.length  > 0 ? computeStairHolesForRooms(lvRooms, arrivingStairs)  : null
      const ceilHolesMap    = departingStairs.length > 0 ? computeStairHolesForRooms(lvRooms, departingStairs) : null
      return lvRooms.map((r) => ({
        ...r,
        stairHoles:        floorHolesMap ? (floorHolesMap.get(r.id) ?? [])  : [],
        ceilingStairHoles: ceilHolesMap  ? (ceilHolesMap.get(r.id)  ?? [])  : [],
      }))
    })

    const floorColorFor = (id) => {
      const fp = id.includes(':') ? id.split(':').slice(1).join(':') : id
      const matId = roomMeta[fp]?.floorMaterial
      const mat = matId ? getFloorMaterial(matId) : null
      return mat?.color ?? DEFAULT_FLOOR_COLOR
    }
    const floorMatIdFor = (id) => {
      const fp = id.includes(':') ? id.split(':').slice(1).join(':') : id
      return resolveFloorMaterialId(roomMeta[fp]?.floorMaterial) ?? null
    }
    const ceilingColorFor = (id) => {
      const fp = id.includes(':') ? id.split(':').slice(1).join(':') : id
      const matId = roomMeta[fp]?.ceilingMaterial
      const mat = matId ? getCeilingMaterial(matId) : null
      return mat?.color ?? DEFAULT_CEILING_COLOR
    }
    const ceilingMatIdFor = (id) => {
      const fp = id.includes(':') ? id.split(':').slice(1).join(':') : id
      return resolveCeilingMaterialId(roomMeta[fp]?.ceilingMaterial)
    }

    reconcileRooms(stateRef.current.scene, allRooms, roomMeshes.current,
      floorColorFor, levelOffsets, { solo: solo3d, activeLevelId: activeLevel }, floorMatIdFor)
    reconcileCeilings(stateRef.current.scene, allRooms, ceilingMeshes.current,
      ceilingColorFor, levelOffsets, levels,
      { solo: solo3d, activeLevelId: activeLevel, visible: ceilingsVisible }, ceilingMatIdFor)
    // Apply layer visibility after reconciling (rooms layer controls floors + ceilings)
    if (!layers.rooms) {
      for (const m of roomMeshes.current.values()) m.visible = false
      for (const m of ceilingMeshes.current.values()) m.visible = false
    }
  }, [walls, roomMeta, furniture, levels, activeLevel, solo3d, ceilingsVisible, layers])

  // ── selection highlight ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!stateRef.current) return
    applySelectionHighlight(wallMeshes.current, furnMeshes.current, roomMeshes.current, selection)
  }, [selection, walls, resolvedFurniture, roomMeta])

  // ── time of day → sun position + colour ─────────────────────────────────────
  useEffect(() => {
    if (!sunRef.current) return
    applySunForTime(sunRef.current, lighting.timeOfDay)
  }, [lighting.timeOfDay])

  // ── ambient strength ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ambientRef.current) return
    ambientRef.current.intensity = lighting.ambientStrength * 1.0
  }, [lighting.ambientStrength])

  // ── active-light cap warning ──────────────────────────────────────────────────
  const prevActiveLightsRef = useRef(0)
  useEffect(() => {
    const activeCount = furniture.filter(
      (f) => isLightingType(f.type) && f.on !== false,
    ).length
    if (activeCount > MAX_LIGHTS && prevActiveLightsRef.current <= MAX_LIGHTS) {
      pushToast(`More than ${MAX_LIGHTS} lights active — extras are silenced for performance`, 'warn')
    }
    prevActiveLightsRef.current = activeCount
  }, [furniture, pushToast])

  return stateRef
}
