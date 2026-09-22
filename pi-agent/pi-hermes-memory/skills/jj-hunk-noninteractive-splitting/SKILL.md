---
name: "jj-hunk-noninteractive-splitting"
description: "Split same-file Jujutsu changes into atomic commits noninteractively with jj-hunk"
version: 1
created: "2026-09-22"
updated: "2026-09-22"
---
## When to Use
Use when a Jujutsu working-copy commit contains multiple independent concerns in the same changed path and interactive `jj commit -i` or `jj split` is unavailable or unsafe for automation.

## Procedure
1. Run `jj-hunk list --rev @ --format json` and inspect complete diff blocks.
2. Create a fresh JSON spec with full hunk IDs and `"default": "reset"`; never reuse IDs after working-copy state changes.
3. Validate JSON, then preview with `jj-hunk list --rev @ --spec-file <spec> --format json`.
4. Confirm preview is non-empty and contains exactly one logical concern.
5. Run `jj-hunk commit --spec-file <spec> "type(scope): description"`.
6. Re-list hunks and create a new spec before each later commit.
7. Verify resulting revision diffs and final working-copy status with read-only `jj` commands.

## Pitfalls
- jj-hunk selects complete diff blocks, not arbitrary lines; intertwined concerns in one block still require manual editing.
- Do not use indices, content queries, or repository-defined hunkset aliases for agent commits when exact full IDs are available.
- A valid empty selection is a no-op; detect it before reporting a commit.
- On stale IDs, unsupported input, interruption, or nonzero exit, inspect status, diff, and log before retrying.
- Keep temporary specs under `/tmp/pi-coding-agent/<task>/`, never inside target repository.

## Verification
1. Each created commit diff contains only intended concern.
2. Unselected hunks remain in working copy until committed separately.
3. Working copy is empty when all intended concerns are committed.
4. Commit descriptions and change IDs match planned commit groups.