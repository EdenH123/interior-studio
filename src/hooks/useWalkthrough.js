import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import useStore from '../store/useStore'
import { rayHitsWalls } from '../components/viewer3d/walkthroughCollision'

const EYE_HEIGHT  = 1.65
const WALK_SPEED  = 3
const RUN_SPEED   = 6
const GRAVITY     = -12
const JUMP_VEL    = 5
const WALL_MARGIN = 0.4

export default function useWalkthrough(stateRef, active) {
  const walls          = useStore((s) => s.walls)
  const setWalkthrough = useStore((s) => s.setWalkthrough)
  const wallsRef       = useRef(walls)
  wallsRef.current     = walls

  useEffect(() => {
    if (!active || !stateRef.current) return

    const { camera, renderer, controls: orbit } = stateRef.current
    orbit.enabled      = false
    camera.position.y  = EYE_HEIGHT

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

    stateRef.current.onFrame = () => {
      const now = performance.now()
      const dt  = Math.min((now - lastTime) / 1000, 0.05)
      lastTime  = now

      // Vertical physics — runs regardless of lock so landing still works
      velY += GRAVITY * dt
      camera.position.y += velY * dt
      if (camera.position.y <= EYE_HEIGHT) {
        camera.position.y = EYE_HEIGHT
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

      const hit     = rayHitsWalls(pos, movDir, wls, probe)
      const blocked = hit < probe

      if (!blocked) {
        camera.position.x += moveX
        camera.position.z += moveZ
      } else {
        if (Math.abs(moveX) > 1e-4) {
          const hx = rayHitsWalls(pos, { x: Math.sign(moveX), z: 0 }, wls, Math.abs(moveX) + WALL_MARGIN)
          if (hx >= Math.abs(moveX) + WALL_MARGIN) camera.position.x += moveX
        }
        if (Math.abs(moveZ) > 1e-4) {
          const hz = rayHitsWalls(pos, { x: 0, z: Math.sign(moveZ) }, wls, Math.abs(moveZ) + WALL_MARGIN)
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
