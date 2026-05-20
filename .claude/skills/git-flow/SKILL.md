---
name: git-flow
description: Interior Studio's end-of-session git workflow. Triggers automatically at session end, after `session-ritual` has drafted the CONTEXT.md update and before the closing summary, so the same commit captures the code changes AND the CONTEXT.md/USER_GUIDE.md update that describes them. Decides between a direct-to-main commit and a feature-branch + PR + auto-squash-merge flow based on whether the session added a new feature to CONTEXT.md's "Done" list. Honors hard safety gates: never commits on a red build, never on failing tests, never force-pushes, and skips entirely when nothing changed. Trigger at session close, when the user says "wrap up", "we're done", "ship it", "that's it for today", or anytime the end ritual fires.
---

# Interior Studio Git Flow

The end of every session is the same shape: code changes land, `CONTEXT.md`
and (sometimes) `USER_GUIDE.md` are updated, then the work needs to make it
into git in a way the next session can rely on. This skill turns that into a
deterministic flow — same shape every time, no creative decisions at commit
time.

Runs **after** `session-ritual` has finished its CONTEXT.md / USER_GUIDE.md
edits but **before** the end-of-session summary in chat. The commit is the
moment those edits become real — until then they're "drafted but not
finalized." The summary in chat reflects what landed in git, including the
commit hash / PR URL / branch name.

## Prerequisites (one-time)

If `git status` reports "not a git repository", this skill is a no-op for
the current session — surface a one-line note ("git flow skipped: no repo
initialized; run `git init` + add a remote to enable") and continue.
Don't initialise a repo or add a remote on the user's behalf; that's a
durable infra decision they should make explicitly.

Also a no-op when there's no `origin` remote — same one-line note.

## Hard gates (check before anything else)

In this order, fail-fast:

1. **Build is green.** `npm run build` inside `interior-studio/`. If it
   fails, abort the commit, surface the failure, and tell the user the
   session can't responsibly close until it's fixed. Per
   `debugging-discipline`: don't commit broken state.
2. **Tests are green.** `npm test` (vitest run). Same rule — abort on
   red. If a flaky test is suspected, the user has to call it explicitly
   ("commit anyway, the X test is flaky") before this skill proceeds.
3. **Something actually changed.** `git status --porcelain` returns at
   least one line. If empty, exit cleanly with "no changes to commit" —
   don't create empty commits.
4. **Never force-push.** Not under any flag. If `git push` rejects
   because the remote moved, surface the conflict and stop — the user
   resolves it manually next session.

These gates exist so a session never closes on a broken `main` and so
the next session's start ritual (build + read CONTEXT.md) doesn't start
on a lie. Trust them — don't add bypass paths.

## The session number

Both commit messages and feature branches are tagged with a session
number. To pick the next N:

```bash
git log --grep '^Session [0-9]' --pretty=%s | \
  awk -F'[ :]' '{print $2}' | sort -n | tail -1
```

If that returns `M`, the new session is `M + 1`. If the log is empty
(first session ever committed via this skill), `N = 1`. Use the same N
for both the commit subject and any branch name created this turn.

## Decision: direct-to-main vs PR flow

Inspect CONTEXT.md to decide. Diff `git diff -- CONTEXT.md` for the
"Done" section. Two cases:

- **PR flow** — the diff added a **new feature** entry to the Done list
  (a new `- [x]` bullet describing user-visible behavior that didn't
  exist before). New skills, new doc sections, restructures, or
  multi-file feature work all qualify. The clearest signal: the same
  session also touched `USER_GUIDE.md`.
- **Direct-to-main flow** — everything else. Doc-only updates,
  bugfixes, internal refactors, dependency bumps, test additions, skill
  edits, CONTEXT.md polish without a new feature, anything where the
  Done list got *updated* rather than *extended* with new behavior.

When ambiguous: default to direct-to-main. The PR flow exists to give
features a reviewable atomic unit; small changes don't benefit from the
ceremony and shouldn't be branched.

## Direct-to-main flow

```bash
git add -A
git commit -m "$(cat <<'EOF'
Session N: <one-line summary, <70 chars, imperative voice>

- bullet describing the most prominent change
- next prominent change
- (one bullet per logical change — keep tight, this is the audit trail)
EOF
)"
git push origin main
```

The subject line is what someone reads in `git log --oneline`. Make it
specific — "Session 14: fix opening drag overlap toast" beats
"Session 14: bug fixes". The bullet body explains the *what* in enough
detail that `git log -p` isn't strictly necessary to understand the
session.

Stage with `git add -A` (not `.`) so deletions are included. The
`-A` form catches removals as well as additions.

Confirm `git status` is clean after push.

## PR flow (new feature sessions)

GitHub interactions go through whichever interface the current session
has: in a local terminal that's the `gh` CLI; in the remote/cloud
execution environment it's the `mcp__github__*` MCP tools. Both
sequences land the same end state. Pick whichever is available and
don't mix them within a session.

### 1. Branch + commit (both interfaces, same shell)

```bash
BRANCH="session-N-<short-kebab-name>"   # e.g. session-14-openings
git checkout -b "$BRANCH"
git add -A
git commit -m "$(cat <<'EOF'
Session N: <one-line summary>

- bullet list as above
EOF
)"
git push -u origin "$BRANCH"
```

### 2a. PR + auto-merge via `gh` (local sessions)

```bash
gh pr create --title "Session N: <one-line summary>" --body "$(cat <<'EOF'
## What this session built

<2–4 sentences naming the feature and why it matters>

## Files changed

<bulleted list of the main paths, grouped by area>

## How to test it

1. <concrete steps a reviewer can follow in the running app>
2. ...
EOF
)"
gh pr merge --auto --squash --delete-branch
```

### 2b. PR + auto-merge via MCP (remote/cloud sessions)

Use the same body shape — only the call surface changes:

- `mcp__github__create_pull_request` with `owner`, `repo`,
  `head` (the branch name), `base: "main"`, `title`, and `body`.
  Capture the returned PR `number` for the next call.
- `mcp__github__enable_pr_auto_merge` with `owner`, `repo`,
  `pullNumber`, and `mergeMethod: "SQUASH"`.

If `enable_pr_auto_merge` errors with *"Auto-merge is not enabled
for this repository"*, the repo's **Settings → General → Pull
Requests → Allow auto-merge** checkbox is off. Surface the message
verbatim and stop — don't fall back to a direct
`merge_pull_request` call, since that bypasses any future required
checks and is a different decision the user should make explicitly.

If the repo *has* auto-merge enabled but the PR has zero required
checks and is `mergeable_state: clean`, GitHub still queues the
auto-merge; it just fires almost immediately. That's the same end
state as `gh pr merge --auto`, so don't second-guess it.

### 3. Local cleanup once the merge lands (both interfaces)

```bash
git checkout main
git pull --ff-only origin main
git branch -d "$BRANCH"   # -d, not -D — refuses to drop unmerged work
```

Use `-d` (lowercase): it errors if the branch hasn't been merged,
which is the correct safety net. The remote branch is deleted by the
auto-merge step (`--delete-branch` for `gh`; GitHub's default behaviour
for auto-merged PRs via MCP when **Settings → General → Pull Requests
→ Automatically delete head branches** is enabled).

If the PR can't be auto-merged (branch protection requires reviews,
required checks fail or are missing, repo-level auto-merge disabled),
surface the PR URL and stop. The user can merge manually next session;
don't second-guess CI requirements.

## Commit message shape

Same shape for both flows:

```
Session N: <imperative summary under 70 chars>

- <change one>
- <change two>
- <change three>
```

Rules:

- **Subject** is imperative, present-tense, no trailing period. "add
  opening CSG cuts", not "added" or "adds".
- **Blank line** between subject and body — git tooling depends on it.
- **Bullets** are one logical change each. New file = one bullet. Renamed
  helper = one bullet. Multi-file feature = one bullet describing the
  feature (not one bullet per file).
- Keep the body to ~5–8 bullets. If it sprawls past that, the session
  was probably actually two sessions and the user should be told.

Per the global git protocol Claude Code follows, append a
`Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` trailer
to the commit body.

## Order of operations within end-of-session

The end ritual now looks like:

1. `session-ritual` runs `npm run build`.
2. `session-ritual` updates CONTEXT.md (Done / In Progress / Up Next,
   folder tree, conventions, data structures).
3. `session-ritual` updates USER_GUIDE.md if anything user-visible
   changed.
4. **`git-flow` runs here.** Build + test gates → decision → commit /
   PR → push.
5. `session-ritual` emits the chat summary, now including the commit
   hash, the PR URL (if any), and the branch name (if any).

The CONTEXT.md / USER_GUIDE.md edits made in steps 2–3 are part of the
commit produced in step 4 — that's why git-flow runs after them but
before the summary. The chat summary in step 5 is the human-readable
mirror of what just got pushed.

## What this skill never does

- Force-push. Not with `--force-with-lease` either; the gates above are
  enough.
- Skip hooks (`--no-verify`). A failing hook is a signal, not noise.
- Commit secrets. If `git status` lists `.env`, `*.pem`, anything under
  `secrets/`, or anything matching `*key*` / `*token*` outside
  `package.json`, abort and ask the user before staging.
- Commit when the build is red or tests are red.
- Create empty commits.
- Amend or rewrite history. New commits only.
- Run `git config`.
- Delete branches with `-D`. Only `-d` (safe delete).

## Related skills

- **`session-ritual`** is the umbrella; this skill is the git half of
  its end-of-session phase. CONTEXT.md / USER_GUIDE.md edits happen in
  session-ritual; their *finalization* (commit + push) happens here.
- **`debugging-discipline`** rule 1 (don't ship a red build) is what
  the build gate enforces.
- **`verification-before-completion`** is why the commit follows fresh
  `npm run build` + `npm test` rather than trusting "it built earlier".
