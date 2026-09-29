---
name: "diagnose-kube-api-budget-burn"
description: "Trace Kubernetes API error-budget alerts through live rules, latency/error components, and notification repetition"
version: 1
created: "2026-09-29"
updated: "2026-09-29"
---
## When to Use
Investigating recurring KubeAPIErrorBudgetBurn notifications from kube-prometheus-stack.

## Procedure
1. Fetch live Prometheus /api/v1/rules and /api/v1/alerts; retain exact expressions, labels, for durations, activeAt and recording-rule definitions.
2. Query recording series at notification timestamp across relevant windows. Inspect actual read/write aggregation and configured budget instead of assuming a 99.9% SLO.
3. Decompose bad-event numerator into 5xx request rates and SLI duration count minus eligible good buckets, using exact scope thresholds and exclusions from live rules.
4. Identify resource/API group/verb/status contributors and per-instance distribution. For latency contributions subtract matching resource count and threshold bucket rates; account for 1 versus 1.0 bucket labels.
5. Inspect Alertmanager group_by/repeat_interval and notification template. Distinguish separate long/short-window label sets from reminders. Compare activeAt plus rule for-duration with notification StartsAt.
6. Read bounded apiserver logs to establish underlying mechanism. Try configured Kubernetes MCP if local kubectl lacks context; explicitly report access blockers and do not infer etcd or webhook failures from metrics alone.

## Pitfalls
- Some live rules sum independently normalized read and write fractions: the sum is not an overall request failure percentage.
- 5xx and latency terms can overlap; do not describe them as mutually exclusive failed requests.
- GET custom-resource 500s identify API failures, not necessarily failures of the application represented by the resource.
- An absent cluster label explains blank descriptions but does not itself cause burn. activeAt may precede firing by the rule's for-duration.

## Verification
1. Saved rules reproduce threshold crossing at notification time.
2. Contributors are supported by raw query values with timestamps and API-group labels.
3. Separate verified alert trigger from unconfirmed underlying failure mechanism; avoid changing alert thresholds as a substitute for diagnosis.