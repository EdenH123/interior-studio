// Toggles the 2D selection's emissive-blue highlight on the matching 3D
// object. Walks every kept mesh-map; any entry whose kind+id appears in the
// current selection gets emissive set on every descendant material; every
// other entry gets it cleared.
//
// Why traverse: furniture entries are Groups (so the GLB upgrade can swap
// children in-place); walls and rooms are plain Meshes. `obj.traverse`
// works for both — a leaf Mesh calls the callback once with itself; a
// Group visits its subtree.

const SELECTION_EMISSIVE = 0x3b82f6
const SELECTION_INTENSITY = 0.55

export function applySelectionHighlight(wallMeshes, furnMeshes, roomMeshes, selection) {
  const items = selection?.items ?? []
  const isItemSelected = (kind, id) =>
    items.some((i) => i.kind === kind && i.id === id)

  for (const [map, kind] of [
    [wallMeshes, 'wall'],
    [furnMeshes, 'furniture'],
    [roomMeshes, 'room'],
  ]) {
    for (const [id, obj] of map) {
      const on = isItemSelected(kind, id)
      // Stamped so async GLB upgrades (reconcileFurniture.populateLoadedModel)
      // can re-apply the highlight to a freshly-swapped child without needing
      // access to the live selection.
      obj.userData.highlighted = on
      setObjectEmissive(obj, on)
    }
  }
}

export function setObjectEmissive(obj, on) {
  obj.traverse((node) => {
    const mat = node.material
    if (!mat) return
    if (Array.isArray(mat)) mat.forEach((m) => setMaterialEmissive(m, on))
    else setMaterialEmissive(mat, on)
  })
}

function setMaterialEmissive(material, on) {
  if (!material.emissive) return
  if (on) {
    material.emissive.setHex(SELECTION_EMISSIVE)
    material.emissiveIntensity = SELECTION_INTENSITY
  } else {
    material.emissive.setHex(0x000000)
    material.emissiveIntensity = 0
  }
}
