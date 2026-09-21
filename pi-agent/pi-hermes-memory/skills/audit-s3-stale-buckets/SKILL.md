---
name: "audit-s3-stale-buckets"
description: "Assess AWS S3 buckets for cold, abandoned, or stale status using read-only evidence"
version: 1
created: "2026-09-21"
updated: "2026-09-21"
---
## When to Use
Use when asked which S3 buckets in an AWS account are old, inactive, cold, abandoned, or candidates for cleanup. The procedure is read-only and does not establish deletion safety by itself.

## Procedure
1. Verify the AWS profile's account identity with STS before collecting evidence.
2. Inventory bucket region, apparent creation date, versioning, lifecycle, tags, current objects, noncurrent versions, delete markers, and incomplete multipart uploads; retain errors and timeouts explicitly.
3. Query daily AWS/S3 BucketSizeBytes and NumberOfObjects metrics for at least 90-120 days in each bucket's region to distinguish growing, shrinking, flat, and empty storage.
4. Map runtime dependencies, including CloudFront origins and logging, WAF logging destinations, S3 replication, website configuration, notifications, CloudFormation references, and infrastructure-as-code references.
5. Check whether CloudTrail S3 data events, S3 request metrics, or Storage Lens advanced activity metrics exist; only these activity sources can provide meaningful read/request evidence.
6. Classify buckets using converging signals: old newest-object timestamp, flat storage, no runtime dependency, no recent writes, and no access evidence. Keep empty-but-referenced and replicated buckets separate from standalone stale candidates.
7. Recommend reversible quarantine and owner validation before deletion, especially for versioned buckets, state stores, logs, artifact stores, and replication pairs.

## Pitfalls
- Do not treat ListBuckets CreationDate as authoritative age; AWS documents that it can change when bucket settings such as bucket policy are edited.
- Flat object count and size prove only write inactivity, not lack of GET requests.
- A bucket policy naming a CloudFront OAI or service principal is historical/configuration evidence, not proof of a live dependency; compare against current distributions and service configs.
- Do not classify empty CloudFront origins, Terraform state buckets, CloudFormation artifact buckets, or enabled replication destinations as safe to delete without resolving their dependencies.
- Do not silently convert API timeouts or AccessDenied responses to zero objects or no configuration.
- Large current-object scans omit noncurrent versions and delete markers unless list-object-versions is also inspected.

## Verification
1. Confirm every candidate has evidence from object timestamps, metric trend, and dependency scans.
2. Confirm identity and account ID are recorded in the audit.
3. Confirm collection errors and unavailable activity telemetry are disclosed.
4. Confirm no AWS mutation occurred.
5. Before deletion, observe requests with CloudTrail S3 data events or Storage Lens advanced activity metrics and complete an owner-approved quarantine period.