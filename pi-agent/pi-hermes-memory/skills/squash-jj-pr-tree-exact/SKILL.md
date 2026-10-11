---
name: "squash-jj-pr-tree-exact"
description: "Squash GitHub PR in colocated Jujutsu into one commit and guarded force-push while preserving exact reviewed tree and dirty working copies; safe for old merge-based branches."
version: 1
created: "2026-10-10"
updated: "2026-10-10"
---
## When to Use
User explicitly authorizes squash and force-push of an existing PR; working copies must stay untouched and resulting commit must contain exactly the previously reviewed content.

## Procedure
1. Activate Jujutsu and gh-cli skills. Authenticate GitHub. Pin reviewed full head SHA, intended sole base SHA, branch, commit message, PR state, and intended changed paths. Stop on changed refs or unexpected scope.
2. Use --no-pager --ignore-working-copy on every JJ command. Preserve reviewed head with a backup bookmark; do not snapshot or switch existing workspaces.
3. Create isolated revision with jj new --no-edit BASE -m MESSAGE. Capture its change ID from native output; do not assume @ points to it.
4. Restore only intended paths from reviewed head into this new disposable revision with jj restore --from REVIEWED --into NEW PATHS. Resolve resulting full new SHA.
5. Require whole-tree diff REVIEWED -> NEW empty, exactly one parent equal BASE, BASE..NEW containing only NEW, no conflicts, and intended upstream-relative file/stat scope. Verify workspace revisions unchanged.
6. Revalidate authenticated PR head/base and local branch. Fetch only relevant origin branch, require remote still REVIEWED, then move only target bookmark to frozen NEW (allow-backwards only when necessary and authorized).
7. Dry-run explicit remote/bookmark push and require only expected reviewed->new move. Recheck local target, then real native JJ push with remote-state guard; never validation bypasses or raw Git.
8. Verify authenticated remote branch SHA and PR head/count = NEW/one commit, draft state unchanged, backup retained, workspaces unchanged. Do not poll propagation; report discrepancy precisely if PR metadata lags.

## Pitfalls
- jj duplicate of a merge or squash into wrong parent can incorporate upstream history or change reviewed tree; new isolated revision plus restore and full-tree equality avoids this.
- Do not restore into existing working-copy revisions, abandon old history, or use raw Git in JJ repository.
- exact:NAME is a bookmark selector, not a revset. Use quoted revset symbols for branch lookup and exact: only for bookmark-name options.
- Native lease rejects remote changes since fetch. Never silently refetch and retry against a new remote head or add guard-bypass flags.
- Squash changes commit identity, not contents; prior tests establish identical-tree behavior, but new CI runs must not be claimed successful before observed.

## Verification
1. Whole-tree equality empty; sole intended parent; one PR commit; no conflicts.
2. Published branch and GitHub PR head match frozen new SHA; only intended bookmark pushed.
3. Dirty workspaces remain on original revisions; reviewed full head remains reachable via backup bookmark.