---
name: "test-neojj-on-nixos"
description: "Run NeoJJ unit, integration, formatting, lint, and type checks on NixOS without relying on mutable global tooling"
version: 1
created: "2026-09-22"
updated: "2026-09-22"
---
## When to Use
Use when validating a NeoJJ checkout on NixOS, especially when `make test` cannot load Plenary or host Neovim configuration interferes with headless tests.

## Procedure
1. Clone `nvim-lua/plenary.nvim` and `nvim-telescope/telescope.nvim` outside the checkout under `/tmp/pi-coding-agent/<task>/`.
2. Create ignored `tmp/plenary` and `tmp/telescope` symlinks in the NeoJJ checkout pointing to those dependency clones.
3. Run tests with `CI=1 TEST_FILES=tests/specs GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null NVIM_APPNAME=neojj-test nvim --headless -u NONE -S './tests/init.lua'`.
4. Format or check Lua with `nix run nixpkgs#stylua -- lua tests` and `nix run nixpkgs#stylua -- --check lua tests`.
5. Run Selene with `nix run nixpkgs#selene -- --config selene/config.toml lua` and typos with `nix run nixpkgs#typos --`.
6. Run Lua type checks with `nix run nixpkgs#luajitPackages.llscheck -- lua/`; compare diagnostics with upstream baseline because current upstream may already contain warnings.

## Pitfalls
- Plain `make test` may inherit host Neovim behavior or fail to update Lua module paths; explicit `-u NONE` plus CI runtime paths avoids it.
- Do not place full dependency clones in tracked paths; use ignored symlinks under `tmp/`.
- Do not treat `lua-language-server --check .` as equivalent to project `llscheck lua/`; diagnostics and scope differ.
- On Jujutsu checkouts, never use raw Git status or branch commands; use `jj --no-pager st`, `jj --no-pager diff --git`, and bookmarks.

## Verification
1. Full Plenary suite exits zero.
2. `stylua --check`, Selene, and typos exit zero.
3. Any llscheck warnings are compared against upstream and no new warnings come from changed files.
4. Real tag integration tests use only temporary repositories and bare remotes.