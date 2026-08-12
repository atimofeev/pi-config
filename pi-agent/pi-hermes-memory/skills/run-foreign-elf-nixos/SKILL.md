---
name: "run-foreign-elf-nixos"
description: "Run dynamically linked npm/vendor Linux binaries on NixOS without modifying them"
version: 1
created: "2026-08-11"
updated: "2026-08-11"
---
## When to Use
Use when an npm or vendor ELF fails on NixOS with `Could not start dynamically linked executable` or missing `/lib64/ld-linux-x86-64.so.2`.

## Procedure
1. Confirm binary interpreter with `readelf -l <binary> | grep interpreter`.
2. Resolve Nix loader and libraries: `ld=$(nix eval --raw nixpkgs#stdenv.cc.bintools.dynamicLinker)`, `glibc=$(nix eval --raw nixpkgs#glibc.outPath)`, `gcc_lib=$(nix eval --raw nixpkgs#stdenv.cc.cc.lib.outPath)`.
3. Run binary directly: `"$ld" --library-path "$glibc/lib:$gcc_lib/lib" "$PWD/path/to/binary" <args>`.
4. For npm scripts that invoke binary internally, run binary-backed step directly, then run remaining script steps separately.

## Pitfalls
- Do not patch interpreter or rpath inside node_modules when repository forbids node_modules edits.
- `nix run nixpkgs#biome` may provide mismatched version and reject newer config schema.
- `nix run nixpkgs#nix-ld -- <binary>` may fail; direct glibc loader invocation is deterministic.

## Verification
1. Binary exits successfully without NixOS stub-ld error.
2. Tool reports expected version or completes intended check.
3. Repository source remains unchanged except intended tool output.