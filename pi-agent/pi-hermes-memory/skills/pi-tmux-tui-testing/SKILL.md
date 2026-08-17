---
name: "pi-tmux-tui-testing"
description: "Test pi-coding-agent extension/TUI changes via tmux sessions — headless mode doesn't exercise UI code paths (footers, widgets, rendering)"
version: 1
created: "2026-08-17"
updated: "2026-08-17"
---
## When to Use
Testing pi-coding-agent extensions or footer/TUI changes where rendering matters — setFooter, FooterComponent patches, widgets, commands. Also for debugging pi extension runtime internals (exports, bundled binary inspection).

## Procedure
1. Headless smoke test first (fast, catches import/load errors): `pi -p -e /path/to/ext.ts "hi" >/dev/null 2>&1` — extension side effects (writeFileSync to /tmp log) prove it loaded. Does NOT exercise footer/widget rendering.
2. TUI test in tmux: `nix run nixpkgs#tmux -- new-session -d -s pitest -x 200 -y 40 'pi 2>/dev/null'` (tmux not in PATH on this NixOS host; use nix run).
3. Wait for render: `sleep 7-8`, then `nix run nixpkgs#tmux -- capture-pane -t pitest -p | tail -5` (or grep for expected output, e.g. footer branch text).
4. Interact: `nix run nixpkgs#tmux -- send-keys -t pitest '/cmd' Enter`, sleep, capture-pane again.
5. Cleanup: `nix run nixpkgs#tmux -- kill-session -t pitest 2>/dev/null` before each new run — stale session breaks reuse.
6. Run tmux from the target repo cwd so pi picks up project context; footer shows cwd-based state (jj bookmark etc.).

## Pitfalls
- Headless `pi -p` passes but TUI fails (or vice versa): UI-only code paths (ctx.ui.setFooter, FooterComponent.render, widgets) never execute headless. Always tmux-verify UI changes.
- No stderr visible in tmux session: redirect stderr to file (`'pi 2>/tmp/err.log'`) and read after.
- Debug inside extension: temporarily add `appendFileSync('/tmp/<name>.log', JSON.stringify(x)+'\n')` to the extension, run TUI, read log, then revert. Only reliable way to see runtime state of footer patches.
- Footer greps can miss because ANSI codes split text — grep loosely (single keyword), or grep -a. Capture full pane and eyeball `tail -3`.
- pi binary is a compiled bundle: check available exports/symbols with `strings <path>/pi | grep -n 'ClassName'` where path = `$(readlink -f $(which pi))/libexec/pi`. Docs live at same path: docs/extensions.md, docs/tui.md, examples/extensions/.
- sleep <6s → pane shows splash/loader, not settled UI. 7-8s safe on this host.

## Verification
1. capture-pane shows expected footer/widget output (e.g. `~/repo (main⇡1)` not `(detached)`).
2. No errors in stderr log file.
3. Extension temp debug logging removed; final source clean.