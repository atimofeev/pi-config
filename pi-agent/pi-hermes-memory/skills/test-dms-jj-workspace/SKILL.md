---
name: "test-dms-jj-workspace"
description: "Rebuild and verify DankMaterialShell UI features in isolated Jujutsu workspaces on NixOS; fix missing dank-qml-common, SharedSettingsSpec.js ENOENT, and QtQuick.Window import errors."
version: 2
created: "2026-10-10"
updated: "2026-10-10"
---
## When to Use
DMS branch needs a clean rewrite on upstream while original checkout contains unrelated work; or a JJ workspace cannot run DMS shell tests.

## Procedure
1. Read DMS AGENTS plus Jujutsu skill. Recover old feature diff and fetch exact upstream master with jj --ignore-working-copy; preserve original checkout and feature revision.
2. Create isolated JJ workspace under task artifact root. workspace add must update its new working copy: do not pass --ignore-working-copy. If interrupted registration leaves workspace on root, inspect status then jj new <exact-upstream-sha> with explicit description inside new workspace.
3. Prefer current upstream native components, especially LockScreenBackground.qml, over replaying obsolete renderer extraction. SessionData import is qs.DCommon.Session. Keep auth, focus, and session-lock state out of cosmetic changes.
4. JJ does not populate Git submodules. Resolve dank-qml-common from workspace flake.lock using builtins.fetchTree with locked rev and narHash; attach source only through ignored workspace dank-qml-common path. Do not mutate original submodule or use raw git.
5. Run nix shell nixpkgs#qt6.qtdeclarative nixpkgs#lua with Qt QML import paths set to qtdeclarative/lib/qt-6/qml, then python3 quickshell/tests/run-qml.py. Save exact output and exit code. Parse changed QML with qmlformat without -i.
6. Review exact diff and conflicts. Create backup bookmark at old feature SHA before moving feature bookmark to reviewed rebuilt revision. No push without explicit request.

## Pitfalls
- --ignore-working-copy on jj workspace add can register workspace then fail before checkout; inspect existing workspace rather than trying same add blindly.
- Qt qmltestrunner may inherit Quickshell-only QML imports; QtQuick.Window missing indicates environment import path, not feature regression.
- Shell logic needs Lua and shared-QML source; missing SharedSettingsSpec.js means unpopulated submodule.
- DMS AGENTS prohibits tests that slice/mock Modules UI, generated/catalog edits, and extra idle work. Prefer existing logic/Qt tests plus syntax parsing and disclose live compositor gap.
- Moving a local JJ bookmark does not publish it. A github:owner/repo/branch Nix input still resolves old remote head until authorized push and targeted lock update. Explicitly report local-only status.
- If old remote DMS source rejects gpclient overlay patch, first compare locked rev with reviewed rebuilt head. Check actual selected package, not only upstream package, because overlay patch is injected into Go vendor/build phases.
## Verification
1. All existing logic, qt, and lock suites exit zero; changed QML parses.
2. Diff limited to intended files; native wallpaper renderer, auth/focus/DPMS, original checkout, and remote branch unchanged.
3. Rebuilt branch has exact upstream parent; old feature preserved by backup bookmark; jj conflicts() empty.