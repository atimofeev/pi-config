---
name: "verify-nexus-cnpg-external-db-images"
description: "Research Nexus Repository Helm external PostgreSQL support and CloudNativePG custom/hardened image compatibility; distinguish current CE from legacy OSS, Pro chart defaults, database image requirements and version-dependent S3 support."
version: 3
created: "2026-10-14"
updated: "2026-10-15"
---
## When to Use
Use for a research-only architecture check involving Nexus, external PostgreSQL and CNPG custom images. Documentation verification does not establish runtime compatibility for an unspecified image.

## Procedure
1. Extract intended Nexus edition/version, exact chart/version, CNPG version, PostgreSQL image digest and blob-store provider from requirements. If absent, make verdict conditional rather than inventing deployment target.
2. Check current Sonatype CE onboarding, PostgreSQL installation docs and active/passive deployment guide. Distinguish application capability, official chart support scope and software licensing. CE onboarding currently states 40,000 components and 100,000 requests/day; do not confuse H2 capacity guidance with CE tier limits.
3. Inspect chart values and StatefulSet/secret templates at pinned revision using authenticated gh. For nxrm-ha, inspect statefulset.clustered, statefulset.replicaCount, hpa.enabled, statefulset.container.env, secret.existingDbSecret.enabled and statefulset.container.additionalEnv. Existing-secret switch can suppress default DB entries without wiring replacements; check all DB_NAME, DB_HOST, DB_USER and DB_PASSWORD entries.
4. Inspect nonclustered replica rendering and license arguments explicitly. Some nxrm-ha revisions force replicas: 1 when clustered=false, ignoring replicaCount: 0; cold standby requires separate app activation control or minimal template adaptation. Both branches may retain licenseFile JVM settings.
5. Check current feature-matrix HTML icons, not only stripped text. If web_fetch raw output truncates before table, extract rows from reported full-content temporary file with standard-library HTML parser. PostgreSQL/S3 availability does not establish CE eligibility for resilient/HA patterns: matrix separately marks Resilient Deployment Options and High Availability Deployment Options.
6. Read matching-version CNPG container-image, security, bootstrap and catalog documentation. Verify binaries in PATH, locales, non-root UID/GID and filesystem behavior, entrypoint replacement, postgres database/user invariants and explicit major-version identification. Check pg_trgm, Nexus database ownership and locale requirements.
7. Recommend digest-pinned CNPG-compatible reference image or custom image built to contract. Require disposable-cluster bootstrap, local and cross-cluster switchover, backup/restore and Nexus artifact upload/download checks for exact versions before declaring runtime validation.
8. For two-DC DR, distinguish one logical service from two independent writable Nexus installations. Validate DB, blobs, filesystem state and encryption keys together; define fencing, GitOps desired-state changes, planned token-based CNPG switchover, unplanned promotion, former-primary re-clone and application-level RPO/RTO measurements.
## Pitfalls
- Do not infer external PostgreSQL is impossible because a chart lacks dedicated externalDatabase keys: custom environment injection may support it.
- Do not treat the Pro-oriented chart README as proof CE use is legally prohibited; inspect documented CE adaptation options.
- Do not repeat historical Pro-only claims for PostgreSQL or S3 without checking current CE feature availability and usage limits.
- Custom PostgreSQL images are not arbitrary drop-ins: CNPG bypasses their entrypoints, so vendor entrypoint initialization may never run.
- Pin evidence to the actual chart/operator release. Sources on main may differ from installed versions.
- A nonclustered chart branch may still inject Pro license properties. replicas=1 alone is not proof of a production-ready CE setup.
- CNPG Container Image Requirements lives at /docs/<version>/container_images, not /container_image_requirements. Current plugin-based releases no longer require Barman Cloud executables inside PostgreSQL operand images; verify matching-version docs.
- Do not infer bounded end-to-end RPO from archive_timeout, nominal replication lag, or PostgreSQL promotion tokens. Blob replication and application filesystem state form separate recovery domains; asynchronous lag may grow without bound during outages.
- Distinguish local CNPG pod failover from cross-cluster promotion. Planned distributed-topology demotion/promotion tokens avoid rebuilding former primary; unplanned cross-cluster failover requires re-cloning former primary per CNPG docs.
## Verification
1. Cite primary-source URLs and actual chart key paths; distinguish documentation/source verification from rendering and runtime tests.
2. Confirm feature-matrix column order and icon alt values before asserting edition support.
3. Record unspecified chart/image/version inputs and the exact smoke-test acceptance checklist.
4. Do not edit tickets or operate clusters for a research-only request.