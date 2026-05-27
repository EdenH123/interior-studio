# Interior Studio — User Guide

_Last updated: 2026-05-27_  <!-- pool water fix; void wall-snap; 2D stair-arrival ghost on upper floors -->


A short tour of everything Interior Studio can do today. Read it
beginning-to-end the first time; after that, the **Keyboard shortcuts**
section at the bottom is the cheat sheet you'll come back to.

## What you can do

Sketch a floor plan, place furniture, view your room in 3D, and have it
all save automatically. No account, no upload, no installation — it runs
entirely in your browser.

The screen has four areas:

- **Top bar** — the app name and the **3D** toggle button.
- **Left panel** — the furniture catalog and layers panel.
- **Center** — the 2D canvas where you draw and arrange things.
- **Right panel** — properties of whatever is currently selected.

## Drawing walls

When the canvas is empty, a short **"Start your floor plan"** card appears in
the center with three steps to get you going. It disappears the moment you
draw your first wall or drop a piece of furniture.

1. Click anywhere empty on the canvas to drop the **start point**. A blue
   dot appears.
2. Move the mouse. You'll see a dashed blue preview wall following the
   cursor, with a floating measurement (e.g. `3.20 m`) showing the
   current length.
3. Click again to **commit** the wall. It turns solid white.
4. The wall is committed *and* the next wall is already starting from
   that endpoint. Keep clicking to draw a chain of connected walls.

### Ending a chain

When you're done drawing, finish the chain in any of these ways:

- Click the **same point again** (a "double-click" on the endpoint).
- Press **`Esc`**.
- **Right-click** on an empty part of the canvas.

### Snap to existing points

While you're drawing, if your cursor gets near an existing wall's
**endpoint** or **midpoint**, a small **cyan marker** appears:

- A small square = an endpoint.
- A small diamond = a midpoint.

When the marker is visible, your next click will lock to that exact
point instead of wherever the cursor was. This makes it easy to close
rooms (snap back to where you started) and to connect walls cleanly to
existing geometry without aiming.

### Starting a wall on an existing wall

In **Draw** mode, clicking anywhere along an existing wall starts a new
wall from that exact point on the wall (it does **not** select the wall).
This makes T-junctions and interior partitions a single click — start on
the wall, then click again to draw away from it. To select a wall and
edit its properties instead, switch to **Select** mode and click it.

### Wall angle snapping

If there's no nearby snap point the preview wall locks to the nearest
**45° multiple** from the start point (0°, 45°, 90°, 135°, 180°, 225°,
270°, or 315°). A cyan degree readout at the midpoint shows the current
angle live.

Two modifier keys change the snap mode while you hold them:

| Key | Snap mode |
|---|---|
| *(none)* | 45° multiples (default) |
| **Shift** | 90° only (horizontal / vertical) |
| **Alt** | Free angle — no snapping |

The HUD hint at the bottom of the canvas reflects the active mode.
Release the key to return to the default 45° snap.

### Deleting a wall

**Right-click** on any wall to delete it. Or click the wall to select it
and press **`Del`** / **`Backspace`**. Any doors or windows on that wall
are removed at the same time.

## Doors and windows

Above the furniture catalog, the left panel has an **Openings** group with
seven types to choose from:

| Type | Default width | Notes |
|---|---|---|
| Hinged Door | 0.9 m | Standard swing door; panel opens 90° in 3D |
| Double Door | 1.6 m | Two panels sharing a center hinge; both swing in 3D |
| Sliding Door | 1.2 m | Panel slides to one side; static in 3D |
| Pivot Door | 1.0 m | Panel pivots about its centre line; opens 90° in 3D (click to open/close). Use "Opens toward" to flip the direction |
| Window | 1.2 m | Standard sash, 0.9 m sill height |
| Fixed Window | 1.5 m | Non-opening pane, 0.9 m sill height |
| Casement | 1.0 m | Side-hinged swing-out frame, 0.9 m sill height |
| Arched Window | 1.0 m | Semicircular arch at the top, 0.9 m sill height |

To place an opening:

1. **Drag** a tile from the sidebar onto the canvas. While dragging, a blue
   preview locks to the nearest wall — that's where it'll land. Drop with
   no wall close enough and you'll see a red X; nothing happens.
2. The opening appears on the wall with its default size.
3. The wall stays whole visually but renders as two segments around the
   gap. In 3D the hole is actually carved out of the wall geometry and the
   appropriate door panel or window frame fills the opening.

If the opening is too wide for the wall you drop it on (or it would overlap
another opening), it won't be placed at its default size — but instead of
just refusing, the notification offers a **Resize to fit** button. Click it
to drop a version automatically shrunk to the available space on that wall.

### Opening and closing doors in 3D

**Click a door panel** in the 3D view to toggle it open or closed (300 ms animation). Click again to close. The state is saved with the project.

- **Hinged door** — panel swings 90° from its hinge edge into the room.
- **Double door** — both panels swing open independently from their outer edges.
- **Sliding door** — panel slides one full width along the wall to reveal the opening.

### Moving an opening

Click an opening to select it (it turns blue), then drag it. It stays
locked to its parent wall — there's no way to move a door from one wall to
another short of deleting and re-dropping it.

### Editing size and material

With an opening selected, the right panel shows:

- **Width (m)** and **Height (m)** — type a value and press Enter.
- **Sill height (m)** — windows only; how far above the floor the bottom of the glass sits.
- **Color** — a row of color swatches. Doors offer Wood, White, Dark, Black, Gray. Windows offer White, Wood, Black, Gray. The change applies immediately in the 3D view.
- **Material** (doors only) — three styles: **Painted** (smooth flat finish), **Wood Grain** (procedural vertical wood grain texture), **Glass** (frosted glass for modern sliding doors).
- **Swing** (hinged door only) — **← Left** or **Right →** sets which edge the hinge is on. Left means the hinge is on the left jamb and the door swings from there; Right flips it.
- **Opens toward** (hinged door only) — **↑ Front** or **↓ Back** controls which side of the wall the door opens to. Use this to make a door open into the room rather than out, or vice versa. Together with Swing, this gives you all four possible hinged-door orientations.

Every door also has a visible wooden **casing** (jambs + header) framing the doorway in 3D, including inner jamb lining that wraps the cut wall edges — so the opening reads as a real doorway from any angle, even when the panel is closed or open. Single and double doors have metal knobs at handle height; sliding doors get a chrome vertical pull bar near the leading edge.

If your edit would make the opening fall off the end of the wall or
overlap another opening already on it, the change is rejected and a toast
explains why.

### Deleting an opening

Right-click it, or select it and press **`Del`** / **`Backspace`**.

## Placing furniture

The left panel is a catalog grouped into five categories:

- **Seating** — Sofa, Armchair, Chair
- **Tables** — Coffee table, Dining table, Desk
- **Bedroom** — Bed
- **Storage** — Bookshelf, Wardrobe
- **Decor** — Rug, Lamp, TV

Each tile shows a small footprint preview (the rectangle's aspect ratio
matches the real-world footprint) and the real dimensions in metres.

To place a piece:

1. **Drag** a tile from the catalog onto the canvas.
2. While you're over the canvas, a **translucent preview** of the
   item's footprint follows the cursor at the correct real-world size
   (snapped to the grid). It shows exactly where a drop will commit.
3. **Release** anywhere on the canvas. The item lands at the preview's
   position and becomes selected automatically. The preview disappears.

If you drag back off the canvas (or press Esc / release outside any
drop target), the preview clears and nothing is placed.

### Moving furniture

**Click and drag** a piece on the canvas to move it.

### Snapping furniture to a wall

While dragging, if the item's centre comes within about 60 screen pixels
of a wall, it **snaps flush against that wall face** automatically —
position and rotation both update so the item sits squarely against it.
Release to confirm. This works for any floor-placed item (sofa, bookshelf,
bed, etc.); wall-mounted items (TV) use a separate wall-mount path.

### Choosing a furniture material

Select a piece, then use the **Material** picker in the right panel.
The picker is grouped by category:

- **Default** — restores the catalog's stock colour for that piece
- **Wood Finish** — 15 real wood tones (Walnut, Honey Oak, Cherry,
  Mahogany, Maple, Teak, Ebony, Driftwood, etc.)
- **Paint** — a curated subset of Benjamin Moore + Sherwin-Williams
  colours that look good on painted furniture (whites, neutrals,
  navy, hunter green, charcoal, etc.)
- **Fabric** — eight upholstery tones (Ivory, Cream Linen, Sage,
  Mustard, Rust, Deep Navy, Warm Gray, Charcoal)

Hover any swatch to see the full name and (for paints) the
manufacturer code. A search box appears at the top when a category
has more than 10 entries — type any part of a name or paint code
("hale", "SW 7036", "walnut") to filter.

The change applies in both the 2D footprint and the 3D box fallback.
Loaded 3D models keep their own authored materials — the override is
for the box stand-ins.

### Resizing furniture

Select a piece to reveal **four white corner handles** at the corners of its footprint. Drag any corner to resize the item symmetrically around its centre — both width and depth scale together from the centroid so the piece stays centred.

**Lock ratio** (the checkbox in the right panel under Dimensions, on by default) keeps the W/D proportions fixed while you drag. Uncheck it to resize width and depth independently. The same lock also applies to the W/D/H numeric inputs: when locked, typing a new width scales depth and height proportionally.

You can also type exact values directly in the **W**, **D**, **H** fields in the right panel — press Enter or click away to apply, Esc to cancel.

### Rotating furniture

Select the piece, then **drag the small blue rotation handle** that
appears on a short stick extending from the back of the footprint. The
piece rotates around its centre to follow your cursor.

Keyboard shortcuts still work and are best for precise angles:

- **`R`** — rotate clockwise by 15°.
- **`Shift+R`** — rotate counter-clockwise by 15°.

A small light tick on the "front" edge of the footprint shows which way
the piece is currently facing; the rotation handle sticks out from the
opposite (back) edge.

### Deleting furniture

Right-click the piece to delete it instantly. Or click it once to
select, then press **`Del`** / **`Backspace`**.

## Selecting and editing

**Left-click** any wall, furniture item, or room to select it. Selected
items are outlined in blue.

Once selected:

- The **right panel** shows the item's properties — for furniture: type,
  width, depth, height, rotation, position. For walls: an editable
  length and the start/end positions. For rooms: name input,
  floor-material picker, area, and vertex count.
- **`Del`** / **`Backspace`** deletes the selection (walls and
  furniture only — rooms aren't deletable directly; delete the walls
  to remove the room).
- **`Esc`** clears the selection.

### Selecting multiple items

You can select more than one item at a time in three ways:

- **Shift+click** an item to add it to the current selection. Shift+click
  an already-selected item to remove it without clearing the rest.
- **Drag on empty canvas** — when no wall chain is in progress, dragging
  on the background draws a blue marquee rectangle. Release the mouse to
  select everything whose centre (furniture, openings) or both endpoints
  (walls) fall inside the rectangle.
- **Ctrl/Cmd+A** — selects every visible item at once (walls, furniture,
  openings, underlay — only on layers that are currently shown).

With multiple items selected, the right panel shows shared editing controls
based on what's selected:

- **All furniture** — an **Align** section with six buttons (Left,
  Ctr·X, Right, Top, Ctr·Y, Bot) that snap all selected pieces to a
  shared edge or centre line, plus a shared Rotation control and a
  Material picker (both apply to all selected pieces).
- **All rooms** — shared **Floor material** and **Ceiling material** pickers
  that apply to every selected room at once. Swatches show no active
  selection when the rooms have different materials currently.
- **Mixed types** — count breakdown only (e.g. "2 walls, 1 furniture").

**`Del`** / **`Backspace`** removes all selected items at once.

Dragging any one selected furniture piece moves **all** selected
furniture by the same offset (walls and openings are not drag-moved in
multi-select).

### Editing a wall's dimensions

Once a wall is selected, the right panel shows three dimension inputs:

- **Length (m)** — type a new length and press **Enter** (or click away)
  to apply. The first endpoint stays fixed; the second moves to match.
  Minimum: 0.05 m.
- **Height (m)** — changes how tall this wall is in the 3D view (default
  2.4 m, range 0.5 – 6.0 m). Useful for half-walls, low partitions, or
  cathedral walls. Step: 0.1 m.
- **Thickness (m)** — changes the wall's depth in 3D (default 0.2 m,
  range 0.05 – 1.0 m). Step: 0.05 m.

Press **Esc** while typing any field to revert to the current value.

### Reshaping a room by dragging (corner & edge handles)

To resize or reshape a room without redrawing it, switch to **Select**
mode and click one of its walls. Drag handles appear on the canvas:

- **Corner circles** at the wall's two ends — drag a corner to move it.
  Every wall meeting at that corner moves with it, so the room reshapes
  and stays closed. (Moving one corner of a square turns it into a
  trapezoid.)
- **Edge square** at the wall's midpoint — drag it to slide the whole
  wall straight in or out. Both ends move together and the two adjoining
  walls stretch to stay attached — the quick way to make a balcony or
  room smaller while keeping its shape.

Dragged corners and edges snap to a 0.1 m grid. Doors, windows, and
wall-top railings on the affected walls follow the reshape automatically,
and the move counts as a single **Undo** step. (Handles only appear in
Select mode — in Draw mode, clicking a wall starts a new wall instead.)

### Wall materials

Below the length input, the right panel has a **Material** picker
grouped by category:

- **Default** — neutral gray (what walls start as)
- **Structural** — three materials that show a real texture in 3D:
  Brick (hand-laid offset courses), Stone (irregular ashlar blocks),
  Concrete (weathered cast finish)
- **Benjamin Moore** — ~30 popular colours (Hale Navy, Revere Pewter,
  White Dove, Chantilly Lace, Hawthorne Yellow, Caliente, etc.)
- **Sherwin-Williams** — ~30 popular colours (Agreeable Gray,
  Alabaster, Naval, Evergreen Fog, Urbane Bronze, Tricorn Black, etc.)
- **Other** — Wood Panel (visible grain texture in 3D)

Hover any swatch to see the full name and manufacturer code (e.g.
"Hale Navy · HC-154", "Agreeable Gray · SW 7029"). A search box at
the top filters by name or code — type "navy", "HC-154", or "SW 7029"
to narrow the list.

The wall changes colour in both the 2D plan and the 3D viewer.
Materials are per-wall — different walls in the same room can use
different finishes. They save with your design and survive a refresh.

If you open a project created before this release, walls that used
the old material names (`painted-white`, `brick`, `concrete`,
`wallpaper`) are automatically remapped to the closest paint colour
on load.

Only one thing is selected at a time. Clicking on empty canvas clears
the selection (and starts a new wall — see below).

## Room detection

When you draw a **closed loop** of walls (every endpoint connects to
the next), the area inside fills with a subtle **sky-blue tint** to
mark it as a room. You'll see this happen automatically the moment the
loop closes.

This works for any closed shape — rectangles, L-shapes, octagons,
anything that has no gaps. If you leave even a small gap, the room
won't be detected; close the gap (snap-to-endpoint helps) and the tint
will appear.

### Naming a room

**Click inside a detected room** (anywhere on the tinted floor area)
to select it. The right panel shows the room's editor:

- **Name** — type any name (e.g. "Living room", "Kitchen 2"). The name
  appears on the canvas at the room's centre.
- **Floor material** — pick from a grouped catalog: 15 **Wood
  Finish** options (Walnut, Honey Oak, Cherry, Mahogany, Maple, Teak,
  Ebony, etc.) and four **Other Materials** (Tile, Marble, Concrete,
  Carpet). Hover for the full name; the search box filters by name.
  The room's floor tint changes to match in both 2D and 3D.
- **Area** and **Vertices** — read-only stats about the room.

Room names and materials are saved automatically and survive page
refresh, just like walls and furniture.

### Removing a room's ceiling (e.g. a balcony)

With a room selected, the right panel has a **Ceiling** checkbox above the
ceiling-material picker. It's on by default. Uncheck it to remove that
room's ceiling entirely in 3D — useful for a balcony or an open courtyard.
The ceiling-material picker hides while the box is unchecked, and the
setting is saved with the project. (This is per-room, distinct from the
global **Ceilings** toggle in the 3D toolbar, which just hides all ceilings
at once without changing your rooms.)

### Ceiling material

With a room selected (and its **Ceiling** checkbox on), the right panel
shows a **Ceiling** picker below the floor material picker. Seven finishes
are available:

| Finish | Category |
|---|---|
| Painted White | Paint |
| Off White | Paint |
| Cream | Paint |
| Light Gray | Paint |
| Sky Blue | Paint |
| Exposed Concrete | Other |
| Wood Beam | Other |

The ceiling colour updates in the 3D view immediately. Rooms default to
Painted White.

To toggle ceilings on or off globally, use the **Ceilings** button in the
3D lighting toolbar (top-right of the 3D view). Turning ceilings off gives
you an open-top view so you can see all floors at once; it doesn't affect
the saved per-room ceiling material.

When stairs connect two levels, the ceiling on the lower level and the floor
on the upper level both show the matching opening — you can see through from
one floor to the next.

### Re-finding a renamed room

Each room is identified by the exact corner positions of its walls. If
you delete and redraw the same walls to the same coordinates, the
room's name and material come back. If you redraw them in slightly
different positions, the app treats it as a new room.

### Drawing inside a room

Clicking inside a room normally selects it. To draw a wall inside an
existing room (e.g. to subdivide it), click somewhere outside any
detected room to start the chain, then continue inside. Or use
snap-to-endpoint: click near an existing wall endpoint to start a chain
from there — that works inside a room because the endpoint is on the
room's boundary.

## Outdoor areas (rooms without walls)

For spaces that have a floor but no walls — a patio, deck, balcony, or
garden — use the **Area** tool (the third button in the top toolbar, next
to Select and Draw).

1. Click **Area** to enter area mode.
2. **Click each corner** of the space on the canvas. A lime outline grows
   as you go, and a translucent fill appears once you have at least three
   points.
3. **Close the shape** by clicking back on the first point (it highlights
   in cyan when you're close enough), or just press **Enter**. Press
   **Esc** to cancel a half-drawn area.

Like walls, each new side **locks to a 45° angle** from the previous point.
Hold **Shift** for 90°-only, or hold **Alt / Option** for a free angle.

As you draw, each side shows a floating **length in metres** (the segment
you're currently dragging out included), just like walls — so you can size
the area precisely.

The finished area shows as a floor patch in both 2D and 3D — no walls, no
ceiling. Switch to **Select** mode and click it to set its **name** and
**floor material** (the same wood/tile/marble/etc. catalog as rooms), or
to **delete** it (Delete key or the button in its properties). Areas live
on the active level and ride the **Rooms** layer toggle.

### Reshaping an area

Every side of an area always shows its **length in metres** on the canvas.
To change the shape, select the area in **Select** mode — the same handles
as walls appear:

- **Corner circles** at each vertex — drag a corner to move it.
- **Edge squares** at each side's midpoint — drag to slide that whole side
  in or out (great for nudging one edge to an exact length while watching
  its label).

Corners and edges snap to a 0.1 m grid, and each reshape is a single
**Undo** step.

## Pools

To add a pool, use the **Pool** tool (the fourth button in the top
toolbar). You draw it exactly like an outdoor area: **click out the
corners** of the pool, then click the first point — or press **Enter** —
to close it (**Esc** cancels). Each side shows its length in metres as you
go.

In 3D the pool becomes a **sunken basin cut into the ground**: the pool's
footprint is removed from the ground so the basin sits **below grade**, the
sides become tiled basin walls, a flat stone **coping** border rings the
rim, and a translucent blue **water surface** fills it near the top. In 2D
it shows as a water-blue patch.

Select a pool in **Select** mode to:

- set its **name**,
- set its **depth** with a slider (0.3–3 m — how far the water sits below
  ground),
- reshape it with the same **corner / edge handles** as areas and walls,
- or **delete** it.

Pools sit on the active level and ride the **Rooms** layer toggle. Build a
deck around one by drawing an outdoor **Area** next to it.

## Double-height spaces (the Void tool)

To make part of a room **double-height** — open all the way up to the next
floor — use the **Void** tool (the fifth toolbar button). On the lower
level, **click out the opening** where you want the space to rise (same
draw flow as areas/pools, with the same 45° / Shift / Alt angle snapping;
Enter to finish, Esc to cancel).

In 3D this **cuts a matching hole in the ceiling of the level you drew on
and in the floor of the level directly above**, so that part of the room
opens up into the level above — a high ceiling, atrium, or mezzanine
overlook. The rest of the room keeps its normal height.

Tip: the void cuts the **room directly above** it. So draw your upper
floor first, then mark the void on the lower floor where you want the
slab removed. Select a void to rename, reshape, or delete it. While
drawing a void (or an area/pool), points **snap to nearby wall corners and
wall lines**, so you can trace an opening exactly wall-to-wall.

## Seeing the floor below

When you're on an upper level, a staircase that **arrives from the level
below** shows on the canvas as a dashed footprint with tread lines and an
"↑ stairs" label — so you can see where the stairs land and place things
around the opening. (Detected rooms on the level below also show as faint
dashed outlines.)

## Floor-plan underlay

Have an existing floor plan as an image (a scanned blueprint, a real
estate listing, a photo of a hand-drawn sketch)? Bring it in as an
**underlay** and trace your walls over it.

### Uploading

Click **Upload underlay** in the top bar. Pick a PNG or JPG. The image
appears in the canvas at its natural pixel size, semi-transparent (40%
by default), with its top-left corner at the canvas origin.

### Positioning before calibration

Right after upload, the image is **unlocked**:

- You can **drag it** to move it around.
- The toolbar button changes to **Underlay** (not yet locked).
- Click the image to select it; the right panel shows its properties.

### Calibrating the scale

The image's pixels are not the same as canvas pixels — a 1000×1000 PNG
isn't 20 m × 20 m unless you say so. **Calibration** tells the app what
real-world distance is represented by a known span on the image.

1. Select the underlay (click it on the canvas, or click **Underlay** in
   the top bar).
2. In the right panel, click **Calibrate**.
3. The hint at the bottom-right of the canvas changes to "click first
   calibration point". Click any point on the image whose real-world
   location you know — e.g. the corner of a known doorway.
4. Click a second point a known distance away — e.g. the opposite
   corner of that doorway, or a printed scale bar's tick mark.
5. A small dialog appears: "Real distance (meters)". Type the distance
   (e.g. `0.9` for a 90 cm door). Press Enter or click **Apply**.
6. The image rescales so those two points end up exactly that many
   metres apart in the canvas. The first point stays where it was; the
   second moves to match the new scale.
7. The image **locks**. The toolbar button now shows **Underlay ·
   locked**.

Once locked, clicks on the image pass through to whatever's underneath
— so you can draw walls right over it without the image shifting.

### Re-calibrating

Made a mistake or measured the wrong span? Select the underlay, click
**Re-calibrate**, and repeat the two-click + distance flow. The image
unlocks during calibration and re-locks on apply.

### Opacity

While the underlay is selected, the right panel has an **Opacity**
slider. Lower it to see your walls more clearly; raise it to read
fine details on the image. The setting saves with the underlay.

### Removing

Select the underlay and click **Remove** in the right panel. The image
disappears immediately. To re-upload, click **Upload underlay** in the
top bar.

### AI: Trace floor plan

If you have an Anthropic API key saved in the AI panel, the underlay
properties panel shows an **AI: Trace floor plan** button. Clicking it
sends the uploaded image to Claude's vision API, which detects wall
segments and returns a proposal you can review in the AI panel.

1. Make sure the underlay is **calibrated** first — the trace uses the
   image's scale and origin to map Claude's pixel coordinates into your
   floor plan world.
2. Click **AI: Trace floor plan**. A "Tracing…" indicator appears while
   Claude processes the image (typically 5–20 seconds).
3. When done, the AI panel opens with a proposal showing the detected
   walls. Review the diff, then click **Apply** to commit them to the
   canvas, or **Discard** to cancel.
4. After applying, use **Ctrl/Cmd+Z** to undo if the result isn't right.

The trace finds wall centerlines only — furniture, text labels, and
dimension lines are ignored. Openings (doors, windows) are not traced
automatically; drop them manually after the walls are placed.

### Auto-save and underlays

Underlays save to your browser along with walls and furniture. Large
images are still **automatically downscaled** on upload to 2000 pixels on
the long side and re-encoded as JPEG at high quality (a small toast tells
you when this happens), which keeps them light — but your design is now
stored in IndexedDB rather than the old 5 MB localStorage box, so underlay
images and imported 3D models persist reliably without crowding out the
rest of the project.

## Layers panel

Near the bottom of the left sidebar, a collapsible **Layers** panel lets
you show or hide each class of content on the canvas.

Click the **Layers** heading to expand or collapse the panel. Inside,
six rows each have an eye icon that you can click to toggle:

| Layer | What it controls |
|---|---|
| **Walls** | All wall segments |
| **Furniture** | All placed furniture items |
| **Openings** | Doors and windows |
| **Rooms** | Detected room fills and labels |
| **Underlay** | The uploaded floor-plan image |
| **Grid** | The background dot grid |

Hidden items don't render and can't be clicked. If the item currently
selected becomes hidden, the selection is **not** cleared automatically
— re-show the layer to interact with it again.

Layer visibility is **saved automatically** and survives a page refresh
(like walls and furniture). It is **not** part of the undo/redo history —
toggling a layer on and off doesn't consume an undo step.

**Ctrl/Cmd+A** only selects items on layers that are currently visible.

## 3D viewer

Click the **3D** button in the top bar to switch into fullscreen 3D mode.
The 2D canvas is replaced by the 3D viewer — all panels (sidebar, properties)
stay visible. Click **← 2D** in the top bar to return to the 2D canvas.

- Walls show up as boxes that are 2.4 m tall.
- Furniture shows up as low-poly 3D models sized to the catalog
  dimensions — sofas with backrests and arms, chairs with legs, tables
  with leg sets, a bed with headboard, shelving with shelves, and so on.
  The first time you open 3D after placing furniture a small **loading
  models…** spinner appears in the bottom-right corner until all models
  have loaded. After that first load the models are cached for the
  session. The right panel's **Model** row shows `GLB loaded` when the
  3D model is active or `Box fallback` if a model failed to load.
- Each detected room shows up as a coloured **floor piece** matching
  its floor material (Wood, Tile, Carpet, etc.). Rooms with no material
  set yet use a neutral gray. Beyond the room boundaries, the dark
  ground plane stays visible.
- Change a room's floor material on the 2D side (right panel) and the
  3D floor updates instantly.

### Moving the 3D camera

- **Left-click and drag** — orbit around the scene.
- **Right-click and drag** — pan (slide the view sideways/up/down).
- **Mouse wheel** — zoom in and out.

Click **← 2D** in the top bar to return to the 2D canvas.

### Placing furniture directly in 3D

While in 3D mode you can drag furniture tiles straight from the sidebar
onto the 3D view — no need to switch back to 2D first.

1. **Drag** any furniture tile from the catalog and hold it over the 3D view.
2. A **translucent blue ghost** appears on the floor, snapped to a 0.5 m grid.
   Move your cursor to position it where you want.
3. **Drop** to place the piece. It is added to the current active level's
   floor plan and appears immediately in 3D.

The coordinates are automatically converted to 2D canvas coordinates, so the
piece shows up correctly when you switch back to 2D. If no floor plane is
found under the cursor (e.g. dragging over a wall or empty air), the ghost
disappears and nothing is placed.

### Placing doors and windows directly in 3D

Door and window tiles from the **Openings** group can also be dragged
straight onto the 3D view:

1. **Drag** a Door or Window tile from the sidebar and move it over the 3D view.
2. Hover over a wall — a **translucent blue slab** appears on the wall face at
   the cursor position to show where the opening will land.
3. **Drop** to place. The opening is cut into the wall exactly as if you had
   placed it in 2D. Width and sill-height default to catalog values and can be
   adjusted in the properties panel afterwards.

If you hover over empty space (no wall within cursor range) the ghost
disappears and a toast tells you to aim at a wall.

### Selection is bidirectional

Selection is synchronised between the 2D and 3D views:

- Selecting a **wall, furniture item, or room in 2D** makes the
  corresponding 3D mesh glow blue.
- **Click a mesh directly in the 3D view** to select it — the same
  blue highlight appears in 3D, and the right-panel editor updates as
  if you'd selected on the 2D side. Clicking empty 3D space clears the
  selection.

(Orbit drags don't trigger selection — only a still click does.)

> **Heads-up:** the first time you click **3D** in a fresh session, the
> 3D engine downloads in the background. You'll see "loading 3D…" for
> a moment, then the view appears.

## Lighting and time of day

### Placing lights

The **Lighting** category at the bottom of the left panel has four lamp types:

| Type | Description |
|---|---|
| **Ceiling lamp** | Warm omnidirectional PointLight, 8 m radius, mounts at ceiling height |
| **Floor lamp** | Warm omnidirectional PointLight, 5 m radius, floor-standing |
| **Table lamp** | Extra-warm omnidirectional PointLight, 3 m radius, floor-standing |
| **Pendant** | Warm downward SpotLight, 30° cone, 5 m radius, mounts at ceiling height |

Drag a tile onto the 2D canvas just like regular furniture. When you switch to 3D the lamp mesh and its light both appear at the correct height. Lights cast shadows by default.

### Lighting toolbar (3D pane)

When the 3D pane is open, a small **Lighting** panel appears in its top-right corner with four controls:

- **Lights ON / OFF** — master switch that silences all placed lights at once (their meshes remain visible).
- **Ceilings ON / OFF** — shows or hides all ceiling planes. Turn off for an open-top view when working on a multi-level project. Does not change saved ceiling materials.
- **Time of day** slider (00:00–24:00) — moves the sun across the sky from east to west. Colour changes from warm orange at dawn and dusk (~2500 K) to cool white at noon (~6500 K). The sun disappears below the horizon at night, leaving only ambient and placed lights.
- **Ambient %** slider (0–100 %) — controls the fill-light intensity so you can darken the whole scene for a dramatic night look or brighten it for a neutral review.

### Editing a placed light (Properties panel)

Click a lamp on the 2D canvas to select it. The right panel shows:

- **Power** — toggle the individual lamp on or off.
- **Intensity** (0–3) — brightness of the light itself (not the 3D mesh).
- **Color temp** (2000–6500 K) — warm orange candlelight at 2000 K, cool daylight white at 6500 K. A small swatch shows the approximate hue.
- **Radius (m)** (1–15 m) — how far the light falls off; larger radius illuminates a bigger area at lower intensity.
- **Shadow** — toggle per-lamp shadow casting. Shadows are expensive; turn them off on distant lamps if performance feels slow.

### Performance notes

- Up to **8 active lights** (on = true, master lights = on) are rendered in full. If you place more than 8, the extra ones are silenced and a warning toast appears. Turn some off via the Power toggle to re-enable others.
- Shadow resolution is 512 × 512 per placed light. The directional sun uses 2048 × 2048.

## Walkthrough mode

When the 3D pane is open, a **Walk** button appears in the top bar next to the **3D** button. Click it to enter first-person walkthrough mode — you'll see your room from eye level as if you were standing inside it.

### Entering walkthrough

1. Enable 3D with the **3D** button.
2. Click **Walk** (the button turns green).
3. Click anywhere in the 3D view to lock the mouse cursor.

A crosshair appears in the centre of the screen and the orbit-camera hint is replaced by the HUD:
> `WASD to move · Shift to run · Space to jump · Esc to exit`

### Moving around

| Control | Action |
|---|---|
| **W / ↑** | Walk forward |
| **S / ↓** | Walk backward |
| **A / ←** | Strafe left |
| **D / →** | Strafe right |
| **Shift** (hold) | Run (double speed) |
| **Space** | Jump |
| **Mouse** | Look around |

The camera stays at eye height (1.65 m). Gravity pulls you back to the floor after a jump. Wall collision stops you from walking through walls; if you press diagonally into a corner you'll slide along the face instead of sticking.

### Exiting walkthrough

Press **Esc** at any time. The cursor is released, the **Walk** button turns grey, and the orbit camera is restored. You can also click **Walk** again from the toolbar to toggle it off.

> **Note:** The lighting toolbar (time of day, ambient slider) is hidden while walkthrough is active. Exit walkthrough to adjust lighting, then re-enter.

## AI design assistant

Click **AI** in the top bar to open a chat panel on the right side (it
temporarily replaces the Properties panel). Click **AI** again, or the
**×** in the panel, to close it.

### Setting up

You'll need an **Anthropic API key**. Paste it into the input the first
time you open the panel.

> ⚠ **Dev-mode feature.** A browser-side app cannot keep an API key
> truly private. Any script on this page, any browser extension, or
> anyone with access to your dev tools can read it. The key is stored
> only in **sessionStorage** — it disappears when you close this tab,
> and it never goes into a project file or `localStorage`. Even so,
> use a key with strict spending limits.

You can clear the key any time from the same panel (**Clear key**).

### Using it

Two ways to start a conversation:

- **Analyze current design** — sends the whole project (walls,
  furniture, rooms with names + materials, whether an underlay is
  loaded — but **not** the underlay image bytes) to Claude with a
  request for concrete suggestions. Good for "what's missing?"
- **Free-form prompt** — type a question in the box at the bottom
  (e.g. "suggest a furniture layout for a small home office",
  "what would you swap to make this room feel less crowded?").
  **Enter** sends; **Shift+Enter** for a newline.

Responses stream in as text. A blinking cursor on the active reply
indicates Claude is still responding.

### Following up

The panel keeps a multi-turn conversation in memory. Each request
includes the full conversation so far **plus** the current design
state, so Claude sees both what you've discussed and what you've
edited since. Use **Clear conversation** to start over.

### Applying suggestions

When Claude proposes concrete changes, it returns a JSON block
representing the full intended state of your design. The app:

1. **Parses and validates** the JSON against the project schema. If
   it's malformed, you'll see "Can't apply — …" with the reason, and
   you can still **Copy** the raw block to use elsewhere.
2. **Diffs against your current design** and shows a **Preview
   changes** card above the input. The card lists, per slice:
   - **+N** in green — items to add
   - **~N** in amber — items to modify
   - **−N** in red — items to remove
3. **Highlights the diff on the 2D canvas**:
   - **Green** dashed strokes / footprints for additions
   - **Amber** strokes for modifications
   - **Red** dashed strokes for removals
4. **Apply** commits the changes in one step — pressing
   **Ctrl/Cmd+Z** afterwards reverts the entire AI change.
   **Discard** drops the preview, leaves the transcript and the
   canvas as they were.

Starting a new turn (sending another prompt) automatically discards
any preview that wasn't applied.

> The underlay (your uploaded floor-plan image) is intentionally
> outside the AI's scope. Apply never touches it.

### Limits

- Conversations don't persist. Close the tab → conversation gone.
- The model used is `claude-sonnet-4-20250514`. Cost is charged to
  your Anthropic account at that model's rates.
- The underlay's image bytes are never sent — Claude knows an
  underlay is loaded and whether it's locked, but not what it looks
  like.

## Copy and paste

Select one or more items (walls, furniture, openings), then:

- **Ctrl/Cmd+C** — copies the selection to a session clipboard. A toast
  confirms "Copied N item(s)". The clipboard resets each time you copy.
- **Ctrl/Cmd+V** — pastes a duplicate offset 50 px to the right and
  down from the originals. The paste becomes the new selection so you
  can immediately move it into place.

Notes:
- Walls paste with their openings. Openings that belonged to a wall not
  in the clipboard are skipped.
- The clipboard is session-only — it clears on page refresh.
- Each paste is a single undo step (Ctrl/Cmd+Z reverts the whole paste).

## Undo and redo

Made a mistake? Press **Ctrl/Cmd+Z** to undo. **Ctrl/Cmd+Shift+Z**
redoes. The small **↶** / **↷** buttons in the top bar (just to the
right of the app name) do the same thing, and grey out when there's
nothing to undo or redo.

History tracks changes to walls, furniture, rooms, and the underlay.
It does **not** track which item is selected, the 3D toggle, or your
camera position — those are just view state.

A few details:

- Continuous actions like dragging the rotation handle or typing into
  the room name field collapse into a single undo step (~300 ms of
  quiet ends the step).
- History is session-only. Reload the page and you start fresh, but the
  walls/furniture/etc. that were on screen before the reload come back
  from auto-save.
- The limit is 50 steps. Beyond that, the oldest entry drops off.

Pressing **Ctrl/Cmd+Z** while typing in a text field (room name, wall
length, calibration distance) does the normal text undo, not the
app-wide one.

## Saving, opening, and exporting

The top bar has three save/export buttons:

- **Open** — opens a `.studio.json` file you saved previously. If you
  have any current work, the app will ask you to confirm before
  replacing it. The file picker accepts only `.json` files.
- **Save** — downloads a `.studio.json` file containing the entire
  project (walls, furniture, room names + floor materials, underlay
  image). Filename is `interior-studio-{timestamp}.studio.json`.
- **Export PNG** — captures the current 2D canvas view as a PNG image
  at 2× resolution. Includes the dark backdrop, grid, walls, furniture,
  rooms, and the underlay if one is loaded. Filename is
  `interior-studio-{timestamp}.png`.
- **Export PDF** — exports the floor plan as an A4 landscape PDF. The
  image fills the page with a 10 mm margin. A **scale bar** at the
  bottom left shows how many millimetres on the page equal 1 metre in
  the real world (based on the current zoom level). The date is printed
  in the footer. jsPDF loads on-demand the first time you click this
  button.

`.studio.json` files are versioned for future compatibility. The
current format is version 1; if you open a file from a newer version
than the app can read, you'll get a clear error.

> **Tip:** PNG export captures the current view. Pan and zoom to frame
> the area you want before clicking Export PNG; the export uses
> whatever's visible (including a selection highlight if you have
> something selected — clear with Esc first for a clean shot).

## Auto-save

Everything you draw is **saved automatically** to your browser's local
storage. Close the tab, come back tomorrow, and your walls and
furniture will still be there.

What's saved:

- All walls
- All furniture (including position and rotation)
- All room names and floor materials
- The floor-plan underlay (image + calibration + opacity), if any

What's **not** saved (resets every session):

- Selection
- Whether the 3D view was open
- Pan/zoom position on the canvas

If you want a truly clean slate, clear the site's storage in your
browser's developer tools (we don't yet expose a "reset" button).

## Working with multiple levels

Interior Studio supports multi-storey buildings. By default every project
starts with a single **Ground Floor**. The **Levels** panel sits at the
**top of the left sidebar** (above the furniture catalog) so it's always
easy to find. If you only have one floor, the panel shows a hint: "Single
floor · press + to add a level".

### Managing levels

- **Add a floor** — click the **+** button in the Levels panel header.
  A new floor is added above the highest existing level with a default
  ceiling height of 2.7 m.
- **Activate a floor** — click any level row to make it active (highlighted
  in blue). All 2D drawing and placement goes to the active level. The
  canvas shows only items on the active level.
- **Rename a floor** — double-click the level's name, type the new name,
  press **Enter** (or click elsewhere).
- **Change ceiling height** — edit the number in the **m** column. The
  height is the floor-to-ceiling distance for that level; the 3D viewer
  stacks each level directly above the one below.
- **Remove a floor** — click the **×** button on the right of the row.
  You can't delete the last remaining level. Removing the active level
  automatically switches to the nearest remaining one.

### Stairs

Drag **Stairs** from the **Architecture** category in the sidebar onto
the canvas. Stairs are placed like furniture and display as a stepped
block in both 2D and 3D. They are automatically linked to the active
level (`fromLevel`) and the next level up (`toLevel`).

When a stair item is placed on level N, the 3D viewer automatically cuts
a matching opening (the stair's footprint) out of the floor mesh of level
N+1 — the level the stairs arrive at. The hole updates live as you move,
resize, or rotate the stair piece. If the stair's center falls outside
any detected room on the upper level the floor there is solid — move the
stairs so their center is clearly inside a room polygon.

### Railings (on top of a wall)

Railings live in the **Architecture** category (Wood, Metal, Cable, and
Glass). To make a balcony, lower a wall's height in its properties (e.g.
to 1 m), then **drag a railing onto that wall** — it snaps onto the **top**
of the wall and **spans the whole wall**, centered on it, with its base at
the wall's height. This works in both the 2D plan and the 3D view.

A wall-mounted railing is **attached to its wall**: move, resize, or
re-height the wall and the railing follows automatically. Because of that
it isn't free-dragged on the 2D canvas — reposition it by editing the wall
(or delete it and drop a new one). Deleting the wall removes its railing.

Dropping a railing away from any wall still places it as a free-standing
piece on the floor, which you can move and rotate like normal furniture.

### 3D multi-level view

When the 3D viewer is open, all levels are stacked at their correct
heights. Two toggles in the 3D toolbar (top-right) control what you see:

- **Solo** — show only the active level (everything else is hidden). Use
  this to inspect a single floor without clutter from other levels.
- **X-Ray** — levels *above* the active level become 30% transparent,
  letting you see the active floor through the ceilings above. Levels
  below remain fully opaque.

Both toggles are session preferences and are not saved with the project.

### Saving and loading multi-level projects

Multi-level projects save and load normally (`.studio.json` version 2).
Projects created before multi-level was introduced load without any extra
steps — all existing items are automatically assigned to the Ground Floor.

## Pan and zoom (2D)

- **Mouse wheel** — zoom in and out around the cursor.
- **Hold `Space` + drag** — pan the canvas.
- **Middle-mouse drag** — also pans.

The bottom-left of the canvas shows the current zoom percentage and
your cursor position in metres.

## Keyboard shortcuts

| Key | What it does |
|---|---|
| `D` | Toggle between the 2D plan and the 3D view |
| `Esc` | End the current wall chain / clear selection |
| `Del` or `Backspace` | Delete the selected item(s) |
| `R` | Rotate selected furniture clockwise 15° |
| `Shift+R` | Rotate selected furniture counter-clockwise 15° |
| `Ctrl/Cmd+A` | Select all visible items |
| `Ctrl/Cmd+C` | Copy selected items |
| `Ctrl/Cmd+V` | Paste copied items (offset +50 px) |
| `Ctrl/Cmd+Z` | Undo last change |
| `Ctrl/Cmd+Shift+Z` | Redo |
| `Space` (hold) + drag | Pan the canvas |
| Mouse wheel | Zoom 2D (or zoom 3D camera, when hovering the 3D view) |
| Middle-mouse drag | Pan the canvas |
| Left-click (empty canvas) | Start / extend a wall chain (snaps to 45°) |
| `Shift` (hold, while drawing) | Lock wall to 90° only |
| `Alt` (hold, while drawing) | Free angle — no snap |
| Left-click (item) | Select item |
| `Shift`+click (item) | Add/remove item from multi-selection |
| Drag on empty canvas | Draw marquee rectangle to select items inside |
| Left-click + drag (item) | Move item (moves all selected furniture if multiple are selected) |
| Right-click (item) | Delete item |
| Right-click (empty canvas, while drawing) | Cancel the chain |
| **3D** button (toolbar) | Switch to fullscreen 3D view |
| **← 2D** button (toolbar) | Return to 2D canvas from 3D |
| 3D view: left-drag | Orbit camera |
| 3D view: right-drag | Pan camera |
| Walk button (toolbar, 3D only) | Toggle first-person walkthrough mode |
| `W/A/S/D` or arrow keys (walkthrough) | Move forward/left/back/right |
| `Shift` (walkthrough) | Run |
| `Space` (walkthrough) | Jump |
| `Esc` (walkthrough) | Exit walkthrough, release cursor |

## Frequently asked

**Why didn't a room fill in when I closed it?**
Your walls probably don't quite meet. Watch for the cyan marker — if
it didn't appear when you placed the last endpoint, the wall isn't
locked to the existing geometry. Delete the last wall and redraw it,
making sure the marker shows before you click.

**Why is the 3D view blank for a second?**
First-time download. After the first click, switching between 2D and 3D
is instant.

**Can I undo a mistake?**
Yes — press **Ctrl/Cmd+Z** to undo (up to 50 steps). **Ctrl/Cmd+Shift+Z**
redoes. The **↶** / **↷** buttons in the top bar do the same thing.

**Can I export to a real CAD file or to PDF?**
Not yet. Export to PNG / PDF / `.studio.json` round-trip is planned.

**Can I work on a phone or tablet?**
The app is built for desktop. Touch input isn't supported yet.

---

## For developers

The project has a Vitest test suite for the store + pure utilities (the
visual canvas + 3D rendering still need component tests; see Up Next in
`CONTEXT.md`).

| Command | What it does |
|---|---|
| `npm test` | Run the full suite once and exit. CI-friendly. |
| `npm run test:watch` | Re-run tests on file change. Best while writing. |
| `npm run test:ui` | Open Vitest's browser UI for interactive runs. |
| `npm run build` | Production build — must pass before declaring work done (per `debugging-discipline` skill). |

Tests live next to source files as `*.test.js` / `*.test.jsx`. Shared
setup (jsdom storage stub, `@testing-library/jest-dom` matchers) is in
`src/test/setup.js`.
