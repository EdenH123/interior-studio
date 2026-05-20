---
name: three-scene
description: Interior Studio's rules for managing the Three.js 3D scene — all scene/camera/renderer setup lives in the useThree.js hook and is instantiated exactly once, walls and furniture are synced from the Zustand store via useEffect (one-way, store → scene), furniture loads as GLB with a BoxGeometry fallback, AmbientLight + DirectionalLight are always in the scene, perspective camera uses fov 60, and Konva-to-Three units convert at 1 Konva pixel = 0.02 Three.js units (matching the 50 px = 1 m floor-plan scale). Use whenever writing, editing, or reviewing any Three.js code in this project, whenever adding 3D viewer features, whenever syncing 2D plan data to 3D, whenever loading models or lighting a scene, or whenever the user mentions "3D", "viewer3d", "the 3D side", "render the room", "show the model", or similar — even if Three.js isn't named explicitly. Apply proactively when building the 3D viewer for the first time.
---

# Interior Studio Three.js Scene Management

The 3D viewer mirrors the 2D floor plan. The Zustand store is the single source
of truth for both. These rules exist so the 3D side stays cheap to keep in sync
with the 2D side, and so it doesn't accidentally fight React's render cycle by
recreating expensive WebGL objects every time something changes.

## Rules

### 1. All scene logic lives in `src/hooks/useThree.js`

Scene, camera, renderer, lighting, the animation loop, and the resize handler
are all owned by a single custom hook. Components in `src/components/viewer3d/`
render a `<canvas>` (or a container `<div>`) and call `useThree(containerRef)`
to wire up the scene. They do not import `three` directly.

This keeps the WebGL surface area in one file and means a future session
debugging the 3D side only has to read one place.

### 2. Never recreate scene, camera, or renderer

Instantiate `THREE.Scene`, `THREE.PerspectiveCamera`, and `THREE.WebGLRenderer`
exactly once per viewer mount, in a `useRef` or module-level ref, *not* in
render-body state. Recreating them on every render thrashes the GPU and leaks
WebGL contexts (browsers cap concurrent contexts low — exhausting them blanks
the canvas).

Concretely:

```jsx
// good — stable across renders
const sceneRef = useRef(null)
useEffect(() => {
  if (sceneRef.current) return                // already initialised
  sceneRef.current = new THREE.Scene()
  // …camera, renderer, lights, animation loop
  return () => {
    // dispose on unmount: renderer.dispose(), cancelAnimationFrame, etc.
  }
}, [])
```

Initialise inside an empty-deps `useEffect`. Tear down on unmount — dispose the
renderer, cancel the animation frame, and detach the canvas — so HMR and route
changes don't pile up zombie contexts.

### 3. Sync from Zustand via useEffect (one-way: store → scene)

Walls and furniture in the store drive the scene. Subscribe to the relevant
slices and reconcile inside an effect:

```jsx
const walls = useStore((s) => s.walls)
useEffect(() => {
  reconcileWalls(sceneRef.current, walls)
}, [walls])
```

`reconcileWalls` (and the equivalent for furniture) adds/removes/updates Three
meshes to match the store. Never write back from the scene into the store from
inside this sync — the data flow is one direction. (Editing in 3D is a future
concern; when we get there, it'll dispatch through Zustand actions, not mutate
meshes and read them back.)

Keep the selectors narrow so unrelated store changes don't re-run the sync
(e.g., `useStore((s) => s.walls)` rather than destructuring the whole store).

### 4. Furniture: GLB with a BoxGeometry fallback

Load furniture via `GLTFLoader`. Cache loaded GLTFs by URL — a session is
likely to place the same model many times.

If the GLB fails to load (missing file, network error, decode failure), render
a `BoxGeometry` placeholder sized to the furniture item's `width × depth ×
height` from the store. The placeholder uses a flat material in a muted color
so it's visually obvious it's a fallback, not a finished asset. The scene
should never silently fail to show a piece of furniture.

### 5. Lighting: AmbientLight + DirectionalLight, always

Every scene gets at minimum:

- `THREE.AmbientLight` — soft fill so nothing renders pitch-black.
- `THREE.DirectionalLight` — a single sun-like light casting from a fixed angle
  so geometry reads as 3D.

Add these in the same one-time init effect as the scene. Additional lights
(point lights for lamps, spots for accents) can come later, but the baseline
two are non-optional. Without them, GLB models with PBR materials look black
and broken.

### 6. Camera: PerspectiveCamera, fov 60

Always `THREE.PerspectiveCamera` (not orthographic) with `fov = 60`. Aspect
comes from the container size and updates on resize. Near/far defaults are
fine to start (e.g., 0.1 / 1000) — adjust only if clipping shows up.

Fov 60 is a deliberate calibration — wide enough to feel like a room view,
narrow enough to avoid fisheye distortion on interior shots. Don't change it
on a whim; if a specific feature needs a different fov, isolate it.

### 7. Units: 1 Konva pixel = 0.02 Three.js units

The 2D plan uses 50 Konva pixels per meter (`PIXELS_PER_METER = 50` in
`src/components/canvas/constants.js`). Three.js conventionally uses 1 unit = 1
meter. That makes the conversion factor:

```
1 Konva pixel = (1 / 50) m = 0.02 Three.js units
```

When syncing a wall `{ x1, y1, x2, y2 }` from the store into 3D, multiply
coordinates by `0.02`. Y in Konva is screen-y (down is positive); in Three's
default convention you'll usually map Konva-y to Three-z (floor plane), with
Three-y as height. Pick a mapping once and document it in
`src/hooks/useThree.js`; don't reinvent per-call.

Suggested helper, kept next to the hook:

```js
export const KONVA_TO_THREE = 0.02
export const konvaToFloor = (x, y) => ({
  x: x * KONVA_TO_THREE,
  z: y * KONVA_TO_THREE,
})
```

## File layout this skill assumes

```
src/
├── hooks/
│   └── useThree.js              # the only file that imports `three` directly
└── components/
    └── viewer3d/
        ├── Viewer3D.jsx         # container; calls useThree(containerRef)
        └── …                    # any UI overlays (camera controls, etc.)
```

If a viewer3d feature needs Three.js APIs that don't fit cleanly behind
`useThree.js`, that's a signal the hook needs an extra return value or a small
helper module — not that components should import `three` directly.

## Why these rules

- **Single hook for scene logic**: Three.js is imperative and React is
  declarative; without a clear seam, the two paradigms bleed into each other
  and the code becomes hard to follow. The hook is the seam.
- **One-time instantiation**: WebGL contexts are scarce and expensive. Treating
  them as ref-stable resources (not React state) is the standard pattern.
- **Store → scene sync**: keeping the data flow one-directional means the 2D
  and 3D views can never disagree about what exists. The store is the truth;
  both views are projections of it.
- **GLB + fallback**: a missing model shouldn't leave a hole in the room.
  Fallback geometry keeps spatial reasoning intact while the real asset is
  fixed.
- **Baseline lighting**: most "my 3D model is black" bugs are missing lights.
  Bake the minimum in so the question doesn't have to be asked.
- **Fixed fov and unit factor**: when 2D and 3D measurements have to match
  pixel-for-pixel, having one calibration constant prevents off-by-N-meter bugs
  from creeping in piecemeal.
