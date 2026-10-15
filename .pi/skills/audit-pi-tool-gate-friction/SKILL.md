---
name: "audit-pi-tool-gate-friction"
description: "Audit Pi session JSONL for delegation/tool gates, repeated self-authorization, blocked direct calls, and routing overhead across latest user-facing sessions."
version: 1
created: "2026-10-21"
updated: "2026-10-21"
---
## When to Use
Use when Pi tool/delegation gate seems to add retries or ritual authorization. Measure actual session behavior before changing policy. Not a security audit or a way to authorize sensitive operations.

## Procedure
1. Locate exact gate extension and canonical prompt rules; record state transitions, reset events, allowlists, and whether tool_call or successful tool_result grants access.
2. Freeze requested session cohort before spawning audit workers. Rank by actual stored activity timestamps, not filename creation or mtime alone. Separate worker sessions using installed subagent metadata; parentSession can indicate a legitimate user fork.
3. Parse JSONL records, not grep counts. Count real assistant toolCall blocks and matching toolResult messages. Distinguish real user messages from custom_message reminders and worker notifications.
4. Recognize blocks from anchored result text and inspect authorization details. Preserve session IDs, entry IDs and line references. Check blocks after delegation, repeated auth, and block-to-auth-to-retry sequences.
5. Deduplicate inherited fork/clone events when needed. State whether examining entire historical file or active parentId branch. Inspect nestedCalls on tool results when available; lexical codemode calls alone do not prove execution.
6. Extract only bounded task excerpts and gate metadata into temporary artifacts. Redact secrets and personal/work identifiers; never dump full tool outputs, credential files, image data or opaque thinking signatures.
7. Independently reconcile aggregate counts against selected original logs. Review examples of both straightforward work and substantial discovery; invocation counts alone do not establish benefit or causality.
8. Prefer removing ritual gates over adding another model-judged attestation. Keep operational approvals separate from delegation advice, preserve explicit user routing, and test both direct tools and Agent availability after any change.

## Pitfalls
- A failed or irrelevant Agent invocation may unlock gates that grant access in tool_call rather than after success.
- agent_end can fire before automatic recovery or queued work finishes; treating it as user-task completion can force reauthorization inside one request.
- Session_info naming patterns are package-specific; confirm current worker markers rather than assuming all parentSession records are workers.
- Whole-request boolean self-attestation is not a verified security boundary; a 100% pass rate does not by itself prove dishonest assertions.
- Hidden custom reminders persist as history. Reload removes runtime hooks but does not erase historical instructions; a fresh session is cleanest behavioral check.

## Verification
1. Cohort manifest records exact paths, selected IDs, activity cutoff, exclusions and audit scope.
2. Original-log counts reconcile with summary and representative event sequences.
3. Runtime smoke verifies removed gate/tool absent, direct calls work without authorization, and intended delegation tools remain available.
4. Report sampling, nested-tool, branch, timing and causal limitations explicitly.