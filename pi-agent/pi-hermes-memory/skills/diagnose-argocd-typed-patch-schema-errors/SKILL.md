---
name: "diagnose-argocd-typed-patch-schema-errors"
description: "Diagnose Argo CD failed to create typed patch object / field not declared in schema when same manifests worked before; compare operation-level ServerSideApply overrides, CRD schema and pruned live fields."
version: 2
created: "2026-10-13"
updated: "2026-10-13"
---
## When to Use
Argo sync rejects custom-resource fields absent from CRD schema, especially when another cluster accepts same manifest or application defaults do not enable ServerSideApply.

## Procedure
1. Read affected Application using kubectl get application -o json. Compare spec.syncPolicy.syncOptions with status.operationState.operation.sync.syncOptions; manual sync can enable ServerSideApply only for that operation. Also check per-resource sync-option annotations.
2. Render exact chart and values locally, then inspect offending CRD properties from both bundled chart and live served version. Filter JSON instead of printing full CRDs.
3. Compare desired fields with live spec and kubectl.kubernetes.io/last-applied-configuration. Unsupported fields can remain in last-applied metadata while API server prunes them from live spec.
4. Compare failing and successful cluster operation options before attributing discrepancy to stale CRDs or operator versions. Check revision diff for whether offending field was newly introduced.
5. For raw Helm extraObjects, distinguish chart-only switches from custom-resource API keys. Chart helpers may strip enabled while extraObjects renders verbatim.
6. Report trigger, underlying invalid configuration, and operational impact separately. Verify affected component replicas or emitted operator configuration using read-only requests; do not apply fixes without authorization.

## Pitfalls
- Application-level syncOptions alone do not reveal manual operation overrides.
- Client-side apply success does not prove unsupported configuration took effect.
- Field-manager history differences are not sufficient proof of current apply mode.
- Do not recommend disabling validation or upgrading CRDs before verifying whether requested field exists in supported API.
- Correcting previously pruned aggregation or component settings changes workload behavior; flag this before applying.
- CRD schemas often permit arbitrary strings in runtime options. Helm lint and full schema validation cannot detect unsupported aggregation output names; inspect workload readiness, blocked rollouts and previous-container logs after enabling configuration.
- Verify template enable guards before reporting dead ingresses or wrong hostnames as active bugs. Configured values may be dormant.
- VictoriaMetrics stream aggregation deduplicates before computing aggregates. A dedup interval equal to aggregation interval discards intermediate samples, making intended average/max/sample-count statistics misleading.
- Aggregation output names and retained labels may differ from raw metrics. Check query compatibility before treating aggregation as transparent downsampling.
## Verification
1. Exact failed operation shows apply mode and schema error.
2. Rendered offending field absent from served CRD; valid replacement verified from schema.
3. Live spec confirms whether intended feature was silently ignored.
4. If comparing clusters, same revision and actual operation options recorded.