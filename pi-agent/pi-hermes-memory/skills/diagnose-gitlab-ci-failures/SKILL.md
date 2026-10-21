---
name: "diagnose-gitlab-ci-failures"
description: "Diagnose GitLab CI failures: missing MR pipelines, slow source checkout, or failed ECR image mirroring. Read-only evidence from exact revisions, live settings and job traces."
version: 1
created: "2026-10-21"
updated: "2026-10-21"
---
## When to Use
Use for GitLab CI diagnosis before changing CI, rerunning pipelines or modifying project/cloud settings. Follow only the steps matching the observed symptom.

## Procedure
1. Identify the exact project, MR/job, head SHA and observed symptom through authenticated read-only API calls. Keep credentials and raw traces out of output.
2. For an MR stuck at Checking pipeline status, compare live merge gates, pipelines for the exact SHA, changed paths and effective CI rules.
3. For slow Getting source/get_sources, measure actual job sections, effective depth and included configuration before blaming checkout or repository size.
4. For registry promotion or RepositoryNotFoundException, separate source build, destination registry delivery and workload rollout; do not trust a green pipeline with allow_failure.
5. Report observed cause, evidence and smallest relevant remediation. Obtain separate authorization before reruns, configuration changes, publication, deployment or history rewriting.

## Pitfalls
- Local checkout may differ from the pipeline revision. Current mutable image tags do not prove historical image identity.
- A read-only diagnosis is not permission to start infrastructure jobs or disable merge safeguards.

## Verification
1. Exact SHA, applicable live settings and bounded job/API evidence support the diagnosis.
2. Sampling, inaccessible evidence and untested remediation remain explicit.
3. No repository, pipeline, registry or cloud mutations occur during diagnosis.