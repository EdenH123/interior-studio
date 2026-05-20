---
name: react-style
description: Enforces Interior Studio's React code style — functional components only, Zustand for shared state, custom hooks for logic over 20 lines, PascalCase components, camelCase hooks, Tailwind only (no inline styles or CSS files), components under 150 lines, props always destructured. Use whenever writing, editing, refactoring, or reviewing React (.jsx/.tsx) code in this project, whenever creating new components or hooks, whenever adding state, whenever the user asks you to "build a component", "add a feature to the UI", "style this", or otherwise touches the frontend — even if they don't mention style or conventions explicitly. Apply proactively as you write code, not only when asked to clean up afterward.
---

# Interior Studio React Style

This project has a small, opinionated set of React rules. Their job is to keep
the codebase predictable so that any session can drop in, edit a file, and know
exactly where things live and how they're shaped. Apply these rules while
writing code, not as a cleanup pass — the cost of getting it right the first
time is zero, the cost of refactoring later is real.

If you find existing code that violates a rule **inside a file you're already
editing for another reason**, fix it. Don't go on unrelated cleanup sweeps in
files you weren't asked to touch.

## The rules

### 1. Functional components only
No class components. No `React.Component`, no lifecycle methods, no `this`.
Hooks cover every case we need. If you're tempted to reach for a class for
"complex state", that's a signal to extract a custom hook (see rule 3) or move
the state into Zustand (see rule 2).

### 2. Zustand for shared state
Anything that is read or written by more than one component goes in the Zustand
store at `src/store/useStore.js`. Local-only UI state (a hover flag, a form
input that isn't persisted, an animation tick) stays in `useState`.

Do not introduce React Context for app state, and do not prop-drill more than
two levels — if a value is being passed through an intermediate component that
doesn't use it, lift it into the store instead.

Select narrowly so renders stay tight:

```jsx
// good — only re-renders when walls change
const walls = useStore((s) => s.walls)

// bad — re-renders on any store change
const { walls } = useStore()
```

**Persistence.** When the store needs to survive a reload (planned for floor
plans), wrap the creator in Zustand's `persist` middleware rather than rolling
your own `localStorage` glue:

```js
import { persist } from 'zustand/middleware'

const useStore = create(persist(
  (set) => ({ /* state + actions */ }),
  { name: 'interior-studio' },
))
```

Pick a stable `name` and version it (`version: 1`) so future schema changes
have a migration hook.

### 3. Custom hooks for logic over ~20 lines
If a block of hook-driven logic inside a component (effects, refs, derived
state, event subscriptions) is creeping past ~20 lines, lift it into a custom
hook in `src/hooks/`. The component should end up reading like a description of
what it renders, not a description of how it computes things.

Twenty lines is a guideline, not a tripwire. The real test is: would a reader
understand the component faster if this block had a name? If yes, extract.

### 4. PascalCase components, camelCase hooks
- Components: `PascalCase` for both the file name and the exported symbol.
  `CanvasArea.jsx` exports `CanvasArea`.
- Hooks: `camelCase` starting with `use`. `useElementSize.js` exports
  `useElementSize`.
- Plain utility modules: `camelCase` file, named exports.

One default export per component file. Named exports for hooks and utilities.

### 5. Tailwind only — no inline styles, no CSS files
Style with Tailwind utility classes. Don't introduce `style={{ ... }}`, CSS
modules, styled-components, or per-component `.css` files. The only `.css` file
in the project is `src/index.css`, which only imports Tailwind and resets the
root layout.

Narrow exception: dynamic values that genuinely can't be expressed as utilities
(e.g., a `transform: translate(${x}px, ${y}px)` driven by user drag, or a
`cursor` that depends on multiple state flags). Use `style` only for the
specific dynamic property; keep everything else in `className`.

### 6. Components under 150 lines
If a component file pushes past ~150 lines, split it. Usual axes to split on:

- Pull subtrees into sibling components (one file per visual region).
- Pull logic into a custom hook (see rule 3).
- Pull constants/helpers into a sibling module.

This isn't about line-counting purity — it's about keeping each file small
enough to hold in your head at once. If a 160-line component is genuinely one
coherent thing, that's fine; if it's three things stapled together, split it.

### 7. Always destructure props
Destructure in the parameter list, not in the body. Don't accept a `props`
object and reach into it.

```jsx
// good
export default function Wall({ wall, onContextMenu, selected }) { ... }

// bad
export default function Wall(props) {
  return <Line points={[props.wall.x1, ...]} />
}
```

This makes the component's interface readable at a glance — its public surface
is the parameter list, no scrolling required.

## How to apply this skill

When writing new code:

- Decide up front where state lives (local `useState` vs. Zustand) before you
  start typing.
- Name files correctly the first time — renaming later is friction.
- If a component is heading past ~100 lines while you're still writing, pause
  and ask whether something wants to be extracted now rather than after.

When editing existing code:

- Fix violations in the file you're already touching.
- Leave unrelated files alone unless the user asked for a broader cleanup.

When reviewing:

- Call out violations explicitly with the rule number so the reasoning is
  traceable, e.g. "Rule 5: drop the inline `style` and move the `bg` to a
  Tailwind class."

## Why these rules

Each rule exists to remove a class of decision-fatigue or a class of bug:

- **Functional + hooks** removes the "class or function?" choice and keeps the
  mental model uniform.
- **Zustand-for-shared, local-for-local** prevents both prop-drilling spaghetti
  and overuse of global state.
- **Extracting hooks** keeps components scannable.
- **Naming conventions** mean you can predict a file's contents from its name.
- **Tailwind-only** keeps styling colocated and avoids the "where is this
  styled?" hunt across CSS files.
- **Size limit** is a forcing function for the other rules — when a file grows,
  something usually wants to come out.
- **Destructured props** make the component contract self-documenting.

The point isn't strict compliance for its own sake — it's that a future session
should be able to open any file and immediately know what shape to expect.
