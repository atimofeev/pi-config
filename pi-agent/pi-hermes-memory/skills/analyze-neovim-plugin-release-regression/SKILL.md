---
name: "analyze-neovim-plugin-release-regression"
description: "Compare Neovim plugin releases and separate logic regressions from highlight palette regressions"
version: 1
created: "2026-09-16"
updated: "2026-09-16"
---
## When to Use
Use when behavior or highlighting works in one Neovim plugin tag but appears broken in a newer tag.

## Procedure
1. Authenticate with gh, inspect both releases and compare commit range.
2. Clone into /tmp/pi-coding-agent/<task>/ and inspect changed files using safe repository tooling.
3. Trace local configuration to identify exact feature, highlight groups, and theme inputs.
4. Diff feature algorithm, renderer/lifecycle plumbing, and highlight definitions separately.
5. Build minimal headless Neovim probes: verify generated extmarks/regions, then print resolved highlight groups under actual theme colors.
6. Compare inline/background salience, not only foreground/background text contrast; inspect tests for missing visual invariants.

## Pitfalls
- Passing unit tests can prove extmarks exist while missing visual regressions.
- Theme-specific custom groups or lazy load order can mask plugin defaults.
- Do not infer algorithm breakage when only palette generation changed.
- Avoid modifying user repository; keep probes and clones under /tmp/pi-coding-agent/<task>/.

## Verification
1. Minimal probe emits expected extmarks and highlight group names for both tags.
2. Renderer probe records expected affected buffer regions.
3. Resolved colors are compared against surrounding line highlight backgrounds.
4. Conclusion maps to exact changed commit and lines, with test coverage gap identified.