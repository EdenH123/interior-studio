import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import useStore from '../store/useStore'
import {
  reconcileWalls, reconcileFurniture, reconcileRooms, disposeAll,
} from '../components/viewer3d/sceneReconcilers'
import { applySelectionHighlight } from '../components/viewer3d/selectionHighlight'
import { attachPicking } from '../components/viewer3d/picking'
import { detectRooms } from '../components/canvas/roomDetection'
import { getFloorMaterial } from '../components/canvas/floorMaterials'
import { kelvinToRgb } from '../utils/colorTemp'
import { isLightingType } from '../components/viewer3d/reconcileFurniture'

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
  sunLight.intensity = Math.max(0, elevation) * 1.2
}

// Single owner of the Three.js scene. `containerRef` is a ref pointing at the
// DOM element the renderer will be mounted into. Scene, camera, renderer, and
// controls are instantiated exactly once per mount (kept in a ref so React
// renders don't recreate them) and disposed on unmount. Walls and furniture
// in the Zustand store sync into the scene via one-way useEffect reconcilers.
export default function useThree(containerRef) {
  const stateRef    = useRef(null)
  const wallMeshes  = useRef(new Map())
  const furnMeshes  = useRef(new Map())
  const roomMeshes  = useRef(new Map())
  const lightMap    = useRef(new Map())
  const sunRef      = useRef(null)
  const ambientRef  = useRef(null)

  const walls     = useStore((s) => s.walls)
  const openings  = useStore((s) => s.openings)
  const furniture = useStore((s) => s.furniture)
  const roomMeta  = useStore((s) => s.roomMeta)
  const selection = useStore((s) => s.selection)
  const lighting  = useStore((s) => s.lighting)
  const select        = useStore((s) => s.select)
  const clearSelection = useStore((s) => s.clearSelection)
  const pushToast     = useStore((s) => s.pushToast)

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
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    // Ambient fill — intensity driven by lighting.ambientStrength.
    const ambient = new THREE.AmbientLight(0xffffff, lighting.ambientStrength * 2.4)
    ambientRef.current = ambient
    scene.add(ambient)

    // Sun / directional light — position driven by lighting.timeOfDay.
    const sun = new THREE.DirectionalLight(0xffffff, 0.9)
    sun.castShadow = true
    sun.shadow.mapSize.setScalar(2048)
    sun.shadow.camera.near   = 0.1
    sun.shadow.camera.far    = 200
    sun.shadow.camera.left   = -30
    sun.shadow.camera.right  = 30
    sun.shadow.camera.top    = 30
    sun.shadow.camera.bottom = -30
    applySunForTime(sun, lighting.timeOfDay)
    sunRef.current = sun
    scene.add(sun)

    // Floor + grid.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x111827, side: THREE.DoubleSide }),
    )
    floor.rotation.x    = -Math.PI / 2
    floor.position.y    = -0.001
    floor.receiveShadow = true
    scene.add(floor)
    scene.add(new THREE.GridHelper(FLOOR_SIZE, FLOOR_SIZE, 0x374151, 0x1f2937))

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.set(0, 1, 0)
    controls.update()

    const tick = () => {
      stateRef.current.raf = requestAnimationFrame(tick)
      controls.update()
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
      [wallMeshes.current, furnMeshes.current, roomMeshes.current],
      { onSelect: select, onClear: clearSelection },
    )

    stateRef.current = { scene, camera, renderer, controls, ro, raf: 0, detachPicking }
    tick()

    return () => {
      const s = stateRef.current
      if (!s) return
      cancelAnimationFrame(s.raf)
      s.ro.disconnect()
      s.detachPicking()
      s.controls.dispose()
      disposeAll(s.scene, wallMeshes.current)
      disposeAll(s.scene, furnMeshes.current)
      disposeAll(s.scene, roomMeshes.current)
      for (const [, light] of lightMap.current) {
        if (light.isSpotLight && light.target?.parent) s.scene.remove(light.target)
        s.scene.remove(light)
      }
      lightMap.current.clear()
      s.renderer.dispose()
      if (s.renderer.domElement.parentNode) {
        s.renderer.domElement.parentNode.removeChild(s.renderer.domElement)
      }
      stateRef.current = null
    }
  }, [containerRef, select, clearSelection])   // lighting not in deps — initial values only

  // ── walls ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!stateRef.current) return
    reconcileWalls(stateRef.current.scene, walls, openings, wallMeshes.current)
  }, [walls, openings])

  // ── furniture + lights ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!stateRef.current) return
    reconcileFurniture(
      stateRef.current.scene, furniture, furnMeshes.current,
      lightMap.current, lighting.lightsOn,
    )
  }, [furniture, lighting.lightsOn])

  // ── rooms ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!stateRef.current) return
    const rooms = detectRooms(walls)
    reconcileRooms(stateRef.current.scene, rooms, roomMeshes.current, (id) => {
      const matId = roomMeta[id]?.floorMaterial
      const mat = matId ? getFloorMaterial(matId) : null
      return mat?.color ?? DEFAULT_FLOOR_COLOR
    })
  }, [walls, roomMeta])

  // ── selection highlight ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!stateRef.current) return
    applySelectionHighlight(wallMeshes.current, furnMeshes.current, roomMeshes.current, selection)
  }, [selection, walls, furniture, roomMeta])

  // ── time of day → sun position + colour ─────────────────────────────────────
  useEffect(() => {
    if (!sunRef.current) return
    applySunForTime(sunRef.current, lighting.timeOfDay)
  }, [lighting.timeOfDay])

  // ── ambient strength ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ambientRef.current) return
    ambientRef.current.intensity = lighting.ambientStrength * 2.4
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
}
