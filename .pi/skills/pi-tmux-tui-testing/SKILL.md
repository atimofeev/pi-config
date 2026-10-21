---
name: "pi-tmux-tui-testing"
description: "Test pi-coding-agent extension/TUI changes via tmux sessions — headless mode doesn't exercise UI code paths (footers, widgets, rendering)"
version: 2
created: "2026-08-17"
updated: "2026-10-15"
---
## When to Use
Testing pi-coding-agent extensions or footer/TUI changes where rendering matters — setFooter, FooterComponent patches, widgets, commands. Also for debugging pi extension runtime internals (exports, bundled binary inspection).

## Procedure
1. Read installed Pi extension/TUI documentation and relevant examples before building a fixture; inspect CLI help for supported isolation flags.
2. Create artifacts under a task-specific /tmp/pi-coding-agent/ directory. Use isolated HOME and PI_CODING_AGENT_DIR, offline mode, no session, and disabled automatic extension/skill/context discovery. Explicitly load only the fixture and target extension.
3. For provider-driven UI, import the actual extension through a wrapper that captures its registered response callback. Register a dummy provider/model if needed and invoke the callback with synthetic headers during session_start. Do not send an LLM prompt or use real credentials; guard fetch to reject unexpected requests.
4. Start a uniquely named tmux session using nix run nixpkgs#tmux when tmux is missing. Use the target repo cwd only when repository-specific footer state is under test; otherwise use the isolated artifact directory.
5. Signal readiness after actual target UI output is written, using a fixture marker and event-driven filesystem watcher with a bounded timeout. Avoid fixed sleeps or status-polling loops. For long shell runs, use bg_run and await its automatic terminal notification.
6. Capture via tmux capture-pane -e -p to retain ANSI colors. For color fixes, compare effective foreground at target text with the theme dim color or a known dim footer segment, not merely visible text.
7. Redirect stderr to an artifact and inspect it. Remove only the test's own tmux session in finally; never kill a pre-existing named session. Keep fixture instrumentation outside repository production files.
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