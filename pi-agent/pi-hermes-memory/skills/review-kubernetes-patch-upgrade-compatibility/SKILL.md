---
name: "review-kubernetes-patch-upgrade-compatibility"
description: "Review Kubernetes patch upgrades for breaking changes across every crossed patch; distinguish release-note behavior changes from rollout hazards and verify CSI/proxy applicability."
version: 1
created: "2026-10-21"
updated: "2026-10-21"
---
## When to Use
A Kubernetes patch-version PR spans several releases and the user asks for breaking changes or safe upgrade assessment. Read-only unless execution is authorized.

## Procedure
1. Record exact PR head, base, patch delta and CI evidence using authenticated gh. Keep artifacts in a task-specific private temporary directory.
2. Fetch the minor-series CHANGELOG through authenticated GitHub git-tree/blob APIs. If the target tag changelog omits its own release, use the canonical branch changelog and verify overlapping release sections match.
3. Read every crossed release's changes and dependencies, skipping download tables and pre-baseline minor-release notes. Extract action-required, behavior changes, regressions and fixes.
4. Map conditional changes to live configuration: inspect kube-proxy arguments for backend, CSIDriver.spec.requiresRepublish for republish fixes, component images and explicitly enabled feature gates. Do not infer proxy backend from CNI.
5. Check Talos support matrix or distribution equivalent, client version skew and official release EOL separately from application compatibility.
6. Report confirmed findings first; distinguish release incompatibility, preexisting rollout mechanism hazards, client prerequisites and untested runtime behavior.

## Pitfalls
- An absent target section in the release-tag changelog is not evidence the target had no changes.
- CSI republish fixes apply to requiresRepublish=true; CSI usage alone does not establish applicability.
- IPVS-specific changes do not apply to nftables merely because kube-proxy is installed.
- Avoid dumping full changelogs with download tables into agent context; return concise release-specific evidence.
- No mandatory migration found is not proof of zero downtime or universal compatibility.

## Verification
1. All crossed release sections are accounted for and exact PR head is rechecked.
2. Conditional claims are supported by relevant live fields rather than product-name inference.
3. Conclusions cite canonical changelog and compatibility/lifecycle sources and disclose lack of actual upgrade testing.