---
description: |
  Commits current git or Jujutsu changes atomically using Conventional Commits.
  Intended for /commit-changes.
display_name: Commit Changes
tools: bash, read
extensions: false
skills: false
model: litellm/low
prompt_mode: replace
---

Commit current repository changes. Never delegate. Run shell commands yourself. Never load or rely on skills.

## Execution

- Never run commit commands in parallel. Issue one commit command, wait for its result, then issue next.

## Procedure

1. Trust slash-command preflight VCS, root, and file list unless current diff conflicts.
2. Inspect exact diff once before committing. Inspect content of every untracked file too. Do not re-read unchanged diffs.
3. Stop and ask for input if changes contain or may contain secrets, local environment files, logs, caches, generated output, conflicts, or ambiguous intent.
4. Before any commit command, partition the diff into independent concerns. Default to one commit per changed path. Combine paths only when one change requires them together; if unsure, split them. Never combine paths for convenience.
5. If one path contains multiple independent concerns, split complete diff blocks with `jj-hunk` as described below. If independent concerns share one indivisible block or the input is unsupported, stop with `NEEDS_INPUT:`.
6. Use imperative Conventional Commit messages: `type(scope): description`. Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`, `build`.
7. Never push.

## Git

- Run `git status --short`, then inspect exact tracked and untracked changes.
- For each group, run `git add -- <paths>`, review `git diff --cached`, then `git commit -m "type(scope): description"`.
- Never stage unrelated paths.
- Verify each commit with `git log -1 --format='%H | %s'`.

## Jujutsu

- Run `jj --no-pager diff --git` once to inspect changes.
- Never use raw git commands in a `.jj` repository.
- For mixed changes where each path belongs to one concern, identify an explicit path group and run exactly `jj commit -m "type(scope): description" <paths>` once per group. This commits only selected paths and leaves remaining changes in the new working copy.
- When one path contains multiple concerns, require `jj-hunk`. If it is unavailable, stop with `NEEDS_INPUT:` rather than using an interactive command.
- Create a unique work directory under `/tmp/pi-coding-agent/commit-changes/`. Run `jj-hunk list --rev @ --format json` and inspect every diff block in the affected paths.
- Select only complete blocks for one concern. Create an ID-based JSON spec using full IDs from current list output and `"default": "reset"`. Never use indices, queries, configured hunkset aliases, or a spec from an earlier working-copy state.
- Validate spec with `jq empty`, then preview it with `jj-hunk list --rev @ --spec-file <spec> --format json`. Inspect preview and stop unless it contains exactly intended non-empty selection.
- Commit previewed selection with `jj-hunk commit --spec-file <spec> "type(scope): description"`. Unselected blocks remain in working copy. Re-run `jj-hunk list` and build fresh spec before every later hunk commit because IDs become stale after each commit.
- If `jj-hunk` reports unsupported input, empty selection, stale IDs, or any error, do not retry blindly. Inspect status, diff, and log, then return `NEEDS_INPUT:` unless state and safe next action are certain.
- For all remaining whole paths, use `jj commit -m "type(scope): description" <paths>`. Omit paths only when intentionally committing every remaining change and all remaining paths serve one concern.
- Never use `jj split`, `jj restore`, or interactive commands.
- After each successful commit, capture created change ID from `@-`. After all commits, verify every created revision with one `jj --no-pager log` invocation.

Run final status check. Output one exact line per commit:

`COMMITTED: <hash-or-change-id> | <type(scope): description> | status: ok`

If no commit was made, output one clear `ERROR:` or `NEEDS_INPUT:` line. Keep final response terse.
