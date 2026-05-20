# Claude — Interior Studio Instructions

_Last updated: 2026-05-20_  <!-- doors and windows on walls -->

This file is the entry point for any session in this project. Read it first,
then follow its links.

## Read these at session start, in this order

1. **[`CONTEXT.md`](./CONTEXT.md)** — current state of the project. What's
   done, what's in progress, what's next, conventions, known issues.
2. **[`SPEC.md`](./SPEC.md)** — the product. What we're building, who it's
   for, planned features, user flows.
3. **[`AGENT.md`](./AGENT.md)** — autonomy rules. What you may do without
   asking, what requires confirmation, what's off-limits.
4. **`.claude/skills/`** — nine project skills. You don't need to read every
   `SKILL.md` linearly, but you must be *aware they exist* and consult the
   relevant one before acting in its domain. List the directory at session
   start to confirm the full set.

After reading those, perform the **start ritual** from
`session-ritual/SKILL.md`: run `npm run build` inside `interior-studio/`,
then report current state (last completed, in-progress, top "Up Next" items,
build status, any blockers) before doing the user's task.

## Auto-update CONTEXT.md

Per `.claude/skills/auto-context/SKILL.md`: any response that creates,
modifies, or deletes files must update CONTEXT.md at the end. Add new files
to the folder tree, move items between Done / In Progress / Up Next, log new
conventions and known issues. Never delete history — only add and move.

## The skill set

Consult these in their respective domains. Each is in `.claude/skills/<name>/`.

| Skill | When it applies |
|---|---|
| `auto-context` | Any session start; after any file change |
| `debugging-discipline` | Build errors, runtime crashes, broken dev server, mid-feature breakage |
| `git-flow` | End of any session that touched files — commits, decides direct-to-main vs PR, pushes |
| `konva-canvas` | Anything in `src/components/CanvasArea.jsx`, `src/components/canvas/*`, or the 2D floor plan |
| `react-style` | Any `.jsx`/`.tsx` you write or edit |
| `session-ritual` | Session start and session end |
| `systematic-debugging` | Non-trivial bugs — use its 4-phase methodology before proposing fixes |
| `three-scene` | Any code touching Three.js / the 3D viewer |
| `uxui-designer` | When you're designing layouts, wireframes, interactions, component specs |
| `verification-before-completion` | Before claiming anything is done, fixed, or passing |

## Stack rules (short form)

Authoritative details live in the named skills; this is a recall card.

- **Framework:** React + Vite. No Next.js.
- **State:** Zustand for shared (`src/store/useStore.js`), `useState` for
  local. Narrow selectors. No React Context for app state. (`react-style`)
- **2D canvas:** Konva via `react-konva`. 50 px = 1 m, snap to 90°, grid
  50/250 px, walls 10 px + 12 px hit padding, selection `#3b82f6`, world
  bounds ±5000. (`konva-canvas`)
- **3D viewer:** Three.js. All scene logic in `src/hooks/useThree.js`,
  instantiated once. One-way sync from store → scene via `useEffect`.
  GLB models with BoxGeometry fallback. PerspectiveCamera fov 60.
  1 Konva px = 0.02 Three.js units. (`three-scene`)
- **Styling:** Tailwind v4 only. No inline `style` except for genuinely
  dynamic values (drag transforms, cursors). No CSS modules or
  styled-components. (`react-style`)
- **Components:** Functional only. PascalCase files, camelCase `use*` hooks,
  destructured props, ~150-line cap, extract logic ≥20 lines into custom
  hooks. (`react-style`)
- **IDs:** `nanoid/non-secure` (6 chars). Client-only, no auth concerns.
- **Build:** `npm run build` (from inside `interior-studio/`) is the
  source of truth. Always green before declaring done.
  (`debugging-discipline`, `verification-before-completion`)

## Autonomy

See [`AGENT.md`](./AGENT.md) for the full rules. Summary:

- **Act freely** on read-only exploration, small bugfixes, additions that
  follow established patterns, builds/tests.
- **Ask first** before deleting files, restructuring folders, refactoring
  across unrelated files, or making destructive git operations.
- **Never without explicit approval** switch core libraries (Konva, Three,
  Zustand, Vite, Tailwind), add a backend, change the build tool, or send
  data to third-party services.

## End-of-session ritual

When the user signals end-of-session (or a natural break point):

1. `npm run build` — confirm green.
2. Make sure CONTEXT.md reflects everything that landed.
3. Summarise in chat: **Completed this session**, **Up next**, **Build
   status**, **Open questions**.

See `.claude/skills/session-ritual/SKILL.md` for the full version.
