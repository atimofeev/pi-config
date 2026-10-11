---
name: "audit-waf-proxy-header-privacy"
description: "Audit AWS WAF samples when a proxy endpoint should use X-Session-ID without X-Forwarded-For; explain no-XFF counter gaps and forwarded client-IP leakage."
version: 2
created: "2026-10-05"
updated: "2026-10-05"
---
## When to Use
A CloudFront/WAF endpoint should conceal end-user IPs behind client-side proxies and use session headers, or a no-XFF count is lower than total requests. Perform read-only observation unless a separate change is explicitly approved.

## Procedure
1. Resolve exact distribution aliases, live WebACL ARN, account/profile and CLOUDFRONT scope in us-east-1. Retrieve only safe distribution fields; exclude secret custom origin header values.
2. Inspect live rule priorities and exact size/header predicates. Count rules are nonterminating; counters after terminating rules do not cover all traffic. Not(Size GT 1) is not strict header absence.
3. Fetch samples for session and brand counters using exact metric names, not an assumed ALL metric. API supports MaxItems up to 500 and previous three hours; population is limited to first 5000 requests. Narrow to a completed 15-minute window and record returned window plus actual sample timestamp bounds.
4. Attribute brands using exact Host aliases or independently configured URI brand identifiers. Report per-rule sample groups separately; they may overlap. For sparse brand-session traffic, sample the brand counter and classify session presence within it.
5. Keep raw responses in a task-specific temporary directory mode0700 with files0600. Emit only aggregate header presence/length classes and IP relationships, never session IDs, cookies, authorization, client IPs or query values.
6. For XFF plus session, validate IP tokens and compare first/last XFF to WAF peer and CF-Connecting-IP. CF-Worker can identify an upstream Worker zone; Cloudflare's special cross-zone IP is 2a06:98c0:3600::103. Distinguish forwarded-address evidence from independent proof of real-user identity.
7. Query synchronized AWS/WAFV2 AllowedRequests and BlockedRequests with Rule=ALL and per-rule CountedRequests. Discover actual dimension sets on empty results: CloudFront metrics can omit Region instead of publishing Region=Global. Never interpret an empty metric response as zero.
8. Inspect API origin-request policy and edge-function associations. AllViewerExceptHostHeader forwards XFF and session; CloudFront additionally appends the TCP viewer/proxy IP for origin delivery. Audit alternate visitor-IP headers, and separately confirm backend geo behavior before claiming BO impact.

## Pitfalls
- Sampling is not a traffic census; requested windows may exceed effective sample coverage, and counts from separate rules must not be added as unique requests.
- Count-action sample records do not prove the final request was allowed or reached the origin.
- BLOCK-only logging cannot establish behavior across allowed traffic; logging redaction does not necessarily redact sampled requests.
- Missing session or XFF on static assets or OPTIONS differs from missing headers on bet API traffic; separate these populations before recommending enforcement.
- A proxy or Cloudflare Worker can forward real client-address headers even though WAF's TCP peer is a proxy. Omitting XFF alone may leave CF-Connecting-IP or other identity headers.
- Avoid asserting end-user identity or geo impact solely from an IP chain. Conditional findings must stay conditional.
- One WebACL can serve multiple CloudFront distributions, including distributions with no aliases. Resolve every attached distribution and its comment/domain; metrics combine their traffic. A cloudfront.net Host alone is not unattributable traffic or proof of bypass.
- Numeric brand IDs identify routed brands, not authenticated senders. Origin/Referer and Host provide corroboration, not trusted authentication; retain unknown display names rather than guessing.
- No-XFF counters also include empty or short values under size predicates. Confirm actual absence in raw samples. Missing forwarded-IP headers skip forwarded-IP aggregation; separate source-IP fallback rules may still protect traffic but lose end-user granularity.
## Verification
1. Recompute brand/session/XFF aggregates directly from saved raw responses without printing sensitive values.
2. Verify live ACL priority zero and exact predicate before relating no-XFF counter complement to WAF total.
3. Use published CloudWatch dimensions and aligned UTC windows; ensure AllowedRequests plus BlockedRequests population is appropriate to ACL actions.
4. State observed brand verdicts, sample limitations, actual time windows, and whether backend/BO attribution was inspected.
5. Confirm no infrastructure/state changes occurred and evidence permissions remain private.