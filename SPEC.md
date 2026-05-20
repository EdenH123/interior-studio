# Interior Studio — Product Specification

_Last updated: 2026-05-20_  <!-- doors and windows on walls -->


## What it is

Interior Studio is a browser-based interior design tool — a simplified
SketchUp for non-professionals. Users draw a floor plan in 2D, see it as a
3D room, drop in furniture, try out materials, and (eventually) ask an AI
for design suggestions. Everything runs in the browser; no backend required.

The point of the product is to let someone planning a room — a renter
arranging an apartment, a homeowner planning a renovation, a small-business
owner laying out a shop — sketch and visualise spatial decisions without
having to learn CAD software.

## Target users

| User | Why they're here |
|---|---|
| **Renters & homeowners** | "Will this couch fit?" "Does this layout work?" Sketching before buying or moving furniture. |
| **Hobbyist designers** | Trying ideas for friends, family, side gigs. Want something faster than SketchUp, less limiting than IKEA's planner. |
| **Small-shop owners** | Laying out a café, salon, boutique. Need to think about flow and capacity, not architecture. |
| **Students / educators** | Learning spatial reasoning, design basics, or the math of scale. |

Not target users: professional architects (they need CAD), AR/VR
experiences, anyone needing structural calculations, lighting simulation,
or building-code compliance.

## Non-goals

To keep scope honest:

- **No backend.** No accounts, no cloud sync, no collaboration. Designs
  live in `localStorage` and can be exported as files.
- **No realism.** Not a render engine — Three.js scenes are diagrammatic,
  not photoreal.
- **No CAD precision.** Snap-to-grid and snap-to-angle are enough; we won't
  ship constraint solvers or parametric modelling.
- **No mobile-first.** Designed for desktop. Mobile is "view-only" at best;
  drawing on a phone is a non-goal.
- **No building code, no engineering.** Walls are visual, not load-bearing
  in any structural sense.

## Feature list

### Implemented

- **2D floor-plan canvas** — Konva-based, pan, zoom, grid background, world
  bounds ±5000 px (100 m × 100 m).
- **Wall drawing** — click two points; snap to 90°; live dimension label
  while drawing; right-click to delete; `Esc` cancels. Cursor snaps to
  existing wall endpoints and midpoints (cyan marker indicates the active
  snap target); endpoint/midpoint snap overrides 90° snap. After
  committing a wall the chain continues from the new endpoint; clicking
  the same point again, pressing `Esc`, or right-clicking empty canvas
  ends the chain.
- **Room detection** — closed wall loops automatically render as a
  subtle sky-blue floor tint so users can see enclosed rooms.
- **Named rooms + floor materials** — click a detected room to select
  it; right panel exposes a name input, a 6-swatch floor-material
  picker (Default / Wood / Tile / Carpet / Marble / Concrete), and
  area + vertex stats. Name and material persist via `localStorage`
  keyed by a vertex-set fingerprint of the polygon (stable across
  re-detections — same coords means same room).
- **Floor-plan image underlay with calibration** — upload a PNG/JPG
  via the toolbar; image renders as the bottom-most canvas layer with
  configurable opacity. A two-click calibration flow (click two points
  whose real-world distance you know → enter metres → applies) rescales
  the image so the canvas's `50 px = 1 m` convention is honoured. Image
  is draggable while unlocked; calibrating locks it so clicks pass
  through and wall drawing isn't interrupted. Stored as a base64 data
  URL so it survives a reload. Large uploads are **auto-downscaled** to
  2000 px on the long side (JPEG, quality 0.85) to fit the
  ~5 MB localStorage budget; if persistence still fails, a toast warns
  the user that the underlay is session-only.
- **Toast notifications** — single-slot transient banner anchored
  bottom-center. Used by the underlay flow to signal downscale,
  near-quota, and persistence-failed states. Auto-dismisses after 6 s;
  click to dismiss earlier.
- **Export PNG** — toolbar button captures the current 2D canvas view
  via `stage.toDataURL({ pixelRatio: 2 })` and downloads as
  `interior-studio-{ISO-timestamp}.png`. Stage includes a background
  Rect tinted `#030712` (gray-950) so the export has the dark backdrop
  baked in rather than transparent pixels.
- **Save / Open `.studio.json`** — toolbar buttons round-trip the full
  persistable project state (walls, furniture, roomMeta, underlay) as
  a JSON file with a versioned envelope:
  `{ format: 'interior-studio', version: 1, exportedAt, data }`. Open
  validates `format` + `version`, confirms before overwriting existing
  work, then hydrates via `loadProject` (which also clears transient
  state — selection, mid-draw, calibration, drag-ghost). I/O lives in
  `src/utils/projectIO.js` so it's testable independently of React.
- **Furniture material override** — when furniture is selected, the
  right panel exposes an 8-swatch material picker (Default + Light
  Wood, Dark Wood, White, Black, Linen, Navy, Forest). The override
  applies to the 2D footprint stroke and the 3D box-fallback mesh;
  loaded GLB models keep their authored materials.
- **Undo / redo** — `zundo` temporal middleware wraps the persisted
  store, tracking changes to `walls / furniture / roomMeta / underlay`.
  `Ctrl/Cmd+Z` undoes, `Ctrl/Cmd+Shift+Z` redoes; toolbar `↶` / `↷`
  buttons mirror, with a disabled state when history is empty. History
  snapshots are debounced 300 ms so a continuous flow (rotation drag,
  room-name typing) collapses into one entry. Limit 50 steps; history
  is session-only (not persisted).
- **AI design assistant** — toolbar **AI** button toggles a chat
  panel on the right (replaces the Properties panel while open). The
  user pastes an Anthropic API key (sessionStorage only — never
  localStorage, never persisted with the project). **Analyze current
  design** sends the full project state as JSON; the free-form prompt
  field sends arbitrary follow-ups. The system prompt describes the
  app's data model (walls / furniture / rooms shapes + units +
  conventions); each request also includes the slimmed current state
  (underlay base64 stripped, detected rooms merged with their meta).
  Responses stream via SSE for responsiveness.
  Model: `claude-sonnet-4-20250514`. The UI carries an unmissable
  warning that browser-side API keys are inherently exposed.
- **AI apply-to-project** — when Claude returns a ```json block, the
  app parses it, validates it against the project schema (`walls`,
  `furniture`, `roomMeta` shapes), and diffs against the current
  state. A **Preview changes** card surfaces add/modify/remove counts
  per slice; the 2D canvas paints green / amber / red overlays for the
  additions / modifications / removals respectively. **Apply** commits
  the diff in a single `set()` — one undo step reverts the whole AI
  change. **Discard** drops the preview without touching state. The
  underlay is intentionally outside this scope (Claude doesn't see its
  bytes; apply preserves the live underlay). Malformed JSON falls back
  to a **Copy** button with an inline error.
- **Wall selection + length editing + material** — click selects
  (highlighted in `#3b82f6`); `Del`/`Backspace` removes; right panel
  shows an editable **Length (m)** input (rounds to 2 decimals; min
  0.05 m) and a 6-swatch **Material** picker (Default + Painted White /
  Brick / Concrete / Wood Panel / Wallpaper). Committing a new length
  recomputes the second endpoint along the wall's current direction so
  the first endpoint stays fixed. Material colour applies to both the
  2D wall stroke and the 3D wall mesh.
- **Persistence** — walls and furniture survive page refresh via Zustand
  `persist` middleware (`localStorage` key `interior-studio`, version 1).
  Selection, mid-draw, view-mode, and other transient UI state are
  intentionally not persisted.
- **Furniture catalog & drag-and-drop** — left sidebar lists 12 items
  across 5 categories (Seating, Tables, Bedroom, Storage, Decor). Drag a
  tile onto the canvas; while the drag is over the canvas, a translucent
  Konva-rendered ghost of the item's footprint follows the cursor
  (snapped to the 50 px grid) so the user sees exactly where a drop will
  commit. Drops snap to the same grid and instantiate a piece sized to
  its real-world dimensions. Click to select; drag the piece to move;
  `R` / `Shift+R` to rotate by 15° steps; `Del` to remove.
- **Properties panel** — shows the selected wall or furniture item with
  its key dimensions.
- **App shell** — top toolbar (with 2D ↔ 3D toggle), left sidebar (furniture
  catalog), center canvas, optional right-side 3D viewer (split view),
  right properties panel.
- **3D viewer (split view)** — Three.js scene to the right of the 2D canvas,
  toggled by a button in the toolbar. Walls render as 2.4 m extruded boxes
  using `WALL_THICKNESS` for depth; furniture renders inside a
  `THREE.Group` containing either a loaded GLB (when the catalog entry
  carries a model URL and the load succeeds) or a `BoxGeometry` sized to
  the catalog `width × depth × height` — the documented fallback per the
  `three-scene` skill. The GLB pipeline is scaffolded but every catalog
  entry has `model: null` today, so the fallback always renders. Each
  detected
  room renders as its own triangulated floor mesh (`THREE.ShapeGeometry`)
  tinted with the room's assigned floor material colour, or a neutral
  default when unmaterialed. Lighting is AmbientLight + DirectionalLight
  per the skill. PerspectiveCamera fov 60. Orbit (left-drag), pan
  (right-drag), zoom (wheel) via OrbitControls. The scene reactively
  reconciles when walls, furniture, rooms, or room materials change in the
  store — no manual refresh.
- **Bidirectional selection sync** — selecting a wall / furniture / room
  in 2D applies an emissive-blue (`#3b82f6`) highlight to the matching
  Three mesh; clicking a mesh directly in the 3D viewer dispatches
  `select(kind, id)` back to the store. Raycaster-based picking on the
  renderer canvas; a 4 px pointer-movement threshold distinguishes a
  selecting click from an OrbitControls orbit-drag.
- **Furniture rotation handle** — when furniture is selected, a small
  blue circle on a stick projects out the "back" edge of the footprint.
  Click-dragging the handle rotates the piece freeform around its
  centroid (rotation snapped to whole degrees). Keyboard `R` /
  `Shift+R` continue to provide 15° increments for precise alignment.

### Planned

Ordered roughly by sequence — earlier items unblock later ones.

1. **Populate actual GLB models** — pipeline is in place (cache,
   GLTFLoader, in-place upgrade from box fallback). Drop `.glb` files
   into `src/assets/furniture/` and set the `model` field on the
   matching catalog entry.
2. **PDF export + printed scale bar** — PNG export landed; PDF is a
   separate path (paged, scale-bar overlay).

## User flows

### Flow 1 — Draw a room

1. User opens the app to the empty canvas (grid visible, HUD shows
   "click to start a wall…").
2. Left-clicks an empty point. A blue start marker appears.
3. Moves the cursor. A dashed blue preview wall follows, snapped to
   horizontal or vertical from the start point. A floating
   "X.XX m" label hovers above the preview, perpendicular to the wall.
   If the cursor is within ~14 screen pixels of an existing wall
   endpoint or midpoint, a cyan marker appears and the preview locks to
   that exact point (overriding 90° snap).
4. Left-clicks a second point. The wall commits to a solid white line.
   Either the snap target (if active) or the 90°-projected cursor is
   used as the end point. Drawing state advances: the just-committed
   endpoint becomes the new `drawStart` so the next click extends the
   chain.
5. Continues clicking to extend the chain. Closing the chain back to an
   existing wall endpoint (snap takes precedence) completes a loop.
   Closed loops are automatically detected and tinted as rooms.
6. Ends the chain by clicking the same point again (zero-length commit),
   pressing `Esc`, or right-clicking empty canvas.
7. Right-clicks an existing wall to delete it.

Edge cases:
- Click and immediate click on same point → no zero-length wall is
  created.
- Drawing off-screen → walls can extend to the world bounds (±5000 px);
  beyond is not allowed.

### Flow 2 — Place furniture (implemented)

1. Left sidebar lists furniture grouped by category (Seating, Tables,
   Bedroom, Storage, Decor) with tile thumbnails showing real footprint
   aspect ratio.
2. User drags a tile onto the canvas. The browser's HTML5 drag image
   follows the cursor.
3. Drop commits an item at the cursor position, snapped to the 50 px grid.
   The new piece is auto-selected.
4. Selecting (left-click) populates the right panel with its
   properties: type, dimensions (W × D × H), rotation, position.
6. Drag the piece on the canvas to move (Konva drag with `onDragEnd`
   writing back to the store). `Del`/`Backspace` removes the selection.
7. Rotation: drag the blue rotation handle that sticks out the back of
   the footprint when selected, or press `R` / `Shift+R` for 15°
   increments.
8. A small light tick on the "front" edge of each footprint makes the
   current rotation visible.
9. (Future: items above the floor plane will show a dashed outline;
   ghost while dragging from sidebar.)

### Flow 3 — Switch to 3D view (implemented)

1. User clicks the "3D" toggle in the toolbar. The button highlights when on.
2. A Three.js viewport opens to the right of the 2D canvas (split view —
   both stay visible). Default camera pose: angled view from `(6, 5, 6) m`
   looking at `(0, 1, 0)`.
3. Walls render as extruded boxes (height 2.4 m, depth = `WALL_THICKNESS`
   × `0.02` m). Furniture renders as colored BoxGeometry sized to its
   catalog dimensions. (Future: GLB models with the box as the fallback.)
4. User orbits with left-drag, pans with right-drag, zooms with the wheel
   (Three's OrbitControls with damping). (Future: top / front / iso
   camera presets.)
5. **Selection sync** — selecting a wall/furniture/room in 2D applies
   an emissive-blue highlight to the matching 3D mesh; clicking a mesh
   in the 3D viewer dispatches `select(kind, id)` back to the store.
   The raycaster click is gated by a 4 px pointer-movement threshold
   so orbit drags don't accidentally select.
6. Editing in 3D is otherwise read-only — to change the plan
   (positions, geometry), the user toggles back to 2D.
7. Switching back to 2D restores the previous 2D pan/zoom state.

### Flow 4 — Upload a floor plan image (implemented)

1. User clicks "Upload underlay" in the toolbar; native file picker;
   accepts PNG/JPG.
2. File reads to a base64 data URL; image lands as the bottom-most
   canvas layer at world origin with opacity 0.5 and `scale = 1`. Auto-
   selected, so the properties panel shows its editor.
3. While unlocked, the image is draggable (Konva-native drag) — user
   can position it before scaling.
4. User clicks **Calibrate** in the properties panel. The bottom-right
   hint shifts to "click first calibration point". An invisible
   capture rect on the top canvas layer intercepts the next two left-
   clicks no matter what's underneath.
5. After two clicks, a centred prompt asks for the real-world distance
   in meters. User types it; Enter (or **Apply**) commits.
6. App computes `ratio = (distance_m × 50) / pixel_distance` and applies
   it to the image's `scale` and `(x, y)` so that the first calibration
   point stays in place and the second moves to the right distance away.
   The underlay is then marked `locked: true`.
7. Locked image has `listening={false}` so clicks pass through — wall
   drawing on top of it works normally without shifting the image.
8. Opacity slider in the properties panel adjusts visibility on the fly.
   Selecting a locked underlay is done via the **Underlay** button in
   the toolbar (since clicks on the locked image pass through).
9. **Remove** in the properties panel deletes the underlay and clears
   any selection pointing at it.

Cancellation: `Esc` during any calibration step cancels the flow.
Re-calibration on a locked underlay temporarily unlocks it, then re-
locks on apply.

### Flow 5 — Get an AI design suggestion (implemented)

1. User clicks **AI** in the top bar. The Properties panel is replaced
   by the AI chat panel on the right side.
2. First visit: user is prompted to paste their Anthropic API key. The
   panel shows a clear warning that browser-side API keys are exposed
   to scripts, extensions, and dev tools. The key is stored in
   `sessionStorage` only — never `localStorage`, never written into a
   `.studio.json` export.
3. User either clicks **Analyze current design** (sends the full
   project state as JSON context) or types a free-form prompt
   ("suggest a layout for a kid's bedroom"). **Enter** sends.
4. The request goes to Anthropic's Messages API with `stream: true`.
   The model is `claude-sonnet-4-20250514`. The system prompt
   describes the data model (walls, furniture, rooms shapes; the
   `50 px = 1 m` convention; furniture/wall/floor material ids).
5. Response streams back as text. A blinking cursor on the active
   reply indicates more is coming.
6. Follow-up turns keep the conversation in memory; each request
   re-sends the full transcript plus the current (possibly edited)
   project state.
7. If Claude returns a ```json block, the app parses + validates it
   against the project schema. On success, a **Preview changes** card
   appears above the input with add/modify/remove counts per slice;
   the 2D canvas paints diff overlays (green = add, amber = modify,
   red = remove). **Apply** commits the proposal in a single `set`
   call — one Ctrl/Cmd+Z reverts the whole change. **Discard** drops
   the preview. Sending a new prompt also discards any pending
   preview. If the block parses but doesn't match the schema (or
   doesn't parse), the panel falls back to a **Copy** button with an
   inline error so the user can still use the suggestion manually.
8. **Clear conversation** resets the transcript; **Clear key** wipes
   the API key from sessionStorage; closing the panel (or the tab)
   ends the session.

Limitations:
- The underlay image bytes are not sent (would be huge tokens; the
  model gets a small `{locked, opacity, scale}` summary instead).
- Apply preserves the live underlay — Claude can't author it.
- `roomMeta` keys are polygon fingerprints; if Claude proposes wall
  changes the existing meta keys may go stale. The system prompt
  asks Claude to leave `roomMeta` alone unless it's making a
  rename/material change on rooms whose walls it didn't touch.

## Data model

```javascript
// Wall
{ id: string, x1: number, y1: number, x2: number, y2: number,
  thickness?: number, material?: string }

// Furniture item (planned)
{ id: string, type: string, x: number, y: number, rotation: number,
  width: number, depth: number, height: number, material?: string,
  modelUrl?: string }

// Opening (door or window on a wall)
// position is normalised 0..1 along the parent wall.
// width / height / sillHeight are meters. Doors have sillHeight = 0.
{ id: string, type: 'door' | 'window', wallId: string,
  position: number, width: number, height: number, sillHeight: number }

// Room (planned, derived from closed wall loops)
{ id: string, wallIds: string[], floorMaterial?: string, name?: string }

// Plan (planned, for export/import)
{ version: 1, units: 'meters', walls: Wall[], openings: Opening[],
  furniture: Furniture[], rooms: Room[],
  underlay?: { dataUrl: string, scale: number } }
```

All world coordinates are pixels. `1 m = 50 px` in 2D Konva, `1 m = 1 unit`
in Three.js, hence `1 Konva px = 0.02 Three.js units`.

## Constraints (non-functional)

- **Browser-only.** Runs against `file://` or any static host. No service
  workers required.
- **Performance budget.** Floor plans up to ~200 walls and ~100 furniture
  items should pan/zoom at 60 fps on a modern laptop.
- **Bundle.** The Konva + Three.js combo is heavy (~500 kB gzip today).
  Code-split the 3D viewer so users who only use 2D don't pay for
  Three.js until they toggle 3D.
- **No PII, no telemetry.** Anything sent to Claude goes only when the
  user clicks "Suggest" and uses their own key.

## Open product questions

These will need decisions before the relevant feature lands.

- **Default wall height in 3D.** 2.5 m feels right for residential;
  shop/office spaces might want 3.0 m. Per-room override?
- **Furniture catalog source.** Bundle a small starter set as GLBs in
  `src/assets/furniture/`? Pull from Sketchfab API? Both?
- **Exported file format.** `.studio.json` for round-trip, PNG/PDF for
  share. Should we also export to `.glb` or `.obj` for users who want to
  take the 3D model elsewhere?
- **AI billing.** User-supplied API key is simplest but high-friction.
  Worth a hosted free tier eventually? Out of scope for v1.
