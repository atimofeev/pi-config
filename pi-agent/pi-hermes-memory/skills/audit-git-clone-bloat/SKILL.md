---
name: "audit-git-clone-bloat"
description: "Investigate huge Git clone transfers or repository packs by identifying oversized historical blobs, their compressed contribution, introduction/deletion commits, and retained refs."
version: 2
created: "2026-10-05"
updated: "2026-10-05"
---
## When to Use
A small source repository clones hundreds of MiB or GiB; user asks why Git history is huge. Read-only diagnosis before cleanup.

## Procedure
1. Activate VCS safety guidance; resolve target repo and actual object storage, including submodule gitdir or alternates. Do not use Git mutations in a Jujutsu repo.
2. Measure pack bytes and git count-objects -v; check full vs shallow/partial clone and local refs. Clone progress percentage counts objects, not bytes.
3. Map reachable objects with git rev-list --objects --all and cat-file --batch-check, then rank blob sizes. Use verify-pack -v once to get packed contributions; sum offending entry sizes against actual pack bytes.
4. Trace offending paths with git log --all --name-status; verify blob IDs and sizes via cat-file -s, addition/deletion commits, absence/presence at HEAD, and containing refs.
5. Inspect relevant .gitignore and build configuration without reading binaries or secret state. Distinguish generated caches committed to Git from CI artifact storage.
6. Report exact paths, raw/packed sizes, responsible commits and why deletion did not shrink reachable history. Recommend prevention and optional shallow/partial client workaround; propose coordinated rewrite only with explicit approval.

## Pitfalls
- A filename that looks like a hash is not necessarily its Git blob ID.
- Repeated additions of identical content reuse the same blob; do not double-count them.
- A historical blob version does not imply its path is absent at HEAD. Check path presence separately from whether HEAD contains that exact object ID.
- Deleting files or ordinary GC/repack cannot remove blobs still reachable from ancestors. Local refs do not reveal server-hidden refs.
- Current pack contributions are not exact post-rewrite size predictions. Hosting retention/GC may delay server storage reduction.
- Many raw versions of access-list/config data may total GiB but delta-compress to tiny packs. Rank clone bloat by measured packed bytes, not raw aggregates.
- Vendored Helm dependencies, deployment packages and intentional infrastructure backup exports are not automatically disposable. Distinguish current required artifacts from historical-only generated output.
- Historical Terraform states/plans merit security review even when packed size is small; do not inspect or print contents without appropriate scope, and do not claim confirmed secret exposure from filenames alone.
- Never rewrite history, force-push, prune, or fetch during a read-only investigation.
## Verification
1. Reproduce offending raw blob sizes, exact history status and HEAD absence/presence with independent read-only commands.
2. Confirm packed-byte totals explain the measured transfer and isolate remaining small content.
3. Verify repository working tree remains unchanged; retain detailed evidence outside repository under the task artifact directory.