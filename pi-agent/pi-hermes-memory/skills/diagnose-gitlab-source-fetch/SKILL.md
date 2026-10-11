---
name: "diagnose-gitlab-source-fetch"
description: "Diagnose slow GitLab CI Getting source/get_sources clone or fetch despite GIT_DEPTH: compare job section timestamps, effective depth, config includes, full-history packs versus current tree, and artifact-only checkout skips."
version: 1
created: "2026-10-07"
updated: "2026-10-07"
---
## When to Use
User reports slow GitLab CI repository fetching or shallow-clone changes not taking effect. Read-only investigation; do not edit runner settings or rewrite history without request.

## Procedure
1. Activate VCS safety; inspect CI entrypoint and included configuration ref. Local included-file edits may not apply to branch pipelines if include is pinned to master. Preserve existing changes.
2. Use authenticated glab API GET to inspect project ci_default_git_depth/build_git_strategy and 2-3 recent successful job traces. glab api may lack --jq; pipe JSON through jq instead. Store traces with restricted permissions under task artifact directory.
3. Compare timestamped prepare_executor, prepare_script, get_sources and restore_cache sections. Within get_sources, compare Created fresh repository to Checking out, then section end. This distinguishes network/server work from checkout and adjacent cache time.
4. Verify effective depth via Runner-version source: positive depth emits Fetching changes with git depth set to N; depth <=0 emits Fetching changes. Fresh repository means fetch is initial full transfer, not incremental reuse.
5. Measure local pack bytes and HEAD file sizes; use audit-git-clone-bloat skill for historical dominant objects. Never equate local full-history packs or raw blob totals with measured CI wire transfer.
6. Prioritize activating shallow depth, then GIT_STRATEGY: empty for source-free artifact jobs and cache: [] where node_modules is unused. Re-measure after publish. Avoid history rewriting unless separately approved.

## Pitfalls
- --no-tags disables automatic tag following, not explicit refs/tags/* refspecs. Inspect actual requested refs; few tags offer little upside.
- Partial clone with full checkout may fetch all needed blobs anyway; fetch strategy cannot reuse ephemeral workspaces.
- Depth 1 may affect queued/retried old commits or history-dependent scripts. Verify actual job dependencies and commands.
- Never print API secrets or full traces; scripts may contain credentials.

## Verification
1. Actual traces support timings and effective depth interpretation for installed Runner version.
2. Current-tree versus historical size claims reproduced from object metadata.
3. No repository changes beyond pre-existing edits; post-change improvement reported only after new CI job measurement.