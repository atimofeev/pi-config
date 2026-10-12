---
name: "resolve-and-squash-fork-pr"
description: "Resolve merge conflicts in GitHub fork PR, squash commits onto current upstream, and force-push safely with exact head-SHA lease."
version: 3
created: "2026-10-06"
updated: "2026-10-12"
---
## When to Use
User explicitly requests conflict resolution, squash, and force-push for existing GitHub fork PR; no need to mutate their working checkout.

## Procedure
1. Activate gh-cli and jujutsu skills; authenticate, inspect PR head owner/branch/SHA and base branch. Locate checkout or create fresh isolated clone under /tmp/pi-coding-agent/<task>/checkout.
2. Fetch upstream base and fork branch. Validate fork head matches recorded PR head. Preserve original head locally and save original PR patch outside checkout.
3. Create resolution branch at fetched upstream base; git merge --squash original-head in Git-only clone. Read conflict plus original patch and upstream intent; resolve only conflicts while preserving both changes.
4. Review staged diff and conflict-marker absence; commit one Conventional Commit. Run affected tests, non-writing lint, and TypeScript check as applicable. Verify tracked working tree remains clean and exactly one commit sits above base.
5. Before push, compare remote fork head to original SHA and remote upstream base to tested base. Stop on changes. Push only exact PR branch with --force-with-lease=refs/heads/<branch>:<original-SHA>. Verify published SHA, one PR commit, and mergeable status through gh.

## Pitfalls
- Never reuse or discard unrelated working-tree edits; fresh clone avoids that risk. Use JJ exclusively if existing checkout has .jj.
- Use mktemp -d under /tmp/pi-coding-agent for fresh isolated clones; fixed task paths may already contain prior work. Never remove existing directories to make room.
- gh repo clone of a fork may automatically add and fetch upstream. Inspect existing remotes before adding upstream to avoid remote-already-exists failures.
- Conflict resolution alone does not require squash or history rewriting. Preserve existing PR commits with an upstream merge and normal fast-forward push unless user explicitly requests squash/rebase.
- gh pr view baseRefOid may lag current upstream tip while PR mergeability is cached; fetched upstream ref identifies current base. Validate branch identity and captured pre-push base, rather than assuming stale metadata is current.
- Do not silently widen lease or overwrite concurrent changes. Never use unguarded --force.
- NixOS bundled native lint binaries may need glibc loader wrapper; do not rewrite vendor binaries. Keep check commands non-writing.
## Verification
1. Diff preserves original PR code, tests and docs plus upstream release notes; no conflict markers or whitespace errors.
2. Affected tests, non-writing lint and type checks exit zero; working tree clean. If PR requires coverage, run coverage and inspect newly introduced branches, not only test pass counts.
3. Remote PR branch equals tested commit; GitHub reports exactly one commit and no conflicts, or explicitly report pending recalculation.
4. Inspect required coverage-service statuses independently of CI jobs: Codecov project delta may fail even when tests and local coverage thresholds pass. Report pending or failed remote checks rather than declaring complete CI success.