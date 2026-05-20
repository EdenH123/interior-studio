---
name: konva-canvas
description: Interior Studio's 2D Konva floor-plan canvas rules — 50 px = 1 meter, walls snap to 90°, grid is 50 px minor and 250 px major, walls render at 10 px stroke with 12 px hit padding, selected elements highlight in #3b82f6, dimension labels stay visible while drawing, world bounds are -5000 to +5000 (100 m × 100 m). Use whenever writing, editing, or reviewing anything in src/components/CanvasArea.jsx or src/components/canvas/*, or any code touching the 2D floor-plan Konva stage. Trigger when the user mentions the canvas, floor plan, walls, drawing, snapping, the grid, zoom/pan in 2D, or dimensions — even if they don't say "Konva" explicitly. Apply proactively when building canvas features for the first time.
---

# Interior Studio 2D Konva Canvas Rules

These constants and behaviors define how the 2D floor plan looks and feels. The
canvas is the part of the app users spend the most time in, so its calibration
matters. Treat the numbers below as the source of truth — if a feature needs a
different value, justify it and put it next to these in
`src/components/canvas/constants.js` so future sessions can find it.

## The constants

| Constant | Value | Lives in |
|---|---|---|
| `PIXELS_PER_METER` | `50` | `src/components/canvas/constants.js` |
| `GRID_SIZE` (minor) | `50` (px) | same |
| Major grid spacing | `250` (px, every 5th minor) | `Grid.jsx` |
| `WALL_THICKNESS` | `10` (px) | `constants.js` |
| Wall hit-stroke padding | `12` (px) | `Wall.jsx` |
| Selection highlight | `#3b82f6` | `Wall.jsx`, `DimensionLabel.jsx` |
| `WORLD_HALF` | `5000` (px, world spans -5000…+5000) | `constants.js` |

When introducing a new value that any other canvas code might read, put it in
`constants.js` rather than hardcoding at the call site.

## Behaviour rules

### 1. 50 px = 1 meter
All world coordinates are pixels. Convert to display units (meters) only at
render time via `formatMeters()`. Don't store meters anywhere; the unit
conversion is one-way at the edges of the system.

### 2. Walls snap to 90°
Use `snapTo90(start, end)`. Snap rotates around the start point and preserves
the cursor's distance — so the user gets either a perfectly horizontal or
perfectly vertical wall, the length they aimed for. Never round-then-snap
(rounding first eats the length).

### 3. Grid: 50 px minor, 250 px major
Every 5th grid line is "major" and renders heavier (`strokeWidth 1` vs `0.5`).
The axes (x = 0 and y = 0) render heaviest (`strokeWidth 1.5`) so origin is
always visible. Render the whole world inside `Grid.jsx`; don't try to clip to
the viewport — Konva handles that fine and clipping logic adds bugs.

### 4. Wall thickness 10 px, hit-stroke 12 px
Walls render at `strokeWidth = WALL_THICKNESS` (10 px). Hit area is wider —
`hitStrokeWidth = WALL_THICKNESS + 12` — so right-click delete is forgiving and
near-misses still count. Always set `hitStrokeWidth` explicitly; the default
matches `strokeWidth` and feels too precise.

### 5. Selected elements highlight in #3b82f6
Any selected wall, furniture item, or preview-while-drawing uses
`#3b82f6` (Tailwind `blue-500`). Don't introduce other selection blues; if you
need a *secondary* state (hover, multi-select), pick a clearly different hue
rather than shading this one.

### 6. Dimension labels are visible while drawing
While the user is mid-draw (`drawStart` set + cursor moving), render a
`DimensionLabel` at the midpoint of the preview wall showing length in meters.
Offset it perpendicular to the wall so it doesn't sit on the line. The label
should always be readable — counter-scale font and padding by `1 / view.scale`
so it stays a constant pixel size as the user zooms.

### 7. World bounds -5000 to +5000
The grid and any "infinite plane" geometry render within ±`WORLD_HALF`. That's
100 m on each axis — large enough to model any reasonable building. Don't
chase truly infinite canvas semantics; the bounded world keeps the grid
component cheap and lets Konva culling work.

## Why these numbers

- **50 px/m** is fine-grained enough to draw small features (door widths) and
  coarse enough that a typical room fits comfortably on screen at default
  zoom. 10 px/m felt cramped, 100 px/m felt sluggish to pan around.
- **250 px major spacing** = 5 m, a useful "room" reference at a glance.
- **10 px walls + 12 px hit padding** balances visual weight (walls should
  read as walls, not lines) against clickability.
- **#3b82f6** is Tailwind's `blue-500` — picks up cleanly on the dark canvas
  background and is the same blue the rest of the UI uses for primary actions.
- **Bounded world (10000 × 10000)** keeps the Grid layer at ~400 lines, which
  Konva renders trivially. Going unbounded means writing viewport-aware grid
  logic.

## Where to look

- Constants and helpers: `src/components/canvas/constants.js`
- Grid: `src/components/canvas/Grid.jsx`
- Walls: `src/components/canvas/Wall.jsx`
- Dimension labels: `src/components/canvas/DimensionLabel.jsx`
- Stage host, zoom/pan, draw flow: `src/components/CanvasArea.jsx`
