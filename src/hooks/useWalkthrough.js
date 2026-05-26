import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import useStore from '../store/useStore'
import {
  rayHitsWalls, stairGroundY, indexOpeningsByWall,
} from '../components/viewer3d/walkthroughCollision'
import { computeLevelOffsets } from '../store/slices/levelsSlice'
import { konvaToFloor, konvaRotationToThreeY } from '../components/viewer3d/threeMath'

const EYE_HEIGHT   = 1.65
const WALK_SPEED   = 3
const RUN_SPEED    = 6
const GRAVITY      = -12
const JUMP_VEL     = 5
const WALL_MARGIN  = 0.4
const STAIR_MARGIN = 0.15
// Only treat a stair as the player's floor when the player is already close
// to its ramp height — keeps an upper-floor walker from being pulled down
// onto a stair that runs underneath them.
const STAIR_VERTICAL_GRAB = 1.0

export default function useWalkthrough(stateRef, active) {
  const walls          = useStore((s) => s.walls)
  const openings       = useStore((s) => s.openings)
  const furniture      = useStore((s) => s.furniture)
  const levels         = useStore((s) => s.levels)
  const setWalkthrough = useStore((s) => s.setWalkthrough)

  // Refs so the RAF callback reads live data without re-binding each frame.
  const wallsRef        = useRef(walls);        wallsRef.current        = walls
  const openingsRef     = useRef(openings);     openingsRef.current     = openings
  const stairsRef       = useRef([])
  const levelOffsetsRef = useRef(new Map())
  const openingsIndexRef = useRef(new Map())

  // Re-index openings whenever they change.
  useEffect(() => {
    openingsIndexRef.current = indexOpeningsByWall(openings)
  }, [openings])

  // Precompute level offsets + stair lookup data.
  useEffect(() => {
    const lo = computeLevelOffsets(levels)
    levelOffsetsRef.current = lo
    stairsRef.current = furniture
      .filter((f) => f.stairStyle != null)
      .map((f) => {
        const baseY = lo.get(f.levelId) ?? 0
        // Exact level-to-level rise so the top of the ramp meets the next floor.
        const topY = f.toLevel != null ? (lo.get(f.toLevel) ?? (baseY + f.height)) : (baseY + f.height)
        const height = Math.max(0.01, topY - baseY)
        const pos = konvaToFloor(f.x, f.y)
        return {
          cx: pos.x,
          cz: pos.z,
          yaw: konvaRotationToThreeY(f.rotation),
          width: f.width,
          depth: f.depth,
          height,
          baseY,
        }
      })
  }, [furniture, levels])

  useEffect(() => {
    if (!active || !stateRef.current) return

    const { camera, renderer, controls: orbit } = stateRef.current
    orbit.enabled = false

    // Track the player's floor Y (separate from camera Y — gravity pulls
    // camera toward groundY + EYE_HEIGHT). Initialise from any stair under
    // the entry position, otherwise ground floor.
    let groundY = computeGroundYAt(camera.position.x, camera.position.z, 0) ?? 0
    camera.position.y = groundY + EYE_HEIGHT

    const plc = new PointerLockControls(camera, renderer.domElement)
    plc.lock()

    const onCanvasClick = () => { if (!plc.isLocked) plc.lock() }
    renderer.domElement.addEventListener('click', onCanvasClick)

    const onUnlock = () => setWalkthrough(false)
    plc.addEventListener('unlock', onUnlock)

    let velY     = 0
    let onGround = true

    const keys = { w: false, s: false, a: false, d: false, shift: false }

    const onKeyDown = (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp')         keys.w     = true
      if (e.code === 'KeyS' || e.code === 'ArrowDown')       keys.s     = true
      if (e.code === 'KeyA' || e.code === 'ArrowLeft')       keys.a     = true
      if (e.code === 'KeyD' || e.code === 'ArrowRight')      keys.d     = true
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = true
      if (e.code === 'Space' && onGround) { velY = JUMP_VEL; onGround = false }
    }
    const onKeyUp = (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp')         keys.w     = false
      if (e.code === 'KeyS' || e.code === 'ArrowDown')       keys.s     = false
      if (e.code === 'KeyA' || e.code === 'ArrowLeft')       keys.a     = false
      if (e.code === 'KeyD' || e.code === 'ArrowRight')      keys.d     = false
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = false
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup',   onKeyUp)

    let lastTime   = performance.now()
    const _euler   = new THREE.Euler(0, 0, 0, 'YXZ')

    // Returns the stair ramp height at (x,z) if any stair contains it AND
    // its surface is within reach of the current floor — otherwise null.
    function computeGroundYAt(x, z, currentFloorY) {
      const stairs = stairsRef.current
      let best = null
      for (const s of stairs) {
        const gY = stairGroundY(x, z, s, STAIR_MARGIN)
        if (gY == null) continue
        // Stair must be reachable from current floor (within one level rise).
        if (Math.abs(gY - currentFloorY) > STAIR_VERTICAL_GRAB + s.height) continue
        // Pick the highest stair surface under the player (handles overlaps).
        if (best == null || gY > best) best = gY
      }
      return best
    }

    stateRef.current.onFrame = () => {
      const now = performance.now()
      const dt  = Math.min((now - lastTime) / 1000, 0.05)
      lastTime  = now

      // Update ground Y from stairs the player is over.
      const stairY = computeGroundYAt(camera.position.x, camera.position.z, groundY)
      if (stairY != null) groundY = stairY

      // Vertical physics — gravity pulls toward groundY + EYE_HEIGHT.
      velY += GRAVITY * dt
      camera.position.y += velY * dt
      const targetY = groundY + EYE_HEIGHT
      if (camera.position.y <= targetY) {
        camera.position.y = targetY
        velY      = 0
        onGround  = true
      }

      if (!plc.isLocked) return

      // Derive XZ movement from camera yaw
      _euler.setFromQuaternion(camera.quaternion)
      const yaw    = _euler.y
      const fwdX   = -Math.sin(yaw)
      const fwdZ   = -Math.cos(yaw)
      const rightX =  Math.cos(yaw)
      const rightZ = -Math.sin(yaw)

      let moveX = 0
      let moveZ = 0
      if (keys.w) { moveX += fwdX;  moveZ += fwdZ  }
      if (keys.s) { moveX -= fwdX;  moveZ -= fwdZ  }
      if (keys.a) { moveX -= rightX; moveZ -= rightZ }
      if (keys.d) { moveX += rightX; moveZ += rightZ }
      if (moveX === 0 && moveZ === 0) return

      // Normalize and scale
      const len  = Math.sqrt(moveX * moveX + moveZ * moveZ)
      const spd  = (keys.shift ? RUN_SPEED : WALK_SPEED) * dt
      moveX      = (moveX / len) * spd
      moveZ      = (moveZ / len) * spd

      // Wall collision with XZ sliding
      const pos    = { x: camera.position.x, z: camera.position.z }
      const wls    = wallsRef.current
      const movLen = Math.sqrt(moveX * moveX + moveZ * moveZ)
      const movDir = { x: moveX / movLen, z: moveZ / movLen }
      const probe  = movLen + WALL_MARGIN

      const collOpts = {
        openingsByWall: openingsIndexRef.current,
        playerY: camera.position.y,
        levelBaseY: levelOffsetsRef.current,
      }

      const hit     = rayHitsWalls(pos, movDir, wls, probe, collOpts)
      const blocked = hit < probe

      if (!blocked) {
        camera.position.x += moveX
        camera.position.z += moveZ
      } else {
        if (Math.abs(moveX) > 1e-4) {
          const hx = rayHitsWalls(pos, { x: Math.sign(moveX), z: 0 }, wls, Math.abs(moveX) + WALL_MARGIN, collOpts)
          if (hx >= Math.abs(moveX) + WALL_MARGIN) camera.position.x += moveX
        }
        if (Math.abs(moveZ) > 1e-4) {
          const hz = rayHitsWalls(pos, { x: 0, z: Math.sign(moveZ) }, wls, Math.abs(moveZ) + WALL_MARGIN, collOpts)
          if (hz >= Math.abs(moveZ) + WALL_MARGIN) camera.position.z += moveZ
        }
      }
    }

    return () => {
      if (stateRef.current) stateRef.current.onFrame = null
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup',   onKeyUp)
      renderer.domElement.removeEventListener('click', onCanvasClick)
      plc.removeEventListener('unlock', onUnlock)
      plc.unlock()
      plc.dispose()
      orbit.enabled = true
    }
  }, [active, stateRef, setWalkthrough])
}
