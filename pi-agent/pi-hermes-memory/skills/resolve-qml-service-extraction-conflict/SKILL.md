---
name: "resolve-qml-service-extraction-conflict"
description: "Resolve PR merge conflicts after QML singleton extraction: preserve upstream compatibility facade and relocate timer/event logic into new owning service using JJ."
version: 1
created: "2026-10-05"
updated: "2026-10-05"
---
## When to Use
A QML PR adds logic to a singleton that upstream replaced with a compatibility facade or split into separate services.

## Procedure
1. Activate gh-cli and Jujutsu skills; get authenticated PR base/head refs and locate clean target checkout. Fetch exact refs with jj git fetch.
2. Read PR patch and upstream facade plus new owning service. Identify relocated methods and signals before choosing resolution. Keep original remote head reachable.
3. Create local JJ merge of PR head and current upstream with explicit message. Preserve upstream facade exactly; relocate only PR properties, timers, and signal handlers to owning service. No push without explicit approval.
4. Delegate exact replacements with known paths and anchors. Avoid reading enormous conflicted files when upstream replacement already determines resolution.
5. Check actual diff against upstream: only intended additions in new owning service. Confirm jj conflicts() empty and both parents present.
6. Run relevant existing logic and singleton-cycle tests. Test extracted timer and resume handlers in temporary Node VM harness; model root properties consistently. Parse changed QML with installed Qt qmlformat to temporary output, never in-place. Report live suspend/resume as untested unless exercised.

## Pitfalls
- Do not resolve by retaining obsolete combined singleton; that can silently undo upstream refactor.
- Never assign separate VM context properties back onto root after executing root-qualified QML handlers; this can create false retry-reset failures.
- A JJ merge may report working-copy modifications relative to conflicted auto-merge even when resolved tree differs from upstream in only one file.
- Missing AGENTS.md after updating upstream can be expected deletion; don't loop on previous checkout instructions.

## Verification
1. jj log -r '@ & conflicts()' returns no revisions.
2. Facade matches upstream byte-for-byte; upstream-relative diff shows only relocated PR behavior.
3. Retry count and intervals, repeated-resume reset, current power-state evaluation, feature-disabled behavior, and singleton cycles pass.
4. No branch push or unrelated changes.