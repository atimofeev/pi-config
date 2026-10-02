---
name: "migrate-shared-waf-ipsets"
description: "Change shared AWS WAF IP-set authorization safely across ACLs with mixed default actions and renderer-controlled priorities."
version: 1
created: "2026-10-02"
updated: "2026-10-02"
---
## When to Use
When changing AWS WAF path authorization across multiple ACLs, replacing shared IP sets, or deleting an IP set referenced from independently managed stacks.

## Procedure
1. Inventory consuming ACLs, default actions, early terminating allow rules, IP-set consumers, and account/state fan-out. Confirm approved VPN egress ranges rather than guessing from names.
2. Inspect actual template renderer and pinned/cached module implementation. Some renderers replace YAML Priority with list-order-derived values; enforce deny-before-allow at the real ordering boundary.
3. For restricted resource paths, place a deny for matching path AND NOT approved IPs before broad allow rules. Add authorized allows only where needed by default Block; preserve existing rate and managed-rule controls.
4. Use identical URI matching and text transformations in allow/deny rules. Test percent-encoded suffixes with URL_DECODE when origins decode URL paths; do not assume transformations are global.
5. If shared VPN sets include retired addresses needed by unrelated consumers, use an explicitly maintained dedicated authorization set instead of removing shared entries globally.
6. Stage live lifecycle: create replacement IP sets while retaining old sets; deploy reviewed ACL plans; verify no live old references; delete obsolete sets through reviewed plans. Shared fileset deletion can fan out to many accounts.
7. Run focused path/IP/order regression tests, YAML lint, OpenTofu formatting, backend-independent init/validate, then approved real-backend plans. Keep source provider versions, locks, and backends unchanged.
8. For isolated static validation, copy code and cached modules/providers into task artifacts. If copied backend metadata makes init -backend=false require HTTP address, use a clean TF_DATA_DIR containing modules/providers only, retaining real backend declarations; never replace backend or disable locks for plans.

## Pitfalls
- An Allow rule does not restrict access in a default-Allow ACL; an early office allow can bypass a late map restriction.
- Dedicated IP sets need explicit maintenance when approved VPN ranges change.
- Deleting old IP-set definitions before updating independently managed live ACLs causes ResourceInUse failures; one final source diff may require staged rollout.
- Cached provider installation may produce a temporary lockfile; keep it in isolated validation artifacts, not as an unrelated source version change.
- Local statement evaluators and validate do not prove deployed WAF behavior. Verify real rendered plans and endpoint access from allowed and denied networks.

## Verification
1. Unauthorized public, home, retired proxy, office-only, and IPv6 requests hit early deny; approved VPN addresses reach existing security controls and intended allow/default action.
2. Ordinary JS/static requests do not match map guard; root, hashed, nested, and percent-encoded map cases behave consistently.
3. Review actual rendered priorities and IP-set ARNs in saved per-account plans. Preserve reviewed plans and pre-change templates.
4. Rollback recreates any deleted old IP sets before restoring ACL references from reviewed rollback plans.