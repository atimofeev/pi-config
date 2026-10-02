---
name: "resolve-jj-superset-divergence"
description: "Resolve Jujutsu divergent variants when one tree strictly contains the other without losing concurrent edits"
version: 1
created: "2026-10-02"
updated: "2026-10-02"
---
## When to Use
Concurrent Jujutsu operations create divergent versions of one change, and comparison proves one variant is a strict superset. Not for variants with complementary or conflicting edits.

## Procedure
1. Load Jujutsu skill. Inspect jj --no-pager status, log -r divergent(), parents, descriptions, and exact commit IDs.
2. Compare variants using jj diff --from <redundant-commit-id> --to <retained-commit-id> --git. Confirm all differences are intended additions and retained tree contains every unique edit. Check redundant variant has no descendants requiring preservation.
3. Save variant diff, retained change diff, operation log and working-tree hashes under task artifact directory.
4. If retained variant is current working copy, run jj abandon <redundant-commit-id> targeting immutable commit ID, not ambiguous change ID. Do not create/describe commits unless separately requested.
5. Verify divergent() is empty, retained working-copy commit and parent are unchanged, and working-tree hashes match. Confirm user edits now inherited from parent remain present.

## Pitfalls
- Changed working-copy revision does not imply edits vanished; user may have moved them into parent concurrently.
- Do not discard a variant with unique changes or meaningful metadata without merging/preserving them.
- Abandon may rebase descendants; inspect first.
- Never use raw Git or destructive restore/reset to repair divergence.

## Verification
1. jj log -r divergent() returns no revisions.
2. Current commit/parent and all relevant file hashes match retained variant.
3. User changes and original commit boundaries remain intact.