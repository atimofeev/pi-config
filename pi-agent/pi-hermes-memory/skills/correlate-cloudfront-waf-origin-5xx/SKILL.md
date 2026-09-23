---
name: "correlate-cloudfront-waf-origin-5xx"
description: "Correlate historical CloudFront viewer 5xx spikes with WAF blocks and origin health when request logs are missing"
version: 1
created: "2026-09-22"
updated: "2026-09-22"
---
## When to Use
Use when CloudFront, WAF, and origin logs disagree about HTTP 5xx responses, especially when CloudFront access logging was disabled or individual viewer requests cannot be recovered.

## Procedure
1. Resolve viewer hostname to exact CloudFront distribution; separately identify origin hostnames and path-to-origin behaviors.
2. Inspect distribution logging, WebACL, custom error responses, error cache TTL, origin groups, and failover status codes without changing resources.
3. Query one-minute CloudFront Requests, 5xxErrorRate, and status-specific additional metrics such as 502ErrorRate, 503ErrorRate, and 504ErrorRate for incident window.
4. Estimate status counts per minute as Requests multiplied by error-rate percentage divided by 100; compare synchronized timing across distributions sharing origin or WebACL.
5. Query AWS/WAFV2 BlockedRequests for WebACL aggregate and each custom-response rule. Treat ACL aggregate as upper bound when not every block returns same status.
6. Compare total WAF blocks against CloudFront viewer-error estimates. Temporal alignment alone indicates contribution, not causation or client-IP identity.
7. Check origin health metrics and health-check configuration. Verify protocol, port, host header, and path match production traffic before treating green checks as evidence.
8. Report viewer-level aggregate proof separately from per-request proof. If access logs are missing, state that source IP, URI, request ID, and exact probe response remain unprovable.

## Pitfalls
- Do not treat origin hostname as CloudFront viewer alias; direct DNS may bypass CloudFront and WAF.
- AWS CLI may render timestamps in local timezone even when query bounds use UTC; normalize before correlation.
- CloudFront 5xxErrorRate cannot distinguish status; use enabled status-specific metrics when available.
- WAF rate rules can return custom 503, while default blocks commonly return 403. Inspect actual rule action.
- WAF logging filters may drop rate-limited events, making logs incomplete by design.
- Healthy Route 53 checks prove little when they test HTTP root while CloudFront uses HTTPS, custom headers, and application paths.
- Origin-group failover may exclude 503, allowing origin 503 responses to pass through and be cached.

## Verification
1. Confirm exact distribution ID and viewer alias.
2. Confirm metric timestamps and timezone normalization.
3. Confirm status-specific CloudFront metric reproduces reported response code.
4. Confirm WAF counts and custom response codes from current WebACL configuration.
5. Confirm whether access logs existed during incident and document any permission blocker.
6. Preserve sanitized query definitions and summaries without credentials or secret origin headers.