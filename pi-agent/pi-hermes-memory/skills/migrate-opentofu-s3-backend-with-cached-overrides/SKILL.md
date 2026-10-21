---
name: "migrate-opentofu-s3-backend-with-cached-overrides"
description: "Migrate OpenTofu S3 state safely when init did not detect a moved backend, local .terraform already points to empty destination, or cached -backend-config overrides prevent init -migrate-state from switching."
version: 2
created: "2026-10-19"
updated: "2026-10-19"
---
## When to Use
Use for explicitly authorized S3-to-S3 OpenTofu backend migrations, especially after a directory/backend rename or init -reconfigure lost the source connection context. Not for resource-address refactors or provider migrations.

## Procedure
1. Confirm exact source/destination account, bucket, key, region and workspace scope. Read project instructions. Require explicit authorization; do not apply resources, import/recreate objects, disable locks or force-unlock.
2. Verify normal named-profile authentication, bucket ownership, source existence, destination absence, source/destination lock absence, workspace inventory, destination versioning/encryption and no active writers. An existing manual CI apply is not an active writer, but must not be triggered after cutover.
3. Create a private artifact directory0700 with umask077. Save guarded source backup0600 using ETag/version conditions; record only hashes, lineage/serial, resource/provider inventory and safe metadata. Never print raw state or outputs.
4. Use an isolated scratch root/TF_DATA_DIR with copied real generated backend configuration, unchanged exact provider constraints and existing provider cache. Preserve the user's local .terraform metadata. Initialize explicit SOURCE bucket/key with init -reconfigure, then verify cached backend and exact workspaces.
5. If OpenTofu normalizes dependency lock metadata, allow changes only to disposable scratch lock files with exact versions unchanged and no -upgrade. Do not mutate real configuration, pins or remote state provider addresses.
6. Immediately recheck source ETag, destination absence and both locks. Run native init -migrate-state with explicit DESTINATION -backend-config bucket/key values and locking enabled. Explicit destination overrides matter: dropping source CLI overrides while HCL hash stays unchanged can silently retain cached source backend and exit0 without copying.
7. Answer yes only to the expected prompt explicitly stating no existing destination state and asking to copy source. Reject overwrite/nonempty-destination, unexpected workspace or other prompts. Do not blindly force-copy. If command fails after backend work, inspect actual source/destination before any retry.
8. Read destination guarded by ETag/version and compare complete resources, instances, provider addresses and outputs privately against backup; preserve ordered attribute lists. Verify actual user root reads intended destination, lock objects are absent, target is versioned and source is unchanged. Retain original source as recovery copy, never as a second active backend.

## Pitfalls
- Exit0 from init does not prove state moved. Verify cached destination and populated S3 object independently.
- In OpenTofu1.12.6 native remote persistence, a physically absent destination can reset lineage and start serial1 while retaining every copied resource/output. Do not assume all migrations preserve snapshot metadata or all reset it. Classify exact differences and verify version-specific native source behavior; never silently ignore arbitrary state differences.
- A newer source terraform_version string alone does not prove incompatibility. Before any production write, test exact runtime against secured backup using native offline parsing and lossless roundtrip. Compare complete resources, provider addresses, outputs, check_results and snapshot metadata; a writer-version-only difference can be serialization-compatible. This proves serialization only, not provider/live-plan compatibility. Never upgrade/downgrade pins or substitute a fake operational backend; offline backup inspection is not a workaround for a blocked real plan.
- Provider initialization occurs after backend initialization/migration. A late dependency-lock error can coexist with a completed backend operation. Inspect actual remote state before retrying.
- Do not store backup/state/plan files in repository, print sensitive payloads, or reuse old saved plans after cutover. Do not cancel jobs or change IAM/bucket policies unless separately authorized.
- A retained old source is for recovery only. Once new writes occur, rollback must migrate latest authoritative state back under stopped writers, not blindly restore older snapshot.
## Verification
1. Native migration transcript shows intended old/new backend transition and one authorized empty-target confirmation.
2. Destination resource/data counts, IDs, attributes, provider addresses and outputs match source backup; source ETag/hash remains unchanged.
3. Record any lineage/serial changes with exact-version explanation; destination VersionId/encryption and both lock absences verified.
4. Run state list from actual user working directory to prove backend connectivity and expected address inventory without applying resources.
5. Run a fresh locked plan separately if requested; distinguish pre-existing drift from refactor-introduced changes and never apply unreviewed plans.