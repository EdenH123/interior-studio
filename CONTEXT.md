# Interior Studio — Project Context

## What this is
A browser-based interior design app (simplified SketchUp). Users can draw floor
plans in 2D, view them in 3D, place furniture, apply materials, and get AI
design suggestions. No backend required (browser-only for now).

## Stack
- React + Vite
- Konva.js / react-konva — 2D floor plan canvas
- Three.js — 3D room viewer (not wired yet)
- Zustand — global state
- Tailwind CSS (v4, via `@tailwindcss/vite`) — styling
- nanoid — stable IDs for canvas objects
- Claude API — AI design assistant (future)

## Folder Structure
```
interior-studio/
├── CLAUDE.md                    # session entry point: required reading order, skill index, stack rules, autonomy summary
├── SPEC.md                      # full product spec: vision, users, non-goals, features, user flows, data model
├── AGENT.md                     # autonomy rules: act freely / ask first / never-without-approval
├── USER_GUIDE.md                # non-technical reference for end users: features, flows, keyboard shortcuts, FAQs
├── .claude/
│   └── skills/
│       ├── auto-context/
│       │   └── SKILL.md         # rule: update CONTEXT.md after every change + read it at session start
│       ├── debugging-discipline/
│       │   └── SKILL.md         # rule: tactical etiquette — fix build before features, no commented-out code, build after every fix
│       ├── git-flow/
│       │   └── SKILL.md         # rule: end-of-session git workflow — gates (build/tests green, no force-push), session numbering, direct-to-main vs branch+PR+auto-squash decision based on CONTEXT.md's Done list
│       ├── konva-canvas/
│       │   └── SKILL.md         # rule: 2D canvas constants & behaviour (50px=1m, snap90, grid, thickness, selection blue)
│       ├── react-style/
│       │   └── SKILL.md         # rule: React code style (functional, Zustand+persist, Tailwind, naming, size)
│       ├── session-ritual/
│       │   └── SKILL.md         # rule: start (read CONTEXT.md + build + report) / end (build + update CONTEXT.md + summarise)
│       ├── systematic-debugging/
│       │   ├── SKILL.md         # methodology: 4-phase root-cause investigation before any fix
│       │   ├── root-cause-tracing.md       # trace bugs backward through the call stack
│       │   ├── defense-in-depth.md         # validate at every layer once root cause is found
│       │   ├── condition-based-waiting.md (+ .ts example)  # replace arbitrary sleeps with condition polling
│       │   └── find-polluter.sh            # bisect tests to find which one corrupts state
│       ├── three-scene/
│       │   └── SKILL.md         # rule: Three.js scene management (single hook, one-time init, store→scene sync, units)
│       ├── uxui-designer/
│       │   └── SKILL.md         # role: UX/UI design — ASCII wireframes, hierarchy, micro-interactions
│       └── verification-before-completion/
│           └── SKILL.md         # rule: no completion claims without fresh verification evidence in the current message
├── public/
├── src/
│   ├── assets/                  # images, icons, 3D models, textures
│   │   └── furniture/           # 12 .glb mesh files + CREDITS.md (chair.glb = processed SheenChair; 11 procedural CC0)
│   ├── components/
│   │   ├── Toolbar.jsx          # top bar — app title + 2D/3D toggle + underlay upload (async, downscale, quota toast)
│   │   ├── Sidebar.jsx          # furniture catalog: category groups + HTML5-draggable tiles
│   │   ├── CanvasArea.jsx       # Konva Stage host: drop, draw flow, selection, render
│   │   ├── PropertiesPanel.jsx  # right panel — routes selection to per-kind editor
│   │   ├── Toast.jsx            # bottom-center transient notification (info/warn/error), 6 s TTL
│   │   ├── AiPanel.jsx          # AI chat panel — replaces PropertiesPanel when toggled on; hosts proposal preview
│   │   ├── AiSettings.jsx       # API-key input + dev-mode security warning, extracted from AiPanel
│   │   ├── AiProposalCard.jsx   # apply/discard preview card shown when Claude returns a valid project-schema JSON block
│   │   ├── LevelsPanel.jsx      # collapsible sidebar panel: list levels, click to activate, double-click to rename, inline height input, add/remove
│   │   ├── canvas/              # 2D canvas primitives
│   │   │   ├── constants.js     # PIXELS_PER_METER, snapTo90, formatMeters, zoom limits
│   │   │   ├── furnitureCatalog.js  # 13 items × 6 categories (Architecture added with Stairs); dimensions in meters
│   │   │   ├── openingsCatalog.js   # door + window catalog + OPENING_DRAG_MIME constant
│   │   │   ├── openingGeometry.js   # pure helpers: project/snap onto wall, clamp position, overlap test, wallSegmentsForRendering
│   │   │   ├── Opening.jsx          # 2D opening: jambs + door swing arc / window double-line; drag-along-wall via projected dragBoundFunc
│   │   │   ├── OpeningProps.jsx     # PropertiesPanel editor for a selected opening (width / height / sill height)
│   │   │   ├── Grid.jsx         # minor/major/axis grid lines
│   │   │   ├── Wall.jsx         # Konva line with right-click delete + selection highlight
│   │   │   ├── Furniture.jsx    # Konva group: footprint rect + front-edge tick + label
│   │   │   ├── DimensionLabel.jsx  # floating "X.XX m" chip
│   │   │   ├── DragGhost.jsx       # translucent footprint preview shown on the canvas while a sidebar tile is being dragged
│   │   │   ├── DiffOverlay.jsx     # green/amber/red overlay for active AI proposal — added/modified/removed walls + furniture footprints
│   │   │   ├── stageHandle.js      # module-level Konva Stage holder — registerStage / getStage; lets Toolbar reach stage.toDataURL() without props or Zustand
│   │   │   ├── SnapIndicator.jsx   # cyan endpoint-square / midpoint-diamond marker shown while snap target is active
│   │   │   ├── Room.jsx            # detected room polygon: fill (default or material), centroid name label, selectable when not mid-draw
│   │   │   ├── roomDetection.js    # planar-graph face detection → Array<{ id, verts, centroid }>, polygonAreaM2 helper, vertex-set fingerprint for stable identity
│   │   │   ├── floorMaterials.js   # 5 floor materials (Wood/Tile/Carpet/Marble/Concrete) + DEFAULT_ROOM_FILL + materialOverlayFill
│   │   │   ├── wallMaterials.js    # 5 wall materials (Painted White/Brick/Concrete/Wood Panel/Wallpaper) + DEFAULT_WALL_COLOR + wallColorFor(wall)
│   │   │   ├── furnitureMaterials.js  # 7 furniture materials (Light Wood/Dark Wood/White/Black/Linen/Navy/Forest) + furnitureColorFor(item) (override > catalog)
│   │   │   ├── FurnitureProps.jsx  # PropertiesPanel editor for selected furniture — stats + material picker + model status
│   │   │   ├── Swatch.jsx          # shared material-picker chip used by RoomProps + WallProps + FurnitureProps
│   │   │   ├── HudOverlay.jsx      # bottom-of-canvas chips: zoom %, cursor in meters, context-sensitive hint
│   │   │   ├── DrawPreview.jsx     # the dashed-blue preview wall + start/end dots + live dimension label
│   │   │   ├── Underlay.jsx        # Konva.Image with drag-when-unlocked + selection
│   │   │   ├── UnderlayProps.jsx   # PropertiesPanel editor for the underlay (opacity, calibrate, remove, AI trace)
│   │   │   ├── WallProps.jsx       # PropertiesPanel editor for a selected wall — editable Length (m), Height (m), Thickness (m) inputs + material picker
│   │   │   ├── RotationHandle.jsx  # blue circle on a stick — click-drag to rotate selected furniture
│   │   │   ├── CalibrationOverlay.jsx  # invisible capture rect + cyan calibration markers (top of stage)
│   │   │   ├── CalibrationPrompt.jsx   # HTML modal asking for real-world distance
│   │   │   └── imageDownscale.js   # canvas-based JPEG re-encode helper + QUOTA_WARN_BYTES threshold
│   │   └── viewer3d/            # 3D viewer (Three.js)
│   │       ├── Viewer3D.jsx     # mount point: container div + useThree(containerRef)
│   │       ├── threeMath.js     # KONVA_TO_THREE, konvaToFloor, konvaRotationToThreeY
│   │       ├── sceneReconcilers.js  # reconcileWalls (CSG cuts + painted overlay fallback) + reconcileRooms + Group-safe disposeAll; re-exports reconcileFurniture
│   │       ├── wallCSG.js           # three-bvh-csg helper: builds wall BoxGeometry minus opening boxes; throws on failure
│   │       ├── reconcileFurniture.js  # Group-wrapped furniture: box fallback ↔ loaded GLB upgrade in-place
│   │       ├── reconcileDoors.js    # reconcileDoors + tickDoorAnims — hinged door panel Groups; click toggles open/closed with 300ms smoothstep animation
│   │       ├── furnitureModelCache.js # pure-JS module: cache + getModelStatus + isModelLoaded + onceModelLoaded (no three import; safe to use from PropertiesPanel)
│   │       ├── furnitureModels.js     # three-side helpers: GLTFLoader, cloneLoadedModel (deep clone materials), fitToBox; re-exports cache getters
│   │       ├── selectionHighlight.js # applySelectionHighlight (traverse-based) + setObjectEmissive
│   │       ├── picking.js       # attachPicking — raycaster (recursive) + parent walk + click-vs-drag guard; kind='door' dispatches onToggleDoor instead of onSelect
│   │       ├── walkthroughCollision.js  # pure 2D ray-segment math for wall collision: raySegmentIntersect + rayHitsWalls (no THREE import)
│   │       ├── walkthroughCollision.test.js
│   │       ├── stairsGeometry.js    # pure BufferGeometry builder: buildStairsGeometry(w,d,h,numSteps=12) — stepped staircase, all 6 faces per step, indexed geometry
│       └── stairFloorHoles.js   # stairHoleCorners (CW-rotation footprint), holesFp (fingerprint), computeStairHolesForRooms (PIP assignment)
│   ├── hooks/
│   │   ├── useElementSize.js    # ResizeObserver hook for fluid stage sizing
│   │   ├── useViewport.js       # scale/pan state, wheel-zoom-around-cursor, drag-pan, client→world helper
│   │   ├── useCanvasKeyboard.js # global shortcuts: space-pan, esc, del/backspace, R/Shift+R rotate; esc also cancels calibration
│   │   ├── useDrawWalls.js      # the click-to-draw-walls handler factored out of CanvasArea (snap, chain, calibration guard)
│   │   ├── useFurnitureDrop.js  # sidebar→canvas drag handlers (dragover/leave/drop); spreadable as {...dragHandlers}
│   │   ├── useOpeningDrop.js    # sidebar→wall drop handlers (wall-snap within 28 screen px, addOpening on drop, toast on rejection)
│   │   ├── useProjectIO.js      # toolbar export/import flow: exportPng, exportJson (.studio.json save), openJson (file picker → validate → confirm → loadProject)
│   │   ├── useUndoRedo.js       # reactive read of the zundo temporal store (canUndo/canRedo + undo/redo actions)
│   │   ├── useWalkthrough.js    # PointerLockControls hook — physics (gravity/jump/wall-collision) wired to stateRef.current.onFrame
│   │   ├── useApiKey.js         # sessionStorage-backed [key, setKey] for the Anthropic API key — never persisted
│   │   ├── useAiProposalSync.js # watches the latest assistant message; parses ```json → validates → diffs → setAiProposal; returns helpers for the panel UI
│   │   ├── useFurnitureDrop3D.js  # 3D sidebar drag-drop: furniture (floor raycast + 0.5m snap) + openings (wall raycast → wallPositionFrom → addOpening); exports wallPositionFrom for tests
│   │   └── useThree.js          # the only file outside viewer3d/ that imports `three`; owns scene/camera/renderer/composer/controls/RAF/resize; EffectComposer chain: RenderPass→SSAOPass→UnrealBloomPass; reconciles walls + furniture + rooms from the store via useEffect
│   ├── store/
│   │   ├── useStore.js          # composer: imports slices, wires persist + zundo, holds loadProject + getSelectedFurniture
│   │   └── slices/              # one file per state concern
│   │       ├── wallsSlice.js
│   │       ├── furnitureSlice.js
│   │       ├── openingsSlice.js # doors + windows on walls — addOpening/updateOpening/removeOpening/toggleDoorOpen; door items have open:false default
│   │       ├── roomsSlice.js
│   │       ├── underlaySlice.js
│   │       ├── viewSlice.js     # show3d + drawStart
│   │       ├── uiSlice.js       # selection + dragGhost (now carries kind/wallId/position) + toast
│   │       ├── lightingSlice.js # lightsOn + timeOfDay + ambientStrength — persisted, not in undo
│   │       ├── walkthroughSlice.js  # walkthrough bool — NOT persisted, NOT in undo history
│   │       ├── levelsSlice.js       # building levels: { id, name, height, order }; GROUND_FLOOR_ID='L00000'; computeLevelOffsets(); solo3d + xrayCeiling flags
│   │       └── levelsSlice.test.js  # 19 tests: computeLevelOffsets + all 9 actions
│   ├── App.jsx                  # root layout: Toolbar + Sidebar + Canvas + (PropertiesPanel ↔ AiPanel) + Toast
│   ├── index.css                # Tailwind import + full-height reset
│   ├── test/
│   │   └── setup.js             # jsdom localStorage/sessionStorage stub + @testing-library/jest-dom matchers
│   ├── services/
│   │   ├── claudeApi.js         # browser-side fetch + SSE streaming for Anthropic Messages API (dangerous-direct-browser-access header)
│   │   ├── aiPrompts.js         # buildSystemPrompt(state) — role + data model + slimmed project snapshot (underlay bytes stripped); extractJsonBlock helper; contract spec for apply-ready JSON
│   │   ├── aiApply.js           # validateProposedProject(raw) + diffProject(current, proposed) + diffIsEmpty / totalChangeCount
│   │   └── traceFloorPlan.js    # Claude vision call to trace wall segments from underlay image; parseDataUrl + transformWalls (img-px → Konva world); returns proposal { walls, furniture:[], openings:[], roomMeta:{} }
│   └── utils/
│       └── projectIO.js         # versioned .studio.json envelope build/validate, downloadBlob/DataUrl helpers, readJsonFile, timestampForFilename
├── vite.config.js               # react + tailwindcss plugins
└── package.json
```

### Planned additions
- `components/viewer3d/` — Three.js 3D room viewer
- `components/sidebar/` — furniture catalog, tool groups
- `components/properties/` — typed property editors
- `components/ui/` — shared buttons, inputs, etc.
- `hooks/useThree.js` — Three.js scene management
- `assets/furniture/` (.glb + thumbnails), `assets/textures/`

## Current Status

### ✅ Done
- [x] Auto-context skill — `.claude/skills/auto-context.md` rule to keep CONTEXT.md updated after every file change
- [x] Auto-context skill rebuilt as proper SKILL.md — moved to `.claude/skills/auto-context/SKILL.md` with YAML frontmatter so it's discoverable/invokable as a real skill
- [x] React-style skill — `.claude/skills/react-style/SKILL.md` enforces functional components, Zustand for shared state, custom hooks >20 lines, PascalCase components, camelCase hooks, Tailwind-only styling, components <150 lines, destructured props
- [x] Three-scene skill — `.claude/skills/three-scene/SKILL.md` rules for the 3D viewer: single `useThree.js` hook, one-time scene/camera/renderer init, store→scene sync via useEffect, GLB furniture with BoxGeometry fallback, baseline AmbientLight + DirectionalLight, PerspectiveCamera fov 60, conversion 1 Konva px = 0.02 Three units
- [x] Konva-canvas skill — `.claude/skills/konva-canvas/SKILL.md` codifies 2D canvas constants & behaviour: 50px=1m, walls snap to 90°, grid 50px minor / 250px major, wall stroke 10px + 12px hit padding, selection `#3b82f6`, dimensions visible while drawing, world bounds ±5000
- [x] Debugging-discipline skill — `.claude/skills/debugging-discipline/SKILL.md`: fix build before features, never comment out broken code, `npm run build` after every fix, strip console.logs before done, install missing packages immediately
- [x] Session-ritual skill — `.claude/skills/session-ritual/SKILL.md`: start (read CONTEXT.md + `npm run build` + report state) and end (`npm run build` + update CONTEXT.md + summarise completed/next) of every session
- [x] Imported 5 skills from realshare project: `uxui-designer`, `systematic-debugging`, `verification-before-completion`, `error-handling-patterns`, `react-state-zustand` (read each SKILL.md to learn what they enforce before relying on them)
- [x] Reconciled imports: deleted `react-state-zustand` (overlapped `react-style` rule 2; Supabase-specific) and `error-handling-patterns` (Next.js/Supabase-only, no surface in this project). Trimmed `systematic-debugging` (removed eval artifacts: test-*.md, CREATION-LOG.md) and `uxui-designer` (removed 11 localized description_*.txt duplicates). Merged Zustand `persist` middleware note into `react-style`. Added cross-references between `debugging-discipline` ↔ `systematic-debugging` ↔ `verification-before-completion`, and from `session-ritual` to its supporting skills.
- [x] Root-level governance docs — `CLAUDE.md` (session entry point and skill index), `SPEC.md` (full product spec with vision, users, non-goals, features, user flows for draw/place/3D/upload/AI, data model), `AGENT.md` (autonomy rules: act freely / ask first / never without approval)
- [x] Project scaffold (Vite + React + Tailwind v4 + Zustand + Konva + Three)
- [x] App shell: top toolbar, left sidebar, center canvas, right properties panel
- [x] 2D floor plan canvas
  - Grid background (50 px = 1 m, major gridlines every 5 m, axis lines)
  - Pan: hold `Space` + drag, or middle-mouse drag
  - Zoom: mouse wheel, zooms toward cursor, clamped 20%–500%
  - Wall drawing: click two points; snaps to 90° (horizontal/vertical)
  - Live dimension label in meters while drawing
  - Right-click a wall to delete it
  - `Esc` or right-click empty canvas cancels current draw
  - HUD: zoom %, cursor coords in meters, contextual hint
- [x] Unified selection model — `selection: { kind: 'wall' | 'furniture', id } | null`. Click selects, `Del`/`Backspace` removes, `Esc` clears, `R`/`Shift+R` rotates furniture. PropertiesPanel reads from selection.
- [x] Furniture catalog & drag-and-drop placement
  - 12 items across 5 categories (Seating, Tables, Bedroom, Storage, Decor) in `furnitureCatalog.js`
  - Sidebar tiles use HTML5 drag with custom MIME (`application/x-interior-studio-furniture`)
  - Drop handler on the canvas container converts `clientX/Y` → world coords (via `clientToWorld` in `useViewport.js`) and snaps to the 50 px grid
  - `Furniture.jsx` renders each item as a Konva Group: tinted rect sized to `width × depth × PIXELS_PER_METER`, front-edge tick to show rotation, centered type label, all counter-scaled by `view.scale`
  - Konva-native `draggable` for in-canvas move; `onDragEnd` writes new position to store
  - Right-click deletes a piece; `Del` removes whichever (wall or furniture) is selected
- [x] Selection-blue unification — `Wall.jsx` and `DimensionLabel.jsx` updated from `#60a5fa` to `#3b82f6` so all selected elements (walls, dimension preview, furniture) share the same blue per the `konva-canvas` skill
- [x] `WALL_THICKNESS` bumped from `8` → `10` in `constants.js` to match the `konva-canvas` skill (closed open question from previous session)
- [x] 3D viewer (split view, Three.js)
  - Toolbar 2D/3D toggle (`show3d` + `toggle3d` in store); App.jsx renders `<Viewer3D />` next to `<CanvasArea />` when on
  - `useThree(containerRef)` is the only hook that imports `three`; instantiates Scene / PerspectiveCamera (fov 60) / WebGLRenderer / OrbitControls exactly once via empty-deps `useEffect`, RAF render loop, ResizeObserver, full dispose on unmount (per `three-scene` skill)
  - Lighting baseline: AmbientLight (0.6) + DirectionalLight (0.9 from (8, 12, 6))
  - Walls render as `BoxGeometry(length, 2.4, WALL_THICKNESS × 0.02)` positioned at the midpoint + rotated `-atan2(Δz, Δx)`
  - Furniture renders as `BoxGeometry(width, height, depth)` in catalog color, positioned at `(x × 0.02, height/2, y × 0.02)`, rotated `-rotationDeg × π/180`
  - Reactive sync: dedicated `useEffect` per slice (`walls`, `furniture`) calls reconcilers that add/update/remove meshes against the live Three scene. One-way: store → scene
  - Floor `PlaneGeometry` + `GridHelper` provide ground reference
- [x] `Viewer3D` code-split via `React.lazy` + `Suspense` in `App.jsx` — main bundle dropped from `1051 kB / 293 kB gzip` back to `517 kB / 160 kB gzip`. Three.js (`Viewer3D-*.js` chunk, ~135 kB gzip) downloads on-demand the first time the user toggles 3D on. Fallback shows "loading 3D…" while the chunk arrives.
- [x] Persistence — `useStore` wrapped in Zustand `persist` middleware. `localStorage` key `interior-studio`, `version: 1`. `partialize` limits the persisted slice to `{ walls, furniture }` so selection / mid-draw / 3D-toggle / draw-start don't leak across reloads.
- [x] Snap to existing wall endpoints + midpoints
  - `SNAP_RADIUS_SCREEN = 14` (px in screen space) in `constants.js`; world threshold is `SNAP_RADIUS_SCREEN / view.scale` so the snap "feel" is zoom-independent.
  - `findNearestSnapPoint(cursor, walls, worldThreshold)` returns `{ x, y, kind: 'endpoint' | 'midpoint' }` or `null`. Endpoints win ties over midpoints.
  - Precedence in the draw flow: a live snap target *overrides* 90° snap. Applies to both the first click (sets `drawStart` to the snapped point — effectively chained drawing without a dedicated mode) and the second click (commit point).
  - `SnapIndicator.jsx` renders a cyan (`#22d3ee`) outlined square for endpoints, diamond for midpoints, counter-scaled so the marker stays ~14 px on screen at any zoom.
- [x] Chained wall drawing — on a successful commit, `drawStart` becomes the new endpoint (instead of `null`), so the next click extends the chain. Zero-length click (same point twice), `Esc`, or right-click empty canvas ends the chain. Snap-to-endpoint already let users close loops; chaining removes the "click to start a new wall each time" friction.
- [x] `USER_GUIDE.md` at the project root — non-technical reference covering every user-facing feature (wall drawing, chaining, snapping, furniture placement, rotation, selection, properties, room detection, 3D viewer, auto-save) plus a complete keyboard-shortcuts table and a small FAQ. Updated at session-end via the `session-ritual` skill whenever user-facing behavior changes.
- [x] `session-ritual` skill extended — end-of-session ritual now includes a `USER_GUIDE.md` update step (with explicit do/don't-update rules), and the "Why these halves matter" section explains the audience split between CONTEXT.md (next Claude session) and USER_GUIDE.md (human user).
- [x] Room detection
  - `roomDetection.js` implements planar face detection on the wall graph: snap-equal endpoints share a node, each wall yields two directed half-edges, half-edges at each node sorted by angle, "next" pointer = the half-edge immediately CW from the incoming twin (consistent right-hand turn). Tracing yields every face; the unbounded outer face is filtered by signed-area sign.
  - In Konva's screen-y-down coords, this traversal traces inner rooms with **positive signed area** and the outer face with negative. Filter: `signedArea > MIN_ROOM_AREA = 25 × 25 px²` (~0.25 m²), which also drops degenerate near-zero polygons from dangling walls.
  - `Room.jsx` renders each polygon as a closed `Konva.Line` with `fill="rgba(56, 189, 248, 0.10)"` (sky-400 at 10% α), no stroke, `listening={false}`.
  - Computation runs inside `useMemo(() => detectRooms(walls), [walls])` in `CanvasArea.jsx` — re-detects only on wall changes, not on every render.
  - Rooms render *before* walls in the same Konva layer so the tint sits under the wall strokes.
- [x] Named rooms + floor materials
  - `roomDetection.detectRooms(walls)` now returns `{ id, verts, centroid }` per room. `id` is a fingerprint = sorted vertex coords joined by `|`; invariant to traversal start/direction. `centroid` is area-weighted (stays inside L-shapes; vertex average can fall outside).
  - Store gains `roomMeta: { [fingerprint]: { name?, floorMaterial? } }` and `updateRoomMeta(id, patch)`. Persisted alongside walls + furniture so room names survive reload. Selection model extended with `kind: 'room'`.
  - `floorMaterials.js` catalogs 5 materials (Wood, Tile, Carpet, Marble, Concrete) with an opaque hex color and a `materialOverlayFill(hex)` helper that turns each into a translucent 2D overlay (~35% alpha).
  - `Room.jsx` now accepts `selected`, `fill`, `listening`, `name`, `scale`, `onSelect`; renders a centroid name label when set; gets a blue stroke when selected; `listening={drawStart === null}` so rooms ignore clicks while mid-draw (the user can still extend a wall chain by clicking inside a room).
  - `PropertiesPanel` gains a `RoomProps` editor: name input, 6-swatch material picker (with the project's selection-blue active state), read-only area in m² and vertex count.
  - `HudOverlay` extracted into `canvas/HudOverlay.jsx` (was inline in `CanvasArea`); added a room-selected hint.
- [x] Test suite — Vitest with 120 passing tests across 15 files
  - Setup: `vitest.config.js` (jsdom env, globals on, setup file), `src/test/setup.js` (stubs `localStorage` / `sessionStorage` because jsdom-in-vitest exposes them on `window` but not as bare globals, which broke Zustand `persist`).
  - Commands: `npm test` (CI run), `npm run test:watch`, `npm run test:ui`.
  - Coverage:
    - **Slices**: `wallsSlice`, `furnitureSlice`, `roomsSlice`, `underlaySlice`, `viewSlice`, `uiSlice` — each tested in isolation with a fresh per-test store (and a tiny stub for cross-slice writes like `removeWall` clearing selection).
    - **Composer**: `useStore.test.js` covers `loadProject`, `applyAiProposal` (verifies underlay preservation + single-history-step apply), zundo undo/redo with `vi.useFakeTimers()` to advance past the 300 ms debounce, and the 50-step history cap.
    - **Pure utilities**: `roomDetection` (square / L-shape / figure-8 / dangling walls / fingerprint stability), `aiApply` (validate good + bad shapes, diff edge cases including material-null-vs-missing equality), `projectIO` (envelope round-trip + version checks + malformed input coercion), `canvas/constants` (`snapTo90`, `formatMeters`, `findNearestSnapPoint`), the 3 material catalogs, `threeMath`.
  - **Bug caught**: `roomDetection.js` was using `(idx + 1) % len` for the next-pointer in face traversal. With 2-way junctions only (square, L-shape) this is the same as `(idx - 1 + len) % len` and both worked, but at T-junctions (figure-8 with a divider) the wrong direction picked the outer perimeter as a face instead of the inner rooms. Fixed to `(idx - 1 + len) % len` — see the comment in `roomDetection.js`.
- [x] AI "Apply to project" — preview + commit + undo
  - `src/services/aiApply.js` — `validateProposedProject(raw)` (structural check: arrays, finite numerics, string ids), `diffProject(current, proposed)` (per-slice added/modified/removed by `id` or key), plus `diffIsEmpty` / `totalChangeCount`. Material/type strings are not strictly validated — the renderer's defaulting handles unknowns.
  - System prompt in `aiPrompts.js` now spells out the contract: when proposing edits Claude returns the COMPLETE intended state of walls + furniture + roomMeta, keeping existing ids verbatim. Omissions = deletions. Underlay out of scope.
  - Store: `aiProposal: { proposed, diff } | null` in `uiSlice`. `applyAiProposal` lives on the composer — one `set()` that swaps in the proposed slice and clears transient state (consistent with `loadProject`). One Cmd+Z reverts the entire apply because zundo tracks the partialized history slice and the temporal middleware sees a single state delta.
  - `useAiProposalSync(messages, streaming, pushToast)` hook: watches for a `\`\`\`json` block, parses + validates after streaming completes, computes the diff against the live store, dispatches `setAiProposal`. Exposes `proposalError` for malformed JSON, `onApply` / `onDiscard` / `copyJson` for the panel UI.
  - `AiProposalCard.jsx` renders inside the AI panel when a valid proposal is detected — per-slice +/~/− counts in green / amber / red, Apply + Discard buttons.
  - `DiffOverlay.jsx` renders inside the Konva interaction layer when `aiProposal` is active: green dashed strokes / footprints for additions, amber strokes for modifications, red dashed strokes for removals. `listening={false}` everywhere so clicks still reach underlying shapes.
  - AiPanel: sending a new prompt discards any pending proposal (it's stale to the new turn).
- [x] AI design assistant (Claude API, browser-side, session-scoped)
  - Toolbar **AI** button toggles `aiPanelOpen` in `uiSlice`. App.jsx renders `<AiPanel />` instead of `<PropertiesPanel />` when on.
  - `src/services/claudeApi.js` — pure browser fetch + SSE streaming. Posts to `https://api.anthropic.com/v1/messages` with `stream: true` and the `anthropic-dangerous-direct-browser-access: true` header (required for CORS to allow browser calls). Yields text deltas as an async generator. Throws on HTTP errors and on mid-stream `event: error` payloads.
  - `src/services/aiPrompts.js` — `buildSystemPrompt(state)` returns the role + data-model doc + a JSON snapshot of the current design (walls, furniture, rooms-with-meta, underlay-without-bytes). `extractJsonBlock(text)` pulls the first ```json fenced block out of a reply for the Copy button.
  - `src/hooks/useApiKey.js` — sessionStorage only. Listens to `storage` events. Never written into `persist` or `.studio.json`.
  - `src/components/AiPanel.jsx` — chat UI. Local state for messages + prompt + streaming + error. Each turn re-builds the system prompt from the current store state so the model always has the live design. **Enter** to send, **Shift+Enter** for newline. Disabled controls while streaming. Auto-scrolls the transcript as text arrives. Renders the streaming cursor on the active reply.
  - `src/components/AiSettings.jsx` — extracted API-key input + unmissable amber warning about browser-side key exposure.
  - Model: `claude-sonnet-4-20250514` (per user spec). System prompt name + model constant both live in `AiPanel.jsx`.
  - Apply: copy-to-clipboard for any ```json block in the last reply. Direct store mutation is a deliberate follow-up — needs a diff/preview UX before we let an LLM write to user data.
- [x] Store refactored into slices
  - `src/store/slices/` — one file per concern: `wallsSlice`, `furnitureSlice`, `roomsSlice`, `underlaySlice`, `viewSlice` (3D toggle + drawStart), `uiSlice` (selection + dragGhost + toast).
  - Each slice exports `createXxxSlice(set, get)` returning its state + actions. Cross-slice writes (e.g. removeWall clearing the selection) work because `set` merges into root state regardless of which slice declared a key.
  - `useStore.js` is now a 103-line composer: imports the 6 slice creators, spreads them, holds `loadProject` + `getSelectedFurniture` cross-slice actions, and wraps everything in `persist(temporal(...))`. Same hook export, same per-component imports — zero call-site churn.
  - No behaviour change. Verified by build green + manual trace of every action path through the new files.
- [x] Furniture material override
  - `furnitureMaterials.js` exports `FURNITURE_MATERIALS` (Light Wood, Dark Wood, White, Black, Linen, Navy, Forest) and `furnitureColorFor(item)` (material override > catalog default `item.color`).
  - Furniture shape gains optional `material: id | null`. Existing pieces hydrate cleanly — `material` is undefined → falls through to catalog color.
  - `Furniture.jsx` (2D) uses `furnitureColorFor(item)` for the fill.
  - `reconcileFurniture.js` (3D) uses `furnitureColorFor(f)` when creating the box fallback and when updating `mesh.material.color` on change. **Loaded GLB models are not retinted** — they keep their authored materials. (A future enhancement could traverse the GLB tree and apply the override.)
  - `FurnitureProps.jsx` extracted from PropertiesPanel; adds an 8-swatch picker following the same pattern as walls + floors. Shared `Swatch` component reused.
- [x] Undo / redo via `zundo` temporal middleware
  - `npm install zundo` added. Middleware order: `create(persist(temporal(creator, tempOpts), persistOpts))` — temporal records history, persist writes the current state. Undo restores a past state via the inner set, which then propagates through persist (so the undone state survives a reload).
  - History config: `limit: 50`, `partialize` to `{ walls, furniture, roomMeta, underlay }` (transient UI state excluded), `handleSet: (h) => debounce(h, 300)` so continuous flows (rotation drag, name typing) collapse into one entry per quiet pause.
  - `useUndoRedo` hook reactively reads `pastStates.length` / `futureStates.length` from `useStore.temporal` to drive button enable state.
  - `useCanvasKeyboard` gains `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z`. The existing input/textarea guard at the top of the handler means typing-in-a-field falls through to native browser text undo — by design.
  - Toolbar gains `↶` / `↷` square buttons next to the app name, with disabled state when history is empty.
- [x] Export PNG + Save / Open `.studio.json`
  - New `src/utils/projectIO.js` (pure, no React/Konva/Zustand): `buildExportData`, `validateImport`, `downloadBlob`, `downloadDataUrl`, `readJsonFile`, `timestampForFilename`, plus `FORMAT = 'interior-studio'` and `VERSION = 1` constants. Envelope: `{ format, version, exportedAt, data: { walls, furniture, roomMeta, underlay } }` — mirrors the `persist` partialize slice.
  - New `src/components/canvas/stageHandle.js` — module-level holder. `CanvasArea` registers the Konva Stage on the `ref` callback (`(node) => { stageRef.current = node; registerStage(node) }`), so Toolbar can reach `stage.toDataURL(...)` via `getStage()` without props-threading or storing functions in Zustand.
  - Store: new `loadProject(data)` action replaces `walls`/`furniture`/`roomMeta`/`underlay` and clears transient state (`selection`, `drawStart`, `calibration`, `dragGhost`). `show3d` is intentionally left alone (window arrangement is a session preference).
  - `useProjectIO` hook bundles three handlers for the toolbar: `exportPng` (toDataURL at `pixelRatio: 2`), `exportJson` (Blob → download), `openJson` (clicks the hidden file input). The change handler validates the file, prompts `window.confirm` if there's existing work, and hydrates via `loadProject`. Toast on success/failure.
  - `CanvasArea` gained a full-bleed background `Rect` (gray-950 `#030712`, ±2×WORLD_HALF, listening=false) inside the underlay layer. Same colour as the container's CSS `bg-gray-950` — invisible to live users but means PNG export has the dark backdrop baked in instead of transparent pixels.
- [x] Drag-from-sidebar ghost preview
  - Store: transient `dragGhost: { type, x, y } | null` + `setDragGhostType` / `setDragGhostPos` / `clearDragGhost`. Not persisted.
  - `Sidebar.CatalogTile` sets the ghost type on `onDragStart`; the same component's `onDragEnd` always clears (covers successful drops and aborted drags).
  - `useFurnitureDrop(containerRef, view)` hook owns the three canvas-side handlers (`onDragOver`, `onDragLeave`, `onDrop`). `onDragOver` snaps the cursor to the 50 px grid in world coords and updates the ghost position; `onDragLeave` clears the ghost only when `e.relatedTarget` is outside the canvas container (child-boundary crossings don't trigger). `onDrop` adds the furniture at the snapped position and clears the ghost. Spread as `{...dragHandlers}` onto `<main>`.
  - `DragGhost.jsx` renders a translucent Konva `Rect` sized to `spec.width × spec.depth × PIXELS_PER_METER`, dashed blue outline. `listening={false}` so it never intercepts the drag.
  - CanvasArea size: 178 → 147 lines after extracting `useFurnitureDrop`.
- [x] Wall materials
  - `wallMaterials.js` exports `WALL_MATERIALS` (Painted White, Brick, Concrete, Wood Panel, Wallpaper), `DEFAULT_WALL_COLOR` (`#e5e7eb`, the previous gray), `getWallMaterial(id)`, and `wallColorFor(wall)` (returns the per-wall colour, defaulting when no material is set).
  - Wall data shape gains an optional `material: id | null`. Existing walls hydrate fine — `material` is undefined → treated as null → default colour.
  - `Wall.jsx` uses `wallColorFor(wall)` for the stroke. Selection-blue still overrides when selected.
  - `reconcileWalls` computes `color = wallColorFor(w)`, builds the mesh material with it on creation, and `mesh.material.color.set(color)` on change (tracked via `mesh.userData.color`, same pattern rooms use).
  - `WallProps` adds a 6-swatch picker (Default + 5 materials) below the length input. Dispatches `updateWall(id, { material })`.
  - Shared `Swatch.jsx` extracted from PropertiesPanel and used by both `RoomProps` and `WallProps`.
- [x] GLB furniture pipeline scaffolded (BoxGeometry fallback active)
  - `furnitureCatalog.js` — every item now carries `model: null`. README in `src/assets/furniture/` documents how to add real `.glb` files and reference them with the Vite `import.meta.url` pattern.
  - `useStore.addFurniture` snapshots `spec.model` onto the new piece so changing the catalog later doesn't retroactively upgrade existing items.
  - `furnitureModelCache.js` (pure JS, no `three` import) — module-level Map of url → `{ state, scene?, error?, listeners }`. Exports `getModelStatus`, `isModelLoaded`, `onceModelLoaded`. **Critical**: PropertiesPanel imports from here, not from `furnitureModels.js`, so the main bundle doesn't drag in Three.
  - `furnitureModels.js` — three-side helpers: `loadFurnitureModel` (GLTFLoader, idempotent), `cloneLoadedModel` (deep-clones materials so per-instance emissive doesn't bleed across pieces), `fitToBox` (`Box3().setFromObject` → scale to `width × depth × height`, shift bottom-centre to local origin).
  - `reconcileFurniture.js` extracted from `sceneReconcilers.js`. Each piece is a `THREE.Group` containing either a Box mesh fallback or the loaded GLB scene. Lifecycle: create Group → if model URL set, kick load + box fallback now → on load completion, swap in the cloned/fitted model. Dim changes rebuild the current child; colour changes update the fallback box only. On load completion the new child also picks up the emissive highlight if `userData.highlighted` is set.
  - `selectionHighlight.js` rewritten to traverse subtrees so Groups light up correctly. New `setObjectEmissive` export used by `reconcileFurniture` after upgrades. `applySelectionHighlight` now stamps `userData.highlighted` on each entry so async GLB swaps preserve the highlight.
  - `picking.js` updated to `intersectObjects(..., true)` and walks `node.parent` up until a `userData.kind` ancestor is found — handles both leaf Meshes (walls/rooms) and Groups (furniture).
  - `sceneReconcilers.disposeAll` and the shared `removeMissing` now traverse subtrees with `obj.traverse(...)` so Groups dispose every leaf's geometry + material, not just the top-level object's.
  - PropertiesPanel `FurnitureProps` shows a **Model** row: `"Box fallback"` / `"GLB loading…"` / `"GLB loaded"` / `"GLB failed — using box"`.
- [x] Bidirectional 3D selection sync
  - **2D → 3D**: `applySelectionHighlight(wallMeshes, furnMeshes, roomMeshes, selection)` in new `viewer3d/selectionHighlight.js` walks the mesh maps and toggles `material.emissive` (`#3b82f6`, intensity 0.55) on the matching mesh. Called from `useThree` in a new effect on `[selection, walls, furniture, roomMeta]` — the structural deps ensure freshly-created meshes (auto-select after furniture drop) get the right highlight on the same render.
  - **3D → 2D**: `viewer3d/picking.js` exports `attachPicking(renderer, camera, meshMaps, { onSelect, onClear })`. Raycaster against the live mesh maps; click-vs-drag guard (4 px pointer movement) prevents orbit-drags from registering as selections. Click on empty 3D space clears selection.
  - Reconcilers now tag each mesh with `mesh.userData = { kind, id, ... }` on creation so the raycaster can identify the hit.
  - Cleanup wired through `stateRef.current.detachPicking` so the listeners come off on unmount (and on HMR / toggle-off-3D).
- [x] Furniture rotation handle
  - `RotationHandle.jsx` renders a small blue circle on a short stick projecting past the back edge of the selected furniture's footprint. World position derived from item centroid + rotated offset.
  - Click-drag uses a `dragBoundFunc` returning the static world position (so the handle visually stays put under the cursor) plus `onDragMove` reading the live pointer and computing `Math.atan2(dx, -dy)` to derive the new rotation in degrees (snapped to integer). Centroid-jitter guard: ignores drags within 5 px of the centroid (atan2(0,0) would snap to 0).
  - CanvasArea renders the handle conditionally on `selection?.kind === 'furniture'` after the furniture rendering loop. Keyboard `R` / `Shift+R` shortcuts remain unchanged for precise 15° steps.
- [x] In-canvas wall length editing
  - Store: new `updateWall(id, patch)` action — `{ walls: walls.map(...) }`.
  - `WallProps.jsx` extracted from PropertiesPanel; renders an editable `Length (m)` number input bound to local state. `key={wall.id}` on the component ensures fresh local state when the selected wall changes.
  - Commit (Enter or blur): parses input, validates `>= 0.05 m`, computes new endpoint along the wall's current direction (`(x1, y1) + unitVec × newLengthPx`), dispatches `updateWall`. Esc reverts.
- [x] Underlay quota handling — auto-downscale on upload + persistence failure toast
  - `imageDownscale.js` exports `downscaleDataUrl(dataUrl, maxPx=2000, quality=0.85)` — decodes via `<img>`, draws to an offscreen `<canvas>` if the long side exceeds `maxPx`, re-encodes as JPEG. Images already under `maxPx` pass through unchanged.
  - `QUOTA_WARN_BYTES = 4 MB` of base64 chars — comfortably below the ~5 MB localStorage cap once walls/furniture/roomMeta share the payload.
  - `Toolbar.handleFile` is now async: read → downscale → set underlay → verify persist landed (reads back `localStorage.getItem('interior-studio')` next microtask; if the underlay's dataUrl didn't make it, emits an `error` toast).
  - Three toast paths: error (didn't persist), warn (size above threshold but did persist), info (downscaled successfully).
  - Toast plumbing: store gains single-slot `toast` + `pushToast(msg, kind)` + `dismissToast`. `Toast.jsx` component renders bottom-center with kind-specific styling, 6 s auto-dismiss, click to dismiss. Mounted once in `App.jsx`.
- [x] Floor-plan image underlay with two-click calibration
  - Toolbar gains an "Upload underlay" / "Underlay" button (toggles state based on whether one is loaded). File picker accepts PNG/JPG; image read to a base64 data URL.
  - Store: `underlay: { dataUrl, x, y, scale, opacity, locked }` + transient `calibration: { p1?, p2? }`. Actions: `setUnderlay`, `updateUnderlay`, `clearUnderlay`, `startCalibration`, `cancelCalibration`, `setCalibrationPoint`, `applyCalibration(meters)`. `applyCalibration` is in the store (not the component) so the scale/origin computation has atomic access to both underlay and calibration state. Underlay persisted; calibration excluded from `partialize`.
  - `Underlay.jsx` renders a `Konva.Image` loaded via a small `useEffect`. Draggable + selectable while unlocked; `listening={false}` while locked so clicks pass through to wall drawing.
  - `CalibrationOverlay.jsx` renders a top-most invisible `Konva.Rect` (`fill="rgba(0,0,0,0.001)"`) covering the world bounds — captures the next two left-clicks regardless of what shape sits underneath. Also renders cyan circle-plus-cross markers at each placed point and a dashed connecting line.
  - `CalibrationPrompt.jsx` is an HTML modal (not Konva) that appears once both points are placed. Number input autofocused; Enter applies, Esc cancels.
  - Math: `ratio = (distance_m × PIXELS_PER_METER) / pixelDistance`. New scale = `old × ratio`. New image origin shifts so `p1` stays fixed in world coords (`newX = p1.x - (p1.x - oldX) × ratio`).
  - `useCanvasKeyboard` updated: `Esc` cancels calibration when active before falling through to clearing selection / drawStart.
  - HudOverlay gains calibration-mode hints (`click first calibration point`, etc.).
- [x] Refactor pass to honour the 150-line cap:
  - Extracted `DrawPreview.jsx` from CanvasArea (preview wall + endpoint dots + dimension label).
  - Extracted `UnderlayProps.jsx` from PropertiesPanel.
  - Extracted `useDrawWalls.js` hook from CanvasArea (the click-to-draw-walls handler).
  - Result: `CanvasArea.jsx` 146, `PropertiesPanel.jsx` 139 — both under tolerance.
- [x] Per-room 3D floors in `Viewer3D`
  - `reconcileRooms(scene, rooms, meshMap, colorForId)` added to `sceneReconcilers.js`. Each room becomes a triangulated `THREE.ShapeGeometry` mesh (earcut under the hood). Lays flat via `mesh.rotation.x = Math.PI / 2`, sits at `y = 0.01` (just above the grid and the global floor plane), `MeshStandardMaterial` with `DoubleSide` because the +π/2 rotation flips the face normal.
  - Geometry is built once per fingerprint (room `id` = vertex hash, so same id ⇒ identical polygon); subsequent updates only mutate `mesh.material.color` when the material colour changes.
  - `useThree.js` gains a third reactive effect on `[walls, roomMeta]` that re-runs `detectRooms(walls)` and calls the reconciler with a closure that resolves material colours from `getFloorMaterial(roomMeta[id]?.floorMaterial)?.color ?? DEFAULT_FLOOR_COLOR ('#4b5563')`.
  - Cleanup: `disposeAll(scene, roomMeshes.current)` runs in the unmount path alongside walls + furniture.
  - Viewer3D chunk gained ~7 kB gzip (earcut module pulled in by ShapeGeometry).

- [x] Real color palette — named paint colors + wood finishes (2026-05-21)
  - Three new data files: `benjaminMooreColors.js` (30 colors with name + code + hex), `sherwinWilliamsColors.js` (30 colors), `woodFinishes.js` (15 wood tones, no manufacturer code).
  - `wallMaterials.js` rewritten to compose from BM + SW + a wood-panel "Other" entry — 61 wall materials total. Each carries `{ id, label, color, category, code? }`.
  - `floorMaterials.js` rewritten to compose from wood finishes + tile/marble/concrete/carpet — 19 floor materials.
  - `furnitureMaterials.js` rewritten to compose from wood finishes + a curated paint subset + 8 fabric tones — 40 furniture materials. The curated paint subset is selected via `PAINT_IDS_FOR_FURNITURE` (a Set filter) so the furniture picker isn't overwhelming.
  - Each catalog exports `resolveXxxMaterialId(id)` that maps legacy ids (`painted-white`, `light-wood`, `wood`, etc.) to current equivalents. `getXxxMaterial` and `xxxColorFor` both run through the resolver so legacy persisted state hydrates without breakage.
  - `MaterialPicker.jsx` — new shared component replacing the inline `<Swatch>` grids in `WallProps`, `FurnitureProps`, `RoomProps` (PropertiesPanel inline), `MultiSelectProps`. Groups by `category`, shows a search input when any group exceeds 10 entries, scrollable max-height. Each swatch's `title` shows `name · code` for paints.
  - `Swatch.jsx` updated to accept a `title` prop; defaults to label for back-compat.
  - `aiPrompts.js` updated: describes the new namespaced material ids (`bm-*`, `sw-*`, `wood-*`, `fabric-*`) with examples and notes legacy short ids still work via the resolver.
  - Tests: +31 (3 new data-file tests, expanded legacy-migration coverage on all 3 catalog tests). 211 total passing.

- [x] Real GLB furniture pack — 12 procedural CC0 models (2026-05-20)
  - `scripts/generate-furniture-glbs.mjs` generates raw GLTF 2.0 binary files (no dependencies) for all 12 catalog items: sofa, armchair, chair, coffee-table, dining-table, desk, bed, bookshelf, wardrobe, rug, lamp, tv.
  - Each model is built from box primitives with correct CCW winding and face normals, designed at exact catalog dimensions so `fitToBox()` applies a 1:1:1 scale (no distortion). +Y up, −Z is back, origin at bottom-centre.
  - `furnitureCatalog.js` `model` field set for all 12 items via a `glb(file)` helper using `new URL('../../assets/furniture/${file}', import.meta.url).href`. Files ≥4 kB emit as separate fingerprinted assets; files <4 kB are inlined as data URLs by Vite (both load correctly via GLTFLoader).
  - `furnitureModelCache.js` gains `onCacheChange(fn)` / `notifyCacheChange()` — pure-JS global listener mechanism so React components can subscribe to load-state transitions without Three.js in the main bundle.
  - `furnitureModels.js` calls `notifyCacheChange()` on load start, load success, and load failure.
  - `Viewer3D.jsx` gains a `useAnyModelLoading()` hook (subscribes to cache changes, reads `furniture` from store) and renders a small spinning indicator in the bottom-right corner while any model is in flight.
  - `src/assets/furniture/CREDITS.md` documents the CC0 provenance, geometry conventions, and how to regenerate.
  - Box fallback unchanged — items with `model: null` still render as colored boxes.
  - Existing persisted furniture items keep their snapshotted `model: null` until deleted and re-placed; newly placed items get the GLB URL.

- [x] Multi-select on 2D canvas + layers panel (2026-05-20)
  - Selection model changed to `{ items: [{kind, id}, ...] } | null`. `select(kind, id)` still works (wraps to single-item array). Helpers in `src/store/selectionHelpers.js`: `selectionItems`, `isSelected`, `getSingleItem`, `commonKind`.
  - Shift+click adds/removes individual items. Drag-rectangle marquee on empty canvas selects all items inside the rect. Cmd/Ctrl+A selects all visible items (`selectAll` cross-slice action).
  - Delete/Backspace removes all selected items. R/Shift+R rotates all selected furniture. Multi-furniture drag moves all selected furniture by the same delta (`useFurnitureMultiDrag` hook).
  - PropertiesPanel shows "N items selected" with shared rotation + material editor for all-furniture selections (`MultiSelectProps.jsx`).
  - HudOverlay updated for multi-select hint.
  - `layersSlice.js` adds toggle visibility for Walls/Furniture/Openings/Rooms/Underlay/Grid. Persisted; not in undo history. `LayersPanel.jsx` collapsible panel at bottom of Sidebar with Eye/EyeOff icons (lucide-react). Hidden layers skip rendering and clicking.
  - 3D `selectionHighlight.js` updated for multi-item selection (highlights all selected objects).
  - Tests: +25 new tests; 180 total passing.
- [x] Doors and windows on walls — placeable as a new "Openings" sidebar group above furniture categories. Catalog (`openingsCatalog.js`) defines door (0.9 × 2.1 m) and window (1.2 × 1.4 m, sill 0.9 m) defaults. New MIME `application/x-interior-studio-opening` keeps furniture + opening drag flows independent — the canvas now combines both drop hooks via a `combineDragHandlers(...bags)` helper. `useOpeningDrop.js` projects the cursor onto the nearest wall within 28 screen px (zoom-aware) and stores `{kind, wallId, position}` on `dragGhost`; `DragGhost.jsx` branches on `ghost.kind` and renders a blue snap preview on the target wall (or a red X when no wall is in range). Data model: `openings: [{ id, type: 'door'|'window', wallId, position (0–1), width, height, sillHeight }]` — its own slice (`openingsSlice.js`) with `addOpening` / `updateOpening` / `removeOpening`. Placement guards: width-shorter-than-wall refused, position clamped so the footprint stays inside the wall, overlap with existing openings refused (toast in both cases). 2D rendering: `wallSegmentsForRendering(wall, openings)` splits each wall into solid segments around its openings; `Opening.jsx` renders a door as jambs + perpendicular panel + quarter-circle swing arc, and a window as jambs + two parallel pane lines, both rotated to the wall angle. `dragBoundFunc` projects the cursor back onto the parent wall and clamps to footprint limits — drag-along-wall feels free but stays valid. 3D rendering: `wallCSG.js` uses three-bvh-csg's `Brush` + `Evaluator` + `SUBTRACTION` to cut hole boxes (oversized in Z) out of the wall box geometry; failures throw and the reconciler falls back to plain `BoxGeometry` with a translucent painted-rectangle overlay (`syncOverlay`) where the holes would be (warns to console). Wall geometry is fingerprinted by length + opening list so we only rebuild geometry when something actually changed. Cascade: `removeWall` filters openings on that wall and clears any selection pointing at a removed opening, in the same `set()`. Persist + zundo: `openings` joins `HISTORY_SLICE` and `persist.partialize`; `loadProject` + `applyAiProposal` include it. AI: prompts describe the opening schema and ask Claude to round-trip openings in the same JSON block as walls/furniture/roomMeta; `validateProposedProject` checks wallId references, type, position 0–1, finite width/height/sillHeight; `diffProject` treats openings like walls/furniture with an `openingEqual` field comparator. Tests: new `openingsSlice.test.js` (placement guards, clamping, overlap refusal, update reclamping, selection auto-selection, removeWall cascade), `openingGeometry.test.js` (project/snap/clamp/overlap/segments/placement), plus extensions to `aiApply.test.js` (openings validate + diff) and `projectIO.test.js` (round-trip + coercion). `uiSlice.test.js` updated for the extended `dragGhost` shape (`kind`/`wallId`/`position`). Total: 155 tests, all green.

- [x] Lighting system in 3D — placed lights + global controls (2026-05-20)
  - Four new lighting catalog items in the `'Lighting'` category: Ceiling lamp (PointLight, 3000 K, 8 m), Floor lamp (PointLight, 3000 K, 5 m), Table lamp (PointLight, 2700 K, 3 m), Pendant (SpotLight 30°, 3000 K, 5 m). Each has: `lightType`, `intensity`, `colorTemp`, `distance`, `castShadow`, `on` snapshotted from catalog at add-time.
  - Types prefixed `'lighting:*'` so `isLightingType(type)` identifies them; they use the existing `furniture` store array and all existing placement/selection/deletion tooling.
  - Four procedural GLBs generated by `scripts/generate-lighting-glbs.mjs`: ceiling-lamp (mount plate + cord + shade), floor-lamp (base + pole + shade), table-lamp (base + neck + shade), pendant (cable + cap + shade + diffuser). All CC0.
  - `src/utils/colorTemp.js` — `kelvinToRgb(temp)` + `kelvinToHex(temp)` using Tanner Helland's curve fit; valid 1000–40 000 K, clamped outside that range.
  - `lightingSlice.js` — `lighting: { lightsOn, timeOfDay, ambientStrength }` + three setters. Persisted.
  - `reconcileFurniture.js` extended: receives `lightMap` (Map<id, THREE.Light>) and `lightsOn` boolean. Creates PointLight / SpotLight alongside each lighting item's Group; positions at `lightSourceY` (computed from type + height + yOffset). Ceiling-mounted items (`lighting:ceiling-lamp`, `lighting:pendant`) are positioned at `WALL_HEIGHT − height` so they flush against the ceiling. Hard cap: items beyond 8 active lights are silenced (intensity=0) with a toast warning. Cleans up lights on removal.
  - SpotLight: `angle 30°`, `penumbra 0.2`, `decay 2`; target at floor level directly below.
  - `renderer.shadowMap.enabled = true; type = PCFSoftShadowMap`. Directional sun has 2048×2048 shadow map, 60×60 m frustum. Placed lights have 512×512 shadow maps. Walls get `castShadow + receiveShadow`; room floors get `receiveShadow`; furniture box/model meshes get `castShadow + receiveShadow`.
  - `useThree.js` gains `sunRef`, `ambientRef`, `lightMap` refs. Three new reactive effects: `lighting.timeOfDay → applySunForTime` (arc + kelvin-based sun colour); `lighting.ambientStrength → ambient.intensity`; `furniture → active-light cap check`. Cleanup disposes all lights in `lightMap`.
  - `LightingToolbar.jsx` — overlay in the 3D pane (top-right): master lights toggle, time-of-day 0–24 slider (displays `HH:MM`), ambient strength 0–1 slider.
  - `LightingProps.jsx` — properties panel editor for lighting items: Power on/off, Intensity slider (0–3), Color temp slider (2000–6500 K with live hex swatch), Radius slider (1–15 m), Cast shadow toggle.
  - `PropertiesPanel.jsx` routes `type.startsWith('lighting:')` furniture selections to `LightingProps` instead of `FurnitureProps`.
  - Tests: `+27` (colorTemp × 9, lightingSlice × 7, reconcileLights × 11). 238 total passing.

- [x] Walkthrough (first-person) mode (2026-05-20)
  - **Walk button** in Toolbar (visible only when 3D is on): calls `toggleWalkthrough`; emerald-green when active.
  - `walkthroughSlice.js` — `walkthrough: bool` + `setWalkthrough` + `toggleWalkthrough`. NOT persisted (boots in orbit), NOT in undo history.
  - `walkthroughCollision.js` — pure 2D ray-segment math: `raySegmentIntersect(pos, dir, A, B, maxDist)` and `rayHitsWalls(posXZ, dirXZ, walls, maxDist)` converting Konva wall coords to Three.js units (× 0.02). No Three.js dependency.
  - `useWalkthrough(stateRef, active)` hook — activates when `active` is true; disables OrbitControls, creates `PointerLockControls(camera, renderer.domElement)`, locks cursor, sets `camera.position.y = EYE_HEIGHT (1.65 m)`. WASD/arrow keys + Shift to run + Space to jump. Physics: gravity −12 m/s², jump 5 m/s, dt capped 50 ms. Wall collision in XZ via `rayHitsWalls`; blocked moves try X-only then Z-only (sliding). Escape fires `unlock` event → `setWalkthrough(false)`. Cleanup: removes event listeners, disposes PLC, re-enables OrbitControls.
  - `useThree.js` extended: `stateRef.current.onFrame` slot (initially null); tick loop calls `stateRef.current.onFrame?.()` before `controls.update()`; hook now returns `stateRef`.
  - `Viewer3D.jsx` updated: receives `stateRef` from `useThree`, passes to `useWalkthrough`. Tracks `ptrLocked` via `document.pointerlockchange`. Shows click-to-enter overlay when `walkthrough && !ptrLocked`; shows crosshair + HUD when `walkthrough && ptrLocked`; hides LightingToolbar and orbit hint while walkthrough is active.
  - Tests: +17 (walkthroughSlice × 5, walkthroughCollision × 12). 255 total passing.

- [x] Polish — GLB tinting, reactive model status, lighting glyph, component smoke tests (2026-05-20)
  - **GLB material override**: `reconcileFurniture.js` now stores `group.userData.tintColor = f.material ? color : null`. `populateLoadedModel` calls `applyTint(group)` after fitting; `applyTint` traverses all `MeshStandardMaterial` instances and sets `mat.color.set(tintColor)`. When tintColor changes (material override added, changed, or removed), the model child is rebuilt from the cache clone so original GLB colors are fully restored. Box fallback path unchanged (updates in-place).
  - **Reactive model status**: `FurnitureProps.jsx` now subscribes to `onCacheChange` via a `useEffect` that bumps a counter on every load-state transition. The "GLB loading… / GLB loaded / GLB failed" row updates live when a model finishes loading while the panel is open.
  - **Lighting 2D glyph**: `Furniture.jsx` renders `LightGlyph` (circle + 8 radiating spokes + soft halo) instead of the plain footprint rect for `lighting:*` items. `Sidebar.jsx` `TileGlyph` shows the same sun icon for lighting catalog tiles. Label text changes to show only the subtype (e.g. "ceiling-lamp" not "lighting:ceiling-lamp").
  - **Component smoke tests**: 4 new test files — `Toolbar.test.jsx` (6 tests: core buttons, 3D label, Walk visibility), `Sidebar.test.jsx` (6 tests: all 12+4 furniture + 2 openings), `PropertiesPanel.test.jsx` (6 tests: empty/wall/furniture/lighting/opening/multi-select routing), `AiPanel.test.jsx` (3 tests: no-key shows settings input, with-key shows chat textarea + Send button).
  - Tests: +21 new; 276 total passing.

- [x] 3D door panels + AI floor-plan tracing (2026-05-20)
  - **3D door swing animation**: `openingsSlice.js` gains `open: false` default on new doors and `toggleDoorOpen(id)` action. `reconcileDoors.js` creates a Three.js `Group` per door opening — hinge at left edge of the opening in wall-local X (converted to world space), door panel `Mesh` at +width/2 as a child offset. Closing angle = wall yaw; open angle = wall yaw + π/2. `tickDoorAnims(doorAnims)` runs in the RAF tick and drives 300 ms smoothstep interpolation. `picking.js` extended with `onToggleDoor` callback — clicking a door mesh calls `toggleDoorOpen(id)` instead of `onSelect`. `useThree.js` wires `doorMeshes` + `doorAnims` refs, passes them to `reconcileDoors` and `attachPicking`.
  - **Door material**: warm wood color (`#c8a97e`, roughness 0.8) for the door panel — visually distinct from walls.
  - **AI floor-plan tracing**: `traceFloorPlan.js` sends a vision message (base64 image + text prompt) to `claude-opus-4-7` via the existing `streamClaude` generator. Claude returns a `\`\`\`json` block with wall segments in image-pixel coordinates; `transformWalls(rawWalls, underlay)` converts to Konva world coords (`konvaX = underlay.x + imgPx * underlay.scale`). Returns `{ walls, furniture:[], openings:[], roomMeta:{} }` for `validateProposedProject`.
  - **Underlay UI**: `UnderlayProps.jsx` becomes a connected component (imports `useStore`, `useApiKey`, `traceFloorPlan`, `validateProposedProject`, `diffProject`). Adds a violet "AI: Trace floor plan" button with loading state; on success calls `setAiProposal` + `toggleAiPanel`. Shows a hint when no API key is set.
  - **Tests**: `openingsSlice.test.js` +6 tests (toggleDoorOpen toggles, ignores unknowns, ignores windows, new doors default open:false). `traceFloorPlan.test.js` — 13 tests across `parseDataUrl` (valid/jpeg/invalid URLs), `transformWalls` (coord math, id generation, identity, empty), `traceFloorPlan` (vision message format, coord transform, empty result shape, missing JSON block, missing walls array).
  - Tests: +19 new; 295 total passing.

- [x] Integration test suite — 31 new tests across 9 flows (2026-05-20)
  - `src/integration/flows.test.jsx` (25 tests) — store + hook + component integration flows:
    wall drawing chain + cascading removal, furniture drop via `useFurnitureDrop.onDrop` (renderHook + real drag event), multi-select add/toggle/delete + layer-aware selectAll, calibration scale math, AI proposal apply → single-step undo, layer toggle, `loadProject` full restore + transient-state clear, JSON round-trip (`buildExportData` + `validateImport` + `loadProject`), `PropertiesPanel` routing with real store (wall/furniture/empty states).
  - `src/components/canvas/imageDownscale.test.js` (6 tests) — canvas mock setup: small image passes through unchanged, landscape image downscaled to maxPx, custom maxPx respected, error on bad image; constants `DEFAULT_MAX_PX`, `QUOTA_WARN_BYTES`.
  - `resetStore()` pattern extended to reset `layers` (not cleared by `loadProject` — now documented).
  - Tests: 326 total (up from 295), all green.

- [x] Bug hunt and UX fixes — session 27 (2026-05-20)
  - **Issue 2 fixed — wall vs endpoint click conflict**: `useDrawWalls.js` now allows shape clicks during an active wall chain (`if (e.target !== stageRef.current && !drawStart) return`). Previously the closing click of a rectangle was silently dropped if it landed on a Wall shape near the target endpoint. The guard now only bails when `drawStart` is null (no chain active), so selection clicks on shapes still work normally when not drawing.
  - **Issue 1 fixed — wall closing snap improvements**: Three-tier snap system in `useDrawWalls.js`: (1) raw cursor endpoint/midpoint snap (existing); (2) endpoint snap applied to the direction-snapped position — catches "close rectangle" clicks where the raw cursor was a few pixels outside snap radius but the direction-locked point is on the target; (3) new `snapParallelWallLength` function in `constants.js` — snaps wall length to match a parallel existing wall of similar length (within snap-radius threshold). Rectangle close is now much more forgiving.
  - **Issue 3 fixed — walkthrough mouselook**: `useThree.js` RAF tick now skips `controls.update()` (OrbitControls) when `stateRef.current.onFrame` is set (walkthrough active). OrbitControls' damping was interfering with PointerLockControls' mouselook rotation. The fix is a one-liner: `if (!stateRef.current.onFrame) controls.update()`.
  - **Tests**: `constants.test.js` +5 (snapParallelWallLength: returns unchanged when no parallel wall, snaps to parallel wall within threshold, rejects delta > threshold, ignores perpendicular walls, handles zero-length draw). `flows.test.jsx` +3 (useDrawWalls shape-click guard: ignores shape click when no chain, commits wall on shape click when chain active, background clicks start chain normally). Tests: 334 total, all green.

- [x] Upgraded furniture GLBs — real SheenChair + v2 procedural generator (2026-05-20)
  - **chair.glb**: processed from the CC0 `SheenChair.glb` asset from three.js/KhronosGroup. Pipeline: download (4.4 MB) → strip all textures + `TEXCOORD_*` vertex attributes → reset material to pure white PBR → `@gltf-transform` `dedup + prune + quantize(position:10, normal:8)` → 501 kB (~150 kB gzip). `scripts/process-sheenchair.mjs` is the reproducible script.
  - **11 procedural models (v2)**: `scripts/generate-furniture-glbs.mjs` completely rewritten. New helpers: `cyl(cx,cz,y1,y2,r,segs,smooth)` (8-segment smooth-normal cylinder, 32 tris each), `fourLegs()`, `merge()` for arbitrary part combination. Models range 60–384 triangles (vs 12–96 in v1). sofa/armchair: individual cushions + cylinder feet; dining-table: round legs (10-seg); desk: left pedestal + 3 drawers + handles; bed: pillows + panelled headboard + corner posts; bookshelf: book bundles per shelf; lamp: 7-layer frusto-cone shade; wardrobe: cylinder handles + centre divider.
  - **Packages added** (devDeps): `@gltf-transform/core`, `@gltf-transform/functions`, `@gltf-transform/extensions`, `meshoptimizer`.
  - **CREDITS.md** updated with full CC0 attribution for `chair.glb` (including note that Poly Pizza was inaccessible from the network environment) and updated triangle-count / size table for all 11 procedural models.
  - All GLBs well under 500 kB; build green, 295/295 tests pass.

- [x] Multi-level building system — full implementation (2026-05-20)
  - **Data model**: `levelsSlice.js` — `levels: [{ id, name, height, order }]` + `activeLevel` + `solo3d` + `xrayCeiling`. Fixed Ground Floor id `GROUND_FLOOR_ID = 'L00000'`. Actions: `addLevel` / `removeLevel` / `renameLevel` / `setLevelHeight` (min 0.1 m) / `setActiveLevel` / `setSolo3d` / `setXrayCeiling`. `computeLevelOffsets(levels)` → `Map<levelId, Y_base_metres>`.
  - **Item tagging**: every wall, furniture item, and opening now carries `levelId` set to `s.activeLevel` at creation time (from the set-callback's state, not a captured closure). Openings inherit `wall.levelId ?? activeLevel`.
  - **Stairs**: `furnitureCatalog.js` gains a new `'Architecture'` category (listed first) with one item: `'stairs'` (0.9 × 3.0 m, `stairType: true`). `addFurniture` detects `spec.stairType` and adds `fromLevel` + `toLevel` to the piece. `stairsGeometry.js` — pure `BufferGeometry` builder (`buildStairsGeometry(w, d, h, numSteps=12)`) — 12 stepped columns, 6 faces per step, indexed. `reconcileFurniture.js` detects `group.userData.type === 'stairs'` in `populateBoxFallback` and uses `buildStairsGeometry`; geometry spans y=0..height so no `mesh.position.y = height/2` offset.
  - **2D canvas**: `CanvasArea.jsx` filters `walls`, `furniture`, `openings` by `activeLevel` before passing to canvas components and `detectRooms`. Only the active level is visible in 2D.
  - **3D viewer**: all reconcilers accept `opts = { levelOffsets, activeLevelId, solo, xray }`. Walls: `mesh.position.y = yOffset + WALL_HEIGHT/2` where `yOffset = levelOffsets.get(w.levelId) ?? 0`; solo hides non-active-level meshes; xray makes levels above active 30% transparent. Furniture: `group.position.set(pos.x, floorY + yOff, pos.z)`; solo sets `group.visible`. Doors: `group.position.y = yOffset`; solo sets `group.visible`. Rooms: detected per-level in `useThree.js` (flat-map over levels), ids prefixed `${levelId}:${fingerprint}`, positioned at `yOffset + FLOOR_OFFSET_Y`; solo hides non-active rooms.
  - **LevelsPanel.jsx**: collapsible sidebar panel above `LayersPanel`. Click to activate (blue), double-click to rename, height input per row, "+" adds level, "×" removes (hidden when only 1).
  - **LightingToolbar.jsx**: two new toggle buttons — Solo (blue) and X-Ray (purple) — above the existing Lights toggle.
  - **Persist migration**: `useStore.persist.version` bumped 1 → 2. `migrate(state, version)` function assigns `levelId: GROUND_FLOOR_ID` to all existing items in v1 saves and adds the default levels array. `loadProject` also migrates: items without `levelId` get `firstLevelId`; missing `levels` defaults to Ground Floor only.
  - **projectIO.js**: `VERSION` bumped to 2. `buildExportData` includes `levels` + `activeLevel`. `validateImport` accepts both v1 and v2 files (v1 returns `levels: undefined` which `loadProject` handles via migration).
  - **`selectAll`**: filters items to `activeLevel` before selecting (Cmd+A only selects on the current floor).
  - **Tests**: `levelsSlice.test.js` (19 tests: computeLevelOffsets stacking/sorting/empty, all 9 actions). `flows.test.jsx` +9 migration tests: default ground floor on load, levelId assignment for items, preservation of explicit levelId, new walls/furniture inherit activeLevel, buildExportData includes levels, validateImport accepts v1 + v2 files. Total: 360 tests, all green.

- [x] Stair floor-hole cutting (session 28.1, 2026-05-20)
  - **`stairFloorHoles.js`** (new) — three pure utilities: `stairHoleCorners(stair)` computes the stair's rotated footprint as four shape-space corners using the CW-rotation formula for Konva's Y-down coordinate system; `holesFp(holes)` produces a stable string fingerprint for geometry-rebuild detection; `computeStairHolesForRooms(rooms, stairs)` ray-casting point-in-polygon test assigns each stair's hole to the room whose polygon contains the stair's center.
  - **`sceneReconcilers.js`** — `reconcileRooms` now accepts `r.stairHoles`; stores a `holesFp` fingerprint in `mesh.userData`; rebuilds geometry when fingerprint changes. Extracted `buildRoomShape(r)` helper that creates a `THREE.Shape` with optional `THREE.Path` holes (native Three.js — no CSG needed for flat geometry). Import `holesFp` from `stairFloorHoles`.
  - **`useThree.js`** — rooms effect now filters `furniture` for stairs with `toLevel === lv.id`, calls `computeStairHolesForRooms`, and augments room objects with `stairHoles`. Added `furniture` to the rooms effect dependency array so holes update live on stair move/resize/rotate.
  - **`stairFloorHoles.test.js`** (new) — 13 tests covering all three exported functions: corner positions at rotation=0, center invariant, 90° CW swap of width/depth extents, center-after-rotation, `holesFp` stability + order-independence, `computeStairHolesForRooms` inside/outside/multi-room/empty cases.
  - Total: 373 tests, all green. Build green.

- [x] Bathroom and Kitchen fixture categories — wall-mounted item system (session 29, 2026-05-21)
  - **18 new catalog items**: Bathroom (8: toilet, basin, bathtub, shower-tray, towel-rack, bathroom-mirror, vanity-unit, laundry-basket) + Kitchen (10: kitchen-sink, fridge, oven, dishwasher, microwave, upper-cabinet, range-hood, kitchen-island, pantry-unit, bar-stool). All `model: null` (box fallback).
  - **Wall-mounted items**: towel-rack, bathroom-mirror, upper-cabinet, range-hood carry `wallMounted: true` and a `mountHeight` (meters above floor). `addFurniture` snapshots both fields onto new pieces.
  - **`wallMountedPlacement(snap, depthMetres, worldPoint)`** exported from `openingGeometry.js` — uses wall normal + drop-side detection to compute x/y/rotation when a wall-mounted item is dropped against a wall.
  - **`useFurnitureDrop.js`** updated — wall-mounted items snap to nearest wall within 60 screen px during dragover (same threshold as openings), orient perpendicular, and show a red-X ghost when no wall is in range. Non-wall-mounted items still grid-snap as before.
  - **`DragGhost.jsx`** — FurnitureGhost shows red X when `ghost.wallSnap === false`; applies `rotation` from ghost extra data.
  - **`reconcileFurniture.js`** — `yOff = f.wallMounted ? (f.mountHeight ?? 0) : lightYOffset(f.type, f.height)` positions wall-mounted items at their mount height.
  - **`FurnitureProps.jsx`** — adds `MountHeightField` (number input 0–4 m, Enter/Esc/blur commit) visible when `item.wallMounted`.
  - CATEGORIES updated to include `'Bathroom'` and `'Kitchen'`.
  - Tests: new `furnitureCatalog.test.js` (12 tests: category counts, wall-mounted fields, required fields); expanded `openingGeometry.test.js` (+4 tests for `wallMountedPlacement`). Build green.

- [x] Gemini Flash API migration (session 29b, 2026-05-21)
  - **`src/services/claudeApi.js`** — complete replacement with a Google Gemini streaming implementation. Calls `generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=…`. Internally converts Anthropic-format messages to Gemini `contents` + `system_instruction` (including `inline_data` for vision messages used by the floor-plan tracer). Kept `streamClaude` function name and file path so callers and test mocks need no changes.
  - **`AiPanel.jsx`**: `MODEL = 'gemini-2.0-flash'`.
  - **`traceFloorPlan.js`**: `TRACE_MODEL = 'gemini-2.0-flash'`; error messages de-branded.
  - **`useApiKey.js`**: storage key changed to `'interior-studio:gemini-api-key'`.
  - **`AiSettings.jsx`**: label/placeholder/warning updated for Google Gemini; links to `aistudio.google.com/app/apikey`. Key is free-tier (15 RPM / 1500 RPD at no cost).

- [x] UX overhaul — fullscreen 3D, ceilings, drag-into-3D, zoom-drag fix, controls sensitivity, LevelsPanel (session 30, 2026-05-21)
  - **2D drag jump fix**: `Furniture.jsx` now tracks a `dragOffset` ref (world coords delta between pointer and item origin) using `stage.getRelativePointerPosition()`. `onDragMove` corrects the Konva node's world position on every move; `onDragEnd` reports the correct final world position. Fixes the scale-dependent "jump" where Konva's internal drag computed positions in screen-space without dividing by Stage scale. Regression test in `furnitureDrag.test.js` (5 tests across scale 1/2/3 and pan offset).
  - **Fullscreen 3D**: `App.jsx` now renders EITHER `<CanvasArea />` OR `<Viewer3D />` (not both simultaneously). The 3D toolbar button changes to `← 2D` when 3D is active, providing a clear back affordance. Sidebar and PropertiesPanel remain visible in both modes.
  - **3D drag-drop** (`useFurnitureDrop3D.js` new hook; `Viewer3D.jsx` wired): sidebar tiles can be dragged directly onto the 3D canvas. `onDragOver` raycasts from cursor through camera onto the floor plane (y=0), shows a translucent blue ghost box at the snapped floor position (0.5 m grid). `onDrop` converts Three XZ → Konva XY coords and calls `addFurniture`. Ghost mesh is managed in scene directly (not React state); removed on leave or drop. Coordinate conversion tests in `useFurnitureDrop3D.test.js` (5 tests).
  - **OrbitControls sensitivity tuned**: `zoomSpeed = 0.8`, `panSpeed = 0.8`, `minDistance = 1.5`, `maxDistance = 80` (mirrors 2D 20%–500% zoom feel).
  - **Ceiling support**: each 3D room gets a ceiling plane at `levelOffset + levelHeight`. `reconcileCeilings()` in `sceneReconcilers.js` mirrors `reconcileRooms` but positions at the top of the level and cuts stair holes for stairs that DEPART the level (going up through the ceiling). Ceiling material stored in `roomMeta[id].ceilingMaterial` (defaults to near-white `#F0F0EE`). `ceilingMaterials.js` exports 7 options. PropertiesPanel `RoomProps` gains a ceiling material picker. LightingToolbar gains a `Ceilings ON/OFF` toggle (`ceilingsVisible` flag in levelsSlice). Tests in `ceilingReconciler.test.js` (6 ceiling tests + 1 stair-hole reciprocity test).
  - **LevelsPanel relocated**: moved to the top of the sidebar (above the Elements header) so it's the first visible element. Added a tooltip and a single-floor empty-state hint ("Single floor · press + to add a level").
  - Total: 389 tests, all green. Build green.

- [x] Session 31: PDF export, 3D opening drop, multi-select room materials (2026-05-21)
  - **PDF export** (`useProjectIO.js` + `Toolbar.jsx`): A4 landscape PDF with floor plan image + a drawn scale bar (1 m marker sized to the current viewport zoom via `stage.scaleX() * pixelRatio`). jsPDF + html2canvas lazy-loaded via dynamic `import()` so the main bundle stays at ~637 kB gzip. `Export PDF` button added to toolbar.
  - **3D opening drop** (`useFurnitureDrop3D.js` extended): Door and Window tiles can now be dragged directly onto the 3D view. `onDragOver` raycasts against wall meshes (walks up parent chain to handle wall-overlay children), shows a translucent blue slab ghost positioned at the wall face (correctly aligned to the wall's angle and sill height). `wallPositionFrom(wallId, threePoint)` projects the hit point onto the Konva wall to get 0–1 position; clamped to 0.01–0.99. `onDrop` calls `addOpening(type, wallId, position)` and toasts on failure. Ghost kind tracked via `ghostKindRef` to handle transitions between furniture (floor) and opening (wall) ghosts. 6 new `wallPositionFrom` unit tests.
  - **Multi-select room materials** (`MultiSelectProps.jsx` + `PropertiesPanel.jsx`): When all selected items are rooms, the properties panel shows shared Floor material and Ceiling material pickers. Pickers show no active selection when rooms have differing materials (same `undefined → null` pattern as multi-furniture). `roomMeta` + `updateRoomMeta` now passed through from PropertiesPanel.
  - Total: 396 tests, all green. Build green.

- [x] Stair railing system — slope-following railings per stair type (2026-05-21)
  - `furnitureSlice.js`: stair items now snapshot `addRailing: false` + `railingType: 'wood'` at placement time.
  - `railingGeometry.js` rewritten: `buildStairRailingGeometry(W,D,H,N,style)` places a diagonal handrail (`slopeBox`) that follows the stair angle, vertical balusters stepping up at each tread nosing, and newel posts at start/end. Four styles: **Wood** (chunky 45mm balusters + 70mm flat rail), **Metal** (15mm posts + diagonal mid-rail), **Cable** (stout posts + 5 parallel diagonal cables), **Glass** (vertical per-step panels + metal cap). `buildSpiralRailingGeometry` handles spiral stairs with outer posts + segment-wise helix handrail. Standalone horizontal `buildRailingGeometry` unchanged.
  - `reconcileFurniture.js`: tracks `stairStyle`, `addRailing`, `railingType` in `group.userData`; rebuilds when any changes. `addStairRailingMesh` adds a second child mesh (wood/metal/cable → MeshStandardMaterial; glass → MeshPhysicalMaterial with transmission). Also fixes a bug where changing stairStyle did not rebuild the mesh.
  - `StairProps.jsx` (new): Properties panel for stair items — Style buttons (Standard / Floating / Spiral), read-only dims, "Add railing" checkbox, and Railing type buttons (Wood / Metal / Cable / Glass) with a one-line hint.
  - `PropertiesPanel.jsx`: routes `f.stairStyle != null` furniture to `StairProps` instead of `FurnitureProps`.

- [x] Material textures in 3D — procedural PBR textures for walls and floors (branch claude/features-batch-WE8lC, 2026-05-22)
  - **`proceduralTextures.js`** (new): canvas-based texture generator. Wall textures: `struct-brick` (offset brick rows + mortar), `struct-stone` (irregular blocks), `wood-panel` (grain + plank joints), `struct-concrete` (deterministic noise). Floor textures: wood plank, tile (grout grid + highlight), marble (quadratic-curve veining), concrete, carpet (weave). Module-level `_cache` Map; `.clone()` per mesh shares GPU source.
  - **`wallMaterials.js`**: new `Structural` category prepended — `struct-brick`, `struct-stone`, `struct-concrete` available in the wall material picker.
  - **`sceneReconcilers.js`**: `buildWallMaterial()` / `buildFloorMaterial()` helpers; change detection via `texFp` / `matFp` fingerprints. `reconcileCeilings` gets `buildCeilingMaterial` with `ceilingMatIdFor` — `ceiling-wood` maps to wood plank texture.
  - **`useThree.js`**: `floorMatIdFor` and `ceilingMatIdFor` closures added; passed to reconcilers as optional parameters.

- [x] More door/window styles — 4 new opening types (branch claude/features-batch-WE8lC, 2026-05-22)
  - **`openingsCatalog.js`**: 7 opening types total — `door` (hinged), `door-double` (French/double, 1.6m), `door-sliding` (1.2m), `window`, `window-fixed` (1.5m), `window-casement` (1.0m), `window-arched` (1.0m).
  - **`openingsSlice.js`**: `open: false` default and `toggleDoorOpen` now match `type.startsWith('door')` to cover all door variants.
  - **`OpeningGlyphs.jsx`** (new): all 7 2D glyph components extracted from `Opening.jsx` — `DoubleDoorGlyph` (dual swing arcs), `SlidingDoorGlyph` (panel + directional arrow), `FixedWindowGlyph` (solid frame + centre divider), `CasementGlyph` (diagonal hinge line), `ArchedWindowGlyph` (SVG arc top).
  - **`reconcileDoors.js`**: `buildDoubleDoor()` (two half-width panels sharing hinged animation), `buildSlidingDoor()` (static panel offset to side). All `window-*` types share `buildWindowFrame()`.

- [x] Furniture snap-to-wall — non-wall-mounted items snap flush to nearest wall face (branch claude/features-batch-WE8lC)
  - **`wallSnapGeometry.js`** (new pure utility): `findWallSnap(item, walls, scale, thresholdScreen=60)` — projects item centroid onto each wall segment, clamps to the segment, measures distance. If within threshold (60 screen px, zoom-adjusted via `scale`), picks the correct side via `sign(dot(normal, centroid−wallPoint))`, returns `{ x, y, rotation }` snapped flush against the wall face with `halfDepth + WALL_HALF_THICK + 1 px` offset. Rotation = wall angle ± 90° so the item face is flush. `normalizeAngle(deg)` wraps to 0–359. 7 unit tests in `wallSnapGeometry.test.js`.
  - **`useFurnitureDrop.js`**: `onDragOver` and `onDrop` now call `findWallSnap` for non-wall-mounted floor items after grid-snap. Ghost updates with `rotation: wallSnap.rotation` for preview; `addFurniture` places with snap rotation. Wall-mounted items continue to use the existing `nearestWallSnap` + `wallMountedPlacement` path unchanged.
  - **`Furniture.jsx`**: `onDragMove` calls `findWallSnap` for non-wall-mounted items; overrides Konva node position and stores snap rotation in `pendingRotation.current`. `onDragEnd` commits `{ x, y, rotation }` — rotation is the pending snap value or the original item rotation if no snap was active.

- [x] Per-wall height and thickness controls (branch claude/features-batch-WE8lC, 2026-05-22)
  - **`WallProps.jsx`**: Two new `NumField` inputs below Length — **Height (m)** (step 0.1, min 0.5, max 6.0, default 2.4) and **Thickness (m)** (step 0.05, min 0.05, max 1.0, default 0.2). Both dispatch `updateWall(id, { height: n })` / `updateWall(id, { thickness: n })` on Enter/blur; Esc reverts. `NumField` reusable helper component keeps the component under 150 lines.
  - **`sceneReconcilers.js`**: `reconcileWalls` now reads `w.height ?? WALL_HEIGHT` and `w.thickness ?? thickness` per-wall inside the loop. Both `buildGeometry` and `buildWallMaterial` accept `wallHeight` as a parameter (with `WALL_HEIGHT` default so call sites without per-wall overrides are unaffected). `syncOverlay` also updated to receive and use `wallHeight`. `texFp` fingerprint extended with `wallHeight` and `wallThick` so geometry + material rebuild when dimensions change. Defaults (`WALL_HEIGHT=2.4`, `WALL_THICKNESS*KONVA_TO_THREE`) unchanged — existing designs look identical.

- [x] Copy/paste (branch claude/features-batch-WE8lC, 2026-05-22)
  - **`uiSlice.js`**: `clipboard: null` (session-only, not persisted) + `setClipboard(items)` / `clearClipboard()`. Clipboard shape: `[{ kind: 'furniture'|'wall'|'opening', item }]`.
  - **`useStore.js`**: `pasteClipboard` cross-slice action — single `set()` call so undo reverts the entire paste as one step. Walls offset +50 px on both axes; furniture offset +50 px; openings pasted only when their parent wall was also in the clipboard (orphaned openings skipped). Pasted items become the new selection. `nanoid` imported at top.
  - **`useCanvasKeyboard.js`**: `Ctrl/Cmd+C` builds clipboard from current selection (walls include their openings automatically); `Ctrl/Cmd+V` calls `pasteClipboard`. Both respect the existing `INPUT`/`TEXTAREA` guard. Toast confirms "Copied N item(s)". Subscribes to `furniture`, `walls`, `openings`, `setClipboard`, `pasteClipboard`, `pushToast` from the store.

- [x] 45° angle walls with modifier-key snap modes (branch claude/angle-walls-alignment-WE8lC, 2026-05-24)
  - **`snapTo45`** added to `constants.js` after `snapTo90`: snaps wall endpoint to nearest 45° multiple (0°/45°/90°/135°/180°/225°/270°/315°) from the draw start.
  - **`useModifierKeys.js`** (new hook): tracks `shiftDown` + `altDown` via `window.addEventListener('keydown'/'keyup')`. Does NOT call `preventDefault` on Alt so browser menu shortcuts are unaffected. Independent of `useCanvasKeyboard` to avoid duplicating space/undo/selection-shortcut logic.
  - **`CanvasArea.jsx`**: imports `useModifierKeys` + `snapTo45`; `snapFn` = Alt→free, Shift→90°, default→45°. `previewEnd` uses `snapFn`. Passes `shiftDown` + `altDown` to `useDrawWalls` and `HudOverlay`.
  - **`useDrawWalls.js`**: signature extended with `shiftDown = false, altDown = false`; same `snapFn` logic used for commit snap (matches preview exactly).
  - **`DrawPreview.jsx`**: now shows a cyan angle readout (`${angleDeg}°`) via a Konva `<Text>` at the midpoint. Imports `Text` from `react-konva`.
  - **`HudOverlay.jsx`**: drawing hint includes live snap mode: "free angle" / "90° only" / "45° snap · Shift=90° · Alt=free".

- [x] Furniture alignment tools in multi-select panel (branch claude/angle-walls-alignment-WE8lC, 2026-05-24)
  - **`MultiSelectProps.jsx`** `MultiFurnitureProps`: when 2+ items selected, shows an "Align" section above the Rotation field with a 3×2 grid of buttons: Left (align left edges), Ctr·X (center horizontally), Right (align right edges), Top (align top edges), Ctr·Y (center vertically), Bot (align bottom edges). Operations work on item centroids (`f.x`, `f.y`) via `updateFurniture`. `updateFurniture` is already threaded through to `MultiFurnitureProps` from `MultiSelectProps` → `PropertiesPanel`.

- [x] Fix sliding door clipping through wall when open (branch fix/door-visual-quality, 2026-05-24)
  - **`reconcileDoors.js`**: `buildSlidingDoor` now positions the panel flush with the room-side wall face (Z = wallHalfThick + DOOR_THICKNESS/2) so it slides along the wall surface instead of clipping into solid wall geometry. Added a metallic overhead track mesh (2.2× door width) visible in both states. Removed legacy transparency on panel material.

- [x] Fix door types 3D visual (branch fix/door-types-visual, 2026-05-24)
  - **`reconcileDoors.js`**: rewrote double door animation direction — `targetLeft = -π/2`, `targetRight = +π/2` (was reversed, panels opened outward). Sliding door now animates when clicked: panel slides one full width along the wall direction with 300 ms smoothstep. All door/window types now accept a `color` hex field; `matFp` fingerprint triggers material rebuild. Color defaults: doors = `#c8a97e` (wood), windows = `#f0ece6` (off-white).
  - **`wallCSG.js`** + **`sceneReconcilers.js`**: sill check changed from `o.type === 'window'` to `o.type.startsWith('window')` — fixes `window-fixed`, `window-casement`, `window-arched` not getting their sill offset.
  - **`OpeningProps.jsx`**: added Material swatch row — 5 door presets (Wood/White/Dark/Black/Gray), 4 window presets. Color dispatched via `updateOpening`.

- [x] Fix canvas jump when moving furniture (branch fix/canvas-jump-furniture-drag, 2026-05-24)
  - **`useViewport.js`**: `handleStageDragEnd` now guards `if (e.target !== e.target.getStage()) return` before updating pan position. Konva bubbles `dragend` from draggable child nodes (furniture Groups) up to the Stage; without the guard `e.target.x()/y()` returns the furniture's world position and overwrites the Stage pan state, causing the canvas to jump to a random location on every furniture move.

- [x] Door casings + door materials (branch fix/door-casings-and-materials, 2026-05-24)
  - **Door casings**: `reconcileDoors.js` now adds a static wooden frame (jambs + header) around every door opening, on both sides of the wall. The casing sits in the same `meshMap` under key `${id}:casing` and is positioned at the opening centre with wall yaw — it does not animate with the door panel. Without the casing, sliding doors and double doors appeared as flat panels on a solid wall (the CSG hole is there but invisible from the room side because the panel covers it / both panels swing perpendicular to the wall hiding the hole edges). The casing makes the doorway opening obvious from any angle. Casing dimensions: 7 cm trim width, 1.8 cm sticking out from each wall face, wood color `#a8896a`.
  - **Door materials**: `o.material` field added (default `'painted'`). Three options: **painted** (flat color, current behaviour), **wood** (vertical wood-grain procedural texture from `proceduralTextures.getDoorTexture`), **glass** (frosted `MeshPhysicalMaterial` with transmission — pairs well with sliding doors). `OpeningProps.jsx` renders a 3-button picker below the color row for doors only. `matFp` extended to `${color}:${materialId}` so material changes trigger panel rebuild.
  - **`proceduralTextures.js`**: new `drawDoorWood` function (vertical grain + 3 darker knot patches) and `getDoorTexture()` export. Cached at key `door:wood`.
  - **`reconcileDoors.js`**: new `buildPanelMaterial(materialId, color)` helper replaces inline `MeshStandardMaterial`. `buildDoubleDoor` and `buildSlidingDoor` accept `materialId` parameter.

- [x] Door handles + inner jamb lining (branch feature/door-handles-and-lining, 2026-05-24)
  - **Inner jamb lining**: `buildDoorCasing` in `reconcileDoors.js` now adds 3 wood pieces *inside* the CSG-cut hole (left jamb + right jamb + header), filling the cut wall-edge surfaces. Without the lining, the raw wall material was visible on the inside faces of the hole even when the door was open, so the doorway never read as a clean opening. Now the entire interior of the doorway is wood — the doorway feels like a real doorway from any angle. Lining thickness 2.5 cm.
  - **Door handles**: new `buildDoorKnob()` (rosette + stem + sphere, brushed dark metal) and `attachKnobPair(parent, x, y)` helpers add knobs to both faces of the panel at handle height (1.0 m). Single hinged door gets one knob pair near the free edge. Double door gets a knob pair on each panel's free edge (where the panels meet). Sliding door gets a `buildSlidingPull()` vertical chrome bar near the leading edge.
  - **`reconcileDoors.js`**: single-door creation now stores `group.userData.panel` reference so the material rebuild path doesn't have to guess at `children[0]` (which is no longer always the panel after handles were added).

- [x] Fix double-door CSG hole missing + wall heights per level (2026-05-24)
  - **`wallCSG.js`**: added `current.updateMatrixWorld()` after each `evaluator.evaluate()` call in the loop. Without this, the result `Brush` from the first cut had a stale/uninitialised `matrixWorld`; the second cut (e.g. `door-double` on the same wall as a `door-sliding`) received the wrong input transform and produced no visible hole in the browser (worked in Node.js because the identity matrix happened to coincide with the intended transform there).
  - **`sceneReconcilers.js`** + **`useThree.js`**: `reconcileWalls` now reads wall height as `w.height ?? opts.levelHeights?.get(w.levelId) ?? WALL_HEIGHT`. `useThree.js` passes `levelHeights: new Map(levels.map(lv => [lv.id, lv.height]))` in the walls effect opts. This fixes walls on upper floors always being `WALL_HEIGHT` (2.4 m) tall regardless of the configured level height (default 2.7 m), causing a 0.3 m gap at the top of every upper-floor room.

- [x] Fix stairs going through upper floor base (2026-05-24)
  - **Root cause**: stair catalog hardcodes `height: 2.7` but level heights vary (Ground Floor = 2.4 m). Stairs were 0.3 m taller than the Ground Floor rise, so the top steps poked through Floor 1's floor slab.
  - **`reconcileFurniture.js`**: for stair items (`stairStyle != null`), `effectiveHeight = opts.levelHeights?.get(f.levelId) ?? f.height` is used for geometry dims instead of `f.height`. This fixes both existing and newly placed stairs. `useThree.js` now passes `levelHeights` to `reconcileFurniture` alongside `levelOffsets`.
  - **`furnitureSlice.js`**: `addFurniture` for stair items now stores `height: currentLevel?.height ?? spec.height` so the correct rise is persisted from placement time.

- [x] Layer toggles affect 3D view — session 33 (2026-05-24)
  - **`useThree.js`**: subscribes to `layers` from the store. After each reconciler call, a visibility pass iterates the corresponding mesh map and sets `mesh.visible = false` when the layer is off.
    - `layers.walls = false` → all `wallMeshes` hidden
    - `layers.openings = false` (or `layers.walls = false`) → all `doorMeshes` (door panels + casings) hidden
    - `layers.furniture = false` → all `furnMeshes` (boxes, GLBs, stairs, lighting fixtures) hidden
    - `layers.rooms = false` → all `roomMeshes` (floor slabs) and `ceilingMeshes` hidden
  - `layers` added to the dep array of each affected `useEffect` so toggling a layer ON correctly re-reconciles with normal visibility restored.
  - No changes to reconciler files — all logic is in `useThree.js`.

- [x] Overhauled procedural textures — realistic PBR materials (branch claude/object-resize-models-bikg3, 2026-05-24)
  - Added `hash2` + `valueNoise` + `fbm` noise utilities to `proceduralTextures.js` for natural-looking variation.
  - **Brick**: fbm per-face variation, mortar depth gradient, corner micro-chips, separate roughness map.
  - **Stone**: procedurally randomised block sizes, bevel edges with light/shadow, fbm surface noise.
  - **Wood panel**: per-plank tones, dense wavy grain, multi-ring knots.
  - **Concrete wall**: multi-scale fbm aggregate texture, formwork seams, pitting holes.
  - **Floor wood**: per-plank color + knots with concentric rings, grain, end-grain joints, roughness map (smooth mid-plank, rough at joints/knots). Resolution 512×256.
  - **Floor tile**: fbm clouding + off-center specular highlight + grout depth; low roughness 0.22 + metalness 0.03 for porcelain gloss.
  - **Marble**: bezier veins with branches, background clouding, crystal specks, roughness map (smooth slab, rough at veins). 1024×1024 resolution.
  - **Concrete floor**: multi-scale fbm, saw-cut expansion joints, aggregate pits.
  - **Carpet**: loop-pile dot grid + directional sheen.
  - `sceneReconcilers.js`: wired `roughnessMap` and `metalness` into all three material builders (wall, floor, ceiling).

- [x] Corner resize handles on 2D canvas (branch claude/object-resize-models-bikg3, 2026-05-24)
  - `ResizeHandle.jsx` (new): four blue corner squares appear when a furniture item is selected.
  - Drag any corner to resize width + depth symmetrically from the centroid. Hold Shift for proportional (locked-ratio) resize.
  - Handles follow the item's rotation, are counter-scaled so they stay 7 px on screen at any zoom level.
  - Uses the same `dragBoundFunc` pin-and-read-pointer pattern as `RotationHandle`.
  - Wired into `CanvasArea.jsx` alongside the existing `RotationHandle`; no store changes needed.

- [x] Door swing direction + open-side controls (2026-05-25)
  - `openingsSlice.js`: new doors default to `swingDir: 'left'` and `openSide: 'front'`.
  - `OpeningProps.jsx`: "Swing" row (← Left / Right →) and "Opens toward" row (↑ Front / ↓ Back), both visible only for `type === 'door'` (single-leaf hinged).
  - `OpeningGlyphs.jsx` `DoorGlyph`: `swingDir` flips panel/arc to right jamb; `openSide='back'` mirrors the arc to the opposite side of the wall (positive Y in wall-local space, arc sweep flag inverted).
  - `Opening.jsx`: passes both `swingDir` and `openSide` down to `DoorGlyph`.
  - `reconcileDoors.js`: `swingDir` controls hinge edge; `openSide='back'` negates the sideSign so `openAngle = wallYaw ∓ π/2` flips to the other wall face. Both fields included in `swingFp` fingerprint.

- [x] Lock-ratio checkbox wired to corner resize handles (2026-05-25)
  - Lifted `lockAspectRatio` from local `useState` in `FurnitureProps` into `uiSlice` (not persisted, default `true`).
  - `CanvasArea.jsx` reads `lockAspectRatio` from store and passes `lockRatio={lockAspectRatio || shiftDown}` to `ResizeHandle`.
  - `ResizeHandle.jsx`: renamed `shiftDown` prop to `lockRatio`; Shift key still works as override via the combined expression in CanvasArea.

- [x] Post-processing — SSAO + bloom (branch claude/object-resize-models-bikg3, 2026-05-25)
  - **`useThree.js`**: imports `EffectComposer`, `RenderPass`, `SSAOPass`, `UnrealBloomPass` from `three/addons/postprocessing/`.
  - `EffectComposer` replaces the bare `renderer.render()` call in the RAF tick. Passes: `RenderPass` (base render) → `SSAOPass` (ambient occlusion, kernelRadius 0.5, maxDistance 0.05) → `UnrealBloomPass` (strength 0.15, radius 0.4, threshold 0.9 — subtle glow on bright spots only).
  - `composer.setSize(w, h)` called in the `ResizeObserver` alongside `renderer.setSize` so post-processing buffers stay in sync with window resize.
  - `composer` stored on `stateRef` and disposed via `s.composer.dispose()` on unmount.
  - Viewer3D chunk: ~195 kB → ~225 kB gzip (post-processing modules).

- [x] Improved bathroom 3D models — oval/round geometry (branch claude/object-resize-models-bikg3, 2026-05-25)
  - Added `ellipse`, `innerEllipse`, `ring`, `disk` primitive helpers to `generate-bathroom-kitchen-glbs.mjs`.
  - **Toilet**: oval ellipse bowl (18-seg) + flat ring seat + oval pedestal base. Replaces rectangular box bowl.
  - **Basin**: round pedestal column + wide oval outer bowl wall + visible inner surface (`innerEllipse` + `disk` floor). Chrome tap with riser + spout + handles.
  - **Bathtub**: outer shell + inset inner basin (visible depth) + headrest slope at one end. Chrome taps and drain.
  - **Vanity unit**: oval integrated basin (`ellipse` + `innerEllipse` + `disk`) replacing the box basin.
  - **Laundry basket**: oval ellipse body with horizontal band details + domed lid with knob.
  - **Shower tray / towel rack / mirror**: minor polish only.
  - Triangle counts: toilet 260, basin 408, laundry 334, bathtub 240. Build green.

- [x] Multi-color kitchen 3D models (branch claude/object-resize-models-bikg3, 2026-05-25)
  - Added `C_MARBLE` + `C_PAINT_W` constants to `generate-bathroom-kitchen-glbs.mjs`.
  - **Kitchen sink** (3 groups): oak wood cabinet + stainless countertop/sink basin + chrome taps/handles (hot+cold handles added).
  - **Fridge** (3 groups): dark gunmetal body + stainless steel doors + chrome handles. Was previously all-chrome.
  - **Dishwasher** (3 groups): dark body + stainless control strip + chrome handle. Control strip split from door panel.
  - **Kitchen island** (3 groups): oak wood cabinet + marble countertop (white marble tone) + chrome handles on all 4 sides (back handles added).
  - **Pantry unit**: painted warm white body + chrome handles (was beige/off-white).
  - **Upper cabinet**: painted warm white body + chrome handle.
  - **Bar stool** (3 groups): fabric seat + wood base column + chrome footrest (footrest split from base).
  - **Oven / microwave / range hood**: unchanged — already multi-material.
  - `furnitureCatalog.js`: updated `parts` keys for all 10 kitchen items to match new GLB material names (enables per-part color override in FurnitureProps).

### 🚧 In Progress
- (nothing active)

### 📋 Up Next
- [ ] Further GLB quality: Poly Pizza and other real-model sources were inaccessible this session. When network access allows, swap additional items (sofa, bed, etc.) for real CC0 geometry beyond SheenChair.
- [ ] Lighting: LightingProps material/color picker (add a warm color preset row alongside the Kelvin slider).
- [ ] AI prompt caching — split static system prompt from dynamic project snapshot via Anthropic `cache_control` blocks.
- [ ] AI markdown rendering — the chat transcript shows plain whitespace-preserved text today; rendering headings + lists + code blocks would make responses more scannable.
- [ ] Underlay selection from 3D (today 3D picking only finds walls / furniture / rooms; underlay is a 2D-only concept)

## Key Data Structures
```javascript
// Level
{ id: string, name: string, height: number /* metres */, order: number }
// GROUND_FLOOR_ID = 'L00000' — fixed; used by persist migration.

// Wall — levelId added in session 28; items without it treated as ground floor.
// height (metres) and thickness (metres) are optional per-wall overrides;
// 3D reconciler falls back to WALL_HEIGHT=2.4 and WALL_THICKNESS*0.02 when absent.
{ id, x1, y1, x2, y2, levelId: string, material?: string | null,
  height?: number, thickness?: number }

// Furniture item — levelId + optional stair fields added in session 28.
// x, y are world pixels (centroid); width/depth/height are meters;
// rotation is degrees (0–359). color is the footprint tint from the catalog.
// model is snapshotted from catalog at add-time (.glb URL or null).
// Stairs additionally carry: fromLevel, toLevel.
{ id, type, x, y, rotation, width, depth, height, color, model: string | null,
  levelId: string, material?: string | null,
  // lighting items only:
  lightType?, intensity?, colorTemp?, distance?, castShadow?, on?,
  // stairs only:
  fromLevel?, toLevel? }

// Opening — levelId inherited from parent wall at creation.
{ id, type: 'door'|'window', wallId, position, width, height, sillHeight,
  levelId: string, open?: boolean /* doors only */,
  swingDir?: 'left'|'right'       /* single hinged door only, default 'left' */,
  openSide?: 'front'|'back'       /* single hinged door only, default 'front' */ }

// Opening (door or window on a wall — current shape in useStore.js)
// position is normalised 0..1 along the parent wall (0 = wall start).
// width / height / sillHeight are meters. sillHeight is 0 for doors.
{ id, type: 'door' | 'window', wallId, position, width, height, sillHeight }

// Selection (current shape in useStore.js) — multi-item
// selectionHelpers.js: selectionItems(sel), isSelected(sel, kind, id),
// getSingleItem(sel), commonKind(sel)
{ items: [{ kind: 'wall' | 'furniture' | 'room' | 'opening' | 'underlay', id }, ...] } | null

// Furniture item — lighting extension (lighting:* types only)
// lightType: 'point' | 'spot'. intensity: 0-3. colorTemp: 2000-6500 K.
// distance: meters (light radius / falloff). castShadow: bool. on: bool.
{ id, type: 'lighting:ceiling-lamp'|'lighting:floor-lamp'|'lighting:table-lamp'|'lighting:pendant',
  x, y, rotation, width, depth, height, color, model,
  lightType, intensity, colorTemp, distance, castShadow, on }

// Lighting slice (persisted, not in undo history)
{ lightsOn: bool, timeOfDay: 0-24, ambientStrength: 0-1 }

// Walkthrough slice (NOT persisted, NOT in undo history)
{ walkthrough: bool }

// Layers (persisted, not in undo history)
{ walls: bool, furniture: bool, openings: bool, rooms: bool, underlay: bool, grid: bool }

// Room (derived from walls each render; not stored)
// `id` is a fingerprint hash of the polygon's vertex set — stable across
// re-detections and reloads. `centroid` is area-weighted.
{ id: string, verts: Array<{x, y}>, centroid: { x, y } }

// Room metadata (stored, keyed by fingerprint id; persisted)
{ [fingerprint]: { name?: string, floorMaterial?: 'wood' | 'tile' | 'carpet' | 'marble' | 'concrete' } }

// Underlay (stored, single instance, persisted)
// dataUrl is base64 (survives reload), x/y/scale in canvas world pixels,
// locked becomes true after calibration.
{ dataUrl: string, x: number, y: number, scale: number, opacity: number, locked: boolean } | null

// Calibration (transient, NOT persisted)
{ p1: { x, y } | null, p2: { x, y } | null } | null

// Room (planned)
{ id, walls: [wallId], floorMaterial, name }
```

## Conventions & Decisions
- **Units**: `PIXELS_PER_METER = 50`. All world coordinates are pixels; convert
  for display via `formatMeters()` in `components/canvas/constants.js`.
- **World bounds**: grid is drawn from `-WORLD_HALF` to `+WORLD_HALF` (5000 px
  each way = 100 m × 100 m). Adjust in `constants.js` if needed.
- **Snap angle**: walls snap to multiples of **45°** by default (see `snapTo45`). Hold **Shift** for 90°-only snap; hold **Alt** for free angle. Snap function selected in both `CanvasArea.jsx` (preview) and `useDrawWalls.js` (commit) so preview and actual wall always match.
- **Wall thickness**: rendered with `strokeWidth = WALL_THICKNESS` (8 px), but
  `hitStrokeWidth` is 16 px so right-click delete is forgiving.
- **State library**: Zustand. Slice by selector in components
  (`useStore((s) => s.walls)`) to keep renders narrow.
- **IDs**: `nanoid/non-secure` (6 chars) — small, stable, fine for client-only.
- **Context discipline**: CONTEXT.md is updated automatically at the end of any
  response that touches files, per `.claude/skills/auto-context.md`. Only add
  and move entries — never delete history.
- **Session start**: read CONTEXT.md before doing anything else in a new
  session (auto-context skill, Session Start Rule).
- **Root-doc timestamps**: `CLAUDE.md`, `SPEC.md`, `AGENT.md`, and
  `USER_GUIDE.md` each carry an italic `_Last updated: YYYY-MM-DD_` line
  right under their H1. When editing any of those files, bump the date to
  the current session's date so a future session can see at a glance how
  fresh the doc is.
- **USER_GUIDE.md is for users, not for Claude**: it lives at the project
  root alongside CONTEXT.md but serves a different audience. CONTEXT.md is
  exhaustive technical state for the next Claude session; USER_GUIDE.md
  describes the app's behavior the way a non-technical user would read it.
  The `session-ritual` skill's end-of-session step requires updating it
  whenever a user-visible behavior changes (and explicitly *not* updating
  it for pure refactors or internal changes).
- **Furniture coordinates**: a furniture item's `(x, y)` is the **centroid**
  in world pixels, not the top-left. This makes `rotation` straightforward
  (Konva rotates a Group around its origin) and matches how dragging in
  Konva feels (the user drags from anywhere on the piece).
- **HTML5 drop, not Konva drag**: the sidebar→canvas placement uses the
  HTML5 drag-and-drop API on the container `<main>`, not Konva's stage
  events — because the source is a DOM element. The MIME type
  `application/x-interior-studio-furniture` (exported from `Sidebar.jsx`
  as `FURNITURE_DRAG_MIME`) carries the furniture `type`. Client
  coordinates convert to world via `clientToWorld(clientX, clientY,
  containerRect, view)` in `useViewport.js`.
- **3D coordinate mapping**: Konva `(x, y)` → Three `(x × 0.02, 0, y × 0.02)`
  (floor on the XZ plane, +Y is up). Furniture rotation: Konva is degrees
  CW from above; Three is radians CCW around +Y; so
  `three.y = -konva × π/180`. Wall rotation around +Y is
  `-Math.atan2(Δz, Δx)`. All of this lives in
  `components/viewer3d/threeMath.js`.
- **Three.js isolation**: the only files that import `three` are
  `hooks/useThree.js` and the helpers under `components/viewer3d/`. Other
  components (including `Viewer3D.jsx`) only see the hook's surface area.
- **One-way store→scene sync**: each tracked slice (`walls`, `furniture`)
  has its own `useEffect` in `useThree.js` that calls a reconciler. Meshes
  are kept in `useRef` Maps owned by the hook so React renders don't
  thrash the scene. Editing happens in 2D and propagates to 3D; the
  inverse direction is intentionally a future concern.
- **Persisted slice**: only `{ walls, furniture }` go through `persist`.
  Anything ephemeral or UI-only (`selection`, `drawStart`, `show3d`) is
  deliberately excluded via `partialize`. If the shape of a wall or
  furniture item ever changes, bump `version` in `useStore.js` and add a
  `migrate` function — otherwise existing localStorage entries will
  hydrate into a broken store.
- **Snap precedence (three tiers, second click only)**: (1) raw cursor
  endpoint/midpoint snap — wins if anything is within `SNAP_RADIUS_SCREEN / scale`;
  (2) endpoint snap from the 90°-snapped position — a secondary pass that catches
  "close rectangle" clicks where the cursor was a pixel or two outside the raw
  threshold but the direction-locked point lands on the endpoint; (3)
  `snapParallelWallLength` — when neither snap fires, checks for a parallel wall
  whose length is within the same threshold of the current cursor distance, and
  snaps the new wall's length to match. First click (sets `drawStart`) still uses
  only the raw snap. The snap is recomputed in the click handler from the click's
  own pointer position, not from a cached `cursorWorld`, so a slow mousemove can't
  desync the click from what the indicator was showing.
- **Wall-chain lifecycle**: after a successful commit, `drawStart` is set
  to the new endpoint, not cleared. The chain continues until the user
  clicks the same point again (zero-length commit short-circuits), hits
  `Esc`, or right-clicks empty canvas. Selection clicks and right-clicks
  on existing shapes don't interrupt the chain — they're handled by the
  shape's own click handlers; `handleStageMouseDown` only runs for
  background clicks.
- **Room detection** is purely a function of `walls`: `detectRooms(walls)`
  in `roomDetection.js` is pure (no React), and `CanvasArea` /
  `PropertiesPanel` each call it inside `useMemo([walls])` so it re-runs
  only when the wall set changes. Rooms themselves are not stored —
  only their metadata is, keyed by the fingerprint.
- **Room identity is a vertex-set fingerprint** (`fingerprint(verts)` in
  `roomDetection.js`): rounded coords, sorted lex, `|`-joined. In a
  connected planar graph each face has a unique vertex set, so the hash
  is invariant to which half-edge starts the trace and which direction
  it's traced in — and to whether the user redraws the same walls in a
  new session.
- **Rooms gate listening on `drawStart`**: while drawing, rooms pass
  `listening={false}` so the canvas drop-through still extends the wall
  chain. When not drawing, rooms accept clicks and route to
  `select('room', id)`. This avoids the "clicking inside a room blocks
  drawing" trap.
- **3D floor coordinates**: room polygons feed `THREE.Shape` using Konva
  coords directly (in math-y-up the polygon comes out CCW, which is what
  ShapeGeometry expects). The mesh then rotates `+π/2` around X so the
  Shape's Y axis maps to world Z — same `1 Konva px = 0.02 Three units`
  rule used by walls and furniture. Side effect: face normals point
  *down* after this rotation, so floor materials use `DoubleSide` rather
  than relying on a specific lit face. Floors sit at `y = 0.01` to clear
  the global ground plane (-0.001) and the grid helper (0).
- **Room-mesh identity = room id**: the reconciler uses the fingerprint
  as the mesh-map key. Two consequences: (1) geometry is computed once
  per polygon shape and reused across renders / sessions; (2) changing
  only the material colour is a cheap `material.color.set(...)`, never
  a geometry rebuild.
- **Underlay capture rect**: during calibration, a top-most invisible
  `Konva.Rect` (`fill="rgba(0,0,0,0.001)"`, listening) covers the world
  bounds. This way calibration clicks are caught no matter what shape
  sits underneath — no need to plumb a `calibrationActive` flag through
  every shape's click handler. Bonus: `useDrawWalls` also guards
  internally so a background click during calibration (if the capture
  rect ever misses) can't accidentally start a wall chain.
- **Underlay storage**: base64 data URLs only. Blob URLs (`URL.createObjectURL`)
  don't survive a reload because they're scoped to the document's blob
  registry. Persisting base64 inflates size by ~33%, so a large image
  can push the persisted payload over the ~5 MB localStorage cap — a
  known issue tracked in Up Next.
- **Underlay lock semantics**: while unlocked the image is draggable and
  selectable on the canvas; while locked it's `listening={false}` so it
  doesn't swallow clicks (walls draw through it). To re-select a locked
  underlay, the user clicks the "Underlay" button in the toolbar — that
  dispatches `select('underlay', 'underlay')` (the id is a fixed string
  since there's only ever one).
- **Wall length editing rule**: the first endpoint `(x1, y1)` is the
  anchor; editing length only moves `(x2, y2)`. This means the visual
  "From" endpoint is significant — drawing a wall left-to-right vs.
  right-to-left determines which end stays put when the length is
  retyped. The right panel reflects this with separate `From`/`To`
  readouts so the user can see which is which.
- **Per-kind PropertiesPanel editors live in `canvas/`**: `WallProps`,
  `UnderlayProps` (and inline `FurnitureProps`/`RoomProps`) are
  per-selection-kind editors. They sit alongside the canvas shape
  components because they are conceptually paired with them — adding a
  new selectable kind means adding both a shape component (renders on
  canvas) and a Props component (renders in the panel). When the next
  one ships, follow the same pattern.
- **Material catalogs follow one pattern**: a `*.js` module exports
  the catalog array, an `id → object` lookup, a `default` constant,
  and a `colorFor(item)` helper that returns the appropriate hex
  (catalog or default). `floorMaterials.js` and `wallMaterials.js`
  both follow this. The PropertiesPanel picker is always a grid of
  `<Swatch>` (shared component) — one "Default" tile first, then one
  per material. Dispatches to a single `update*` action.
- **Two version numbers, one source of truth**: both the Zustand
  `persist` middleware and `utils/projectIO.js` use `version: 1`. They
  must stay in lockstep — `.studio.json` files written today should
  hydrate cleanly into the in-memory store, and vice versa. When the
  next schema change happens, bump *both* in the same change.
- **Stage access pattern**: imperative Konva handles live in a small
  module-level holder (`stageHandle.js`) — not in Zustand state, not
  threaded through props. Set on the Stage's `ref` callback so it
  follows mount/unmount automatically. Read-side callers (Toolbar)
  must null-check; the stage is null until CanvasArea has mounted and
  `size` is known.
- **API keys never touch persistence**: the AI panel's API key lives
  in `sessionStorage` via `useApiKey`, not in the Zustand store, not in
  `localStorage`, not in `.studio.json`. If you ever need other
  secret-shaped inputs, follow the same pattern (custom hook + session
  storage + clear warning in the UI). The key is also excluded from
  the project snapshot Claude sees.
- **Browser-side Anthropic calls require an explicit "dangerous"
  header**: `anthropic-dangerous-direct-browser-access: true`. Without
  it, the API rejects the call as CORS-disallowed. The header name is
  intentional — Anthropic wants developers to acknowledge that browser
  exposure of the key is real. Our AI panel surfaces that warning in
  amber above the key input.
- **AI streaming via async generators**: `streamClaude` is an async
  iterable. The component consumes with `for await (const chunk of …)`
  and accumulates into the active assistant message. SSE frames are
  parsed inline — no SDK. Errors during the stream (e.g.
  `overloaded_error`) come through as `event: error` payloads and
  throw out of the generator.
- **AI apply uses one `set` for one undo step**: `applyAiProposal`
  is a single root-level `set` that swaps in walls/furniture/roomMeta
  together. zundo's debounced `handleSet` records one snapshot for
  the whole change, so Cmd+Z reverts the entire AI proposal as one
  unit. Underlay is *not* included in the proposal scope — Claude
  doesn't see its bytes and apply preserves the live value.
- **Tests live next to source**: `*.test.js` / `*.test.jsx` in the same
  directory as the file they test. Vitest auto-discovers via glob.
  Setup file at `src/test/setup.js` runs before every test file.
- **jsdom localStorage gotcha**: in Vitest's jsdom environment,
  `window.localStorage` is available but the bare global `localStorage`
  (which Zustand's `persist` default storage reaches for) is not.
  `src/test/setup.js` force-assigns a tiny `MemoryStorage` to both
  `globalThis` and `window`. Any future test setup that adds the AI
  panel or other tab-storage features should reuse this pattern.
- **AI proposal contract**: when Claude wants to propose changes, it
  returns the COMPLETE intended state of walls + furniture + roomMeta
  in one ```json block. Omissions = deletions; existing ids are kept
  verbatim for items the user should retain. This shape matches the
  `partialize` slice (minus underlay), so `loadProject` /
  `applyAiProposal` can consume it directly. The diff is computed
  inside the app; Claude never sees the diff format.
- **Store is sliced**: state + actions split across 6 files under
  `src/store/slices/`. The composer (`useStore.js`) glues them and
  wraps in `persist(temporal(creator))`. Cross-slice writes are
  allowed when there's an obvious linkage — `removeWall` clearing
  `selection`, `clearUnderlay` clearing an underlay-kind selection,
  etc. `set` merges into root state regardless of slice. When adding
  a new state concern, give it its own slice unless it's a small
  cross-slice action that lives on the composer (like `loadProject`).
- **Undo/redo via zundo, debounced**: `temporal` middleware sits
  *inside* `persist` so undo restores past state and persist writes
  the now-current state to localStorage. `handleSet` is debounced
  300 ms so rotation drags and name-input typing each collapse to one
  history entry. History is session-only (rebuilt on reload) but the
  *result* of an undo survives reload through persist. Limit 50.
  When adding a new slice that the user should be able to undo, add
  it to the `HISTORY_SLICE` selector in `useStore.js` (and keep that
  selector in sync with `persist.partialize` if the same state should
  also be persisted).
- **PNG-export background**: the underlay layer's first child is a
  full-bleed gray-950 `Rect`. Same colour as the container's CSS
  background, so live rendering is unchanged; the difference is that
  `toDataURL` now captures the dark backdrop instead of transparent
  pixels. Don't change the colour without checking whether the
  container's CSS still matches.
- **Multi-item selection helpers**: never access `selection.kind` or `selection.id` directly — use `src/store/selectionHelpers.js`. `getSingleItem(sel)` for single-select code paths (PropertiesPanel routing, rotation handle); `isSelected(sel, kind, id)` for per-shape `selected` prop; `selectionItems(sel)` for bulk ops (delete, rotate, marquee).
- **Marquee flow**: `useMarquee` hook injects `onMouseDown/Move/Up` into the Stage alongside `useDrawWalls`. On mousedown it records the anchor; if the drag exceeds 5px screen pixels it cancels the accidental `drawStart` (`setDrawStart(null)`) and shows the dashed blue rect. On mouseup it calls `setSelectionItems([...])` with all items whose representative points fall inside the rect. Only active when `drawStart === null` at mousedown time.
- **Multi-furniture drag**: `useFurnitureMultiDrag` hook captures all selected furniture positions at drag-start via `useStore.getState()` (no stale closures). On drag-end it computes the delta from the dragged item's start→end and applies it to every other selected furniture item in one pass.
- **Layers are persisted but not undoable**: `layers` is in `persist.partialize` but NOT in `HISTORY_SLICE`. Layer visibility is a session preference (like `show3d`), not a design decision the user should undo.
- **Toasts are single-slot**: the store holds one `toast | null`,
  replaced (not queued) by `pushToast`. Good enough for our current
  message volume; if multiple concurrent messages become a problem,
  bump to a list with stable ids and let `Toast.jsx` map over them.
- **3D selection lives on the material's emissive channel**: we toggle
  `material.emissive` + `emissiveIntensity` rather than swapping
  materials or adding outline meshes. Cheap (no allocation), works on
  the existing `MeshStandardMaterial` we already use, and reads as a
  natural "glow" against the dark scene background. When GLB models
  land, walking the loaded mesh tree and toggling emissive on each
  material will reuse the same idea.
- **Mesh identity for picking**: every mesh added by the reconcilers
  carries `mesh.userData.kind` ('wall' | 'furniture' | 'room') and
  `mesh.userData.id`. That's the contract `picking.js` reads. Any new
  selectable kind in 3D must populate the same two fields.
- **Click vs drag in 3D**: a `pointerdown` records coordinates; the
  subsequent `click` event is only treated as a selection if the
  pointer moved less than 4 px. OrbitControls owns the drag itself
  (orbit / pan); it doesn't fire `click`, so the browser's native
  click event after a no-drag mousedown/up is what we listen for.
- **Material catalogs are composed from data sources**: `wallMaterials.js`, `floorMaterials.js`, `furnitureMaterials.js` no longer hard-code their entries — they import from `benjaminMooreColors.js`, `sherwinWilliamsColors.js`, `woodFinishes.js` and map each into a `{ id, label, color, category, code? }` shape. Adding a new color: edit the data file, not the catalog. Hex values for paints are approximations, not spec values; treat them as preview-quality.
- **Legacy material ids are migrated, not renamed**: each catalog exports a `resolveXxxMaterialId(id)` and a `LEGACY_MIGRATIONS` map. Old persisted state keeps its short ids (`painted-white`, `light-wood`, `wood`, etc.); the catalog rewrites them to current ids only when read. Three reasons not to migrate at write time: (1) `.studio.json` exports stay backward-readable, (2) the migration map can change later without re-touching user state, (3) one less version bump on the persist schema. Always go through `getXxxMaterial(id)` or `xxxColorFor(item)` — never `BY_ID[id]` directly — so legacy ids hit the resolver.
- **MaterialPicker thresholds**: the picker shows a search input when at least one category has more than 10 entries (`SEARCH_THRESHOLD = 10` in `MaterialPicker.jsx`). The picker itself is scrollable with `max-h-72 overflow-y-auto` so even with 60+ wall paints the Properties panel doesn't blow up. Swatch `title` prop carries the tooltip text — `${name} · ${code}` for paints, `${label}` alone for wood + fabric + "Other".
- **Furniture GLB provenance**: all 12 GLB files in `src/assets/furniture/` are procedurally generated by `scripts/generate-furniture-glbs.mjs` (CC0). Each model's bounding box exactly matches the catalog entry's `width × depth × height` so `fitToBox()` applies a 1:1:1 scale. Orientation: +Y up, −Z is back (backrests/headboards), origin at bottom-centre. To add a new model or replace one: drop the `.glb` in the assets dir, reference via `glb('name.glb')` in the catalog, and re-run `npm run build`. Re-generate all 12 procedural models at any time with `node scripts/generate-furniture-glbs.mjs`.
- **Vite GLB asset inlining**: Vite's default `assetsInlineLimit` is 4096 bytes. GLBs below this threshold are base64-inlined into the JS bundle; larger ones are emitted as separate fingerprinted files. Both load correctly via GLTFLoader (which supports `data:` URLs). The main bundle grew ~29 kB from inlined sofa/armchair/bed/rug/lamp/tv GLBs.
- **GLB pipeline split across two modules** (cache + loader):
  `furnitureModelCache.js` is pure JS — Map, status getters, listener
  registration. `furnitureModels.js` imports `three` + `GLTFLoader` for
  loading, cloning, and fitting. The 2D side (PropertiesPanel) imports
  only from the cache module so the lazy Viewer3D chunk stays separated
  from the main bundle. **Don't** add three-using helpers to the cache
  module — that breaks the code-split.
- **Furniture is Group-wrapped in 3D, walls/rooms are still Meshes**:
  furniture gets a `THREE.Group` parent so the GLB-vs-box swap happens
  in-place without recreating the addressable scene object. Walls and
  rooms have no such swap, so they remain plain Meshes for simplicity.
  Helpers that touch the maps (`applySelectionHighlight`, picking,
  `disposeAll`) traverse generically — they work for both.
- **Picking parent walk**: `intersectObjects(targets, true)` finds the
  leaf Mesh inside a Group. We then walk `node.parent` upward until we
  hit a node with `userData.kind` — that's the addressable selectable.
  Any new selectable kind in 3D must populate `userData.kind` + `id` on
  the *outermost* object the meshMap stores.
- **Rotation handle is a separate sibling, not a child of Furniture**:
  it lives in CanvasArea's render tree (conditional on
  `selection?.kind === 'furniture'`), positioned in world coords
  derived from the selected item's centroid + rotation. Putting it
  outside the Furniture Group avoids fighting with the Group's own
  `draggable` (which moves the piece) — the handle's "drag" is custom
  via `dragBoundFunc` + `onDragMove` reading the live pointer.
- **React style**: enforced by `.claude/skills/react-style/`. Summary:
  functional components only, Zustand for cross-component state with narrow
  selectors, custom hooks for any logic block >~20 lines, PascalCase component
  files, camelCase `use*` hook files, Tailwind utilities only (no inline
  `style` except for dynamic transforms/cursor), components capped at ~150
  lines, props destructured in the parameter list.
- **Three.js scene**: enforced by `.claude/skills/three-scene/`. Summary: all
  scene/camera/renderer setup lives in `src/hooks/useThree.js` and is
  instantiated exactly once (ref-stable, not React state); walls/furniture sync
  from Zustand into the scene one-way via `useEffect`; furniture is GLB with a
  BoxGeometry fallback; every scene has AmbientLight + DirectionalLight;
  PerspectiveCamera with `fov = 60`; unit conversion is
  `1 Konva px = 0.02 Three.js units` (because 50 px = 1 m = 1 Three unit).
- **2D canvas constants** (enforced by `.claude/skills/konva-canvas/`): wall
  stroke `10` px, hit-stroke padding `+12` px, selection `#3b82f6`, world
  bounds `±5000`. Minor grid 50 px, major every 5th line (250 px).
- **Lighting items reuse the furniture pipeline**: `'lighting:*'` typed items live in the `furniture` array and go through all the normal furniture tooling (placement, selection, deletion, undo, 2D canvas rendering). The 3D reconciler detects them via `isLightingType(type)` and creates a Three.js light alongside the visual Group. Light-specific fields (`lightType`, `intensity`, `colorTemp`, `distance`, `castShadow`, `on`) are snapshotted from the catalog spec at add-time.
- **Lighting items mount at ceiling or floor**: ceiling-lamp and pendant position their Group at `WALL_HEIGHT − height` (so top flush with ceiling); floor-lamp and table-lamp sit at y=0. The Three.js light itself is placed at `lightSourceY` — roughly the shade position — regardless of Group Y. The formula is encoded in `reconcileFurniture.js:lightSourceY()`.
- **Active light cap**: only the first 8 `on=true` lighting items (in furniture array order) are given non-zero intensity. Items beyond the cap are kept in the scene but silenced. `useThree.js` watches the count and fires a toast when the user first exceeds 8. Reducing below 8 re-enables the previously-silenced lights on the next reconcile.
- **Sun is reactive, not per-frame**: `applySunForTime(sunRef.current, timeOfDay)` runs in a dedicated `useEffect` on `lighting.timeOfDay`. Sun colour uses the Kelvin→RGB curve (2500 K at horizon, 6500 K at noon). Intensity tracks `max(0, elevation) * 1.2`, so the sun disappears below the horizon at night.
- **GLB material tinting is opt-in, not always-on**: `tintColor` on a furniture Group is null when the user has left the material at the catalog default — the GLB's authored colors are untouched. Only a non-null `item.material` override produces a tint. When the override is removed the Group is rebuilt (re-cloned from cache), restoring original colors. Materials were already cloned per-instance by `cloneLoadedModel`, so changing one piece's tint never affects identical pieces.
- **Component tests use a Zustand selector mock pattern**: `vi.mock('../store/useStore', () => ({ default: vi.fn() }))` then `vi.mocked(useStore).mockImplementation((sel) => sel(mockState))` in `beforeEach`. Sub-editors are stubbed with `vi.mock('./canvas/FurnitureProps', () => ({ default: () => <div>FurnitureProps</div> }))` so PropertiesPanel smoke tests focus on routing, not sub-component internals.
- **Walkthrough uses an `onFrame` slot on `stateRef`**: `useThree` now returns `stateRef` (the stable ref holding `{ scene, camera, renderer, controls, … }`). `useWalkthrough` sets `stateRef.current.onFrame` to its per-frame physics callback when active; the RAF tick calls it before `controls.update()`. When inactive, the slot is null and the tick is a no-op. This avoids a second RAF loop and lets the walkthrough hook co-exist cleanly with the Three.js render loop.
- **Walkthrough is NOT persisted and NOT in undo history**: it's a viewport mode, like `show3d`. The app always boots in orbit mode. `walkthroughSlice` keys are intentionally excluded from both `HISTORY_SLICE` and `persist.partialize`.
- **PointerLockControls and OrbitControls coexist — orbit update skipped during walkthrough**: when walkthrough is active, `orbit.enabled = false`; on cleanup, it's restored. The RAF tick also skips `controls.update()` entirely when `stateRef.current.onFrame` is set — even with `enabled = false`, OrbitControls' damping was interfering with PLC mouselook when `update()` was called every frame. Skipping `update()` is safe because damping has no effect when the camera is PLC-controlled.
- **Wall collision in walkthrough is XZ-only**: `walkthroughCollision.js` works entirely in the XZ plane (no Y component). Walls are treated as infinitely tall 2D line segments. The sliding fallback tries X-only then Z-only movement so the player glides along walls instead of sticking.
- **Shadows are always on** (once enabled): `renderer.shadowMap.enabled = true` is set once at mount and never toggled. Per-item `castShadow` on placed lights is controlled per-item from `LightingProps`. Turning off a light (intensity→0) doesn't toggle `castShadow` — Three.js ignores inactive lights' shadow maps automatically.
- **Debugging discipline** (`.claude/skills/debugging-discipline/`): no work
  begins on a red build; never comment out broken code; `npm run build` after
  every fix; strip `console.log` before marking done; install missing packages
  immediately.
- **Session ritual** (`.claude/skills/session-ritual/`): start every session
  by reading CONTEXT.md + running `npm run build` + reporting state. End every
  session by running `npm run build` + updating CONTEXT.md + summarising
  completed work and what's queued next.

## Known Issues / Open Questions
- No undo/redo. (Consider zundo or a manual history slice.)
- Wall hit-stroke padding is still `16` in `Wall.jsx`; the `konva-canvas` skill text reads as `WALL_THICKNESS + 12 = 22`. Selection blue & wall thickness now match the skill, this is the last calibration gap — defer until someone reports walls feeling hard to right-click.
- Editing in 3D is read-only — all writes go through the 2D side. (Documented in `SPEC.md` Flow 3 and CLAUDE.md three-scene rules.)
- Persistence is unversioned-against-shape-changes: if a future session adds fields to a `Wall` or `Furniture`, the migration must be written explicitly (`persist` `migrate` callback + bump `version`).
- **Multi-drag is furniture-only** (2026-05-20): marquee + multi-select allows moving multiple furniture items together, but walls and openings in the selection don't move with them. `useFurnitureMultiDrag` only iterates `kind === 'furniture'` items. Fix needs a shared multi-drag handler that operates on the full `selection.items` list per kind (translate wall endpoints, re-clamp opening positions on their walls).
- **Hiding a layer doesn't deselect items in that layer** (2026-05-20): when a layer's visibility is toggled off via the Layers panel, items of that kind remain in `selection.items` even though they're no longer rendered or clickable. The Properties panel then shows controls for an invisible item, which is confusing. Fix: in `layersSlice.toggleLayer`, when visibility flips to `false`, filter the matching kind out of `selection.items` in the same `set()` call (mapping layer key → selection `kind`: `walls`→`wall`, `furniture`→`furniture`, `openings`→`opening`, `underlay`→`underlay`; `rooms` and `grid` have no selection equivalent).

## How to Start Each Session
Paste this file, then say what you want to work on next.
