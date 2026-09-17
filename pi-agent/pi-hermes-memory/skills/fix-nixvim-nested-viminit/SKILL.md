---
name: "fix-nixvim-nested-viminit"
description: "Diagnose nested Neovim failures caused by inherited Nixvim VIMINIT"
version: 1
created: "2026-09-11"
updated: "2026-09-11"
---
## When to Use
Use when Neovim launched from kitty-scrollback, :terminal, or another Nixvim process runs a generated `/nix/store/*-init.lua` and fails to require Nixvim-only plugins such as `lz.n`.

## Procedure
1. Confirm foreground Nixvim exports `VIMINIT` and identify generated init path.
2. Confirm nested command resolves a different `nvim` executable than foreground Nixvim wrapper.
3. Reproduce with nested `nvim --headless +qa` and capture stderr.
4. For kitty-scrollback, add `--env VIMINIT=` to shared `action_alias` so it follows `--copy-env` and overrides inherited value while preserving normal Home Manager startup.
5. Verify empty `VIMINIT` starts nested Neovim without generated-init errors and still loads intended local config/plugins.
6. Evaluate Nix configuration and rebuild/reload Kitty config.

## Pitfalls
- Do not add `lz.n` to unrelated Home Manager Neovim solely to satisfy foreign generated init.
- `--nvim-args --clean --noplugin -n` also works but intentionally drops user configuration; use only when isolated scrollback config is desired.
- Place kitty-scrollback `--env` arguments before `--nvim-args`; everything after `--nvim-args` is forwarded to Neovim.

## Verification
1. Nested Neovim stderr contains no `Error in VIMINIT` or missing `lz.n`.
2. kitty-scrollback plugin remains discoverable under nested Neovim runtimepath.
3. `nix flake check --no-build` or equivalent configuration evaluation passes.
4. Rebuilt Kitty config contains `--env VIMINIT=` in shared action alias.