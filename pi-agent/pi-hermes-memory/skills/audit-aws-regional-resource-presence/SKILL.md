---
name: "audit-aws-regional-resource-presence"
description: "Audit all enabled AWS regions for major resources outside configured backup regions: EC2, databases, storage, containers, networking and messaging. Build a metadata-only named-profile presence matrix, distinguish unknowns from absence, qualify region-filtered S3 exports, and plan per-account coverage changes."
version: 1
created: "2026-10-17"
updated: "2026-10-17"
---
## When to Use
Use when asked to check all AWS regions for major resources, determine whether a two-region backup selection misses workloads, or prepare a scoped region-expansion plan. Not an exhaustive inventory of every AWS service or authorization to enable regions, inspect excluded accounts, read workload data or create backups.

## Procedure
1. Extract an explicit approved profile/account allowlist and excluded accounts. Privately match STS identities with known owner-account IDs. Expand placeholder baseline paths with each actual profile name; do not treat a pattern like baseline-ACCOUNT as a literal directory.
2. Refresh EC2 DescribeRegions(AllRegions=True) per account. Audit enabled regions and record disabled regions as uninspected; disabled status does not prove resources never existed. Keep configured versus outside-region flags on every result.
3. Use one coherent SDK interpreter with bundled operation, paginator and endpoint models. Freeze named-profile credentials in RAM if automatic refresh is forbidden. Never persist credentials, raw responses, resource IDs/names, user tags, policy bodies or data values.
4. Define the major-service catalog before execution. Typical classes include live/stopped EC2, owned EBS/AMI/snapshots, Lambda, EKS/ECS, RDS instances/clusters, DynamoDB, EFS/FSx, ElastiCache, OpenSearch, Redshift, Kafka, load balancers, NAT, queues/streams, secret metadata, ACM and alarms. Record API Gateway and regional WAF or any other omitted product explicitly rather than implying universal coverage.
5. Validate API input/result keys against local models. Use owned-only image/snapshot filters, exclude terminated instances/deleted NATs, request all modeled ACM key types and both alarm types, and supply SQS pagination parameters. Do not count default VPCs or default buses as evidence of major workloads.
6. Bound account concurrency, total simultaneous calls, explicit API requests, timeouts and wall time. Set total SDK attempts to one when retries are forbidden. Credential/identity failures stop new scheduling; classify service permission, throttle, endpoint and network errors distinctly from empty results.
7. For presence audits, stop after the first nonempty page only if counts are labeled lower bounds when continuation remains. Empty pages with continuation must be followed before claiming absence. Exact counts require exhausted pages. SDK endpoint-model absence is model-unavailable/not inspected, not authoritative AWS service absence.
8. Inventory S3 account-wide with paginated ListBuckets and an explicit modeled MaxBuckets. Prefer returned BucketRegion; if missing, use GetBucketLocation without reading objects. Normalize legacy region aliases. Fully reconcile bucket totals with per-region sums.
9. Before calling outside-region S3 buckets unexported, inspect the pinned exporter source and captured state region attributes. Some exporters filter BucketLocation by selected region. Distinguish current scope gaps from an identity-matched historical deletion/regression; resource creation timing may differ from captures.
10. Independently recompute totals from actual metadata, including per-profile bucket sums, rather than trusting agent prose. Check artifact ownership, symlinks and modes, including shared parents; fix only owned task directories nonrecursively.
11. Report profile/region/class/count/precision and coverage exceptions. Propose per-account region additions rather than blindly adding all regions to every account. Verify pinned image service selectors: region expansion alone cannot cover unselected database/storage types; do not invent AMI or snapshot support from a generic EBS service key.

## Pitfalls
- Presence of EC2 instances includes stopped resources unless states are separately reported; do not call every discovered instance running or production.
- Configuration exports do not back up database contents, bucket objects, AMI image data or snapshot data, and do not establish independent data-backup policies.
- Do not retry a large matrix merely to resolve a few errors. Publish the failed region/service set and obtain appropriate authorization for a narrow follow-up.
- An SDK-modeled endpoint can still be unreachable or unavailable; a model-unavailable skip may reflect stale models. Neither is a successful empty check.
- A service-selector listing proves only that the pinned exporter exposes the key, not native-provider compatibility, semantic fidelity or coverage of every resource type under that service.
- Standalone EBS exports can overlap instance block-device management; evaluate ownership before claiming the combined generated configuration is restore-ready.
- Long account/region audits are non-atomic snapshots. Do not attribute resource-count differences to software versions without identity and lifecycle evidence.

## Verification
1. Every enabled account/region/class has a terminal status and count precision; every error, cap, disabled region and uninspected product is disclosed.
2. Explicit request counts reconcile with operation counters; no automatic retries, excluded-account calls, region enablement or cloud mutations occurred.
3. Outside-region positives are verified from actual report rows, and S3 totals equal per-region sums for every profile.
4. Reports/helpers are private owned regular files under private nonsymlink directories; no raw resource data leaks in tool output or exceptions.
5. The final plan separates account/region scope, missing service selectors, configuration validity, semantic fidelity and data/restore requirements.