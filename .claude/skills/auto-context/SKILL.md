---
name: auto-context
description: Keeps the Interior Studio project's CONTEXT.md file in sync with reality across sessions. Use at the START of every session in this project (read CONTEXT.md first, before exploring code or asking questions) AND at the END of every response that creates, modifies, or deletes files in this project (append/move entries, never delete history). Trigger whenever the working directory is the interior-studio project, whenever files in it are touched, or whenever the user asks what's been built, what's next, the project status, or to "catch up" between sessions — even if they don't mention CONTEXT.md by name.
---

# Auto Context Updater

CONTEXT.md is the project's memory layer between sessions. It records the stack,
folder structure, what's done, what's next, conventions, and known issues. It is
only useful if it stays accurate — and it only stays accurate if you keep it
that way, automatically, without being asked.

This skill has two responsibilities: read CONTEXT.md at the start of a session,
and update it at the end of any response that touches files.

## Session start

Before doing anything else in a new session in this project — exploring code,
running commands, asking the user clarifying questions — read CONTEXT.md and use
it as your starting context. Treat its "Conventions & Decisions" section as
authoritative for things like units, naming, and architectural choices.

If CONTEXT.md is missing, say so and offer to create one before proceeding.

## End-of-response update

Trigger this any time your response creates, modifies, or deletes files in the
project. Even small changes — a one-line edit, a single new file, a deletion —
count. The whole point is that the file never drifts; small skipped updates are
how drift starts.

Update the relevant sections of CONTEXT.md:

- **Folder Structure** — add new files/directories, with a short trailing
  comment describing their purpose
- **Current Status** — move items between sections as work progresses:
  - "Up Next" → "In Progress" when you start something
  - "In Progress" → "Done" when it's working and verified
  - New items discovered mid-task go straight to the right section
- **Conventions & Decisions** — log new patterns, constants, or architectural
  choices that future sessions need to know about
- **Known Issues** — log bugs, blockers, or limitations you discovered or
  introduced
- **Key Data Structures** — update if a new shape was introduced or an existing
  one changed

## Formats

Done items:
```
- [x] Feature name — brief one-line description of what was built
```

Known issues:
```
- [ISSUE] description — date discovered
```

## Never remove history

Only add and move items. Don't delete previous entries, even if they look
redundant or outdated. The historical record is part of the value — a future
session reading the file should be able to see what was tried, what was kept,
and roughly when things happened. If something is genuinely wrong (not just
old), strike it through or annotate it rather than removing it.

## Why this matters

You and the user are collaborating across many short sessions, with full context
swapping in and out. CONTEXT.md is the bridge. If it lies, the next session
starts from a false picture and wastes time re-discovering things or, worse,
makes choices that conflict with decisions already made. Keeping it honest is
cheap when done continuously and expensive when done in arrears — so do it
every turn, as a reflex, not a chore.
