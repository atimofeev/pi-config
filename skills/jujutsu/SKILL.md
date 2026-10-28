---
name: jujutsu
description: "**REQUIRED** - Always activate FIRST on any git/VCS operations (commit, status, branch, push, etc.), especially when HEAD is detached. If `.jj/` exists -> this is a Jujutsu (jj) repo - raw git commands can corrupt data. Essential git safety instructions inside. DO NOT IGNORE."
allowed-tools: Bash(jj *)
---

# Jujutsu (jj) Version Control System

This skill helps you work with Jujutsu, a Git-compatible VCS with mutable commits and automatic rebasing.

**Native squash recipe tested with jj v0.41.0** - Commands may differ in other versions; inspect installed help before relying on newer flags.

## Fast path for `/commit-changes`

If slash-command preflight already says `vcs: Jujutsu (.jj)` and lists changed files, use this section only unless command fails or history is ambiguous:

1. Inspect exact patch once: `jj --no-pager diff --git`.
2. If one safe logical group, finalize with `jj commit -m "type(scope): description"`. Omit paths only when intentionally committing every remaining change and all paths serve one concern.
3. For subset commits, use `jj commit -m "type(scope): description" <paths>`: selected paths become a commit; remaining changes stay in the new working copy. Do not split a cohesive feature per file. Never use `jj split` (opens editor) or `jj restore` (replaces file content, does not move changes between commits).
4. Verify once with `jj --no-pager st` and `jj --no-pager log -r @- --no-graph -T 'change_id'`. Output `COMMITTED: <change-id> | <type(scope): description> | status: ok`.

Rules: never use `git` in `.jj` repo, never use editor-prompt commands, never use interactive `jj squash -i`.

## Important: Automated/Agent Environment

When running as an agent:

1. **Always use `--no-pager`** to prevent commands from opening an interactive pager (like `less`), which will hang the agent:

```bash
# Always use --no-pager on commands that produce output
jj --no-pager log          # NOT: jj log
jj --no-pager diff         # NOT: jj diff
jj --no-pager show <id>    # NOT: jj show <id>
```

2. **Always use `-m` flags** to provide messages inline rather than relying on editor prompts:

```bash
# Always use -m to avoid editor prompts
jj desc -m "message"      # NOT: jj desc
jj squash -m "message"    # NOT: jj squash (which opens editor)
```

Editor-based commands will fail in non-interactive environments.

3. **Verify operations with `jj st`** after mutations (`squash`, `abandon`, `rebase`, `restore`) to confirm the operation succeeded.

## Core Concepts

### The Working Copy is a Commit

In jj, your working directory is always a commit (referenced as `@`). Changes are automatically snapshotted when you run any jj command. There is no staging area.

`jj describe -m` changes the description only. `jj commit -m` finalizes selected changes and creates the next working-copy commit.

### Commits Are Mutable

**CRITICAL**: Unlike git, jj commits can be freely modified after creation. You can update descriptions, squash changes, rebase, and absorb — all without creating new commits. See "Essential Workflow" below for the recommended working pattern.

### Change IDs vs Commit IDs

- **Change ID**: A stable identifier (like `tqpwlqmp`) that persists when a commit is rewritten — prefer these when referencing commits
- **Commit ID**: A content hash (like `3ccf7581`) that changes when commit content changes

### Revsets

jj uses a revset language to select commits in commands. Common revsets:

- `@` — the working copy commit
- `@-` — the parent of the working copy
- `::@` — all ancestors of `@`
- `@::` — all descendants of `@`
- `trunk()..@` — commits between trunk and `@` (your branch)
- `bookmarks()` — all commits with bookmarks

Use revsets with `-r` flags: `jj log -r 'trunk()..@'`

## Essential Workflow

### Starting Work: Describe First, Then Code

**Always create your commit message before writing code:**

Validate that you're on a blank revision with `jj st`. If you are not, you should type:

```bash
jj new
```

```bash
# First, describe what you intend to do
jj desc -m "Add user authentication to login endpoint"

# Then make your changes - they automatically become part of this commit
# ... edit files ...

# Check status
jj st
```

### Creating Atomic Commits

Each commit should represent ONE logical change. Use this format for commit messages:

```
Examples:
- "Add validation to user input forms"
- "Fix null pointer in payment processor"
- "Remove deprecated API endpoints"
- "Update dependencies to latest versions"
```

### Viewing History

```bash
# View recent commits
jj --no-pager log

# View with patches
jj --no-pager log -p

# View specific commit
jj --no-pager show <change-id>

# View diff of working copy (use --git for familiar +/- format)
jj --no-pager diff --git
```

**IMPORTANT: `jj diff` output format**: The default `jj diff` output uses a side-by-side line number format (e.g. `26   26:`) that looks very different from git's `+`/`-` prefix format. This is **normal and correct** — it is NOT corrupted or showing stale content. However, to avoid confusion, **always use `jj diff --git`** to get standard unified diff format with `+`/`-` lines.

### Moving Between Commits

```bash
# Create a new empty commit on top of current
jj new

# Create new commit with message
jj new -m "Commit message"

# Edit an existing commit (working copy becomes that commit)
jj edit <change-id>

# Edit the previous commit
jj prev -e

# Edit the next commit
jj next -e
```

## Refining Commits

### Squashing Changes

For a clean linear feature branch, prefer one native squash, not new commit reconstruction:

1. Inspect local status/history once. Pin full old tip ID, exact base ID, first selected commit, and target bookmark. Confirm selected range is linear and excludes unrelated commits. Empty `@` above feature tip is not a feature commit.
2. Stop on dirty unrelated work, conflicts, divergence, merges, uncertain base, or side descendants/other local bookmarks/workspaces that would also be rewritten. Do not stash, switch workspaces, or silently escalate to a complicated recovery procedure. One existing feature commit needs no rewrite unless its message must change.
3. Squash descendants into first selected commit with explicit message:

```bash
jj --no-pager squash --from '<first>..<old-tip>' --into <first> -m "type(scope): description"
```

`first..old-tip` excludes destination and selects only later feature commits. Result keeps original base; descendants, including an empty working copy, rebase automatically. For a single selected commit with explicitly requested message change, use `jj describe -r <first> -m "type(scope): description"` instead.

4. Require `jj --no-pager diff --from <old-tip> --to <new-tip> --summary` empty, exactly one commit above pinned base, sole parent equal base, target bookmark on new commit, and working copy clean/preserved. If bookmark needs moving, move only it to squashed commit, not empty `@`.
5. Report old/new IDs, preserved tree, and local-only result. Original ID and native operation log provide recovery. No remote/API queries, whole-worktree hashing, filesystem backups, extra workspaces, or isolated reconstruction for this fast path. Aim for roughly 10 seconds; safety checks remain mandatory.

Local squash does not authorize push or force-push. Remote checks belong only to a separately requested push. Complex merge-based/dirty-workspace exact-tree publication requires a separately reviewed procedure, not the routine default.

To squash only current commit into its parent, use `jj squash -m "type(scope): description"`. Never use bare `jj squash` or `jj squash -i` in agent environments: either can launch an editor.

### Splitting Commits

**Warning**: `jj split` can launch an editor and hang. For disjoint whole paths, use `jj commit -m "type(scope): description" <paths>`. For independent concerns in one path, use verified noninteractive `jj-hunk` selections or stop for input. `jj restore` discards/replaces content; it is not a splitting primitive.

### Absorbing Changes

Automatically distribute changes to the commits that last modified those lines:

```bash
# Absorb working copy changes into appropriate ancestor commits
jj absorb
```

### Abandoning Commits

Remove a commit entirely (descendants are rebased to its parent):

```bash
jj abandon <change-id>
```

### Undoing Operations

Reverse the last jj operation:

```bash
jj undo
```

This reverts the repository to its state before the previous command. Useful for recovering from mistakes like accidental `abandon`, `squash`, or `rebase`.

### Rebasing Commits

Move commits to a different parent:

```bash
# Rebase current branch onto a destination
jj rebase -d <destination>

# Rebase a specific revision (without descendants) onto a destination
jj rebase -r <change-id> -d <destination>

# Rebase a revision and all its descendants
jj rebase -s <change-id> -d <destination>

# Rebase onto trunk (common: update your branch to latest main)
jj rebase -d main
```

### Restoring Files

Discard changes to specific files or restore files from another revision:

```bash
# Discard all uncommitted changes in working copy (restore from parent)
jj restore

# Discard changes to specific files
jj restore path/to/file.txt

# Restore files from a specific revision
jj restore --from <change-id> path/to/file.txt
```

## Working with Bookmarks (Branches)

Bookmarks are jj's equivalent to git branches:

```bash
# Create a bookmark at current commit
jj bookmark create my-feature -r@

# Move bookmark to a different commit
jj bookmark move my-feature --to <change-id>

# List bookmarks
jj --no-pager bookmark list

# Delete a bookmark
jj bookmark delete my-feature
```

## Workspaces

A **workspace** is a working copy plus its associated repo. One repo can have multiple workspaces — each with its own working directory and working-copy commit (`@`) — all sharing the same commits, operations, and bookmarks. This is jj's equivalent of `git worktree`.

Useful for running a long build or test in one workspace while editing in another. Workspaces are a rarely-needed feature; consult the [official docs](https://docs.jj-vcs.dev/latest/working-copy/#workspaces) for anything beyond the basics below.

### Common commands

```bash
# Create a new workspace (defaults: name = basename of path, parent = current @'s parent)
jj workspace add ../my-tests
jj workspace add --name tests -r <change-id> ../my-tests   # explicit name and base

# Inspect
jj --no-pager workspace list
jj workspace root [--name <ws>]

# Remove (does NOT delete files on disk — rm the directory separately)
jj workspace forget [<ws>]

# Rename current workspace
jj workspace rename <new-name>
```

In `jj log`, each workspace's `@` appears as `<workspace-name>@`.

### Key semantics

- **Isolation by default.** `jj workspace add` gives the new workspace its own fresh empty commit; workspaces don't start out sharing `@`, and on-disk files are never live-mirrored between them.
- **Propagation at command boundaries.** Each jj command snapshots the current workspace's files and reads the op log, so it sees commits/bookmarks made by other workspaces. There is no filesystem watcher.
- **Stale working copy.** If another workspace rewrites this workspace's `@` (e.g. via `jj squash`, `rebase`, `abandon`), jj refuses commands here until you run `jj workspace update-stale`. Same recovery path if a command was interrupted mid-update.
- **Shared `@` is sharp-edged.** `jj edit <id>` lets two workspaces point at the same change without warning. When one mutates it, the other goes stale; if the stale one had un-snapshotted edits, `update-stale` preserves them as a **divergent commit** (same change ID, shown as `xyz??` in `jj log`) that you must resolve. Avoid sharing `@` unless both workspaces are read-only.

### Agent guidance

- Always pass `--no-pager` to `jj workspace list`.
- Don't `jj edit` a change another workspace already has as its `@` — main cause of accidental divergence.
- Don't `rm -rf` a workspace directory without also running `jj workspace forget <name>`.

## Git Integration

### Working with Existing Git Repos

```bash
# Clone a git repository
jj git clone <url>

# Initialize jj in an existing git repo
jj git init --colocate
```

### Fetching Remote Changes

```bash
# Fetch all branches from the default remote
jj git fetch

# Fetch from a specific remote
jj git fetch --remote <remote-name>

# Fetch specific branches
jj git fetch -b <branch-name>
```

After fetching, rebase your work onto the updated trunk: `jj rebase -d main`

### Colocated Repositories

When `.jj/` exists, use Jujutsu exclusively even when `.git/` also exists. Detached Git HEAD is normal in this layout, not a reason to run Git checkout/reset/rebase. Use native JJ history, bookmarks, squash, fetch, and push commands.

### Pushing Changes

When the user asks you to push changes:

```bash
# Push a specific bookmark to the remote
jj git push -b <bookmark-name>

# Example: push the main bookmark
jj git push -b main
```

**Before pushing, ensure:**
1. Your bookmark points to the correct commit (bookmarks don't auto-advance like git branches)
2. The commits are refined and atomic
3. The user has explicitly requested the push; squash alone is not publication authorization
4. Rewritten published history has explicit authorization and native remote-state guard intact. Never silently fetch and retry a rejected push against a changed remote head

**IMPORTANT**: Unlike git branches, jj bookmarks do not automatically move when you create new commits. You must manually update them before pushing:

```bash
# Move an existing bookmark to the current commit
jj bookmark move my-feature --to @

# Then push it
jj git push -b my-feature
```

If no bookmark exists for your changes, create one first:

```bash
# Create a bookmark at the current commit
jj bookmark create my-feature

# Then push it
jj git push -b my-feature
```

## Handling Conflicts

jj allows committing conflicts — you can resolve them later:

```bash
# View conflicts
jj st
```

**Agent conflict resolution**: Do not use `jj resolve` (interactive). Instead, edit the conflicted files directly to remove conflict markers, then run `jj st` to verify resolution.

## Preserving Commit Quality

**IMPORTANT**: Because commits are mutable, always refine them before considering work done:

1. **Review your commit**: `jj --no-pager show @` or `jj --no-pager diff --git`
2. **Is it atomic?** One logical change per commit
3. **Is the message clear?** Use imperative verb phrase in sentence case format with no full stop: e.g. "Add login endpoint", "Fix null pointer in payment processor", "Remove deprecated API endpoints"
4. **Are there unrelated changes?** Commit explicit path groups; use verified noninteractive hunk selections for same-file concerns. Never use `jj restore` to move changes out
5. **Should changes be elsewhere?** Use `jj squash -m "message"` or `jj absorb` only within authorized scope

## Quick Reference

| Action | Command |
|--------|---------|
| Describe commit | `jj desc -m "message"` |
| View status | `jj st` |
| View log | `jj --no-pager log` |
| View diff | `jj --no-pager diff --git` |
| New commit | `jj new -m "message"` (use `jj st` first; skip if `@` is empty) |
| Edit commit | `jj edit <id>` |
| Squash to parent | `jj squash -m "message"` |
| Auto-distribute | `jj absorb` |
| Rebase | `jj rebase -d <destination>` |
| Abandon commit | `jj abandon <id>` |
| Undo last operation | `jj undo` |
| Restore files | `jj restore [paths]` |
| Create bookmark | `jj bookmark create <name>` |
| Fetch remote | `jj git fetch` |
| Push bookmark | `jj git push -b <name>` |
| Add workspace | `jj workspace add <path>` |
| List workspaces | `jj --no-pager workspace list` |
| Forget workspace | `jj workspace forget [name]` |
| Fix stale working copy | `jj workspace update-stale` |

## Best Practices Summary

1. **Describe first**: Set the commit message before coding
2. **One change per commit**: Keep commits atomic and focused
3. **Use change IDs**: They're stable across rewrites
4. **Refine commits**: Leverage mutability for clean history
5. **Embrace the workflow**: No staging area, no stashing - just commits
