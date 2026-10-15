---
name: "diagnose-gitlab-ecr-image-mirror"
description: "Investigate a GitLab image publishing job failing to copy a container to AWS ECR/EKS, including RepositoryNotFoundException, misleading green pipelines and mutable source tags; produce a read-only evidence-based remediation plan."
version: 2
created: "2026-10-14"
updated: "2026-10-14"
---
## When to Use
Use when asked to locate a private GitLab container image and plan its promotion to ECR/EKS. Investigation remains read-only unless the user explicitly requests implementation.

## Procedure
1. Read the exact GitLab job metadata and trace, then inspect its pipeline commit CI definition. Distinguish successful build/push to GitLab from failed downstream registry mirroring; check allow_failure before trusting pipeline status.
2. Query project registry repositories and the exact service tags. Record full registry host/path, tag and current manifest digest. A mutable tag's current digest does not prove the historical job image digest.
3. Derive destination account, region and repository from the job, not the active local AWS profile. Verify profile identity and run an exact read-only ECR describe-repositories lookup; stop on auth failures.
4. Inspect only the corresponding IaC stack and EKS GitOps application. Identify the minimal additive repository change, preserve beta/prod overwrite behavior if required, and review account guards and deletion protection.
5. Prefer repairing and retrying the existing mirror job over building a duplicate pipeline. For a controlled one-off, authenticate through stdin into a restrictive temporary authfile and use digest-pinned skopeo copy --all --preserve-digests, failing rather than silently altering image identity.
6. Verify destination manifest digest and architecture compatibility. Treat attached signatures, attestations and referrers separately according to security policy.
7. Keep image publication separate from workload deployment. Inspect the target Helm values/chart before claiming a copied image will create a service; validate EKS node/Fargate execution-role pull permissions, not workload IRSA.

## Pitfalls
- Never print tokens or broad traces that may contain secrets; use authenticated API requests with bounded relevant output.
- An ECR login succeeding does not establish repository push permissions.
- A green pipeline with an allowed-to-fail mirror job is not evidence of successful delivery.
- EKS is not an image registry: ECR publication and Kubernetes rollout are separate acceptance criteria.
- Do not scan all accounts or rerun whole pipelines when the exact job and destination are known.

## Verification
1. Evidence identifies exact source image, current digest and actual failed operation.
2. Live destination identity/repository state is verified or explicitly marked blocked.
3. Plan names owning IaC stack and deployment repository, separates copy from rollout, and states unverified IAM or runtime requirements.
4. If implementation is requested, test exact repository naming, required mutable aliases, encryption/scanning and wrong-account rejection with mock-provider plan tests; retain existing-resource tests.
5. Backend-free validation can run on a temporary copy retaining the original backend configuration: init -backend=false, validate and mock-only test. Do not use a fake backend for real plans. Keep downloaded provider lock files in the validation artifact and report actual tested runtime/provider versions without changing source constraints.
6. No repository/cloud/pipeline mutations occur during a plan-only request; code-only changes never imply cloud apply or image publication.