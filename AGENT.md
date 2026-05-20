# Agent Autonomy Rules

_Last updated: 2026-05-20_

This file says what you may decide on your own, what you must check before
doing, and what is off the table without explicit user approval. The goal:
move fast on the obviously-fine, slow down on the irreversible, and never
silently change the project's foundations.

A general principle sits above the lists: **reversibility × blast radius**.
Free actions are local and easily undone. Confirming actions are wider in
reach or harder to undo. Forbidden actions reshape the project itself.

## Act freely (no need to ask)

You can do these without checking in:

- **Read anything.** Files, directories, git log, `npm` info, online
  references via fetch. Reading is always free.
- **Search and explore.** `grep`, `find`, `ls`, agent-driven codebase
  searches. Spawn parallel agents for independent reads.
- **Run safe commands.** `npm run build`, `npm run dev`, `npm test` (if
  any), `npm install` *to add* a dependency that the task obviously needs
  (per `debugging-discipline` rule 5).
- **Add new files** in established locations following established
  patterns — a new component in `src/components/`, a new hook in
  `src/hooks/`, a new skill in `.claude/skills/<name>/SKILL.md`.
- **Edit files in scope.** Whatever files the user's task touches, plus
  whatever those files import or are imported by within the same change.
- **Fix obvious bugs you find along the way.** A one-line typo, a missing
  import, an off-by-one — fix it and mention you did. (See "ask first" if
  the fix balloons.)
- **Apply project conventions.** Use Zustand instead of `useReducer`,
  Tailwind instead of inline styles, etc., even if the existing code drifts
  — but only in the file you're already editing (per `react-style`).
- **Update `CONTEXT.md`** per the `auto-context` skill. This is not
  optional and not asked.
- **Update `SPEC.md`** when implementing a planned feature: tick it off
  the list, fold any in-flight clarifications into the relevant flow.

## Ask first (confirm before doing)

Pause and propose before any of these:

- **Delete files or directories.** Even ones that look unused. There may
  be a reason they're there. Show the user what you'd delete and why.
- **Rename or move files** that other code imports. Confirm the user is
  OK with the churn; mention how many imports update.
- **Restructure folders.** Splitting one file into many is usually fine
  inline; reshaping `src/components/` or introducing a new top-level
  directory needs a check.
- **Refactor across unrelated files.** If the user asked to fix X in
  `Wall.jsx` and you see a cleaner pattern that would touch eight other
  files, propose it; don't sprawl.
- **Destructive git operations.** `git reset --hard`, `git push --force`,
  branch deletions, history rewrites. Reading git is free; rewriting it
  is not.
- **Add major dependencies.** Small utility libs (a colour-conversion
  helper, a tiny date formatter) you can install and move on. Something
  load-bearing (a state library, a 3D loader, a UI framework) gets a
  one-line "I'd like to add `<pkg>` because X — OK?" first.
- **Touch public APIs of shared modules.** Changing the shape of
  `useStore`, the `Wall` data structure, or anything exported from a
  canvas primitive — show the diff and the call-site impact before
  applying.
- **Change skill rules or convention constants.** Anything in
  `.claude/skills/*/SKILL.md`, `CLAUDE.md`, or
  `src/components/canvas/constants.js` is project policy. Propose the
  change, explain the impact, wait for OK.
- **Make changes the user didn't ask for** that ship as part of the work.
  Adjacent improvements are great as a *suggestion*; bundling them in
  silently isn't.

When asking, propose the smallest reasonable version, explain the
trade-off in one or two sentences, and offer the user a chance to say
"yes / yes but smaller / no". Don't dump six paragraphs of analysis on
a yes/no question.

## Never without explicit approval

These are off the table by default. If the user wants one, they need to
say so unambiguously.

- **Switch a core library.** Konva → Pixi/Fabric, Three.js → Babylon,
  Zustand → Redux/Jotai/Context, Vite → Webpack, Tailwind → anything.
  Each of these would invalidate skills, retraining sessions, and a lot
  of code. The user owns these decisions.
- **Add a backend.** This is "browser-only" by design (see `SPEC.md`
  non-goals). Don't introduce a server, a database, an auth layer, or
  cloud sync without an explicit go-ahead.
- **Change the build tool or major React version.**
- **Remove a skill or `CLAUDE.md` rule.** Even if it feels redundant.
  Reconciling skills (like merging duplicates) is in scope; deleting
  one as a "cleanup" is not.
- **Send project data to third-party services.** No analytics, no
  telemetry, no posting code to gists or pastebins. The one exception is
  the AI suggestion flow described in `SPEC.md`, which only sends data
  when the user explicitly clicks "Suggest" and only to the user's
  configured Claude endpoint with their own key.
- **Force-push to `main`** or any shared branch.
- **`rm -rf`** anything outside a known scratch/output directory.
- **Disable safety checks** (lint, type-check, hooks) to make a command
  pass. Fix the underlying issue (per `debugging-discipline`).

## When in doubt

Two filters:

1. **Reversibility.** If the action takes 30 seconds to undo, you can
   probably just do it. If undoing it means reading from git history or
   apologising to the user, ask first.
2. **Surprise.** If a reasonable user reading the diff later would be
   surprised by what you did, that's an "ask first" sign even if the
   action was technically reversible.

A confirmation prompt costs seconds. An unwanted destructive action can
cost an hour or a session's worth of trust. Default toward the cheaper
mistake.

## Related skills

- `.claude/skills/debugging-discipline/SKILL.md` — what to do when
  builds break (don't pile work on red, fix or ask).
- `.claude/skills/verification-before-completion/SKILL.md` — the rule
  against claiming success without fresh evidence; an autonomy rule in
  disguise.
- `.claude/skills/auto-context/SKILL.md` — the one "act freely" item
  that's actually mandatory, not optional.
