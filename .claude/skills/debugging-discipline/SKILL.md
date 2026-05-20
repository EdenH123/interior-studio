---
name: debugging-discipline
description: Interior Studio's debugging discipline — fix build errors before starting new features, never comment out broken code (delete it or fix it), run `npm run build` after every fix to confirm green, strip console.logs before marking work done, install missing packages immediately when an import fails. Use whenever you hit a build error, import error, runtime crash, failing dev server, or any "it doesn't work" moment. Use whenever about to add a console.log or temporarily comment something out. Use whenever about to mark a task done — gate completion on a clean build. Apply proactively even mid-feature; don't pile work on top of red.
---

# Debugging Discipline

When something breaks, the cheapest move is to fix it now. Every "I'll come
back to that" turns into an hour later. These rules exist to keep the project
in a state where any session can pick it up and trust that `main` (or whatever
the working branch is) builds.

## The rules

### 1. Fix build errors before new features
If `npm run build` is red, that is the next task — full stop. Don't add a
feature on top of a broken build, don't stack changes hoping one of them fixes
it. Stop, read the error, fix the cause, build again. New work only resumes
when the build is green.

If the build was already broken when the session started, surface that to the
user before doing anything else.

### 2. Never comment out broken code
Two acceptable outcomes for code that doesn't work: **fix it** or **delete
it**. Commented-out blocks rot — six weeks from now nobody remembers why they
were commented, whether they used to work, or whether deleting them is safe.
Use git history if you need to recover something; that's what git is for.

The only exception: a *truly* temporary comment-out during an active debugging
session that you will reverse before the response ends. If it survives the
response, delete it.

### 3. `npm run build` after every fix
After fixing a bug, run `npm run build` (from inside `interior-studio/`).
Don't trust the dev server's HMR to confirm — HMR can mask errors that the
production build catches (unused imports, missing exports, JSX typos). The
build is the source of truth for "does this work".

If the fix touches code paths that only run at runtime (event handlers, async
loads), additionally exercise the path in the dev server before declaring
done. A green build proves the code compiles; only running it proves it
behaves.

### 4. Remove console.logs before marking done
`console.log` is a debugging tool, not a logging tool. Strip every one before
declaring a task complete. Same goes for `debugger`, `// FIXME`, and any
TODO comments referring to the work you just did. If there's a genuine
follow-up worth tracking, put it in CONTEXT.md's "Up Next" or "Known Issues"
section — not as a comment in the code.

A grep before completion catches stragglers:

```bash
grep -rn "console\.\(log\|debug\|warn\|error\)" src/
```

(Keep intentional `console.error` for genuine error logging — flag those as
such.)

### 5. Install missing packages immediately
If an import fails because a package isn't installed, install it the moment
you notice — don't keep typing around the missing dependency hoping it'll
resolve itself or fail silently in someone else's session.

```bash
npm install <pkg>           # runtime dep
npm install -D <pkg>        # dev/build dep
```

Then re-run the failing command to confirm it's resolved. Note the addition in
CONTEXT.md if the package is meaningful (a new library, not a small util).

## Why these rules

Every one of these is about a single failure mode: **debt that compounds
silently**. A red build that you "look at later" becomes a thicket where two
unrelated bugs interact. Commented-out code becomes a maze where nobody knows
what's live. Stray console.logs leak into production. Missing packages cause
mysterious "works on my machine" failures.

The cost of these rules is small (seconds to minutes). The cost of letting
them slide compounds across sessions because each new session has to
re-discover the broken state.

## When the user pushes back

If the user explicitly says "I know the build is broken, just keep going" or
"leave the console.log for now", that's their call — follow it. Otherwise
default to the rules above.

## Related skills

This skill is the *etiquette* of debugging — the tactical do's and don'ts. It
pairs with:

- **`systematic-debugging`** — the *methodology* for non-trivial bugs. When a
  bug isn't obvious in a few minutes, switch over: investigate root cause
  through its four phases before proposing fixes. The supporting docs in that
  skill's folder (`root-cause-tracing.md`, `defense-in-depth.md`,
  `condition-based-waiting.md`) are worth reading when relevant.
- **`verification-before-completion`** — the *honesty* rule. Don't claim
  anything is fixed until you've run the verification command in the current
  message and read its output. Rule 3 (build after every fix) is the
  project-specific application of that general principle.
