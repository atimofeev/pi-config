---
name: "trace-cloudfront-nginx-upstream-404"
description: "Diagnose nginx/OpenResty 404 behind CloudFront by tracing live behavior, Host policy, generated locations and intermediate-proxy versus ingress upstream routing."
version: 2
created: "2026-10-09"
updated: "2026-10-09"
---
## When to Use
Public CloudFront endpoint returns nginx or OpenResty 404 and suspected nginx configuration uses templated routes and multiple upstream tiers.

## Procedure
1. Capture public GET status, headers and body; identify CloudFront transport separately from response-body server signature.
2. Read live CloudFront distribution configuration with narrow AWS CLI queries: matching ordered behavior, target origin, origin path, edge functions and origin-request Host policy. Exclude custom header values from output.
3. Compare direct origin using configured authorization header without printing secrets. Probe each origin address with curl --resolve to preserve Host and TLS SNI.
4. Read serving nginx template and exact route-variable definitions. Resolve actual location match; check unchanged versus rewritten URI, upstream Host and upstream address/port.
5. Compare same URI and Host against candidate upstream tiers from allowed origin network; examine upstream_addr and upstream_status in logs if available.
6. Report proven request chain separately from suspected remediation. Limit fix to narrow missing route rather than broad fallback; validate rendered nginx config before reload.

## Pitfalls
- Server: nginx does not prove outer nginx generated error; reverse proxy can retain upstream body while replacing Server header.
- CloudFront AllViewerExceptHostHeader sends origin Host; unmatched public server_name is not evidence of origin Host mismatch.
- Generated location lists may omit non-/api routes even when CloudFront explicitly routes those paths to API origin.
- Backend-port timeout from workstation is reachability blocker, not evidence that route is absent; test from origin network.
- Do not dump whole secret-bearing configs or raw JSON access logs; those may contain Authorization headers. Export aggregates only, stripping query strings, client IPs and long identifiers.
- For fallback audits, upstream port alone is insufficient when explicit regex also routes to same upstream. Classify normalized URI using active nginx exact/prefix/regex precedence, then correlate recorded upstream address/status.
- Active config parsers must choose HTTPS server when HTTP redirect has same server_name. Auth/OPTIONS if blocks containing only return/add_header do not change URI location selection. Avoid parsing unrelated Lua sections as nginx directive grammar.
- Audit fixed common time window across all inventory nodes; DNS may expose rotating subset. Bound log reads, disclose coverage gaps/rotation, and distinguish origin requests from CloudFront cache hits.
- Counts include diagnostic requests unless separately excluded. Current-config reconstruction does not prove historical routing unchanged.
- Before claiming centralized log availability, verify shipping paths include exact proxy vhost log, not only similarly named API-origin logs.
- Use existing trusted SSH keys. If unknown, require trusted fingerprint or explicit first-use-trust approval; keep changed-key rejection enabled.
## Verification
1. Live CloudFront behavior and direct-origin response agree.
2. Actual nginx location and upstream tier identified using template plus variable definitions.
3. Candidate corrected upstream tested from permitted network before declaring root cause confirmed.
4. No changes or reloads performed without requested implementation scope.