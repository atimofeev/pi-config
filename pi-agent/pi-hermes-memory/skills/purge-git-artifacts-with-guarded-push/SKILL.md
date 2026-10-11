---
name: "purge-git-artifacts-with-guarded-push"
description: "Purge oversized generated files from Git history and publish safely using backups, exact force-with-lease, temporary GitLab allow_force_push restoration, and fresh full-clone verification."
version: 1
created: "2026-10-05"
updated: "2026-10-05"
---
## When to Use
User explicitly authorizes removing generated artifacts from Git history and pushing rewritten refs. Requires confirmed offending paths, clean standalone Git repos, and coordinated rewrite warning.

## Procedure
1. Activate VCS safety guidance; verify clean working trees, current HEAD and tree IDs, full local/advertised remote refs and remote URLs. Include symbolic origin/HEAD in expected ref inventory. Abort on real drift.
2. Create unique task artifact directory. Copy entire Git metadata with cp -a --reflink=auto outside repositories; verify backup integrity before any rewrite. Record old heads, trees, refs, remotes and configs. Do not create backup refs in rewritten repos.
3. Use git-filter-repo --path <artifact-directory>/ --invert-paths; use --force only for backed-up, explicitly authorized existing clones. On NixOS obtain git-filter-repo via nix run nixpkgs#git-filter-repo --. Preserve current tracked tree and avoid unrelated ignore changes.
4. Restore origin if filter-repo removed it, but never recreate old remote-tracking refs. Verify clean status, unchanged HEAD tree, removed paths/blobs absent from all reachable history, and reduced object storage.
5. Publish explicit reviewed new object IDs with --force-with-lease=refs/heads/<branch>:<exact-old-remote-oid>. Stop on rejection or drift; never fall back to naked --force.
6. If GitLab protected branches reject force pushes, request separate authorization for temporary allow_force_push. Read authenticated glab API protection snapshots, preserve roles and rules, change only necessary false flags, and use try/finally for restoration even on push errors. Verify original settings exactly restored; leave initially true flags unchanged.
7. After publish verify remote IDs, fetch rewritten refs and restore upstream/default remote HEAD without resets. Fresh full remote clones must have expected heads/trees, no shallow/partial config, missing offending blobs and small packs. Report backup location, collaborator realignment, and possible server retention.

## Pitfalls
- History rewriting changes commit IDs and may remove now-empty commits; no extra normal commit is needed.
- origin/HEAD commonly aliases origin/main; omission from shorthand inventory is not evidence of unexpected changes.
- GitLab allow_force_push may already be true for some projects. Restore each original value, not a blanket false.
- Mark restoration necessary before PATCH; request may succeed even if response handling fails.
- Local Git size-pack includes index overhead; distinguish it from exact .pack transfer bytes.
- Local backups retain original huge objects, and /tmp backups are not durable across cleanup/reboot. Do not delete until rollback window ends.

## Verification
1. Backups validate before mutations; new HEAD trees equal original trees and original working trees remain clean.
2. Actual push output succeeds with exact leases; remote advertised refs equal expected new IDs.
3. Protection GET equals original snapshot including roles, rule IDs and allow_force_push.
4. Fresh full clones exclude all purged paths and blob IDs and show reduced pack sizes.