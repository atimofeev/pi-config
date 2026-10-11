---
name: "migrate-shared-waf-ipsets"
description: "Change shared AWS WAF IP-set authorization safely across ACLs with mixed default actions and renderer-controlled priorities."
version: 2
created: "2026-10-02"
updated: "2026-10-07"
---
## When to Use
When changing AWS WAF path authorization across multiple ACLs, replacing shared IP sets, or deleting an IP set referenced from independently managed stacks.

## Procedure
1. Inventory consuming ACLs, default actions, early terminating allow rules, IP-set consumers, and account/state fan-out. Confirm approved VPN egress ranges or existing allowlist with owner rather than guessing from names. If owner confirms approved-egress is intended VPN allowlist, reuse approved-egress; do not automatically switch to alternate-trusted-egress/alternate-datacenter-egress or introduce dedicated sets.
2. Inspect actual template renderer and pinned/cached module implementation. Some renderers replace YAML Priority with list-order-derived values; enforce deny-before-allow at real ordering boundary.
3. For restricted resource paths, place deny for matching path AND NOT approved IPs before broad allow rules. Add authorized allows where default Block requires them; preserve existing rate and managed-rule controls. In default-Allow ACLs with an early whole-IP allow, later path-specific allows may be unreachable; avoid claiming they collect metrics.
4. Use identical URI matching and text transformations in allow/deny rules. Test percent-encoded suffixes with URL_DECODE when origins decode URL paths; do not assume transformations are global.
5. Check overlapping IP-set memberships. Removal from approved-egress does not revoke membership in alternate-trusted-egress. Explain overlap only when relevant to chosen allowlist; do not widen shared-set removals or add dedicated authorization sets without approval.
6. Stage live lifecycle: create any explicitly approved replacement IP sets while retaining old sets; deploy reviewed ACL plans; verify no live old references; delete obsolete sets through reviewed plans. Shared fileset deletion can fan out to many accounts.
7. Run focused path/IP/order regression tests, YAML lint, OpenTofu formatting, backend-independent init/validate, then approved real-backend plans. Keep source provider versions, locks, and backends unchanged.
8. For isolated static validation, copy code and cached modules/providers into task artifacts. If copied backend metadata makes init -backend=false require HTTP address, use clean TF_DATA_DIR containing modules/providers only, retaining real backend declarations; never replace backend or disable locks for plans.
## Pitfalls
- An Allow rule does not restrict access in a default-Allow ACL; an early approved-egress allow can bypass a late map restriction.
- Dedicated IP sets need explicit maintenance when approved VPN ranges change.
- Deleting old IP-set definitions before updating independently managed live ACLs causes ResourceInUse failures; one final source diff may require staged rollout.
- Cached provider installation may produce a temporary lockfile; keep it in isolated validation artifacts, not as an unrelated source version change.
- Local statement evaluators and validate do not prove deployed WAF behavior. Verify real rendered plans and endpoint access from allowed and denied networks.

## Verification
1. Unauthorized public, home, retired proxy, other-egress-only, and IPv6 requests hit early deny; approved VPN addresses reach existing security controls and intended allow/default action.
2. Ordinary JS/static requests do not match map guard; root, hashed, nested, and percent-encoded map cases behave consistently.
3. Review actual rendered priorities and IP-set ARNs in saved per-account plans. Preserve reviewed plans and pre-change templates.
4. Rollback recreates any deleted old IP sets before restoring ACL references from reviewed rollback plans.