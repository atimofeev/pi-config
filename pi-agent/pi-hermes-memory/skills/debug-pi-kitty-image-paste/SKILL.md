---
name: "debug-pi-kitty-image-paste"
description: "Diagnose and configure Pi image clipboard paste when Kitty owns Ctrl+V"
version: 1
created: "2026-09-15"
updated: "2026-09-15"
---
## When to Use
Use when Pi can read clipboard images but Ctrl+V pastes nothing or text inside Kitty, especially on Wayland.

## Procedure
1. Check Kitty mappings first: a `map ctrl+v paste_from_clipboard` consumes Ctrl+V before Pi receives it.
2. Verify the clipboard independently with `wl-paste --list-types` and `wl-paste --type image/png`; do not infer Pi behavior from an X11-native clipboard reader when Wayland is active.
3. Test candidate keys through real compositor input, not `kitty @ send-key`, because remote send-key bypasses Kitty's keymap.
4. Prefer `alt+v` when Kitty owns Ctrl+V; Kitty's shifted fallback may also capture Ctrl+Shift+V.
5. Configure Pi with `{"app.clipboard.pasteImage":["ctrl+v","alt+v"]}` in `~/.pi/agent/keybindings.json`; user bindings replace rather than append to defaults, so retain Ctrl+V explicitly.
6. Run `/reload` in existing Pi sessions or start a fresh session, then verify image paste creates a `/tmp/pi-clipboard-*.png` path with expected bytes and dimensions.

## Pitfalls
- `kitty @ send-key` is not an end-to-end test of Kitty mappings; it sends directly to the application.
- A native clipboard module can read stale X11 data when both DISPLAY and WAYLAND_DISPLAY exist, while Pi's Linux path uses `wl-paste`.
- Do not remove an intentional Kitty Ctrl+V text-paste binding merely to make Pi's default image action reachable.
- Ctrl+Shift+V may match Kitty's Ctrl+V mapping due to shifted-key fallback.

## Verification
1. `jq empty ~/.pi/agent/keybindings.json` succeeds.
2. With an image-only Wayland clipboard, Alt+V inserts a new `/tmp/pi-clipboard-*.png` path in Pi.
3. The generated temporary image has the clipboard image's expected dimensions.
4. Kitty configuration remains unchanged and Ctrl+V still performs Kitty clipboard text paste.