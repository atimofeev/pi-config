---
name: "diagnose-slow-aws-s3-sync"
description: "Diagnose AWS CLI s3 sync taking minutes while uploading tiny files, progress stuck calculating, or slow S3 CI deploys despite --exclude static/*; identify destination listing cost and safe upload-only cp replacement."
version: 2
created: "2026-10-07"
updated: "2026-10-07"
---
## When to Use
Slow local-to-S3 deployments with small uploads, long gaps, or large historical destination prefixes. Read-only diagnosis before edits or cleanup.

## Procedure
1. Collect timestamped successful CI trace; separate artifact download, first immutable static sync, second mutable-root sync, and startup/cache stages. Restrict raw trace permissions and never print credentials.
2. Read build configuration to distinguish fixed-name mutable root files from content-hashed static output. Verify current artifact file count and size from upstream metadata without downloading large artifacts.
3. Use existing authenticated AWS profile: get bucket location; list root with delimiter / to count root files/prefixes cheaply; query AWS/S3 NumberOfObjects daily metric. Versioned buckets and multipart uploads mean metric is not necessarily current ListObjectsV2 key count. Avoid exhaustive million-key scans.
4. Verify CLI source implementation if needed: sync creates source and destination file generators, then filters and comparator; destination uses paginated ListObjectsV2 by Prefix. Exclude filters are client-side after remote listing. Recursive local-to-S3 cp generates source files only.
5. Recommend keeping sync for immutable static files while replacing mutable-root sync with aws s3 cp --recursive and identical exclusion/cache-control/ACL flags. cp reuploads unchanged source files but avoids remote listing and refreshes metadata; local artifact walking remains.
6. Validate behavior with dry-run or source inspection, then measure a real CI run after requested change. Do not claim runtime improvement until measured. Treat historical-object cleanup as separately approved action.

## Pitfalls
- Do not recommend --size-only for mutable fixed-name HTML/JS: changed same-length content can be skipped.
- --exclude cannot serve as server-side exclusion of static keys or other historical prefixes during sync. Increasing transfer concurrency does not remove sequential destination pagination; default ListObjectsV2 page size1000 already max.
- Do not add --delete or expire hashed assets blindly; old pages or clients may reference them.
- Object age is not asset last-use age: sync --size-only skips unchanged hashes, so assets still used by current builds can have old timestamps. Preserve current manifest unconditionally plus manifests for retained releases; define grace from release retirement, not initial upload.
- No finite retention window guarantees indefinitely open old clients. Cache max-age alone does not bound client lifetime or cover chunks not yet fetched; require explicit frontend refresh/support policy or measure and accept residual risk.
- Mixed-content buckets can hold log archives or other deployments. Scope pruning to owned build prefixes after producer/consumer verification, not entire bucket.
- Do not confuse slow local directory walking with remote bucket enumeration; hundreds/thousands of local files versus million-key destination matters.
- Preserve cache headers, ACL, MIME type behavior, destination key layout and nonzero failure status.
## Verification
1. Timestamp evidence explains most job duration and shows small actual upload volume.
2. Bucket metadata supports large listing workload without exhaustive scan or secret output.
3. Replacement omits destination generator, keeps static excluded, and preserves existing deployment metadata.
4. No repository or cloud mutation during investigation; post-change timing verified separately.