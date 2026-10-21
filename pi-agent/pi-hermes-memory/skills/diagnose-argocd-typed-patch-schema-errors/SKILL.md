---
name: "diagnose-argocd-typed-patch-schema-errors"
description: "Diagnose Argo CD typed patch, field not declared in schema, or unable to resolve parseableType failures when manifests worked before; compare actual apply mode, served CRD versions, API discovery, pruning and Helm values."
version: 3
created: "2026-10-13"
updated: "2026-10-19"
---
## When to Use
Argo sync rejects custom-resource fields or cannot resolve a custom GVK, especially after operator/chart upgrades, when another cluster accepts the same manifest, or when application defaults do not explain observed server-side apply behavior.

## Procedure
1. Use an explicitly verified kubeconfig, context and endpoint for every CLI call, including subprocesses and waits. Read only relevant Application fields; do not dump credentials or unrelated custom-resource status.
2. Compare spec.syncPolicy.syncOptions, status.operationState.operation.sync.syncOptions and per-resource sync-option annotations. Manual sync can override application-level apply mode.
3. For missing-version or unable-to-resolve-parseableType errors, inspect matching CRD names, scope, each version's served/storage flags and schema, then resource entries in the exact group/version discovery endpoint. A CRD or group/version can exist while the requested kind/version is unserved.
4. Render the exact chart and configured values with its values.schema.json validation enabled. Inspect offending properties in bundled and live served CRD schemas; filter JSON rather than dumping entire CRDs.
5. Compare desired fields with live spec and kubectl.kubernetes.io/last-applied-configuration. Unsupported fields can survive in last-applied metadata while the API server prunes them from live spec.
6. Compare failing and successful cluster operation options and exact revisions before blaming stale caches, CRDs or operator versions. Check whether the offending field or API version actually changed.
7. For raw Helm extraObjects, distinguish chart-only switches from custom-resource API keys. Chart helpers may strip enabled while extraObjects renders verbatim.
8. Validate the minimal candidate against the correct served schema and server dry-run in the application's actual apply mode. For a version-only migration of the same resource, preserve group/kind, name, namespace, spec and UID; never delete/recreate it to change API representation.
9. Report trigger, invalid configuration and operational impact separately. After an authorized fix, verify published/applied revisions, current conditions, real workload readiness and resource identity. Separate historical failed-operation records from active comparison/sync errors; do not clear status to hide history.

## Pitfalls
- Application-level syncOptions alone do not reveal manual operation overrides.
- Client-side apply success does not prove unsupported configuration took effect; field-manager history alone does not prove current apply mode.
- Argo wording that a version is installed can be misleading when a CRD retains an unserved legacy version or another kind keeps that group/version discoverable. Verify resource-specific discovery and served=true before assuming stale cache.
- An SSA server dry-run against resources currently managed through CSA can report ownership conflicts unrelated to the proposed fix. Match actual mode; do not force ownership just to make a test pass.
- Do not disable validation or upgrade CRDs before checking whether the requested field/version is supported. Offline Kubernetes schema validation does not validate Helm values or prove a custom API version is served live.
- Correcting previously pruned aggregation or component settings changes workload behavior; flag this before applying.
- CRD schemas often permit arbitrary strings in runtime options. Helm lint and full schema validation cannot detect unsupported aggregation output names; inspect workload readiness, blocked rollouts and previous-container logs after enabling configuration.
- Verify template enable guards before reporting dead ingresses or wrong hostnames as active bugs. Configured values may be dormant.
- VictoriaMetrics stream aggregation deduplicates before computing aggregates. A dedup interval equal to aggregation interval discards intermediate samples, making intended average/max/sample-count statistics misleading.
- Aggregation output names and retained labels may differ from raw metrics. Check query compatibility before treating aggregation as transparent downsampling.
- Argo Synced/Healthy can coexist with Ready=False on an unsupported custom-resource health type. Inspect relevant custom conditions; do not conflate manifest convergence with application readiness.
- A successful comparison may not replace an old failed operation. Any retry should be bounded, guarded against concurrent operations and reviewed for hooks; normal hook retries can recreate temporary RBAC/Jobs under existing deletion policies. Never blanket-strip finalizers or delete user-data resources.

## Verification
1. Exact failing operation, source revision and actual apply mode recorded.
2. Requested custom GVK verified against resource-specific discovery, served version and structural schema.
3. Rendered invalid field/version corrected without suppressing schema validation; matching-mode server dry-run passes where available.
4. Published and compared/applied revisions verified after authorized changes; current ComparisonError/SyncError conditions absent.
5. Version-only fixes preserve resource UID and spec, including credential-template references.
6. Real workload readiness and independent custom-resource condition failures reported separately; historical operation records are not presented as new failures.