// Module-level singleton so Toolbar can trigger a GLB export without
// prop-threading through App.jsx. useThree registers the export function
// once the scene is ready; callers null-check before invoking.

let _exportFn = null

export function registerSceneExport(fn) { _exportFn = fn }
export function getSceneExport() { return _exportFn }
