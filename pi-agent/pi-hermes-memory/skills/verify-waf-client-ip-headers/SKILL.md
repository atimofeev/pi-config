---
name: "verify-waf-client-ip-headers"
description: "Diagnose AWS WAF X-Forwarded-For/session-header gaps, proxy IP leakage and client-IP attribution using private samples and live rule/forwarding evidence."
version: 1
created: "2026-10-05"
updated: "2026-10-05"
---
## When to Use
Use for CloudFront-scoped WAF header diagnostics, proxy-header privacy and suspected client-IP/geo loss. Read-only investigation; never infer application geo solely from count-no-xff metrics.

## Procedure
1. Resolve exact CloudFront aliases, distribution ID, attached WebACL ARN, metric rule predicates, AWS profile and region through narrowly scoped reads. CloudFront WAF uses us-east-1.
2. Fetch GetSampledRequests for missing-XFF, session-present, and brand-specific rules in a fixed recent UTC window. Store raw headers under /tmp/pi-coding-agent/<task>/ with directory mode 0700 and files 0600; never print cookies, Authorization or session values.
3. Summarize per request: Host, Origin/Referer domain, sanitized URI, method, XFF presence and IP chain, session presence, WAF source IP ownership. Missing-XFF and session-present metrics are not equivalent or guaranteed to overlap.
4. Compare first XFF IP with CF-Connecting-IP or other forwarded-IP headers. Public IP plus matching headers supports consistent forwarding, not independent proof of client identity. Check sampled bet-place POSTs when relevant.
5. If traffic exceeds sample population limits, fetch a few disjoint time slices; deduplicate by request and timestamp before reporting counts. Inspect logging filters before assuming allowed-request history exists.
6. Use aggregate network-base RDAP and official CDN ranges to distinguish CDN sources from subscriber ISP egress. CloudFront adds or appends TCP viewer IP to origin XFF; no incoming XFF can be normal for direct browser traffic.
7. Report brand-specific evidence, exact UTC times, sampling limits, and whether bet/application geo remains unverified. Correlate origin/application bet records before claiming BO geo corruption.

## Pitfalls
- GetSampledRequests returns at most 500 samples from a limited 5,000-request population within previous three hours; busy traffic can dominate samples and absence does not prove no exceptions.
- WAF sample Request.ClientIP is current viewer/source, not necessarily real end-user behind upstream CDN. Never equate WAF Country with bet-user geo.
- Header names are case-insensitive; test missing, empty, and short values separately against actual WAF predicate. UUID-shaped session header is not proof of authenticated identity.
- Some WAF logging filters drop ALLOW traffic, preventing exhaustive retrospective analysis. Do not enable logging or create Athena infrastructure without user authorization.
- Cloudflare /ips-v4 or /ips-v6 may return HTTP 403; use public https://api.cloudflare.com/client/v4/ips once instead. Do not broaden unrelated lookups.

## Verification
1. Confirm live distribution WebACL association and API origin-request policy; check forwarding of viewer headers and edge-function associations.
2. Run assertions on sanitized totals, deduplicated counts, IP-header matches, and session-without-XFF examples.
3. Confirm artifact permissions; report no infrastructure or state mutation and redact raw header values.
4. Cite official AWS sampling/CloudFront behavior documentation and registry URLs supporting ownership conclusions.