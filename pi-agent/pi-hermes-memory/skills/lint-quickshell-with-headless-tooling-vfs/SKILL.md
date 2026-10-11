---
name: "lint-quickshell-with-headless-tooling-vfs"
description: "Run strict DankMaterialShell/Quickshell QML lint without launching desktop shell: generate missing .qmlls.ini and native tooling VFS using isolated offscreen Scope probe."
version: 1
created: "2026-10-10"
updated: "2026-10-10"
---
## When to Use
make lint-qml requires Quickshell tooling VFS (.qmlls.ini buildDir and qs/qmldir), but launching actual desktop shell would disrupt user's session. Tested with Quickshell 0.3.1 and Qt 6.11.2.

## Procedure
1. Read repository lint script; inspect existing .qmlls.ini and stop before overwriting user-owned or stale symlinks. Prefer clean isolated workspace.
2. Create artifact probe QML: import QtQuick; import Quickshell; Scope { Component.onCompleted: Qt.callLater(() => Qt.quit()) }. Place a newly-created temporary symlink to it inside actual QML config directory, so native VFS maps that directory as qs.
3. Touch ignored .qmlls.ini only if absent. Create isolated XDG_RUNTIME_DIR under artifact root with mode 700.
4. Run only probe via timeout 15s env -u DISPLAY -u WAYLAND_DISPLAY -u DBUS_SESSION_BUS_ADDRESS QT_QPA_PLATFORM=offscreen XDG_RUNTIME_DIR=<isolated> qs -p <config-dir>/<probe-link>. Never run shell.qml, DMSShell.qml or DMSGreeter.qml, and never kill production instances.
5. Inspect generated .qmlls.ini: buildDir must exist with qs/qmldir, importPaths must include actual runtime Qt/Quickshell modules. Preserve isolated runtime until lint completes.
6. Remove only newly-created probe symlink. Run native repository make lint-qml with Qt6 qmllint available; save exact log and exit. Check tracked diff excludes probe/config/runtime artifacts.

## Pitfalls
- Quickshell writes tooling configuration only when .qmlls.ini already exists. nix develop may touch it but does not populate VFS alone.
- Passing a probe from unrelated directory generates qs module for wrong root; link probe inside repository's actual config directory.
- Do not fabricate VFS qmldir files or suppress warnings just to pass lint. Use native generated metadata and strict repository command.
- Tooling VFS under isolated runtime must remain alive on disk through lint; cleanup runtime afterwards makes .qmlls.ini stale.
- Project formatter wrapper may invoke raw Git/staging. In JJ workspace, import its LSP helpers and use read-only formatting comparison instead of running Git-oriented main().

## Verification
1. Probe exit zero, with no display/D-Bus session connection and no production shell execution.
2. Native .qmlls.ini references existing qs/qmldir; strict make lint-qml exits zero without warnings.
3. No tracked tooling artifacts or unrelated edits; production session untouched.