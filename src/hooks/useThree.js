import { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import useStore from '../store/useStore'
import {
  reconcileWalls, reconcileFurniture, reconcileRooms, reconcileCeilings, disposeAll,
} from '../components/viewer3d/sceneReconcilers'
import { reconcileDoors, tickDoorAnims } from '../components/viewer3d/reconcileDoors'
import { onCacheChange } from '../components/viewer3d/furnitureModelCache'
import { applySelectionHighlight } from '../components/viewer3d/selectionHighlight'
import { attachPicking } from '../components/viewer3d/picking'
import { attachFurnitureDrag } from '../components/viewer3d/furnitureDrag'
import { detectRooms } from '../components/canvas/roomDetection'
import { resolveRailingMount } from '../components/canvas/wallSnapGeometry'
import { reconcilePools } from '../components/viewer3d/reconcilePools'
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
  const areaMeshes    = useRef(new Map())
  const poolMeshes    = useRef(new Map())
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
  const areas       = useStore((s) => s.areas)
  const pools       = useStore((s) => s.pools)
  const roomMeta    = useStore((s) => s.roomMeta)
  const selection   = useStore((s) => s.selection)
  const lighting    = useStore((s) => s.lighting)
  const levels      = useStore((s) => s.levels)
  const activeLevel = useStore((s) => s.activeLevel)
  const solo3d          = useStore((s) => s.solo3d)
  const xrayCeiling     = useStore((s) => s.xrayCeiling)
  const ceilingsVisible = useStore((s) => s.ceilingsVisible)
  // Narrow per-layer subscriptions so toggling one layer only re-runs the
  // effect that depends on it, not all four reconcilers.
  const layerWalls      = useStore((s) => s.layers.walls)
  const layerOpenings   = useStore((s) => s.layers.openings)
  const layerFurniture  = useStore((s) => s.layers.furniture)
  const layerRooms      = useStore((s) => s.layers.rooms)
  const select          = useStore((s) => s.select)
  const clearSelection  = useStore((s) => s.clearSelection)
  const toggleDoorOpen   = useStore((s) => s.toggleDoorOpen)
  const toggleWindowOpen = useStore((s) => s.toggleWindowOpen)
  const pushToast        = useStore((s) => s.pushToast)

  // Render-on-demand: any subscribed store change re-runs this hook, so flag a
  // render here. The reconciler effects below run synchronously after commit
  // (before the next animation frame), so the next tick renders the applied
  // change. Interaction, async model loads, animations, drag, and resize set
  // the flag through their own paths.
  if (stateRef.current) stateRef.current.needsRender = true

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
    sun.shadow.mapSize.setScalar(1024)
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

    // Flags the next frame to render. OrbitControls fires 'change' on every
    // camera move (including damping ease-out), so listening to it covers
    // interaction without rendering when idle.
    const requestRender = () => { if (stateRef.current) stateRef.current.needsRender = true }
    controls.addEventListener('change', requestRender)

    const tick = () => {
      const s = stateRef.current
      s.raf = requestAnimationFrame(tick)
      s.onFrame?.()
      const doorsActive = tickDoorAnims(doorAnims.current)
      // Skip OrbitControls.update during walkthrough — damping would fight
      // PointerLockControls and prevent mouselook from working.
      if (!s.onFrame) controls.update()
      // Walkthrough drives the camera every frame, so always render then.
      if (s.needsRender || doorsActive || s.onFrame) {
        renderer.render(scene, camera)
        s.needsRender = false
      }
    }

    // Async GLB loads swap meshes in-place outside React — request a render.
    const offCacheChange = onCacheChange(requestRender)

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (!width || !height) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      requestRender()
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
        requestRender,
      },
    )

    stateRef.current = {
      scene, camera, renderer, controls, ro, raf: 0,
      detachPicking, detachDragging, onFrame: null,
      needsRender: true, requestRender, offCacheChange,
    }

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
      s.offCacheChange?.()
      s.detachPicking()
      s.detachDragging?.()
      s.controls.removeEventListener('change', s.requestRender)
      s.controls.dispose()
      disposeAll(s.scene, wallMeshes.current)
      disposeAll(s.scene, furnMeshes.current)
      disposeAll(s.scene, roomMeshes.current)
      disposeAll(s.scene, areaMeshes.current)
      disposeAll(s.scene, poolMeshes.current)
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
    if (!layerWalls) {
      for (const m of wallMeshes.current.values()) m.visible = false
    }
  }, [walls, openings, levels, activeLevel, solo3d, xrayCeiling, layerWalls])

  // ── doors ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!stateRef.current) return
    const levelOffsets = computeLevelOffsets(levels)
    reconcileDoors(stateRef.current.scene, walls, openings, doorMeshes.current, doorAnims.current, {
      levelOffsets, activeLevelId: activeLevel, solo: solo3d,
    })
    // Door panels are openings; hide if either walls or openings layer is off
    if (!layerWalls || !layerOpenings) {
      for (const m of doorMeshes.current.values()) m.visible = false
    }
  }, [walls, openings, levels, activeLevel, solo3d, layerWalls, layerOpenings])

  // ── furniture + lights ───────────────────────────────────────────────────────
  // Resolve custom-model blob URLs (created lazily from stored base64).
  // Stable blob URL strings mean reconcileFurniture sees no change on re-renders.
  const resolvedFurniture = useMemo(() => {
    return furniture.map((f) => {
      let r = f
      if (f.customModelId && customModels.length) {
        const cm = customModels.find((m) => m.id === f.customModelId)
        if (cm) r = { ...r, model: getCustomModelUrl(cm) }
      }
      // Wall-bound railings derive their transform from the mounted wall so
      // they follow it when the wall moves / resizes / changes height.
      r = resolveRailingMount(r, walls)
      return r
    })
  }, [furniture, customModels, walls])

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
    if (!layerFurniture) {
      for (const m of furnMeshes.current.values()) m.visible = false
    }
  }, [resolvedFurniture, lighting.lightsOn, levels, activeLevel, solo3d, layerFurniture])

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

    // Room ids are `${levelId}:${fingerprint}`; roomMeta is keyed by the bare
    // fingerprint, so strip the level prefix before lookup.
    const bareFp = (id) => (id.includes(':') ? id.split(':').slice(1).join(':') : id)
    const floorColorFor = (id) => {
      const matId = roomMeta[bareFp(id)]?.floorMaterial
      const mat = matId ? getFloorMaterial(matId) : null
      return mat?.color ?? DEFAULT_FLOOR_COLOR
    }
    const floorMatIdFor = (id) => resolveFloorMaterialId(roomMeta[bareFp(id)]?.floorMaterial) ?? null
    const ceilingColorFor = (id) => {
      const matId = roomMeta[bareFp(id)]?.ceilingMaterial
      const mat = matId ? getCeilingMaterial(matId) : null
      return mat?.color ?? DEFAULT_CEILING_COLOR
    }
    const ceilingMatIdFor = (id) => resolveCeilingMaterialId(roomMeta[bareFp(id)]?.ceilingMaterial)

    // Per-room "no ceiling" (e.g. a balcony): skip those rooms so the ceiling
    // reconciler removes any existing mesh for them.
    const roomsWithCeiling = allRooms.filter((r) => !roomMeta[bareFp(r.id)]?.noCeiling)

    reconcileRooms(stateRef.current.scene, allRooms, roomMeshes.current,
      floorColorFor, levelOffsets, { solo: solo3d, activeLevelId: activeLevel }, floorMatIdFor)
    reconcileCeilings(stateRef.current.scene, roomsWithCeiling, ceilingMeshes.current,
      ceilingColorFor, levelOffsets, levels,
      { solo: solo3d, activeLevelId: activeLevel, visible: ceilingsVisible }, ceilingMatIdFor)
    // Apply layer visibility after reconciling (rooms layer controls floors + ceilings)
    if (!layerRooms) {
      for (const m of roomMeshes.current.values()) m.visible = false
      for (const m of ceilingMeshes.current.values()) m.visible = false
    }
  }, [walls, roomMeta, furniture, levels, activeLevel, solo3d, ceilingsVisible, layerRooms])

  // ── outdoor areas (floor slabs only — no walls, no ceiling) ──────────────────
  useEffect(() => {
    if (!stateRef.current) return
    const levelOffsets = computeLevelOffsets(levels)
    const asRooms = areas.map((a) => ({ id: `area:${a.id}`, verts: a.verts, levelId: a.levelId }))
    const areaFor = (id) => areas.find((x) => `area:${x.id}` === id)
    const colorFor = (id) => {
      const mat = areaFor(id)?.floorMaterial ? getFloorMaterial(areaFor(id).floorMaterial) : null
      return mat?.color ?? DEFAULT_FLOOR_COLOR
    }
    const matIdFor = (id) => resolveFloorMaterialId(areaFor(id)?.floorMaterial) ?? null
    reconcileRooms(stateRef.current.scene, asRooms, areaMeshes.current,
      colorFor, levelOffsets, { solo: solo3d, activeLevelId: activeLevel }, matIdFor)
    // reconcileRooms tags meshes kind='room'/id='area:…'; relabel for areas.
    for (const [key, m] of areaMeshes.current) {
      m.userData.kind = 'area'
      m.userData.id = key.startsWith('area:') ? key.slice(5) : key
      if (!layerRooms) m.visible = false
    }
  }, [areas, levels, activeLevel, solo3d, layerRooms])

  // ── pools (recessed water basins) ────────────────────────────────────────────
  useEffect(() => {
    if (!stateRef.current) return
    const levelOffsets = computeLevelOffsets(levels)
    reconcilePools(stateRef.current.scene, pools, poolMeshes.current, levelOffsets,
      { solo: solo3d, activeLevelId: activeLevel })
    if (!layerRooms) for (const m of poolMeshes.current.values()) m.visible = false
  }, [pools, levels, activeLevel, solo3d, layerRooms])

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
