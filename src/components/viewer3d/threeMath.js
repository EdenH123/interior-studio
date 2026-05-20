// Konva ↔ Three.js coordinate conversion.
//
// Konva world coords are in pixels with PIXELS_PER_METER = 50, so:
//   1 Konva px = 1/50 m = 0.02 Three.js units (1 unit = 1 m).
//
// Mapping: Konva (x, y) → Three (x, 0, y). Konva's y-axis runs "down on
// screen"; we treat it as the floor's "depth" (Three +Z). Three +Y is up.
//
// Rotation: Konva top-down rotation is degrees, positive = clockwise (when
// looking down at the floor from above). Three Y-axis rotation is radians,
// positive = counter-clockwise from a +Y vantage. So Three.y = -Konva (rad).

export const KONVA_TO_THREE = 0.02

export function konvaToFloor(x, y) {
  return { x: x * KONVA_TO_THREE, z: y * KONVA_TO_THREE }
}

export function konvaRotationToThreeY(degrees) {
  return (-degrees * Math.PI) / 180
}
