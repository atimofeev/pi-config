---
name: "recover-colocated-jj-missing-objects"
description: "Recover colocated Jujutsu repo when working-copy commit/object is missing and jj fails, while preserving notes/files; diagnose sync scripts misusing jj diff --quiet."
version: 1
created: "2026-10-07"
updated: "2026-10-07"
---
## When to Use
Use for `Current working-copy commit not found` or `Object ... of type commit not found` in colocated JJ+Git repos. Reinitialization is fallback only when backing Git history is intact, native recovery fails, and user approves retaining old metadata in backup.

## Procedure
1. Activate Jujutsu skill. Inspect job definition/logs and JJ operation metadata read-only; distinguish missing working-copy commit from missing operation. Do not assume GC caused deletion merely from pack mtimes.
2. Back up whole working tree plus .jj and .git under private task directory; record hashes of all non-VCS files. Check .jj/repo/store/git_target: sandbox copy must point to copied .git, never original object store.
3. Test `jj workspace update-stale` only on copied repo first. It can fail when current target commit is missing; operation-loss recovery documentation is not proof of commit-object-loss recovery.
4. If native recovery fails and intact Git history remains, test moving copied .jj outside sandbox and running `jj git init --colocate` from sandbox directory. Do not use -R pointing to not-yet-initialized repo. Verify files, pending diff, bookmarks, and GC keep refs.
5. Ask approval before replacing live JJ metadata or committing/pushing. Pause automated sync, ensure service inactive and hashes still match backup, archive live .jj, initialize with `jj git init --colocate`, and verify unchanged files. Preserve applicable repo-local settings from archived metadata.
6. For scripts using `if ! jj diff --quiet`, replace with standalone `changes="$(jj diff --name-only)"` then nonempty test. Validate nonempty, empty, and failed-diff branches; failed diff must stop before bookmark/push. Review actual diff and built script.
7. Activate only approved service change; avoid whole-system rebuild when unrelated Nix config edits exist. If targeted persistent systemd drop-in is needed, pin rebuilt store output, document override removal after declarative rebuild. Verify successful sync, fetched remote commit, clean WC, no extra commit on repeated empty run, timer schedule, and unchanged file hashes.

## Pitfalls
- Reinitialization reconstructs JJ state from Git, not old operation log/change IDs or hidden JJ-only revisions. Archive old metadata and tell user this trade-off before acting.
- `jj workspace update-stale` documentation about missing operation is not guarantee that missing current commit can be recovered.
- `jj diff --quiet` exits 0 even with changes. Keep command substitution outside conditional so set -e catches command failure.
- With jj -R, filesets remain relative to shell cwd; cd to repo or use root-prefixed fileset.
- `systemctl start` for Type=simple may return before push completes. Verify Result and logs or use systemctl --wait start for bounded job.
- Persistent systemd overrides continue masking generated units after later NixOS/Home Manager rebuild; remove after patched declarative unit is deployed.

## Verification
1. Pending files match private backup hash manifest before and after recovery/sync.
2. JJ status works, expected pending change set survives, and current working-copy commit has refs/jj/keep pin.
3. Mock tests cover nonempty/empty/error diff; rebuilt script syntax passes bash -n.
4. Successful job exit; fresh JJ fetch confirms main@origin equals approved commit; repeated empty sync adds no commit.
5. Hourly timer active with expected next execution; source patch and targeted override caveat reported.