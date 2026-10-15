---
name: "configure-herdr-zoxide-workspace-popup"
description: "Configure Herdr new-workspace shortcut with zoxide/fzf directory popup and Terminal plus agent tabs when native default workspace templates are unavailable."
version: 3
created: "2026-10-15"
updated: "2026-10-15"
---
## When to Use
User explicitly asks for Herdr workspace directory selection, zoxide integration or automatic default tabs; configuration-only setup must not inspect or mutate live sessions from outside Herdr.

## Procedure
1. Check installed herdr --version, --default-config and config check --help. Inspect version-tagged source instead of assuming cloned main matches the installed binary.
2. Verify supported TOML keys.command popup fields and CLI workspace/tab/pane response schemas through --help and tagged source; avoid invoking mutating subcommands without --help during discovery.
3. Preserve existing live config and back it up under /tmp/pi-coding-agent/<task-name>/. Disable the built-in new_workspace binding before assigning its chord to a popup command.
4. Use a small helper invoked by the popup: query zoxide, select with fzf, cancel before mutations on Escape or no match, validate selection, then create a new workspace with explicit cwd and no-focus.
5. Parse opaque IDs from workspace creation, rename its initial tab rather than adding an extra shell tab, create the agent tab in the returned workspace, and launch the requested command only in its returned root pane. Focus the new workspace last.
6. Validate native TOML and helper syntax. Mock subprocess calls to cover selection, cancellation, dependency errors, quoted paths and partial API failures. Ask user to exercise the popup inside Herdr if not already in a genuine Herdr pane.

## Pitfalls
- Custom commands of type shell have null standard streams and cannot host interactive fzf; use type popup.
- Herdr popup commands receive HERDR_SOCKET_PATH, HERDR_BIN_PATH and HERDR_ACTIVE_* context. Do not spoof HERDR_ENV to bypass restrictions on direct live-session control.
- CLI help without a nested subcommand is safe; commands like workspace create without arguments mutate live state.
- Herdr 0.9.3 pane run calls send_ok_request and returns exit 0 with EMPTY stdout on success. Parse JSON only for workspace/tab creation calls that need returned IDs, not quiet mutators. Test doubles must reproduce this empty stdout or they hide JSONDecodeError regressions.
- If pane run succeeded but later parsing failed, the command was already submitted. Existing workspace may contain a running agent; do not blindly retry the shortcut or launch a duplicate.
- Never infer workspace/tab/pane identifiers or target the user's focused pane. Keep partially created workspaces on errors rather than destructive cleanup or blind retries.
- Saved sidebar visibility can override sidebar_start_collapsed; minimal sidebar settings include sidebar_collapsed_mode="hidden".
- Passing raw paths through shell strings risks quoting errors. Prefer subprocess argv and parse returned JSON; fzf output must be a current directory from the candidate list.
## Verification
1. herdr config check reports config: ok without keybinding collision diagnostics.
2. Run actual installed fzf with the helper's exact argv plus --filter, verifying selection output and no-match status. Mocked subprocess tests do not validate external CLI flags. Use --no-expect to disable expected-key output; --expect= fails with "key names required" on fzf 0.72.0.
3. Mocked tests show only fresh workspace IDs are targeted and Escape/no-match performs zero Herdr mutations.
4. State clearly whether the real popup was exercised; mocks and config parsing do not prove live TUI behavior.