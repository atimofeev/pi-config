---
name: "audit-waf-source-map-access"
description: "Analyze which AWS WAF WebACLs allow .map source maps: explicit extension rules, default actions, broad path-prefix allows, trusted IP exceptions and renderer priorities."
version: 2
created: "2026-10-07"
updated: "2026-10-07"
---
## When to Use
Read-only audit of source-map exposure in WAF rule configuration. Separate typical static source-map URLs from any URI ending in .map.

## Procedure
1. Map active ACLs to environments, rule lists and effective default actions, including fallback lookups and mismatched keys.
2. Find explicit .map regexes, then inspect all Allow rules for broad prefixes, wildcards, unanchored regexes, host-only conditions and path-independent IP sets. Absence of .map literal does not prove denial.
3. Check extension allowlists: an end-anchored .js rule does not match .js.map. Inspect referenced external regex sets; mark unresolved or live-only sets unknown.
4. Determine actual evaluation order from renderer, not numeric Priority fields in source fragments. Earlier terminating actions can override later intended access.
5. Report public default-allow ACLs, explicit restricted allows, broad-path exceptions and IP exceptions separately, with exact file:line evidence.
6. Clearly label repository analysis versus live AWS verification; use read-only get-web-acl and referenced IP/regex-set retrieval for deployed confirmation.

## Pitfalls
- Do not conclude all other ACLs block .map merely because only one explicit .map rule exists.
- Do not infer source-IP whitelist allows from Count rules.
- Compare approved prefixes literally: /api/web/widget is not beneath /web/widget.
- Inspect unanchored endpoint regexes such as identify and trailing wildcards such as coupon/template/.*; prove a concrete .map URI matches before reporting.
- WAF Allow proves request passes WAF, not file existence or successful origin response. A broad API route matters for map leakage only if origin can serve source maps there.
- Avoid reading backend state or credentials during code-only audits.
## Verification
1. Check every active ACL appears in classification or explicitly unknown group.
2. Verify conclusions against actual source rule conditions and effective default actions.
3. For live audits, confirm deployed rules, priorities, defaults and referenced sets without state mutations.