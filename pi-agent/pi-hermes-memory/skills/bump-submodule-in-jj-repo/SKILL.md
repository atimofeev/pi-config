---
name: "bump-submodule-in-jj-repo"
description: "Quickly bump and atomically commit a Git submodule in a colocated Jujutsu repository"
version: 1
created: "2026-09-23"
updated: "2026-09-23"
---
## When to Use
Use when user explicitly asks to bump/update a Git submodule and commit it in a repository containing both `.jj` and `.git`.

## Procedure
1. Delegate one narrow read-only preflight to identify current gitlink, remote default target, ancestry, nested cleanliness, and staged paths. Do not request broad code or infrastructure analysis.
2. Confirm nested repository is clean and no unrelated paths are staged.
3. Checkout exact verified target commit inside submodule, then stage only submodule path with Git.
4. Because Jujutsu does not snapshot Git submodule changes, create atomic raw Git commit containing only gitlink update.
5. Run one Jujutsu status command to import new Git HEAD and verify working copy preservation.
6. Report old and new SHAs, commit ID, and whether bookmark/push occurred.

## Pitfalls
- Do not run Terraform/OpenTofu init, validate, or plan unless user requested validation or submodule bump itself requires it.
- Do not use broad general-purpose investigation when remote target and submodule path are known.
- Do not leave gitlink merely staged; later Jujutsu synchronization may reset index and Jujutsu commits ignore submodules.
- Stop and ask only when nested repo is dirty, unrelated content is staged, target branch is ambiguous, or unexpected concurrent changes appear.

## Verification
1. `git diff --cached --name-only` contains only submodule path before commit.
2. Committed tree entry has mode `160000` and exact target SHA.
3. `git diff-tree --no-commit-id --name-only -r HEAD` contains only submodule path.
4. `jj st` imports raw Git commit and preserves unrelated working-copy changes.