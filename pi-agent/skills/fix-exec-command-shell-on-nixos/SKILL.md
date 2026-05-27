---
name: fix-exec-command-shell-on-nixos
description: Diagnose and fix functions.exec_command failures on NixOS when default shell path is missing (for example 'spawn /bin/bash ENOENT') by forcing valid shell path and re-running command.
version: 1
created: 2026-05-18
updated: 2026-05-18
---
## When to Use
- Running Pi `functions.exec_command` on NixOS.
- Command fails before execution with shell spawn error (example: `spawn /bin/bash ENOENT`).
- Need stable shell for subsequent automation commands.
- Do not use for command logic errors inside script (non-shell-resolution failures).

## Procedure
1. Detect failure signature in tool output.
   - Look for pre-exec error like `spawn /bin/bash ENOENT`.
2. Confirm valid system bash path on NixOS.
   - Preferred path: `/run/current-system/sw/bin/bash`.
3. Re-run `functions.exec_command` with explicit shell override.
   - Set `shell` to `/run/current-system/sw/bin/bash`.
4. Re-run original failing command unchanged first.
   - Isolate shell-path issue from command-content issues.
5. If still failing, classify new error separately.
   - Treat as command/runtime error, not shell resolution.

## Pitfalls
- Using default `/bin/bash` on NixOS can fail because path may not exist.
- Changing command and shell simultaneously hides root cause.
- Switching to `sh` may bypass issue but change behavior; prefer explicit bash for parity.

## Verification
- Command no longer fails with `spawn /bin/bash ENOENT`.
- Same command executes and returns normal stdout/stderr + exit code.
- Repeated `functions.exec_command` calls succeed when same shell override applied.