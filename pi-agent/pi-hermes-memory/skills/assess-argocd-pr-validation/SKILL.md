---
name: "assess-argocd-pr-validation"
description: "Assess low-maintenance Kubernetes/GitOps PR CI scoped to changed directories using kubeconform and Helm; verify real regressions, custom CRD served versions, schema-catalog fallback and validation gaps."
version: 1
created: "2026-10-19"
updated: "2026-10-19"
---
## When to Use
User asks whether kubeconform can prevent ArgoCD/Kubernetes deployment failures or wants simple changed-directory PR validation. Determine whether research or implementation is authorized.

## Procedure
1. Inventory real Application source patterns: remote Helm HTTP/OCI, local charts, raw directories, multi-source and pinned remote bundles. Record valuesObject/values/valueFiles/parameters, source paths and exclusion/recursion settings. Avoid validating only Application wrappers.
2. Select complete changed app directories from PR base versus tested head, covering deletions/renames. Define deliberate broader checks for Kubernetes-version, validator or CRD dependency changes.
3. Render exact declared charts with configured values and schema validation enabled. Reuse existing version/value declarations; do not add a duplicate Helmfile/app list. Fully qualified OCI URLs may already contain chart name.
4. Run kubeconform strict/summary with explicit target Kubernetes version and custom schemas. Missing schemas are errors unless intentionally skipped; keep coverage counts visible.
5. For CRD-producing sources, derive exact schemas and a served group/kind/version registry from selected chart/bundle CRDs. Reject unserved owned GVKs BEFORE generic schema fallback.
6. Create temporary before/after regression fixtures, including bad Helm values, retired custom API versions, historical-schema fallback and an always-false CEL rule. Verify expected outcomes rather than assuming a green validator proves coverage.
7. Recommend smallest workflow/helper that handles observed sources. Pin tools, avoid live-cluster credentials, execute untrusted PRs with read-only permissions on isolated runners, and fail clearly on unsupported packaging.

## Pitfalls
- Kubeconform can accept an Application carrying invalid arbitrary Helm values; helm template must run first and already validates values.schema.json.
- Served-only schema generation is NOT enough when a later catalog supplies an old version. Explicit served-version rejection or disabling fallback for owned custom kinds is required.
- Kubeconform does not execute Kubernetes CEL/admission rules. An always-false x-kubernetes-validations fixture can still pass.
- Custom-resource instances and CustomResourceDefinition objects have distinct schema needs; default registries may lack CRD-object schemas. Do not hide missing coverage with blanket ignore-missing-schemas.
- Directory-only checks can miss consumers of upgraded CRDs elsewhere. Disclose this or define a broader fallback, rather than silently claiming repository-wide compatibility.
- Offline validation cannot establish runtime health, safe database/storage migrations, safe resource deletion or absence of API/etcd timeouts. Server dry-run is stronger but introduces cluster-dependency and credential/security costs.
- Derive intended Kubernetes version from an existing public tracked declaration where possible; extract only needed version fields, never dump state/credentials. Do not assume all tool installer pins are automatically updated by dependency automation.

## Verification
1. Both observed source regressions fail in proposed complete pipeline and fixed equivalents pass.
2. A historical catalog cannot bypass served-version gate; skips and unsupported schemas remain explicit.
3. Changed-directory detection validates complete affected applications and documents global/dependency exceptions.
4. Research preserves repository/unrelated edits; implementation proceeds only after user approval.