---
name: "pi-update-extensions-nixos"
description: "Fix pi update --extensions native build failures on NixOS (node-gyp-build missing)"
version: 2
created: "2026-06-20"
updated: "2026-06-21"
---
## When to Use
Use when `pi update --extensions` fails on NixOS with `node-gyp-build: command not found`, `sh: line 1: node-gyp-build: command not found`, npm code 127, or tar ENOENT errors on node_modules. Also use when better-sqlite3, tree-sitter-bash, or koffi fail to build/install.

## Procedure
1. Wipe corrupted install: `rm -rf ~/.pi/agent/npm/node_modules ~/.pi/agent/npm/package-lock.json`
2. Enter nix shell with build tools: `nix shell nixpkgs#node-gyp-build nixpkgs#python3 nixpkgs#gcc nixpkgs#pkg-config -c bash`
3. Run `npm install --legacy-peer-deps --no-audit --no-fund` from `~/.pi/agent/npm`
4. Approve native build scripts: `npm approve-scripts better-sqlite3 tree-sitter-bash koffi @google/genai protobufjs` (or whatever npm lists as pending)
5. Run `npm rebuild --legacy-peer-deps` to trigger native builds
6. Verify native modules load: `node -e "require('better-sqlite3');require('tree-sitter-bash');require('koffi');console.log('ok')"` from the npm dir
7. Exit nix shell and run `pi update --extensions` to confirm

## Pitfalls
Pi agent paths: npm modules at `~/.pi/agent/npm/node_modules/` (NOT `~/.pi/npm/lib/...`). User agents at `~/.pi/agent/agents/`. Extensions at `~/.pi/agent/extensions/`. `@tintinweb/pi-subagents` has no builtin agent `.md` files (defaults embedded); its `/agents` command comes from the installed package, no user extension needed.
## Verification
1. `pi update --extensions` exits 0 and prints 'Updated packages'
2. `node -e "require('/home/atimofeev/.pi/agent/npm/node_modules/better-sqlite3')"` loads without error
3. `ls ~/.pi/agent/npm/node_modules/better-sqlite3/build/Release/better_sqlite3.node` exists
4. `find ~/.pi/agent/npm/node_modules/tree-sitter-bash/prebuilds/linux-x64 -name '*.node'` returns a file