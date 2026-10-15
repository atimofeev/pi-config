---
name: "compare-agent-memory-systems"
description: "Compare agent-memory extensions and self-hosted memory platforms for personal/laptop, homelab, and multi-user work teams using current source, actual installed behavior, isolation and operational evidence."
version: 1
created: "2026-10-14"
updated: "2026-10-14"
---
## When to Use
Use when evaluating memory extensions versus memory servers, selecting a shared team memory backend, or checking whether a memory system needs cloud infrastructure. Research only unless deployment is separately requested.

## Procedure
1. Identify installed extension version and config separately from upstream default branch, HEAD and latest release. Search package metadata at exact paths before broad filesystem discovery.
2. Inspect each product independently: persistence, retrieval algorithm, automatic recall, automatic extraction, explicit writes, context takeover, skills and source-of-truth export. Prefer official source and authenticated repository tooling.
3. Separate stored memory, always-injected context, user-authored standing instructions and searchable session history. Check active memory mode before interpreting character limits or consolidation behavior.
4. Verify native client integration versus model-proxy routing. Establish whether credentials, OAuth, provider-specific protocol features, tool approvals and compaction remain with the client. Do not infer compatibility from OpenAI-compatible labeling.
5. For teams, inspect credential-bound identity, tenant/user enforcement, retrieval filters, ACL defaults and revocation consistency. Distinguish project/task filters from authorization, and ordinary user privacy from operator access.
6. Record minimal local stack, required models, data sent to model providers, licensing per component, backup consistency, retention and deletion coverage. Avoid invented RAM sizing and vendor benchmark rankings.
7. Recommend separately for personal memory, shared knowledge retrieval and team operations. Propose a small evaluation using real tasks, paraphrases, corrections, unauthorized access attempts, provider outages and backup restores.

## Pitfalls
- Documentation indexes can point to a feature branch that is actually the default branch, or describe obsolete architecture. Verify rather than assuming main is current.
- A feature described on HEAD may not exist in the latest release. Record the distinction and inspect implementation when docs conflict.
- Automatic capture is not guaranteed extraction, retrieval is not guaranteed recall, and prompt instructions are not authorization.
- A local database does not imply local-only data processing; background review and extraction may send full conversation or memory content to hosted models.
- Do not activate two automatic memory owners simultaneously during evaluation; duplicate capture, conflicting summaries and token overhead can obscure results.
- Avoid reading private memory contents or credentials to assess architecture. Bounded metadata/config/source inspection is enough.

## Verification
1. Confirm decisive claims in actual installed code and upstream source, not only agent summaries or marketing pages.
2. Report inspected versions/commits, primary-source links and any conflicting defaults.
3. State clearly whether runtime integration, isolation, performance and restore tests were run; source review alone does not prove production readiness.