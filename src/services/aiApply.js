// Validation + diff helpers for the AI "Apply to project" flow.
//
// Contract with Claude (enforced by the system prompt in aiPrompts.js):
// when the model wants to propose changes, it returns a single ```json
// fenced block containing the COMPLETE intended state of `walls`,
// `furniture`, and `roomMeta`. Existing items the user should keep are
// included verbatim with their current ids; omissions are interpreted as
// deletions; new items use newly-minted ids.
//
// The underlay is intentionally outside this scope — Claude doesn't see
// its bytes and shouldn't author it. Apply preserves the live underlay.

// Returns { ok: true, data } when the parsed JSON matches the project
// schema, or { ok: false, error } with a one-line user-readable message.
export function validateProposedProject(raw) {
  if (!raw || typeof raw !== 'object') return fail('Top level is not an object.')
  if (!Array.isArray(raw.walls)) return fail('Missing `walls` array.')
  if (!Array.isArray(raw.furniture)) return fail('Missing `furniture` array.')
  if (!raw.roomMeta || typeof raw.roomMeta !== 'object' || Array.isArray(raw.roomMeta)) {
    return fail('Missing `roomMeta` object.')
  }
  // `openings` was added in v2; older proposals (and Claude messages from
  // before this prompt update) may omit it. Treat missing as empty.
  const openings = raw.openings ?? []
  if (!Array.isArray(openings)) return fail('`openings` must be an array.')

  for (const w of raw.walls) {
    if (typeof w?.id !== 'string') return fail('Wall is missing a string `id`.')
    if (!['x1', 'y1', 'x2', 'y2'].every((k) => Number.isFinite(w[k]))) {
      return fail(`Wall ${w.id} has invalid numeric coords.`)
    }
  }
  for (const f of raw.furniture) {
    if (typeof f?.id !== 'string') return fail('Furniture item is missing a string `id`.')
    if (typeof f?.type !== 'string') return fail(`Furniture ${f.id} is missing a string \`type\`.`)
    if (!['x', 'y', 'rotation', 'width', 'depth', 'height'].every((k) => Number.isFinite(f[k]))) {
      return fail(`Furniture ${f.id} has invalid numeric fields.`)
    }
  }
  const wallIds = new Set(raw.walls.map((w) => w.id))
  for (const o of openings) {
    if (typeof o?.id !== 'string') return fail('Opening is missing a string `id`.')
    if (o.type !== 'door' && o.type !== 'window') return fail(`Opening ${o.id} has invalid type "${o.type}".`)
    if (typeof o.wallId !== 'string' || !wallIds.has(o.wallId)) {
      return fail(`Opening ${o.id} references unknown wall "${o.wallId}".`)
    }
    if (!Number.isFinite(o.position) || o.position < 0 || o.position > 1) {
      return fail(`Opening ${o.id} has invalid \`position\` (must be 0..1).`)
    }
    if (!Number.isFinite(o.width) || o.width <= 0) return fail(`Opening ${o.id} has invalid \`width\`.`)
    if (!Number.isFinite(o.height) || o.height <= 0) return fail(`Opening ${o.id} has invalid \`height\`.`)
    if (o.type === 'window' && o.sillHeight != null && !Number.isFinite(o.sillHeight)) {
      return fail(`Opening ${o.id} has invalid \`sillHeight\`.`)
    }
  }

  return { ok: true, data: { walls: raw.walls, openings, furniture: raw.furniture, roomMeta: raw.roomMeta } }
}

function fail(error) { return { ok: false, error } }

// Computes add / modify / remove sets for walls, furniture, and roomMeta.
// Identity is by `id` for walls + furniture; by key for roomMeta. Field
// comparison is shallow per the equality functions below — anything that
// would render differently triggers a "modified" entry.
export function diffProject(current, proposed) {
  return {
    walls: diffById(current.walls, proposed.walls, wallEqual),
    openings: diffById(current.openings ?? [], proposed.openings ?? [], openingEqual),
    furniture: diffById(current.furniture, proposed.furniture, furnitureEqual),
    roomMeta: diffByKey(current.roomMeta, proposed.roomMeta, roomMetaEqual),
  }
}

function diffById(curr, prop, eq) {
  const currMap = new Map(curr.map((x) => [x.id, x]))
  const propMap = new Map(prop.map((x) => [x.id, x]))
  const added = prop.filter((x) => !currMap.has(x.id))
  const removed = curr.filter((x) => !propMap.has(x.id))
  const modified = prop.filter((x) => currMap.has(x.id) && !eq(currMap.get(x.id), x))
  return { added, removed, modified }
}

function diffByKey(curr, prop, eq) {
  const added = []
  const removed = []
  const modified = []
  for (const [k, v] of Object.entries(prop)) {
    if (!(k in curr)) added.push({ id: k, ...v })
    else if (!eq(curr[k], v)) modified.push({ id: k, ...v })
  }
  for (const k of Object.keys(curr)) {
    if (!(k in prop)) removed.push({ id: k, ...curr[k] })
  }
  return { added, removed, modified }
}

function wallEqual(a, b) {
  return a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2
    && (a.material ?? null) === (b.material ?? null)
}

function openingEqual(a, b) {
  return a.type === b.type && a.wallId === b.wallId
    && a.position === b.position
    && a.width === b.width && a.height === b.height
    && (a.sillHeight ?? 0) === (b.sillHeight ?? 0)
}

function furnitureEqual(a, b) {
  return a.type === b.type && a.x === b.x && a.y === b.y && a.rotation === b.rotation
    && a.width === b.width && a.depth === b.depth && a.height === b.height
    && a.color === b.color
    && (a.material ?? null) === (b.material ?? null)
    && (a.model ?? null) === (b.model ?? null)
}

function roomMetaEqual(a, b) {
  return (a?.name ?? null) === (b?.name ?? null)
    && (a?.floorMaterial ?? null) === (b?.floorMaterial ?? null)
}

export function diffIsEmpty(diff) {
  return ['walls', 'openings', 'furniture', 'roomMeta'].every(
    (k) => diff[k].added.length === 0 && diff[k].removed.length === 0 && diff[k].modified.length === 0,
  )
}

export function totalChangeCount(diff) {
  let n = 0
  for (const k of ['walls', 'openings', 'furniture', 'roomMeta']) {
    n += diff[k].added.length + diff[k].removed.length + diff[k].modified.length
  }
  return n
}
