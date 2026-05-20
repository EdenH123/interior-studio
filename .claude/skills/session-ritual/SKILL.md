---
name: session-ritual
description: Interior Studio's start- and end-of-session ritual. At session start in this project, read CONTEXT.md first, run `npm run build` to confirm the project starts green, then report the current state ("here's where we are, here's what's next") before doing any work. At session end, run `npm run build` to confirm still green, update CONTEXT.md (move items between Done / In Progress / Up Next, log new conventions and issues), update USER_GUIDE.md if any user-facing behavior changed, and summarise what was completed and what's queued. Trigger at the very beginning of any session in this project — and again when the user says "let's start", "what's the status", "wrap up", "we're done", "that's it for today", or any similar opener/closer. Even if the user dives straight into a task without ceremony, perform the start ritual first, then proceed.
---

# Interior Studio Session Ritual

Sessions in this project are short and contextless by default — Claude wakes
up not knowing what happened yesterday. The ritual exists so every session
starts from an honest picture of the project and ends with that picture
updated, so the *next* session can do the same. Skipping either half breaks
the chain.

This skill works hand-in-hand with `auto-context` (which handles per-response
CONTEXT.md updates) and `debugging-discipline` (which gates "done" on a clean
build). Session-ritual is the umbrella.

## Start ritual

Before any other work — before exploring code, before asking questions, before
running other commands:

1. **Read CONTEXT.md** in full. Treat its "Current Status", "Conventions &
   Decisions", and "Known Issues" sections as your starting picture. If
   CONTEXT.md is missing, say so and offer to create one.

2. **Run `npm run build`** from inside `interior-studio/`. This proves the
   project starts green. If it's red, that's the next task — surface it
   immediately and don't begin the user's requested work until the build is
   fixed (per `debugging-discipline`, rule 1).

3. **Report current state.** A short summary the user can react to:
   - what was last completed (most recent "Done" entries)
   - what's "In Progress" (if anything)
   - the top 2–3 "Up Next" items
   - the build status (green, or what failed)
   - any blocking "Known Issues"

   Then ask (or assume, if they already said) what they want to work on.

If the user opens with a task ("add X" / "fix Y"), still perform steps 1–3
quickly before diving in. They take seconds and prevent acting on a stale
picture.

## End ritual

When the user signals end-of-session (or a natural break point — feature
landed, big refactor done):

1. **Run `npm run build`** one more time. If it's red, the session can't
   responsibly end — fix or explicitly flag the breakage in CONTEXT.md's
   "Known Issues" with date.

2. **Update CONTEXT.md** if the auto-context skill hasn't already covered
   everything from this session:
   - move items between **Up Next → In Progress → Done**
   - add new files to the **Folder Structure**
   - log new conventions or decisions under **Conventions & Decisions**
   - log bugs or blockers under **Known Issues** (with date)
   - update **Key Data Structures** if shapes changed

3. **Update USER_GUIDE.md** if any user-facing behavior changed this
   session. USER_GUIDE.md is the non-technical reference for what the app
   does — it describes features, shortcuts, and flows the way a user would
   read them. Only update it when behavior the user would *see* changes:

   - **Do update** when a new feature ships, an existing feature's
     interaction model changes (keyboard shortcut, click behavior,
     visual cue), a previously-listed shortcut disappears, or a
     limitation goes away.
   - **Don't update** for pure refactors, bundle changes, internal
     architecture, lint fixes, or anything that produces an identical
     experience for the user.
   - Bump the `_Last updated: YYYY-MM-DD_` line at the top whenever the
     body changes, same convention as the other root docs.
   - Touch the **Keyboard shortcuts** table whenever you add or remove
     a shortcut, even if you mention it elsewhere in the guide.

   If you're unsure whether a change is user-visible, ask: "would a
   user reading USER_GUIDE.md *today* be surprised by the app's
   behavior after this change?" If yes, update.

4. **Hand off to `git-flow`** to commit + push (or open a PR). It runs
   `npm run build` + `npm test` as hard gates, decides between
   direct-to-main and a feature-branch PR based on whether this session
   added a new feature to CONTEXT.md's "Done" list, and produces the
   commit hash / PR URL that the chat summary cites. Until git-flow
   runs, the CONTEXT.md and USER_GUIDE.md edits made in steps 2–3 are
   only drafted — committing them is the act of finalizing them.

5. **Summarise** in the chat:
   - **Completed this session:** bullet list of what landed
   - **Up next:** the 2–3 things that should happen in the next session
   - **Build status:** green / red + reason
   - **Open questions / decisions deferred:** anything the user should think
     about between sessions

This summary doesn't replace the CONTEXT.md update — it's the human-readable
companion that lets the user mentally close out without re-reading the file.

## Why these halves matter

The start ritual catches the two most common cross-session failure modes:
acting on outdated assumptions, and silently starting from a broken build.
Both are cheap to prevent and expensive to discover mid-task.

The end ritual catches the equivalent for the *next* session: an inaccurate
CONTEXT.md means the next start ritual is built on a lie. The end summary in
chat is for the user — it's the moment to say "ship it" or "wait, what about
X" while the work is still fresh.

CONTEXT.md and USER_GUIDE.md play different roles and drift differently:
CONTEXT.md is for the next *Claude* session; USER_GUIDE.md is for the
*human user*. CONTEXT.md needs to be exhaustive (so future sessions don't
re-derive); USER_GUIDE.md needs to be honest about what the user sees today
(so it stays trustworthy as a reference). Keep them both up to date but
remember they have different audiences.

## When to skip parts

- Trivial one-line edits or pure questions where no code is touched: the start
  ritual's *build* step can be skipped, but the CONTEXT.md read still happens.
- Already-mid-session continuation (no real "start"): the start ritual is
  already done; just proceed.
- User explicitly says "no ceremony, just do X": follow that, but at minimum
  read CONTEXT.md silently so you're not flying blind.

## Related skills

- **`auto-context`** handles the per-response CONTEXT.md updating. This skill
  bookends the session; auto-context covers everything in between.
- **`debugging-discipline`** rule 1 (don't add features on a red build) is the
  reason the start ritual runs `npm run build` — to surface red builds before
  the user's task lands on top of them.
- **`verification-before-completion`** is why the end ritual runs
  `npm run build` rather than trusting a "looks good": the closing summary is a
  completion claim, and completion claims need fresh evidence.
- **`git-flow`** is the git half of the end ritual — same trigger, runs
  after CONTEXT.md / USER_GUIDE.md edits are drafted and produces the
  commit / PR the chat summary references.
