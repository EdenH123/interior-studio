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

const CAMERA_FOV = 60
const FLOOR_SIZE = 100 // metres on each side; covers the world bounds at scale
const DEFAULT_FLOOR_COLOR = '#4b5563' // neutral gray for rooms with no material set

// Single owner of the Three.js scene. `containerRef` is a ref pointing at the
// DOM element the renderer will be mounted into. Scene, camera, renderer, and
// controls are instantiated exactly once per mount (kept in a ref so React
// renders don't recreate them) and disposed on unmount. Walls and furniture
// in the Zustand store sync into the scene via one-way useEffect reconcilers.
export default function useThree(containerRef) {
  const stateRef = useRef(null)
  const wallMeshes = useRef(new Map())
  const furnMeshes = useRef(new Map())
  const roomMeshes = useRef(new Map())
  const walls = useStore((s) => s.walls)
  const openings = useStore((s) => s.openings)
  const furniture = useStore((s) => s.furniture)
  const roomMeta = useStore((s) => s.roomMeta)
  const selection = useStore((s) => s.selection)
  const select = useStore((s) => s.select)
  const clearSelection = useStore((s) => s.clearSelection)

  useEffect(() => {
    const container = containerRef.current
    if (!container || stateRef.current) return

    const width = container.clientWidth || 1
    const height = container.clientHeight || 1

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b1220)

    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, 0.1, 1000)
    camera.position.set(6, 5, 6)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, height)
    container.appendChild(renderer.domElement)

    // Required-by-skill lighting baseline.
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const sun = new THREE.DirectionalLight(0xffffff, 0.9)
    sun.position.set(8, 12, 6)
    scene.add(sun)

    // Floor + reference grid so the empty scene reads as a room, not a void.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x111827, side: THREE.DoubleSide }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.001
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
      s.renderer.dispose()
      if (s.renderer.domElement.parentNode) {
        s.renderer.domElement.parentNode.removeChild(s.renderer.domElement)
      }
      stateRef.current = null
    }
  }, [containerRef, select, clearSelection])

  useEffect(() => {
    if (!stateRef.current) return
    reconcileWalls(stateRef.current.scene, walls, openings, wallMeshes.current)
  }, [walls, openings])

  useEffect(() => {
    if (!stateRef.current) return
    reconcileFurniture(stateRef.current.scene, furniture, furnMeshes.current)
  }, [furniture])

  // Rooms depend on both walls (geometry) and roomMeta (material colors).
  // detectRooms runs again here; it also runs in CanvasArea. The duplication
  // is cheap for small wall counts; if profiling ever flags it, lift rooms
  // into a derived store selector.
  useEffect(() => {
    if (!stateRef.current) return
    const rooms = detectRooms(walls)
    reconcileRooms(stateRef.current.scene, rooms, roomMeshes.current, (id) => {
      const matId = roomMeta[id]?.floorMaterial
      const mat = matId ? getFloorMaterial(matId) : null
      return mat?.color ?? DEFAULT_FLOOR_COLOR
    })
  }, [walls, roomMeta])

  // Selection → emissive highlight on the matching mesh. Depending on the
  // structural slices too means freshly-created meshes (e.g., auto-select
  // after furniture drop) get the right highlight on the same render.
  useEffect(() => {
    if (!stateRef.current) return
    applySelectionHighlight(wallMeshes.current, furnMeshes.current, roomMeshes.current, selection)
  }, [selection, walls, furniture, roomMeta])
}
