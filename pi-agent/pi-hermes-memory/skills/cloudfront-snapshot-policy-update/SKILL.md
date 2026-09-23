---
name: "cloudfront-snapshot-policy-update"
description: "Audit and safely normalize CloudFront response headers policies across AWS accounts using full snapshots, guarded ETag updates, strict diffs, and live HSTS checks"
version: 2
created: "2026-09-23"
updated: "2026-09-23"
---
## When to Use
Use when auditing or changing CloudFront response headers policy bindings across one or more AWS accounts, especially for HSTS rollout where every default and ordered cache behavior must be checked and proof is required that no unrelated distribution configuration changed. Also use for no-op verification when Terraform-managed policies may already be attached.

## Procedure
1. Run read-only preflight first. Verify each AWS profile with `sts get-caller-identity`, enumerate live distributions, and inspect every default and ordered cache behavior independently. Count `DistributionList.Items`, not `DistributionList.Quantity`.
2. Fetch every referenced response headers policy and evaluate exact required fields. For HSTS baseline require `Override=true`, `AccessControlMaxAgeSec=31536000`, `IncludeSubdomains=true`, and `Preload=true`; missing policy or any mismatch is noncompliant.
3. Select replacement by semantic preservation, not name alone: no policy -> HSTS-only policy; existing S3/CORS/custom policy -> Terraform-managed superset preserving CORS, custom/security headers, removals, and Server-Timing. Compare complete policy configs.
4. Treat managed-policy replacement or any CORS method/header expansion as a decision gate. Show exact old/new semantics and get explicit approval, or skip those behaviors and record them as known exceptions.
5. Capture a before snapshot for the full account or bounded target set: complete `DistributionConfig`, distribution metadata, ETags, referenced policy configs, aliases, enabled/status state, and canonical SHA-256 config hashes. Store artifacts under one task-specific directory.
6. Generate a machine-readable plan listing account, distribution, enabled state, ETag, behavior path, old policy ID, new policy ID, and exact allowed diff path. Assert expected target distribution, behavior-change, and skipped-exception counts before mutation.
7. Immediately before the first update, re-fetch all scoped configs and candidate policies. Abort the whole wave on identity mismatch, snapshot drift, behavior inventory drift, policy drift, or unexpected old policy ID.
8. Deep-copy each full live `DistributionConfig`; modify only `DefaultCacheBehavior.ResponseHeadersPolicyId` or explicitly selected `CacheBehaviors.Items[*].ResponseHeadersPolicyId`. Persist planned configs and pre-change rollback configs.
9. Apply with `UpdateDistribution --if-match <fresh-etag>`. Run disabled targets first to expose deleted-origin validation failures before changing enabled traffic. Use standard AWS retries, serialize calls, and persist results after every distribution so partial progress is recoverable.
10. Wait for every changed distribution to reach `Deployed`. Capture a complete after snapshot, then recursively compare before/after configs. Accept only planned policy-ID transitions with exact old/new values; require untargeted configs to be identical and referenced policy configs unchanged.
11. Recompute behavior-level compliance across the full account. Verify expected exceptions exactly match approved skips and no new missing/noncompliant policy exists.
12. Run representative HTTPS checks for default and ordered paths, including static, CORS, wildcard-path, and API behaviors. Confirm exact `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.
13. For no-op accounts, still capture before/after snapshots and prove zero config/policy differences. Do not issue `UpdateDistribution` merely to reapply the same policy ID.
14. Keep `plan.json`, `apply-result.json`, `verification.json`, and before/after snapshots as audit and rollback evidence.

## Pitfalls
- `UpdateDistribution` replaces full configuration; stale or partial payloads can erase origins, cache behaviors, certificates, aliases, logging, WAF, or function associations.
- One cache behavior can reference only one response headers policy. Attaching HSTS-only policy can silently remove CORS, CSP, custom headers, removals, or Server-Timing.
- AWS managed policies cannot be modified. A Terraform replacement may broaden CORS even when names imply equivalence; compare allowed origins, methods, headers, credentials, exposed headers, max-age, and override flags.
- Policy names can differ only by capitalization while policy IDs/configs differ materially. Treat IDs and full configs as authority.
- HSTS `includeSubDomains` and `preload` affect browser state beyond CloudFront rollback. Validate domain scope and descendant HTTPS readiness before first rollout.
- Disabled distributions can still fail updates when configured S3 buckets were deleted. Do not repair unrelated origins automatically; leave, repair through IaC, or delete only with explicit approval.
- Reapplying an unchanged policy causes needless deployment and ETag churn. Exact matches are safe no-ops.
- CloudFront CLI auto-pagination may omit or null `DistributionList.Quantity` while returning `Items`; count the item array.
- ETag changes are metadata, not configuration differences. Compare `DistributionConfig` separately.
- Under `set -o pipefail`, piping `curl` into an early-exiting parser can return 141 from SIGPIPE despite a valid response. Capture full headers before parsing.
- Large waves can partially succeed. Persist per-distribution results incrementally and never report completion until all changed distributions are `Deployed` and strict diff verification passes.

## Verification
1. AWS profile identity matches expected account for every scoped profile.
2. Before and after distribution inventories match exactly unless deletion was explicitly requested.
3. Observed requested change count equals plan count; every old/new policy ID matches; unexpected config difference count is zero.
4. Untargeted distribution configs are byte/canonical equivalent and referenced response policy config hashes show no drift.
5. All changed distributions report `Deployed`; failed or in-progress targets prevent completion.
6. Every non-exempt default and ordered behavior references a policy with exact required HSTS settings; approved exceptions match recorded distribution and behavior paths.
7. Representative live HTTPS responses return exact HSTS header on default and changed ordered behavior paths.
8. Rollback artifacts contain complete pre-change configs and original ETags, with note that fresh ETags are required for rollback updates.
9. Final report states account totals, distribution and behavior counts, changed/skipped/failed counts, policy IDs used, live-check results, and artifact paths.